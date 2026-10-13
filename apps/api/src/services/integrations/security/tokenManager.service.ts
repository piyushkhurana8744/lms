import { SecretEncryptionService } from '../../security/secretEncryption.service';
import { IIntegrationConnectionDocument, IntegrationConnectionModel } from '@edtech/database';
import { IntegrationProvider } from '@edtech/types';
import { logger } from '@edtech/utils';

export interface DecryptedCredentials {
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  apiKey?: string;
  apiSecret?: string;
  accountEmail?: string;
  webhookSecret?: string;
  tokenType?: string;
  scope?: string;
  [key: string]: any;
}

export class TokenManagerService {
  // In-memory single-flight promise map for concurrent token refreshes
  private static refreshPromises = new Map<string, Promise<string>>();

  /**
   * Decrypts credentials stored in an IntegrationConnection.
   */
  public static decryptCredentials(connection: IIntegrationConnectionDocument): DecryptedCredentials {
    if (!connection.encryptedCredentials) return {};
    try {
      const plaintext = SecretEncryptionService.decryptSecret(connection.encryptedCredentials);
      if (!plaintext) return {};
      return JSON.parse(plaintext);
    } catch (err: any) {
      logger.error(`[TokenManager] Failed to decrypt connection credentials: ${err.message}`);
      return {};
    }
  }

  /**
   * Encrypts credentials object into a ciphertext string for Mongo storage.
   */
  public static encryptCredentials(credentials: DecryptedCredentials): string {
    if (!credentials || Object.keys(credentials).length === 0) return '';
    const plaintext = JSON.stringify(credentials);
    return SecretEncryptionService.encryptSecret(plaintext);
  }

  /**
   * Safely retrieves a valid access token for a connection.
   * If token is expired or close to expiry (within 5 minutes), performs single-flight refresh.
   */
  public static async getValidAccessToken(
    connection: IIntegrationConnectionDocument,
    refreshFn?: (refreshToken: string, creds: DecryptedCredentials) => Promise<{ accessToken: string; refreshToken?: string; expiresInSeconds?: number }>
  ): Promise<string> {
    const creds = this.decryptCredentials(connection);
    const now = Date.now();
    const expiresAt = connection.expiresAt ? new Date(connection.expiresAt).getTime() : 0;
    const isExpired = expiresAt > 0 && expiresAt - now < 5 * 60 * 1000;

    if (!isExpired && creds.accessToken) {
      return creds.accessToken;
    }

    if (!creds.refreshToken && creds.accessToken) {
      return creds.accessToken;
    }

    if (!creds.refreshToken) {
      if (creds.apiKey) return creds.apiKey;
      throw new Error(`Connection ${connection._id} has no valid access token or refresh token`);
    }

    // Single-flight refresh lock based on connectionId
    const lockKey = connection._id.toString();
    const existingPromise = this.refreshPromises.get(lockKey);
    if (existingPromise) {
      return existingPromise;
    }

    const refreshPromise = (async () => {
      try {
        let newAccessToken = '';
        let newRefreshToken = creds.refreshToken;
        let expiresInSeconds = 3600;

        if (refreshFn) {
          const res = await refreshFn(creds.refreshToken!, creds);
          newAccessToken = res.accessToken;
          if (res.refreshToken) newRefreshToken = res.refreshToken;
          if (res.expiresInSeconds) expiresInSeconds = res.expiresInSeconds;
        } else {
          throw new Error('No provider token refresh implementation was supplied');
        }

        const updatedCreds: DecryptedCredentials = {
          ...creds,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        };

        const newExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);

        await IntegrationConnectionModel.updateOne(
          { _id: connection._id },
          {
            $set: {
              encryptedCredentials: this.encryptCredentials(updatedCreds),
              status: 'CONNECTED',
              lastRefreshAt: new Date(),
              expiresAt: newExpiresAt,
              lastErrorCategory: null,
              lastErrorMessage: null
            }
          }
        );

        connection.encryptedCredentials = this.encryptCredentials(updatedCreds);
        connection.status = 'CONNECTED';
        connection.lastRefreshAt = new Date();
        connection.expiresAt = newExpiresAt;

        return newAccessToken;
      } catch (error: any) {
        logger.error(`[TokenManager] Token refresh failed for connection ${connection._id}: ${error.message}`);
        await IntegrationConnectionModel.updateOne(
          { _id: connection._id },
          {
            $set: {
              status: 'RECONNECT_REQUIRED',
              lastErrorCategory: 'AUTH_REQUIRED',
              lastErrorMessage: error.message || 'Token refresh failed'
            }
          }
        );
        connection.status = 'RECONNECT_REQUIRED';
        throw error;
      } finally {
        this.refreshPromises.delete(lockKey);
      }
    })();

    this.refreshPromises.set(lockKey, refreshPromise);
    return refreshPromise;
  }
}
