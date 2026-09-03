/**
 * Admin Pricing API
 * Allows admins to view and update token pricing configuration, including
 * Paystack payment provider settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getPricingConfig, setPricingConfig } from '@/lib/db';

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const pricing = getPricingConfig();
    // Do not expose the secret key to the client
    return NextResponse.json({
      pricing: {
        ...pricing,
        paystackSecretKey: pricing.paystackSecretKey ? '••••••••' + pricing.paystackSecretKey.slice(-4) : '',
      },
    });
  } catch (err: any) {
    console.error('Admin pricing GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch pricing' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
  }

  const body = await request.json();
  const {
    purchaseTokenPriceCents,
    purchaseTokenCurrency,
    purchaseTokenUses,
    purchaseTokenExpiryDays,
    paystackSecretKey,
    paystackPublicKey,
    paystackWebhookSecret,
    paymentProvider,
  } = body;

  // Validate price
  if (purchaseTokenPriceCents !== undefined) {
    if (!Number.isInteger(purchaseTokenPriceCents) || purchaseTokenPriceCents < 0) {
      return NextResponse.json(
        { error: 'purchaseTokenPriceCents must be a non-negative integer' },
        { status: 400 }
      );
    }
  }

  // Validate currency
  if (purchaseTokenCurrency !== undefined) {
    if (!['ngn', 'usd'].includes(purchaseTokenCurrency)) {
      return NextResponse.json(
        { error: 'purchaseTokenCurrency must be ngn or usd' },
        { status: 400 }
      );
    }
  }

  // Validate uses
  if (purchaseTokenUses !== undefined) {
    // 0 or negative means infinite usage
    if (!Number.isInteger(purchaseTokenUses) || purchaseTokenUses < 0) {
      return NextResponse.json(
        { error: 'purchaseTokenUses must be 0 (unlimited) or a positive integer' },
        { status: 400 }
      );
    }
  }

  // Validate expiry
  if (purchaseTokenExpiryDays !== undefined) {
    if (!Number.isInteger(purchaseTokenExpiryDays) || purchaseTokenExpiryDays <= 0) {
      return NextResponse.json(
        { error: 'purchaseTokenExpiryDays must be a positive integer' },
        { status: 400 }
      );
    }
  }

  // Validate payment provider
  if (paymentProvider !== undefined) {
    if (!['paystack', 'none'].includes(paymentProvider)) {
      return NextResponse.json(
        { error: 'paymentProvider must be "paystack" or "none"' },
        { status: 400 }
      );
    }
  }

  setPricingConfig({
    purchaseTokenPriceCents,
    purchaseTokenCurrency,
    purchaseTokenUses,
    purchaseTokenExpiryDays,
    paystackSecretKey,
    paystackPublicKey,
    paystackWebhookSecret,
    paymentProvider,
  });

  const pricing = getPricingConfig();
    return NextResponse.json({
      success: true,
      pricing: {
        ...pricing,
        paystackSecretKey: pricing.paystackSecretKey ? '••••••••' + pricing.paystackSecretKey.slice(-4) : '',
      },
    });
  } catch (err: any) {
    console.error('Admin pricing PATCH error:', err);
    return NextResponse.json(
      { error: 'Failed to update pricing' },
      { status: 500 }
    );
  }
}