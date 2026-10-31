/**
 * ============================================================================
 * CLAY FIT — COMPONENTE BOTÃO
 * /js/ui/button.js
 * Variantes: primary, secondary, ghost, giant
 * Estados: normal, hover, focused, pressed, disabled, loading
 * ============================================================================
 */

import { getIconSvg } from './illustrations.js';

export function renderButton({
  id = '',
  label = 'Continuar',
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'giant'
  icon = null,
  state = 'normal', // 'normal' | 'hover' | 'focused' | 'pressed' | 'disabled' | 'loading'
  type = 'button',
  action = '',
  ariaLabel = ''
} = {}) {
  const isDisabled = state === 'disabled';
  const isLoading = state === 'loading';
  const stateClass =
    state === 'hover'
      ? 'is-hover'
      : state === 'focused'
      ? 'is-focused'
      : state === 'pressed'
      ? 'is-pressed'
      : state === 'disabled'
      ? 'is-disabled'
      : state === 'loading'
      ? 'is-loading'
      : '';

  const iconMarkup = icon ? `<span class="c-btn__icon">${getIconSvg(icon, 20)}</span>` : '';
  const spinnerMarkup = isLoading ? `<span class="c-btn__spinner" aria-hidden="true"></span>` : '';

  return `
    <button
      ${id ? `id="${id}"` : ''}
      type="${type}"
      class="c-btn c-btn--${variant} ${stateClass}"
      ${isDisabled ? 'disabled aria-disabled="true"' : ''}
      ${isLoading ? 'aria-busy="true"' : ''}
      ${action ? `data-action="${action}"` : ''}
      ${ariaLabel ? `aria-label="${ariaLabel}"` : ''}
    >
      ${spinnerMarkup}
      <span class="c-btn__label" style="display:inline-flex;align-items:center;gap:10px;">
        ${iconMarkup}
        <span>${label}</span>
      </span>
    </button>
  `;
}
