/**
 * Manual payment submissions.
 *
 * POST — the user has made a bank transfer and submits their reference.
 *        Creates a `pending` record for an administrator to verify.
 * GET  — the user checks the status of their own submissions. Once a payment
 *        is confirmed the issued token is included so the user can copy it
 *        into the book form even if email delivery is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  createPendingManualPayment,
  getManualPaymentConfig,
  getPaymentsForUser,
  getTokenById,
  hasPendingPayment,
  Payment,
} from '@/lib/db';

const MAX_REFERENCE_LENGTH = 120;
const MAX_NOTES_LENGTH = 1000;
const MAX_NAME_LENGTH = 120;

interface PaymentView {
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

function toPaymentView(payment: Payment): PaymentView {
  const tokenRecord = payment.token_id ? getTokenById(payment.token_id) : undefined;
  const tokenIssued = payment.status === 'completed' && tokenRecord;

  return {
    id: payment.id,
    payerName: payment.payer_name,
    reference: payment.reference,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    tokenDeliveryStatus: payment.token_delivery_status,
    createdAt: payment.created_at,
    confirmedAt: payment.confirmed_at,
    rejectedReason: payment.status === 'rejected' ? payment.notes : null,
    token: tokenIssued ? tokenRecord!.token : null,
  };
}

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Sign in to view your payment submissions.' },
        { status: 401 }
      );
    }

    const payments = getPaymentsForUser(user.id, user.email);
    return NextResponse.json({ payments: payments.map(toPaymentView) });
  } catch (err: any) {
    console.error('Manual payment GET error:', err);
    return NextResponse.json({ error: 'Failed to load your payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const payerName = typeof body.payerName === 'string' ? body.payerName.trim() : '';
    const sessionUser = await getSessionUser();

    if (!reference) {
      return NextResponse.json(
        { error: 'Enter the payment reference or transaction ID from your transfer.' },
        { status: 400 }
      );
    }

    if (!payerName || payerName.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Enter your name (up to ${MAX_NAME_LENGTH} characters).` },
        { status: 400 }
      );
    }

    if (reference.length > MAX_REFERENCE_LENGTH) {
      return NextResponse.json(
        { error: `The reference must be ${MAX_REFERENCE_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }

    if (notes.length > MAX_NOTES_LENGTH) {
      return NextResponse.json(
        { error: `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }

    const email = (sessionUser?.email || (typeof body.email === 'string' ? body.email.trim() : ''))
      .toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Enter the email address the token should be delivered to.' },
        { status: 400 }
      );
    }

    if (hasPendingPayment(email)) {
      return NextResponse.json(
        {
          error:
            'You already have a payment awaiting confirmation. We will email your token as soon as it is verified.',
          alreadyPending: true,
        },
        { status: 409 }
      );
    }

    const config = getManualPaymentConfig();
    const payment = createPendingManualPayment(
      sessionUser?.id ?? null,
      payerName,
      email,
      config.amount,
      config.currency,
      reference,
      notes || null
    );

    return NextResponse.json({
      success: true,
      payment: toPaymentView(payment),
      message:
        'Payment submitted. Your token will be emailed once an administrator confirms the transfer.',
    });
  } catch (err: any) {
    console.error('Manual payment POST error:', err);
    return NextResponse.json({ error: 'Failed to submit your payment' }, { status: 500 });
  }
}
