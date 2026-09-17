const fs = require('fs');
const lines = fs.readFileSync('src/app/globals.css', 'utf8').split(/\r?\n/);

const names = [
  'btn-ghost', 'btn-remove', 'custom-category-input', 'other-option',
  'token-required-section', 'token-prompt', 'token-field', 'token-modal',
  'modal-header', 'modal-close', 'token-option', 'token-option-title', 'token-divider',
  'token-purchase-form', 'token-info', 'token-email-form', 'email-input',
  'final-notes-field', 'attachments-area', 'attachments-list', 'attachment-item',
  'attachment-info', 'attachment-icon', 'attachment-size', 'hidden', 'row',
  'error-box', 'error-message', 'choice-grid', 'form-container', 'btn-primary',
];

for (const name of names) {
  const hits = lines
    .map((line, index) => ({ line: line.trim(), index: index + 1 }))
    .filter((entry) => entry.line.includes(name))
    .slice(0, 2);
  const rendered = hits.length === 0
    ? 'NOT FOUND'
    : hits.map((hit) => `${hit.index}:${hit.line.slice(0, 70)}`).join(' | ');
  console.log(`${name} -> ${rendered}`);
}
