/**
 * Shared serialization of a payment row for the admin API, so the payments
 * list and the payment actions always return the same shape.
 */

import { Payment, getTokenById } from '@/lib/db';

export interface AdminPaymentView {
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

export function toAdminPaymentView(payment: Payment): AdminPaymentView {
  const tokenRecord = payment.token_id ? getTokenById(payment.token_id) : undefined;

  return {
    id: payment.id,
    payerName: payment.payer_name,
    email: payment.email,
    userId: payment.user_id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    reference: payment.reference,
    notes: payment.notes,
    createdAt: payment.created_at,
    confirmedAt: payment.confirmed_at,
    confirmedBy: payment.confirmed_by,
    tokenDeliveryStatus: payment.token_delivery_status,
    token: tokenRecord?.token ?? null,
    tokenMaxUses: tokenRecord?.max_uses ?? null,
    tokenUsedCount: tokenRecord?.used_count ?? null,
    tokenExpiresAt: tokenRecord?.expires_at ?? null,
  };
}
