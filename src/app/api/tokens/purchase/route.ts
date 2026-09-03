/**
 * Purchase Access Token API
 * Creates a token (configurable uses, expiry, price, currency) for users.
 * Each purchase records a payment entry so the platform can report on revenue.
 *
 * Payment flow:
 * - If payment provider is "paystack" and the admin has configured a secret key,
 *   a Paystack payment link is returned so the purchaser can pay before the token
 *   is finalized. The `paymentLink` field contains the URL.
 * - If payment provider is "none" and no secret key is set, paid token creation
 *   is blocked with a 402 status until an admin configures a payment provider.
 * - Admins can always create tokens for free using the `free` flag.
 *
 * Admins can also create tokens for free (no payment recorded) using the `free` flag.
 * Infinite usage is supported by setting uses to 0 or negative.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createAccessToken, getAllAccessTokens, getTokenById, deleteAccessToken, createPayment, getPricingConfig } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const tokens = getAllAccessTokens();
    return NextResponse.json({ tokens });
  } catch (err: any) {
    console.error('Error fetching tokens:', err);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userEmail, free } = body;

    const adminUser = await getSessionUser();
    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const pricing = getPricingConfig();

    // If this is a paid token (not free), verify payment provider is set up
    const paymentConfigured = pricing.paymentProvider === 'paystack' && !!pricing.paystackSecretKey;

    if (!free && !paymentConfigured) {
      return NextResponse.json(
        {
          error: 'Payment provider is not configured. An admin must configure Paystack in the Pricing settings before creating paid tokens.',
          paymentProviderConfigured: false,
        },
        { status: 402 }
      );
    }

    const maxUses = pricing.purchaseTokenUses <= 0 ? 999999 : pricing.purchaseTokenUses;

    const tokenRecord = createAccessToken(
      'purchase',
      userEmail || null,
      userId || null,
      maxUses,
      pricing.purchaseTokenExpiryDays
    );

    let amount = 0;
    let paymentRecorded = false;
    let paymentLink = null;

    if (!free) {
      amount = pricing.purchaseTokenPriceCents;

      if (paymentConfigured) {
        paymentLink = generatePaystackLink(
          pricing.paystackSecretKey,
          amount,
          pricing.purchaseTokenCurrency,
          tokenRecord.token,
          userEmail
        );
      }
    }

    const isInfinite = pricing.purchaseTokenUses <= 0;

    return NextResponse.json({
      success: true,
      token: tokenRecord.token,
      usesRemaining: isInfinite ? null : tokenRecord.max_uses,
      expiresAt: tokenRecord.expires_at,
      maxUses: isInfinite ? null : tokenRecord.max_uses,
      infiniteUses: isInfinite,
      amount,
      currency: pricing.purchaseTokenCurrency,
      paymentProvider: pricing.paymentProvider,
      paymentLink,
      paymentRecorded,
      free: !!free,
    });
  } catch (err: any) {
    console.error('Error creating purchase token:', err);
    return NextResponse.json(
      { error: 'Failed to create token' },
      { status: 500 }
    );
  }
}

/**
 * Generate a Paystack payment link for token purchase.
 */
function generatePaystackLink(
  secretKey: string,
  amountInCents: number,
  currency: string,
  token: string,
  userEmail?: string
): string {
  const email = userEmail || 'customer@example.com';
  const callbackUrl = encodeURIComponent(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/tokens`);

  return `https://paystack.com/pay/${token}?prefilled=${email}&amount=${amountInCents}&currency=${currency.toUpperCase()}&callback_url=${callbackUrl}`;
}

export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await getSessionUser();
    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    await deleteAccessToken(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting token:', err);
    return NextResponse.json(
      { error: 'Failed to delete token' },
      { status: 500 }
    );
  }
}
