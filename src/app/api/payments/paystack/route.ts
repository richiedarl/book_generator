/**
 * Paystack Payment Initialization API
 * Creates a Paystack payment session for token purchases.
 * Admins must configure the Paystack secret key in the Pricing settings first.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getPricingConfig } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail } = body;

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'You must be logged in to purchase a token' },
        { status: 401 }
      );
    }

    const pricing = getPricingConfig();

    if (pricing.paymentProvider !== 'paystack' || !pricing.paystackSecretKey) {
      return NextResponse.json(
        { error: 'Payment provider is not configured. Please contact an administrator.' },
        { status: 402 }
      );
    }

    const email = userEmail || sessionUser.email || 'customer@example.com';

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pricing.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: pricing.purchaseTokenPriceCents,
        currency: pricing.purchaseTokenCurrency.toUpperCase(),
        email: email,
        callback_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/tokens`,
        metadata: {
          userId: sessionUser.id,
          tokenType: 'purchase',
          purpose: 'Token purchase',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to initialize payment' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentLink: data.data.authorization_url,
      reference: data.data.reference,
      amount: pricing.purchaseTokenPriceCents,
      currency: pricing.purchaseTokenCurrency,
    });
  } catch (err: any) {
    console.error('Paystack payment init error:', err);
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    );
  }
}

/**
 * Paystack Webhook — receives payment confirmation callbacks.
 * When a payment succeeds, this endpoint creates a purchase token for the user.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');
  const trxref = searchParams.get('trxref');

  if (!reference || !trxref || reference !== trxref) {
    return NextResponse.redirect('/');
  }

  // In a full implementation, verify the payment with Paystack and then
  // create a token + payment record. For now, redirect to admin tokens page.
  return NextResponse.redirect('/admin/tokens');
}
