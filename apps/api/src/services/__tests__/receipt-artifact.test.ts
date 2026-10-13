import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { renderReceiptPdf } from '../receiptArtifact.service';
import { LocalStorageProvider } from '../storage/localStorage.provider';

describe('receipt PDF artifact', () => {
  const directories: string[] = [];
  afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => fs.promises.rm(directory, { recursive: true, force: true }))); });

  it('renders a structurally valid PDF from immutable display lines', () => {
    const pdf = renderReceiptPdf(['DIDM', 'Receipt: RCPT-1', 'Amount: INR 100.00']);
    expect(pdf.subarray(0, 8).toString()).toBe('%PDF-1.4');
    expect(pdf.toString()).toContain('Receipt: RCPT-1');
    expect(pdf.toString()).toContain('startxref');
  });

  it('stores and resolves a PDF through the provider-neutral local storage contract', async () => {
    const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'didm-receipt-'));
    directories.push(directory);
    const provider = new LocalStorageProvider(directory);
    const pdf = renderReceiptPdf(['Receipt: RCPT-LOCAL']);
    const uploaded = await provider.upload({ tenantId: 'tenant-a', buffer: pdf, originalFileName: 'receipt.pdf', mimeType: 'application/pdf', extension: 'pdf' });
    expect(uploaded.storageKey).toMatch(/^tenant-a\//);
    expect(await fs.promises.readFile(path.join(directory, uploaded.storageKey))).toEqual(pdf);
    await expect(provider.getSignedUrl(uploaded.storageKey)).resolves.toContain('/api/v1/media/file/');
  });
});
