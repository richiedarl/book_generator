/**
 * Admin Payments API.
 *
 * Returns every payment record with the fields an administrator needs to
 * verify manual bank transfers: the submitted reference, the status, who
 * confirmed it and when, the issued token, and the token delivery status.
 */

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getAllPayments } from '@/lib/db';
import { toAdminPaymentView } from '@/lib/payment-view';

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const payments = getAllPayments();

    const pending = payments.filter((payment) => payment.status === 'pending');
    const confirmed = payments.filter((payment) => payment.status === 'completed');
    const rejected = payments.filter((payment) => payment.status === 'rejected');

    const deliveredTokens = confirmed.filter(
      (payment) => payment.token_delivery_status === 'delivered'
    ).length;
    const undeliveredTokens = confirmed.filter(
      (payment) =>
        payment.token_delivery_status === 'failed' ||
        payment.token_delivery_status === 'manual' ||
        payment.token_delivery_status === 'pending_delivery'
    ).length;

    // Revenue is grouped by currency; amounts are stored in major units.
    const revenueByCurrency: Record<string, number> = {};
    for (const payment of confirmed) {
      revenueByCurrency[payment.currency] =
        (revenueByCurrency[payment.currency] ?? 0) + payment.amount;
    }

    return NextResponse.json({
      payments: payments.map(toAdminPaymentView),
      summary: {
        total: payments.length,
        pending: pending.length,
        confirmed: confirmed.length,
        rejected: rejected.length,
        deliveredTokens,
        undeliveredTokens,
        revenueByCurrency,
      },
    });
  } catch (err: any) {
    console.error('Admin payments GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
