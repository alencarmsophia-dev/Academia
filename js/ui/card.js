/**
 * ============================================================================
 * CLAY FIT — COMPONENTE CARTÃO (Padrão e Destaque com cantos orgânicos)
 * /js/ui/card.js
 * ============================================================================
 */

export function renderCard({
  id = '',
  variant = 'default', // 'default' | 'featured'
  interactive = false,
  state = 'normal',
  eyebrow = '',
  title = '',
  bodyHtml = '',
  footerHtml = '',
  staggerIndex = null
} = {}) {
  const variantClass = variant === 'featured' ? 'c-card--featured' : '';
  const interactiveClass = interactive ? 'c-card--interactive' : '';
  const stateClass =
    state === 'pressed'
      ? 'is-pressed'
      : state === 'disabled'
      ? 'is-disabled'
      : '';
  const staggerAttr =
    staggerIndex !== null
      ? `style="--stagger-index: ${staggerIndex};"`
      : '';
  const staggerClass = staggerIndex !== null ? 'stagger-item' : '';

  return `
    <article
      ${id ? `id="${id}"` : ''}
      class="c-card ${variantClass} ${interactiveClass} ${stateClass} ${staggerClass}"
      ${interactive ? 'tabindex="0" role="button"' : ''}
      ${staggerAttr}
    >
      ${eyebrow ? `<div class="t-caption" style="color: var(--terracota); margin-bottom: 6px;">${eyebrow}</div>` : ''}
      ${title ? `<h3 class="t-h2" style="margin-bottom: 10px;">${title}</h3>` : ''}
      ${bodyHtml ? `<div class="c-card__body">${bodyHtml}</div>` : ''}
      ${footerHtml ? `<div class="c-card__footer" style="margin-top: 20px;">${footerHtml}</div>` : ''}
    </article>
  `;
}
