/**
 * Public payment configuration.
 *
 * The business account users must pay into is stored in the database, so an
 * administrator can change it from the admin panel and the payment interface
 * reflects the change immediately. Nothing here is hardcoded in the frontend.
 */

import { NextResponse } from 'next/server';
import { getManualPaymentConfig, getPricingConfig } from '@/lib/db';
import { isEmailConfigured } from '@/lib/email';

export async function GET() {
  const account = getManualPaymentConfig();
  const pricing = getPricingConfig();

  return NextResponse.json({
    payment: {
      businessName: account.businessName,
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      providerName: account.providerName,
      instructions: account.instructions,
      amount: account.amount,
      currency: account.currency,
      // What the payment buys, so the user knows what they are paying for.
      tokenUses: pricing.purchaseTokenUses,
      tokenExpiryDays: pricing.purchaseTokenExpiryDays,
      // Surfaced so the UI can tell the user whether the token arrives by email.
      emailDeliveryEnabled: isEmailConfigured(),
    },
  });
}
