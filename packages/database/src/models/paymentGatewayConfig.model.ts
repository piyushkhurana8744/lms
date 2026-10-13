import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type PaymentGatewayType = 'RAZORPAY' | 'STRIPE' | 'MANUAL';

export interface IPaymentGatewayConfigDocument extends Document {
  tenantId: Types.ObjectId;
  provider: PaymentGatewayType;
  isEnabled: boolean;
  
  // Razorpay encrypted configuration
  razorpay?: {
    keyId: string;
    keySecretEncrypted?: string;
    webhookSecretEncrypted?: string;
  };
  
  // Stripe encrypted configuration
  stripe?: {
    publishableKey: string;
    secretKeyEncrypted?: string;
    webhookSecretEncrypted?: string;
  };
  
  isLiveMode: boolean;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentGatewayConfigSchema = new Schema<IPaymentGatewayConfigDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
    provider: { type: String, enum: ['RAZORPAY', 'STRIPE', 'MANUAL'], default: 'RAZORPAY' },
    isEnabled: { type: Boolean, default: false },
    
    razorpay: {
      keyId: { type: String, trim: true, default: '' },
      keySecretEncrypted: { type: String, default: '' },
      webhookSecretEncrypted: { type: String, default: '' }
    },
    
    stripe: {
      publishableKey: { type: String, trim: true, default: '' },
      secretKeyEncrypted: { type: String, default: '' },
      webhookSecretEncrypted: { type: String, default: '' }
    },
    
    isLiveMode: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

PaymentGatewayConfigSchema.plugin(tenantIsolationPlugin);

export const PaymentGatewayConfigModel = model<IPaymentGatewayConfigDocument>(
  'PaymentGatewayConfig',
  PaymentGatewayConfigSchema
);
