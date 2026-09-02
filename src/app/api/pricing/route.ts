/**
 * Public pricing configuration used by the purchase flow.
 */

import { NextResponse } from 'next/server';
import { getPricingConfig } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ pricing: getPricingConfig() });
}