/**
 * Email Access Token API
 * Generates a single-use token sent via email for users who don't have a purchased token.
 * Each email can only be used once to request an email-generated token.
 * Each email-generated token is single-use.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkEmailUsed, createAccessToken, getAllAccessTokens, deleteAccessToken } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// Number of uses for email tokens — always 1 (single-use)
const EMAIL_TOKEN_USES = 1;

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getSessionUser();
    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const tokens = getAllAccessTokens();
    // Filter to just email tokens
    const emailTokens = tokens.filter(t => t.type === 'email');
    return NextResponse.json({ tokens: emailTokens });
  } catch (err: any) {
    console.error('Error fetching email tokens:', err);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if this email has already been used to get a token
    if (checkEmailUsed(normalizedEmail)) {
      return NextResponse.json(
        { error: 'This email has already been used to request a token. Each email can only be used once.' },
        { status: 409 }
      );
    }

    // Check if user is logged in — if so, associate the token with their account
    let userId = null;
    try {
      const user = await getSessionUser();
      if (user) {
        userId = user.id;
      }
    } catch {
      // Not logged in — that's fine, token will be email-based
    }

    // Create a single-use email token
    const tokenRecord = createAccessToken(
      'email',
      normalizedEmail,
      userId,
      EMAIL_TOKEN_USES, // 1 use only
      null // no expiry — but it's single-use so effectively expires after first use
    );

    // In a real app, send the token via email here.
    // For this project, we return it directly (user enters email, gets token immediately).
    // In production, you'd send it via SMTP/email service.

    return NextResponse.json({
      success: true,
      token: tokenRecord.token,
      type: 'email',
      message: 'Token has been generated for your email. It can be used once.',
    });
  } catch (err: any) {
    console.error('Error creating email token:', err);
    return NextResponse.json(
      { error: 'Failed to create token' },
      { status: 500 }
    );
  }
}
