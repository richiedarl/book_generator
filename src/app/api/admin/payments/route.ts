/**
 * Admin Payments API
 * Lists payment records so admins can review revenue from token purchases.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getAllPayments, getAllAccessTokens } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tokenIdFilter = searchParams.get('tokenId');

    let payments = getAllPayments();

    if (tokenIdFilter) {
      payments = payments.filter(p => p.token_id === tokenIdFilter);
    }

    // Enrich payments with token details (type, email, user name)
    const tokens = getAllAccessTokens();
    const tokenMap = new Map(tokens.map(t => [t.id, t]));

    const enriched = payments.map(p => {
      const token = tokenMap.get(p.token_id);
      return {
        id: p.id,
        token: p.token_id ? tokenMap.get(p.token_id)?.token?.substring(0, 20) + '...' : null,
        tokenType: token?.type ?? null,
        userEmail: p.email ?? token?.email ?? null,
        userId: p.user_id ?? token?.user_id ?? null,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        providerPaymentId: p.provider_payment_id,
        createdAt: p.created_at,
      };
    });

    const totalRevenue = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      payments: enriched,
      totalRevenue,
      paymentCount: payments.length,
    });
  } catch (err: any) {
    console.error('Admin payments GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
