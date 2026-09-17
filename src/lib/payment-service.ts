/**
 * Manual payment workflow.
 *
 * A user transfers money to the business account and submits a reference.
 * That creates a `pending` payment row. An administrator then confirms or
 * rejects it:
 *
 *   confirm → issue a purchase token, link it to the payment, email the token
 *   reject  → mark the submission rejected, issue nothing
 *
 * Every step is written back to the payment row so the system keeps an
 * auditable record of the user, the payment, its status, the confirmation
 * date, the issued token, the delivery status and the confirming admin.
 */

import {
  AccessToken,
  Payment,
  createAccessToken,
  getPaymentById,
  getPricingConfig,
  getTokenById,
  confirmPayment,
  rejectPayment,
  setTokenDeliveryStatus,
} from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { renderTokenEmail } from '@/lib/email-templates';

/** Tokens above this many uses are treated as unlimited by the token layer. */
const UNLIMITED_USES = 999999;

export interface PaymentActionResult {
  ok: boolean;
  error?: string;
  payment?: Payment;
  token?: AccessToken;
  delivery?: 'delivered' | 'failed' | 'skipped';
  deliveryError?: string;
}

function describeUses(maxUses: number): string {
  return maxUses >= UNLIMITED_USES ? 'Unlimited generations' : `${maxUses} generations`;
}

function describeExpiry(expiresAt: number | null): string {
  if (!expiresAt) return 'No expiry';
  return new Date(expiresAt).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Confirm a pending payment: issue the token, record it against the payment,
 * then attempt to email the token to the user. Email failure never rolls back
 * the confirmation — the admin can resend from the payments screen.
 */
export async function confirmManualPayment(
  paymentId: string,
  admin: { id: string; name: string }
): Promise<PaymentActionResult> {
  const payment = getPaymentById(paymentId);

  if (!payment) {
    return { ok: false, error: 'Payment not found' };
  }

  if (payment.status === 'completed' && payment.token_id) {
    return { ok: false, error: 'This payment has already been confirmed.' };
  }

  if (payment.status === 'rejected') {
    return { ok: false, error: 'This payment was rejected. Reopen it before confirming.' };
  }

  const recipientEmail = payment.email;
  if (!recipientEmail) {
    return { ok: false, error: 'The payment has no email address to deliver a token to.' };
  }

  const pricing = getPricingConfig();
  const maxUses = pricing.purchaseTokenUses <= 0 ? UNLIMITED_USES : pricing.purchaseTokenUses;

  const issuedToken = createAccessToken(
    'purchase',
    recipientEmail,
    payment.user_id,
    maxUses,
    pricing.purchaseTokenExpiryDays
  );

  const updated = confirmPayment(paymentId, issuedToken.id, admin.id, admin.name) ?? payment;

  const delivery = await deliverTokenEmail(updated.id);

  return {
    ok: true,
    payment: delivery.payment ?? updated,
    token: issuedToken,
    delivery: delivery.delivery,
    deliveryError: delivery.error,
  };
}

/** Reject a pending submission. */
export function rejectManualPayment(
  paymentId: string,
  admin: { id: string; name: string }
): PaymentActionResult {
  const payment = getPaymentById(paymentId);

  if (!payment) {
    return { ok: false, error: 'Payment not found' };
  }

  if (payment.status === 'completed') {
    return { ok: false, error: 'This payment is already confirmed and cannot be rejected.' };
  }

  const updated = rejectPayment(paymentId, admin.id, admin.name);
  return { ok: true, payment: updated };
}

/**
 * Email the token belonging to a confirmed payment.
 * Also used to resend after a failed or skipped delivery.
 */
export async function deliverTokenEmail(
  paymentId: string
): Promise<PaymentActionResult> {
  const payment = getPaymentById(paymentId);

  if (!payment) {
    return { ok: false, error: 'Payment not found' };
  }

  if (!payment.token_id) {
    return { ok: false, error: 'No token has been issued for this payment yet.' };
  }

  if (!payment.email) {
    return { ok: false, error: 'This payment has no email address.' };
  }

  const token = getTokenById(payment.token_id);
  if (!token) {
    return { ok: false, error: 'The issued token could no longer be found.' };
  }

  const rendered = renderTokenEmail({
    recipientName: payment.payer_name,
    token: token.token,
    usesLabel: describeUses(token.max_uses),
    expiresLabel: describeExpiry(token.expires_at),
  });

  const result = await sendEmail({
    to: payment.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });

  const status = result.delivered ? 'delivered' : result.skipped ? 'manual' : 'failed';
  const note = result.delivered
    ? `Token emailed via ${result.provider} on ${new Date().toISOString()}`
    : `Token email not delivered (${result.provider}): ${result.error ?? 'unknown error'}`;

  const updated = setTokenDeliveryStatus(paymentId, status, note) ?? payment;

  return {
    ok: true,
    payment: updated,
    token,
    delivery: result.delivered ? 'delivered' : result.skipped ? 'skipped' : 'failed',
    deliveryError: result.delivered ? undefined : result.error,
  };
}

/** Reopen a rejected payment so it can be reviewed again. */
export function reopenManualPayment(paymentId: string): PaymentActionResult {
  const payment = getPaymentById(paymentId);
  if (!payment) return { ok: false, error: 'Payment not found' };
  if (payment.status !== 'rejected') {
    return { ok: false, error: 'Only rejected payments can be reopened.' };
  }

  const updated = setTokenDeliveryStatus(paymentId, 'pending_confirmation');
  return { ok: true, payment: updated };
}
