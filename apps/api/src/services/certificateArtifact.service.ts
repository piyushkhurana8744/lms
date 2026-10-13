import { deflateSync, inflateSync } from 'zlib';
import QRCode from 'qrcode';
import { CertificateModel, OrganizationStorageModel, TenantModel } from '@edtech/database';
import { getWorkspaceContext } from '@edtech/utils';
import { ConflictError, NotFoundError } from '../errors/appError';
import { StorageProviderFactory } from './storage/storageProviderFactory';

type FailurePoint = 'RENDER' | 'STORAGE';
let failurePoint: FailurePoint | undefined;
export function setCertificateArtifactFailurePoint(point?: FailurePoint) {
  if (process.env.NODE_ENV !== 'test' && point) throw new Error('Certificate failure injection is test-only');
  failurePoint = point;
}

const escape = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7E]/g, '?').slice(0, 180);

/** Resolve the public tenant origin used by the platform's host-based tenant routing. */
export async function getCertificatePublicOrigin(tenantId: string): Promise<string> {
  const tenant = await TenantModel.findById(tenantId).select('slug customDomain isCustomDomainVerified').lean();
  if (!tenant) throw new NotFoundError('Tenant not found');
  if (tenant.customDomain && tenant.isCustomDomainVerified) return `https://${tenant.customDomain}`;
  const configuredOrigin = process.env.WEB_APP_URL || process.env.PUBLIC_WEB_URL || process.env.NEXT_PUBLIC_PUBLIC_WEB_URL;
  if (configuredOrigin) return new URL(configuredOrigin).origin;
  if (process.env.PUBLIC_PLATFORM_DOMAIN) return `https://${tenant.slug}.${process.env.PUBLIC_PLATFORM_DOMAIN}`;
  if (process.env.NODE_ENV === 'production') throw new Error('A public web origin is required for certificate QR generation');
  return 'http://localhost:3000';
}

function pngToPdfRgb(png: Buffer): { width: number; height: number; data: Buffer } {
  if (!png.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) throw new Error('QR encoder returned an invalid PNG');
  const width = png.readUInt32BE(16); const height = png.readUInt32BE(20);
  if (png[24] !== 8 || png[25] !== 6) throw new Error('Unsupported QR PNG format');
  const chunks: Buffer[] = []; let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset); const type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12; if (type === 'IEND') break;
  }
  const raw = inflateSync(Buffer.concat(chunks)); const stride = width * 4; const rgba = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]; const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? rgba[y * stride + x - 4] : 0; const up = y ? rgba[(y - 1) * stride + x] : 0;
      const upperLeft = y && x >= 4 ? rgba[(y - 1) * stride + x - 4] : 0; let value = row[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) { const p = left + up - upperLeft; const pa = Math.abs(p - left); const pb = Math.abs(p - up); const pc = Math.abs(p - upperLeft); value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upperLeft; }
      else if (filter !== 0) throw new Error('Unsupported PNG filter');
      rgba[y * stride + x] = value & 255;
    }
  }
  const rgb = Buffer.alloc(width * height * 3);
  for (let source = 0, target = 0; source < rgba.length; source += 4, target += 3) {
    const alpha = rgba[source + 3] / 255;
    rgb[target] = Math.round(rgba[source] * alpha + 255 * (1 - alpha)); rgb[target + 1] = Math.round(rgba[source + 1] * alpha + 255 * (1 - alpha)); rgb[target + 2] = Math.round(rgba[source + 2] * alpha + 255 * (1 - alpha));
  }
  return { width, height, data: deflateSync(rgb) };
}

export function renderCertificatePdf(lines: string[], qrPng?: Buffer): Buffer {
  if (failurePoint === 'RENDER') throw new Error('Injected certificate renderer failure');
  const text = lines.map((line, index) => `BT /F1 ${index === 0 ? 24 : 13} Tf 70 ${520 - index * 42} Td (${escape(line)}) Tj ET`).join('\n');
  const qr = qrPng ? pngToPdfRgb(qrPng) : undefined; const content = `${text}${qr ? '\nq 120 0 0 120 650 50 cm /QR Do Q' : ''}`;
  const resources = `/Font << /F1 5 0 R >>${qr ? ' /XObject << /QR 6 0 R >>' : ''}`;
  const objects: Array<string | Buffer> = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << ${resources} >> /Contents 4 0 R >>`, `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  if (qr) objects.push(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${qr.width} /Height ${qr.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${qr.data.length} >>\nstream\n`), qr.data, Buffer.from('\nendstream')]));
  const parts: Buffer[] = [Buffer.from('%PDF-1.4\n')]; const offsets = [0]; let length = parts[0].length;
  objects.forEach((object, index) => { offsets.push(length); const part = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), Buffer.isBuffer(object) ? object : Buffer.from(object), Buffer.from('\nendobj\n')]); parts.push(part); length += part.length; });
  const xref = length; parts.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((value) => `${String(value).padStart(10, '0')} 00000 n \n`).join('')}trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)); return Buffer.concat(parts);
}

export class CertificateArtifactService {
  static async generate(id: string) {
    const tenantId = getWorkspaceContext().currentTenantId; if (!tenantId) throw new Error('Tenant context required'); const now = new Date();
    const claimed = await CertificateModel.findOneAndUpdate({ _id: id, tenantId, $or: [{ 'artifact.status': { $in: ['PENDING', 'FAILED'] } }, { 'artifact.status': 'PROCESSING', 'artifact.leaseUntil': { $lt: now } }] }, { $set: { 'artifact.status': 'PROCESSING', 'artifact.leaseUntil': new Date(now.getTime() + 60_000) }, $unset: { 'artifact.lastError': 1 } }, { new: true });
    if (!claimed) { const existing = await CertificateModel.findOne({ _id: id, tenantId }); if (!existing) throw new NotFoundError('Certificate not found'); return existing; }
    try {
      const provider = await StorageProviderFactory.getTenantStorageProvider(tenantId); if (!provider) throw new ConflictError('Tenant storage is not configured');
      const verificationUrl = `${await getCertificatePublicOrigin(tenantId)}/verify/certificate/${encodeURIComponent(claimed.verificationCode)}`;
      const qrPng = await QRCode.toBuffer(verificationUrl, { type: 'png', errorCorrectionLevel: 'M', margin: 2, width: 256 });
      const s = claimed.credentialSnapshot; const pdf = renderCertificatePdf([s.organizationName, 'CERTIFICATE OF COMPLETION', `This certifies that ${s.studentName}`, `completed ${s.courseTitle}`, `Completion date: ${s.completionDate.toISOString().slice(0, 10)}`, `Issue date: ${claimed.issuedAt.toISOString().slice(0, 10)}`, `Certificate: ${claimed.certificateNumber}`, `Verify: ${verificationUrl}`], qrPng);
      if (failurePoint === 'STORAGE') throw new Error('Injected certificate storage failure');
      const uploaded = await provider.upload({ tenantId, buffer: pdf, originalFileName: `${claimed.certificateNumber}.pdf`, mimeType: 'application/pdf', extension: 'pdf' });
      const storage = await OrganizationStorageModel.findOne({ tenantId }).select('provider').lean(); claimed.artifact = { status: 'READY', storageProvider: storage?.provider || 'LOCAL', storageKey: uploaded.storageKey, mimeType: 'application/pdf', sizeBytes: pdf.length, generatedAt: new Date(), retryCount: claimed.artifact?.retryCount || 0 } as any; await claimed.save(); return claimed;
    } catch (error: any) { await CertificateModel.updateOne({ _id: claimed._id, tenantId }, { $set: { 'artifact.status': 'FAILED', 'artifact.lastError': String(error?.message || error).slice(0, 500) }, $unset: { 'artifact.leaseUntil': 1 } }); throw error; }
  }
  static async download(certificate: any) { if (certificate.artifact?.status !== 'READY' || !certificate.artifact.storageKey) throw new ConflictError('Certificate document is not ready'); const provider = await StorageProviderFactory.getTenantStorageProviderByProvider(certificate.tenantId.toString(), certificate.artifact.storageProvider); if (!provider) throw new ConflictError('Certificate storage provider is unavailable'); const filename = `${certificate.certificateNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`; if (provider.read) return { buffer: await provider.read(certificate.artifact.storageKey), mimeType: 'application/pdf', filename }; return { url: await provider.getSignedUrl(certificate.artifact.storageKey, { expiresIn: 300 }), filename }; }
}
