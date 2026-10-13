import { v2 as cloudinary } from 'cloudinary';

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Returns a configured Cloudinary SDK instance scoped to an organization's stored credentials.
 * Does NOT rely on single global process.env credentials.
 */
export function configureCloudinary(credentials: CloudinaryCredentials) {
  if (!credentials.cloudName || !credentials.apiKey || !credentials.apiSecret) {
    throw new Error('Cloudinary requires cloudName, apiKey, and apiSecret');
  }

  cloudinary.config({
    cloud_name: credentials.cloudName,
    api_key: credentials.apiKey,
    api_secret: credentials.apiSecret,
    secure: true
  });

  return cloudinary;
}

export { cloudinary };
