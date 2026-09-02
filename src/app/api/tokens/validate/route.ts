/**
 * Token Usage Validation API
 * Validates a token and returns remaining uses before consuming it.
 * This is used by the client to check if a token is valid before generating.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, validateAccessToken as validateDbToken } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || !token.trim()) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Validate the token
    const result = validateDbToken(token);

    if (!result.valid || !result.token) {
      return NextResponse.json({
        valid: false,
        error: result.error || 'Invalid token',
      }, { status: 401 });
    }

    const tokenRecord = result.token;
    const usesRemaining = tokenRecord.max_uses - tokenRecord.used_count;

    return NextResponse.json({
      valid: true,
      isEmailToken: tokenRecord.type === 'email',
      usesRemaining,
      maxUses: tokenRecord.max_uses,
      expiresAt: tokenRecord.expires_at,
    });
  } catch (err: any) {
    console.error('Token validation error:', err);
    return NextResponse.json(
      { error: 'Token validation failed' },
      { status: 500 }
    );
  }
}
