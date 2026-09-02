/**
 * Public application configuration needed by the book form.
 */

import { NextResponse } from 'next/server';
import { getAuthConfigApp } from '@/lib/auth';

export async function GET() {
  return NextResponse.json({
    config: {
      tokenRequired: getAuthConfigApp().tokenRequired,
    },
  });
}