import { PaymentGatewayConfigModel } from '@edtech/database';
import { IPaymentProvider } from './paymentProvider.interface';
import { RazorpayProvider } from './razorpay.provider';
import { SecretEncryptionService } from '../security/secretEncryption.service';
import { BadRequestError } from '../../errors/appError';

export class PaymentProviderFactory {
  /**
   * Instantiates the active payment provider for a tenant with decrypted credentials.
   */
  public static async getProviderForTenant(tenantId: string): Promise<IPaymentProvider> {
    const configDoc = await PaymentGatewayConfigModel.findOne({ tenantId });

    if (!configDoc || !configDoc.isEnabled) {
      throw new BadRequestError('Online payment gateway is not configured or enabled for this organization');
    }

    if (configDoc.provider === 'RAZORPAY') {
      const keyId = configDoc.razorpay?.keyId || '';
      const keySecret = configDoc.razorpay?.keySecretEncrypted
        ? SecretEncryptionService.decryptSecret(configDoc.razorpay.keySecretEncrypted)
        : '';
      const webhookSecret = configDoc.razorpay?.webhookSecretEncrypted
        ? SecretEncryptionService.decryptSecret(configDoc.razorpay.webhookSecretEncrypted)
        : '';

      if (!keyId || !keySecret) {
        throw new BadRequestError('Razorpay credentials are incomplete for this organization');
      }

      return new RazorpayProvider({
        keyId,
        keySecret,
        webhookSecret
      });
    }

    throw new BadRequestError(`Unsupported payment provider: ${configDoc.provider}`);
  }
}
