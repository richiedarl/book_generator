/**
 * Admin payment actions.
 *
 * One endpoint for the decisions an administrator makes about a manual
 * payment submission:
 *
 *   confirm       → issue the token, record it, email it to the user
 *   reject        → mark the submission rejected
 *   deliver-token → (re)send the token email for a confirmed payment
 *   reopen        → move a rejected submission back to pending
 *
 * Every action is recorded on the payment row (status, confirmation date and
 * confirming admin, issued token, delivery status) for auditability.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getPaymentById } from '@/lib/db';
import {
  confirmManualPayment,
  deliverTokenEmail,
  PaymentActionResult,
  rejectManualPayment,
  reopenManualPayment,
} from '@/lib/payment-service';
import { toAdminPaymentView } from '@/lib/payment-view';

const PAYMENT_ACTIONS = ['confirm', 'reject', 'deliver-token', 'reopen'] as const;
type PaymentAction = (typeof PAYMENT_ACTIONS)[number];

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action as PaymentAction;
    const paymentId = typeof body.paymentId === 'string' ? body.paymentId : '';

    if (!PAYMENT_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Action must be one of: ${PAYMENT_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    if (!paymentId || !getPaymentById(paymentId)) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const admin = { id: user.id, name: user.name };
    const result = await runAction(action, paymentId, admin);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      payment: result.payment ? toAdminPaymentView(result.payment) : null,
      token: result.token?.token ?? null,
      delivery: result.delivery ?? null,
      deliveryError: result.deliveryError ?? null,
      message: buildMessage(action, result),
    });
  } catch (err: any) {
    console.error('Admin payment action error:', err);
    return NextResponse.json({ error: 'Failed to perform the payment action' }, { status: 500 });
  }
}

function runAction(
  action: PaymentAction,
  paymentId: string,
  admin: { id: string; name: string }
): PaymentActionResult | Promise<PaymentActionResult> {
  switch (action) {
    case 'confirm':
      return confirmManualPayment(paymentId, admin);
    case 'reject':
      return rejectManualPayment(paymentId, admin);
    case 'deliver-token':
      return deliverTokenEmail(paymentId);
    case 'reopen':
      return reopenManualPayment(paymentId);
  }
}

function buildMessage(action: PaymentAction, result: PaymentActionResult): string {
  if (action === 'confirm') {
    if (result.delivery === 'delivered') {
      return 'Payment confirmed. The token has been emailed to the user.';
    }
    return 'Payment confirmed and the token was issued, but the email could not be sent. Use "Resend token" to try again.';
  }

  if (action === 'reject') return 'Payment marked as rejected.';
  if (action === 'reopen') return 'Payment moved back to pending.';

  if (result.delivery === 'delivered') return 'Token email sent.';
  return 'The token email could not be delivered. Check the email settings, or share the token with the user manually.';
}
