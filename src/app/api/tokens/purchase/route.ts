/**
 * Access tokens issued directly by an administrator.
 *
 * Paid users no longer purchase through a payment provider. They transfer to
 * the business account and submit a reference; an administrator confirms it,
 * which issues the token automatically. This endpoint exists for the admin
 * side of that workflow: granting tokens by hand and reviewing/revoking them.
 *
 * GET    — list every token (admin only)
 * POST   — grant a token (admin only)
 * DELETE — revoke a token (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  createAccessToken,
  deleteAccessToken,
  getAllAccessTokens,
  getPricingConfig,
} from '@/lib/db';

/** Tokens above this many uses are treated as unlimited by the token layer. */
const UNLIMITED_USES = 999999;

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ tokens: getAllAccessTokens() });
  } catch (err: any) {
    console.error('Error fetching tokens:', err);
    return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getSessionUser();

    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const userEmail = typeof body.userEmail === 'string' ? body.userEmail.trim() : '';
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const pricing = getPricingConfig();

    const maxUses = pricing.purchaseTokenUses <= 0 ? UNLIMITED_USES : pricing.purchaseTokenUses;

    const tokenRecord = createAccessToken(
      'purchase',
      userEmail || null,
      userId,
      maxUses,
      pricing.purchaseTokenExpiryDays
    );

    const isInfinite = maxUses >= UNLIMITED_USES;

    return NextResponse.json({
      success: true,
      token: tokenRecord.token,
      usesRemaining: isInfinite ? null : tokenRecord.max_uses,
      expiresAt: tokenRecord.expires_at,
      maxUses: isInfinite ? null : tokenRecord.max_uses,
      infiniteUses: isInfinite,
      issuedBy: adminUser.name,
    });
  } catch (err: any) {
    console.error('Error creating token:', err);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await getSessionUser();

    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Token ID is required' }, { status: 400 });
    }

    const deleted = deleteAccessToken(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting token:', err);
    return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 });
  }
}
