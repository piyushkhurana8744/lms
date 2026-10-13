import { OrganizationStorageModel, PaymentModel, ReceiptModel } from '@edtech/database';
import { formatCurrency, tenantContextStorage } from '@edtech/utils';
import { ConflictError, NotFoundError } from '../errors/appError';
import { StorageProviderFactory } from './storage/storageProviderFactory';
import { financeCheckpoint } from './financeFailureInjection';

function escapePdf(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7E]/g, '?');
}

export function renderReceiptPdf(lines: string[]): Buffer {
  const text = lines.map((line, index) => `BT /F1 11 Tf 50 ${790 - index * 22} Td (${escapePdf(line)}) Tj ET`).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

export class ReceiptArtifactService {
  static async generateTrusted(receiptId: string) {
    const receipt = await ReceiptModel.findById(receiptId).setOptions({ bypassTenantFilter: true }).select('tenantId');
    if (!receipt) throw new NotFoundError('Receipt not found');
    const tenantId = receipt.tenantId.toString();
    return tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: 'finance-worker', isPlatformContext: false, allowedTenantIds: [tenantId] }, () => this.generate(receiptId));
  }

  static async generate(receiptId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;
    const now = new Date();
    const claimed = await ReceiptModel.findOneAndUpdate(
      { _id: receiptId, tenantId, $or: [{ 'artifact.status': { $in: ['PENDING', 'FAILED'] } }, { artifact: { $exists: false } }, { 'artifact.status': 'PROCESSING', 'artifact.leaseUntil': { $lt: now } }] },
      { $set: { 'artifact.status': 'PROCESSING', 'artifact.leaseUntil': new Date(now.getTime() + 60_000) }, $unset: { 'artifact.lastError': 1 } },
      { new: true }
    );
    if (!claimed) {
      const existing = await ReceiptModel.findOne({ _id: receiptId, tenantId });
      if (!existing) throw new NotFoundError('Receipt not found');
      return existing;
    }
    try {
      const payment = await PaymentModel.findOne({ _id: claimed.paymentId, tenantId }).lean();
      if (!payment) throw new NotFoundError('Receipt payment not found');
      const provider = await StorageProviderFactory.getTenantStorageProvider(tenantId);
      if (!provider) throw new ConflictError('Tenant storage is not configured');
      const storageConfig = await OrganizationStorageModel.findOne({ tenantId }).lean();
      const lines = [
        claimed.organizationSnapshot.organizationName,
        `Receipt: ${claimed.receiptNumber}`,
        `Payment: ${payment.paymentNumber}`,
        `Student: ${claimed.studentSnapshot.fullName}`,
        `Course: ${claimed.courseSnapshot.title}`,
        `Amount: ${formatCurrency(claimed.amountMinor, claimed.currency)}`,
        `Method: ${claimed.paymentMethod}`,
        `Reference: ${claimed.transactionReference || 'N/A'}`,
        `Paid at: ${payment.receivedAt.toISOString()}`
      ];
      const pdf = renderReceiptPdf(lines);
      financeCheckpoint('RECEIPT_BEFORE_UPLOAD');
      const uploaded = await provider.upload({ tenantId, buffer: pdf, originalFileName: `${claimed.receiptNumber}.pdf`, mimeType: 'application/pdf', extension: 'pdf' });
      claimed.artifact = { status: 'READY', storageProvider: storageConfig?.provider || 'LOCAL', storageKey: uploaded.storageKey, mimeType: 'application/pdf', sizeBytes: pdf.length, generatedAt: new Date() };
      await claimed.save();
      return claimed;
    } catch (error: any) {
      await ReceiptModel.updateOne({ _id: claimed._id, tenantId }, { $set: { 'artifact.status': 'FAILED', 'artifact.lastError': String(error?.message || error).slice(0, 500) }, $unset: { 'artifact.leaseUntil': 1 } });
      throw error;
    }
  }

  static async getDownloadUrl(receiptId: string, studentUserId?: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const query: any = { _id: receiptId, tenantId: ctx.currentTenantId };
    if (studentUserId) query.studentUserId = studentUserId;
    const receipt = await ReceiptModel.findOne(query);
    if (!receipt) throw new NotFoundError('Receipt not found');
    if (receipt.artifact?.status !== 'READY' || !receipt.artifact.storageKey) throw new ConflictError('Receipt document is not ready');
    const provider = await StorageProviderFactory.getTenantStorageProviderByProvider(ctx.currentTenantId, receipt.artifact.storageProvider);
    if (!provider) throw new ConflictError('Receipt storage provider is unavailable');
    return { url: await provider.getSignedUrl(receipt.artifact.storageKey, { expiresIn: 300 }), expiresInSeconds: 300 };
  }

  static async getDownload(receiptId: string, studentUserId?: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const query: any = { _id: receiptId, tenantId: ctx.currentTenantId };
    if (studentUserId) query.studentUserId = studentUserId;
    const receipt = await ReceiptModel.findOne(query);
    if (!receipt) throw new NotFoundError('Receipt not found');
    if (receipt.artifact?.status !== 'READY' || !receipt.artifact.storageKey) throw new ConflictError('Receipt document is not ready');
    const provider = await StorageProviderFactory.getTenantStorageProviderByProvider(ctx.currentTenantId, receipt.artifact.storageProvider);
    if (!provider) throw new ConflictError('Receipt storage provider is unavailable');
    const filename = `${receipt.receiptNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    if (provider.read) {
      return { buffer: await provider.read(receipt.artifact.storageKey), mimeType: receipt.artifact.mimeType || 'application/pdf', filename };
    }
    return { url: await provider.getSignedUrl(receipt.artifact.storageKey, { expiresIn: 300 }), expiresInSeconds: 300 };
  }
}
