/**
 * Client-side access to the payment endpoints.
 *
 * These types deliberately duplicate the server view shape rather than import
 * it, so the browser bundle never pulls in the database layer.
 */

export interface AdminPaymentRecord {
  id: string;
  payerName: string | null;
  email: string | null;
  userId: string | null;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: number;
  confirmedAt: number | null;
  confirmedBy: string | null;
  tokenDeliveryStatus: string | null;
  token: string | null;
  tokenMaxUses: number | null;
  tokenUsedCount: number | null;
  tokenExpiresAt: number | null;
}

export interface AdminPaymentSummary {
  total: number;
  pending: number;
  confirmed: number;
  rejected: number;
  deliveredTokens: number;
  undeliveredTokens: number;
  revenueByCurrency: Record<string, number>;
}

export interface AdminPaymentsResponse {
  payments: AdminPaymentRecord[];
  summary: AdminPaymentSummary;
}

export type PaymentAction = 'confirm' | 'reject' | 'deliver-token' | 'reopen';

export interface PaymentActionResponse {
  success: boolean;
  payment: AdminPaymentRecord | null;
  token: string | null;
  delivery: 'delivered' | 'failed' | 'skipped' | null;
  deliveryError: string | null;
  message: string;
}

export interface UserPaymentRecord {
  id: string;
  payerName: string | null;
  reference: string | null;
  amount: number;
  currency: string;
  status: string;
  tokenDeliveryStatus: string | null;
  createdAt: number;
  confirmedAt: number | null;
  rejectedReason: string | null;
  token: string | null;
}

export interface PublicPaymentConfig {
  businessName: string;
  accountNumber: string;
  bankName: string;
  providerName: string;
  instructions: string;
  amount: number;
  currency: 'ngn' | 'usd';
  tokenUses: number;
  tokenExpiryDays: number;
  emailDeliveryEnabled: boolean;
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${response.status})`);
  }
  return data as T;
}

export async function fetchAdminPayments(): Promise<AdminPaymentsResponse> {
  return readJson<AdminPaymentsResponse>(await fetch('/api/admin/payments'));
}

export async function runPaymentAction(
  action: PaymentAction,
  paymentId: string
): Promise<PaymentActionResponse> {
  return readJson<PaymentActionResponse>(
    await fetch('/api/admin/payments/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, paymentId }),
    })
  );
}

export async function fetchPublicPaymentConfig(): Promise<PublicPaymentConfig> {
  const data = await readJson<{ payment: PublicPaymentConfig }>(
    await fetch('/api/payment-config')
  );
  return data.payment;
}

export async function submitManualPayment(input: {
  payerName: string;
  reference: string;
  notes?: string;
  email?: string;
}): Promise<{ payment: UserPaymentRecord; message: string }> {
  return readJson<{ payment: UserPaymentRecord; message: string }>(
    await fetch('/api/payments/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  );
}

export async function fetchUserPayments(): Promise<UserPaymentRecord[]> {
  const data = await readJson<{ payments: UserPaymentRecord[] }>(
    await fetch('/api/payments/manual')
  );
  return data.payments;
}
