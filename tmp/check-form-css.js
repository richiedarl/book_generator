const fs = require('fs');
const css = fs.readFileSync('src/app/globals.css', 'utf8');

const groups = {
  form: [
    'form-container', 'progress-row', 'progress-label', 'progress-track', 'progress-fill',
    'eyebrow', 'hero-heading', 'step-sub', 'error', 'step', 'field', 'hint', 'grid-2',
    'choice-grid', 'choice-card', 'name', 'desc', 'nav-row',
    'btn', 'btn-primary', 'btn-secondary', 'btn-ghost', 'btn-remove',
    'category-selector', 'category-input-wrapper', 'custom-category-input', 'category-dropdown',
    'category-list', 'category-option', 'category-option-name', 'category-option-description',
    'category-empty', 'other-option', 'selected',
    'token-required-section', 'token-prompt', 'token-prompt-text', 'token-field',
    'modal-overlay', 'token-modal', 'modal-header', 'modal-close',
    'token-option', 'token-option-content', 'token-option-title', 'token-option-desc',
    'token-divider', 'token-purchase-form', 'token-info', 'token-result', 'token-display',
    'token-email-form', 'email-input',
    'review-grid', 'review-section', 'review-notes', 'final-notes-field',
    'attachments-area', 'attachments-list', 'attachment-item', 'attachment-info',
    'attachment-icon', 'attachment-size', 'hidden', 'row', 'error-box', 'error-message',
  ],
  desk: [
    'writing-desk', 'writing-desk-header', 'writing-desk-kicker', 'writing-desk-messages',
    'writing-desk-empty', 'desk-message', 'writing-desk-form', 'chat-launcher',
    'chat-invitation', 'chat-invitation-bubble', 'chat-invitation-icon',
    'chat-invitation-arrow', 'chat-pulse-light',
  ],
};

for (const [groupName, names] of Object.entries(groups)) {
  const missing = [];
  for (const name of names) {
    const pattern = new RegExp('\\.' + name.replace(/-/g, '\\-') + '(?![\\w-])');
    if (!pattern.test(css)) missing.push(name);
  }
  console.log(`--- ${groupName}: ${missing.length === 0 ? 'all present' : 'MISSING -> ' + missing.join(', ')}`);
}
