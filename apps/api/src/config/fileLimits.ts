import { MediaType } from '@edtech/types';

export const FILE_LIMITS = {
  MAX_SIZE_BYTES: {
    IMAGE: parseInt(process.env.MAX_FILE_SIZE_IMAGE || '10485760', 10), // 10 MB
    PDF: parseInt(process.env.MAX_FILE_SIZE_PDF || '26214400', 10), // 25 MB
    AUDIO: parseInt(process.env.MAX_FILE_SIZE_AUDIO || '104857600', 10), // 100 MB
    VIDEO: parseInt(process.env.MAX_FILE_SIZE_VIDEO || '524288000', 10) // 500 MB
  },
  ALLOWED_MIME_TYPES: {
    IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
    PDF: ['application/pdf'],
    AUDIO: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'],
    VIDEO: ['video/mp4', 'video/webm', 'video/quicktime']
  } as Record<MediaType, string[]>,
  ALLOWED_EXTENSIONS: {
    IMAGE: ['.jpg', '.jpeg', '.png', '.webp'],
    PDF: ['.pdf'],
    AUDIO: ['.mp3', '.wav', '.ogg', '.m4a', '.mp4'],
    VIDEO: ['.mp4', '.webm', '.mov']
  } as Record<MediaType, string[]>
};

export function getMediaTypeFromMime(mimeType: string): MediaType | null {
  const normalized = mimeType.toLowerCase().trim();
  for (const [type, mimes] of Object.entries(FILE_LIMITS.ALLOWED_MIME_TYPES)) {
    if (mimes.includes(normalized)) {
      return type as MediaType;
    }
  }
  return null;
}

export function isAllowedMimeAndExtension(mediaType: MediaType, mimeType: string, extension: string): boolean {
  const normalizedMime = mimeType.toLowerCase().trim();
  const normalizedExt = extension.toLowerCase().trim();

  const allowedMimes = FILE_LIMITS.ALLOWED_MIME_TYPES[mediaType] || [];
  const allowedExts = FILE_LIMITS.ALLOWED_EXTENSIONS[mediaType] || [];

  return allowedMimes.includes(normalizedMime) && allowedExts.includes(normalizedExt);
}
