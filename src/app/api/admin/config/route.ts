/**
 * Admin Configuration API
 * Allows admins to toggle token requirement for book generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getAuthConfigApp, setTokenRequiredApp } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const config = getAuthConfigApp();
    return NextResponse.json({ config });
  } catch (err: any) {
    console.error('Admin config GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch config' },
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
    const { tokenRequired } = body;

    if (typeof tokenRequired !== 'boolean') {
      return NextResponse.json(
        { error: 'tokenRequired must be a boolean' },
        { status: 400 }
      );
    }

    setTokenRequiredApp(tokenRequired);

    return NextResponse.json({
      success: true,
      config: getAuthConfigApp(),
    });
  } catch (err: any) {
    console.error('Admin config PATCH error:', err);
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}