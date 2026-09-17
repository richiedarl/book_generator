/**
 * Admin payment configuration.
 *
 * The business account users pay into is stored in the database so an
 * administrator can change the business name, account number, bank, amount
 * and instructions from the admin panel without a code change. Saving here
 * immediately changes what users see in the payment interface.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getManualPaymentConfig, setManualPaymentConfig } from '@/lib/db';

const MAX_TEXT_LENGTH = 400;

function validateText(value: unknown, field: string): string | null {
  if (typeof value !== 'string') return `${field} must be text.`;
  if (value.trim().length === 0) return `${field} cannot be empty.`;
  if (value.length > MAX_TEXT_LENGTH) {
    return `${field} must be ${MAX_TEXT_LENGTH} characters or fewer.`;
  }
  return null;
}

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ payment: getManualPaymentConfig() });
  } catch (err: any) {
    console.error('Admin payment config GET error:', err);
    return NextResponse.json({ error: 'Failed to load payment configuration' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();

    const textErrors = [
      validateText(body.businessName, 'Business name'),
      validateText(body.accountNumber, 'Account number'),
      validateText(body.bankName, 'Bank name'),
      validateText(body.providerName, 'Payment provider'),
      validateText(body.instructions, 'Payment instructions'),
    ].filter((message): message is string => message !== null);

    if (textErrors.length > 0) {
      return NextResponse.json({ error: textErrors[0] }, { status: 400 });
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a number greater than zero.' },
        { status: 400 }
      );
    }

    if (body.currency !== 'ngn' && body.currency !== 'usd') {
      return NextResponse.json({ error: 'Currency must be ngn or usd.' }, { status: 400 });
    }

    setManualPaymentConfig({
      businessName: body.businessName.trim(),
      accountNumber: body.accountNumber.trim(),
      bankName: body.bankName.trim(),
      providerName: body.providerName.trim(),
      instructions: body.instructions.trim(),
      amount,
      currency: body.currency,
    });

    return NextResponse.json({ success: true, payment: getManualPaymentConfig() });
  } catch (err: any) {
    console.error('Admin payment config PATCH error:', err);
    return NextResponse.json({ error: 'Failed to save payment configuration' }, { status: 500 });
  }
}
