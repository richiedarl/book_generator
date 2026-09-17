/**
 * Email content for token delivery.
 * Kept separate from the transport so the copy can be reviewed on its own.
 */

export interface TokenEmailInput {
  recipientName?: string | null;
  token: string;
  usesLabel: string;
  expiresLabel: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderTokenEmail(input: TokenEmailInput): RenderedEmail {
  const greeting = input.recipientName ? `Hello ${input.recipientName},` : 'Hello,';

  const text = [
    greeting,
    '',
    'Your payment has been confirmed. Here is your The Shelf access token:',
    '',
    input.token,
    '',
    `Generations: ${input.usesLabel}`,
    `Valid until: ${input.expiresLabel}`,
    '',
    'Enter this token in the Book Generator form under "Access Token" to start writing.',
    '',
    'Thank you for your purchase.',
    'The Shelf',
  ].join('\n');

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #2b2b26; line-height: 1.6; max-width: 560px;">
      <p>${escapeText(greeting)}</p>
      <p>Your payment has been confirmed. Here is your The Shelf access token:</p>
      <p style="margin: 20px 0;">
        <code style="display: inline-block; padding: 12px 16px; background: #f4f1e8; border: 1px solid #ddd6c4; border-radius: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; word-break: break-all;">
          ${escapeText(input.token)}
        </code>
      </p>
      <p style="margin: 4px 0;"><strong>Generations:</strong> ${escapeText(input.usesLabel)}</p>
      <p style="margin: 4px 0;"><strong>Valid until:</strong> ${escapeText(input.expiresLabel)}</p>
      <p style="margin-top: 20px;">Enter this token in the Book Generator form under &ldquo;Access Token&rdquo; to start writing.</p>
      <p style="margin-top: 20px; color: #6b6b60;">Thank you for your purchase.<br />The Shelf</p>
    </div>
  `.trim();

  return {
    subject: 'Your The Shelf access token',
    text,
    html,
  };
}

// Character codes for the four structural HTML characters. Building the
// replacements from char codes keeps this source file free of entity
// literals and makes the escaping unambiguous.
const AMPERSAND = String.fromCharCode(38);
const LESS_THAN = String.fromCharCode(60);
const GREATER_THAN = String.fromCharCode(62);
const DOUBLE_QUOTE = String.fromCharCode(34);

/**
 * Escape a value for interpolation into the email HTML template above.
 * Only the four structural characters are replaced, which is all the
 * static template above needs to stay well-formed.
 */
function escapeText(value: string): string {
  return value
    .split(AMPERSAND)
    .join(AMPERSAND + 'amp;')
    .split(LESS_THAN)
    .join(AMPERSAND + 'lt;')
    .split(GREATER_THAN)
    .join(AMPERSAND + 'gt;')
    .split(DOUBLE_QUOTE)
    .join(AMPERSAND + 'quot;');
}
