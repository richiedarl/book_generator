/**
 * Get Current User Session
 * Returns the authenticated user's info
 */

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        accessToken: user.accessToken,
      },
    });
  } catch (err: any) {
    console.error('Session error:', err);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}