export interface StorageUploadInput {
  tenantId: string;
  buffer: Buffer;
  originalFileName: string;
  mimeType: string;
  extension: string;
}

// Alias for backwards compatibility
export type StorageUploadParams = StorageUploadInput;

export interface StorageUploadResult {
  storageKey: string;
  url: string;
}

export interface StorageSignedUrlOptions {
  expiresIn?: number;
}

export interface StorageProvider {
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;
  /** Optional direct read for private providers that can serve bytes through an authorized API route. */
  read?(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void | boolean>;
  getSignedUrl(storageKey: string, options?: StorageSignedUrlOptions | number): Promise<string>;
  testConnection(): Promise<boolean>;
}
