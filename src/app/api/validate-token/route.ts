/**
 * Access Token Validation API
 * Validates access tokens for book generation when token requirement is enabled
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAccessToken, isTokenRequired } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    // Check if token is required
    const tokenRequired = isTokenRequired();

    if (!tokenRequired) {
      return NextResponse.json({
        valid: true,
        tokenRequired: false,
        message: 'Token not required',
      });
    }

    if (!token) {
      return NextResponse.json({
        valid: false,
        tokenRequired: true,
        error: 'Access token is required',
      }, { status: 401 });
    }

    const user = validateAccessToken(token);
    if (!user) {
      // Check the new usage-based token table
      const { validateAccessToken: validateUsageToken } = require('@/lib/auth');
      const usageResult = validateUsageToken(token);
      if (!usageResult.success || !usageResult.token) {
        return NextResponse.json({
          valid: false,
          tokenRequired: true,
          error: 'Invalid access token',
        }, { status: 401 });
      }

      return NextResponse.json({
        valid: true,
        tokenRequired: true,
        isEmailToken: usageResult.token?.type === 'email',
        usesRemaining: usageResult.usesRemaining,
      });
    }

    return NextResponse.json({
      valid: true,
      tokenRequired: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err: any) {
    console.error('Token validation error:', err);
    return NextResponse.json(
      { error: 'Token validation failed' },
      { status: 500 }
    );
  }
}