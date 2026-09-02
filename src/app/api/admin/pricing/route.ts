/**
 * Admin Pricing API
 * Allows admins to view and update token pricing configuration.
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
    return NextResponse.json({ pricing });
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
    const { purchaseTokenPriceCents, purchaseTokenUses, purchaseTokenExpiryDays } = body;

    // Validate input
    if (purchaseTokenPriceCents !== undefined) {
      if (!Number.isInteger(purchaseTokenPriceCents) || purchaseTokenPriceCents < 0) {
        return NextResponse.json(
          { error: 'purchaseTokenPriceCents must be a non-negative integer' },
          { status: 400 }
        );
      }
    }
    if (purchaseTokenUses !== undefined) {
      if (!Number.isInteger(purchaseTokenUses) || purchaseTokenUses <= 0) {
        return NextResponse.json(
          { error: 'purchaseTokenUses must be a positive integer' },
          { status: 400 }
        );
      }
    }
    if (purchaseTokenExpiryDays !== undefined) {
      if (!Number.isInteger(purchaseTokenExpiryDays) || purchaseTokenExpiryDays <= 0) {
        return NextResponse.json(
          { error: 'purchaseTokenExpiryDays must be a positive integer' },
          { status: 400 }
        );
      }
    }

    setPricingConfig({
      purchaseTokenPriceCents,
      purchaseTokenUses,
      purchaseTokenExpiryDays,
    });

    const pricing = getPricingConfig();
    return NextResponse.json({
      success: true,
      pricing,
    });
  } catch (err: any) {
    console.error('Admin pricing PATCH error:', err);
    return NextResponse.json(
      { error: 'Failed to update pricing' },
      { status: 500 }
    );
  }
}