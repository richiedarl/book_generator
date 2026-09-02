/**
 * Purchase Access Token API
 * Creates a paid token (configurable uses, expiry, price) for users.
 * Each purchase records a payment entry so the platform can report on revenue.
 * Admins can also create tokens for free (no payment recorded) using the `free` flag.
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

    // Return all tokens for admin review
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

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'You must be logged in to purchase a token' },
        { status: 401 }
      );
    }

    const isAdmin = sessionUser.isAdmin;
    const purchaserId = isAdmin ? (userId || null) : sessionUser.id;
    const purchaserEmail = isAdmin ? (userEmail || null) : sessionUser.email;

    // Get current pricing config
    const pricing = getPricingConfig();

    // Create a purchase token
    const tokenRecord = createAccessToken(
      'purchase',
      purchaserEmail,
      purchaserId,
      pricing.purchaseTokenUses,
      pricing.purchaseTokenExpiryDays
    );

    let amount = 0;
    let paymentRecorded = false;

    // If not free, record the payment
    if (!free || !isAdmin) {
      amount = pricing.purchaseTokenPriceCents;
      createPayment(
        tokenRecord.id,
        purchaserId,
        purchaserEmail,
        amount,
        'usd',
        'simulated',
        null
      );
      paymentRecorded = true;
    }

    return NextResponse.json({
      success: true,
      token: tokenRecord.token,
      usesRemaining: tokenRecord.max_uses,
      expiresAt: tokenRecord.expires_at,
      maxUses: tokenRecord.max_uses,
      amount,
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