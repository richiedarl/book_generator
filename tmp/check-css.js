const fs = require('fs');
const css = fs.readFileSync('src/app/globals.css', 'utf8');
const names = [
  'admin-page', 'admin-header', 'admin-section', 'admin-message', 'section-help',
  'form-grid', 'form-group', 'form-hint', 'form-actions', 'btn-primary', 'btn-secondary',
  'data-table', 'table-container', 'role-badge', 'empty-state', 'stat-card', 'dashboard-cards',
  'config-display', 'config-row', 'section-actions', 'modal-overlay', 'modal', 'modal-actions',
  'btn-icon', 'token-result', 'btn-copy', 'modal-error', 'checkbox-group', 'admin-loading',
  'empty-text', 'dashboard-table', 'quick-card', 'status-badge', 'admin-sidebar', 'write-nav-item',
  'dashboard-section', 'quick-grid', 'dashboard-quick-links',
];
for (const name of names) {
  const pattern = new RegExp('\\.' + name.replace(/-/g, '\\-') + '(?![\\w-])');
  console.log((pattern.test(css) ? 'YES ' : 'no  ') + name);
}
