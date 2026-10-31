/**
 * ============================================================================
 * CLAY FIT — COMPONENTE TOGGLE (Interruptor tátil acessível)
 * /js/ui/toggle.js
 * ============================================================================
 */

export function renderToggle({
  id = '',
  label = 'Metrônomo e sinais sonoros',
  description = '',
  checked = true,
  disabled = false,
  settingKey = ''
} = {}) {
  return `
    <div class="c-toggle ${disabled ? 'is-disabled' : ''}">
      <div style="flex:1; padding-right: 12px;">
        <div style="font-weight: 600; color: var(--text-primary);">${label}</div>
        ${description ? `<div class="t-small" style="color: var(--text-secondary);">${description}</div>` : ''}
      </div>
      <button
        type="button"
        ${id ? `id="${id}"` : ''}
        role="switch"
        aria-checked="${checked ? 'true' : 'false'}"
        aria-label="${label}"
        class="c-toggle__btn ${checked ? 'is-on' : ''}"
        ${settingKey ? `data-toggle-key="${settingKey}"` : ''}
        ${disabled ? 'disabled aria-disabled="true"' : ''}
      >
        <span class="c-toggle__thumb" aria-hidden="true"></span>
      </button>
    </div>
  `;
}

export function bindToggles(root = document, onToggle = null) {
  const buttons = root.querySelectorAll('.c-toggle__btn');
  buttons.forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const next = btn.getAttribute('aria-checked') !== 'true';
      btn.setAttribute('aria-checked', String(next));
      btn.classList.toggle('is-on', next);
      if (typeof onToggle === 'function') {
        onToggle({
          key: btn.dataset.toggleKey || btn.id,
          checked: next
        });
      }
    });
  });
}
