/**
 * Transactional email delivery for The Shelf.
 *
 * Two transports are supported, in priority order:
 *   1. SMTP   — SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS (+ SMTP_FROM)
 *   2. Resend — RESEND_API_KEY (HTTPS API, no SDK required)
 *
 * When neither is configured, delivery is reported as skipped rather than
 * throwing, so a missing mail setup can never break the payment workflow.
 * The caller records the reported status against the payment record.
 */

const DEFAULT_FROM = 'The Shelf <no-reply@theshelf.app>';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailResult {
  delivered: boolean;
  /** Which transport handled (or would have handled) the message. */
  provider: 'smtp' | 'resend' | 'none';
  skipped?: boolean;
  error?: string;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || DEFAULT_FROM;
}

/** True when at least one transport has usable credentials. */
export function isEmailConfigured(): boolean {
  const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_PORT);
  const resendConfigured = !!process.env.RESEND_API_KEY;
  return smtpConfigured || resendConfigured;
}

/**
 * Send a message through the first configured transport.
 * Never throws — failures come back as a non-delivered result.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return sendViaSmtp(message);
  }

  if (process.env.RESEND_API_KEY) {
    return sendViaResend(message);
  }

  return {
    delivered: false,
    provider: 'none',
    skipped: true,
    error:
      'No email transport configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS or RESEND_API_KEY.',
  };
}

/** SMTP transport backed by nodemailer. */
async function sendViaSmtp(message: EmailMessage): Promise<EmailResult> {
  try {
    // Indirect specifier keeps this optional dependency out of the type graph.
    const moduleName = 'nodemailer';
    const nodemailer = require(moduleName);

    const port = Number(process.env.SMTP_PORT);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });

    await transporter.sendMail({
      from: getFromAddress(),
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return { delivered: true, provider: 'smtp' };
  } catch (err: any) {
    return {
      delivered: false,
      provider: 'smtp',
      error: err?.message || 'SMTP delivery failed',
    };
  }
}

/** Resend HTTPS transport — plain fetch, no SDK. */
async function sendViaResend(message: EmailMessage): Promise<EmailResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: getFromAddress(),
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        delivered: false,
        provider: 'resend',
        error: `Resend rejected the message (${response.status}): ${body.slice(0, 200)}`,
      };
    }

    return { delivered: true, provider: 'resend' };
  } catch (err: any) {
    return {
      delivered: false,
      provider: 'resend',
      error: err?.message || 'Resend delivery failed',
    };
  }
}
