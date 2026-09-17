/**
 * Admin Pricing API.
 *
 * Controls what a token costs and how much it grants. The business account
 * that receives transfers is configured separately, under Payment Settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getPricingConfig, setPricingConfig } from '@/lib/db';

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ pricing: getPricingConfig() });
  } catch (err: any) {
    console.error('Admin pricing GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      purchaseTokenPriceCents,
      purchaseTokenCurrency,
      purchaseTokenUses,
      purchaseTokenExpiryDays,
    } = body;

    if (purchaseTokenPriceCents !== undefined) {
      if (!Number.isInteger(purchaseTokenPriceCents) || purchaseTokenPriceCents < 0) {
        return NextResponse.json(
          { error: 'purchaseTokenPriceCents must be a non-negative integer' },
          { status: 400 }
        );
      }
    }

    if (purchaseTokenCurrency !== undefined) {
      if (!['ngn', 'usd'].includes(purchaseTokenCurrency)) {
        return NextResponse.json(
          { error: 'purchaseTokenCurrency must be ngn or usd' },
          { status: 400 }
        );
      }
    }

    if (purchaseTokenUses !== undefined) {
      // Zero or negative means unlimited usage.
      if (!Number.isInteger(purchaseTokenUses)) {
        return NextResponse.json(
          { error: 'purchaseTokenUses must be an integer; 0 or negative means unlimited' },
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
      purchaseTokenCurrency,
      purchaseTokenUses,
      purchaseTokenExpiryDays,
    });

    return NextResponse.json({ success: true, pricing: getPricingConfig() });
  } catch (err: any) {
    console.error('Admin pricing PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update pricing' }, { status: 500 });
  }
}
