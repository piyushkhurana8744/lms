export interface CreateGatewayOrderParams {
  amountMinor: number;
  currency: string;
  receiptId: string;
  notes?: Record<string, string>;
}

export interface GatewayOrderResult {
  orderId: string;
  amountMinor: number;
  currency: string;
  provider: 'RAZORPAY' | 'STRIPE' | 'MANUAL';
  keyId: string;
}

export interface VerifyGatewayPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface InitiateGatewayRefundParams {
  paymentId: string;
  amountMinor: number;
  reason?: string;
  idempotencyKey: string;
}

export interface GatewayRefundResult {
  refundId: string;
  amountMinor: number;
  status: string;
}

export interface GatewayPaymentDetails {
  paymentId: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  status: 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'UNKNOWN';
}

export interface GatewayRefundDetails {
  refundId: string;
  paymentId: string;
  amountMinor: number;
  status: 'PENDING' | 'PROCESSED' | 'FAILED' | 'UNKNOWN';
}

export interface IPaymentProvider {
  createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult>;
  fetchPayment(paymentId: string): Promise<GatewayPaymentDetails>;
  fetchPaymentForOrder(orderId: string): Promise<GatewayPaymentDetails | null>;
  fetchRefund(refundId: string): Promise<GatewayRefundDetails>;
  findRefund(paymentId: string, idempotencyKey: string): Promise<GatewayRefundDetails | null>;
  verifyPaymentSignature(params: VerifyGatewayPaymentParams): boolean;
  initiateRefund(params: InitiateGatewayRefundParams): Promise<GatewayRefundResult>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}
