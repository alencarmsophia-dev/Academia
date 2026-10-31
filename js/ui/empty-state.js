/**
 * ============================================================================
 * CLAY FIT — COMPONENTE DE ESTADO VAZIO COM ILUSTRAÇÃO EDITORIAL INTERATIVA
 * /js/ui/empty-state.js
 * ============================================================================
 */

import { getEmptyStateIllustration } from './illustrations.js';
import { renderButton } from './button.js';

export function renderEmptyState({
  variant = 'hoje', // 'hoje' | 'biblioteca' | 'comecar' | 'evolucao' | 'perfil'
  eyebrow = 'CADERNO EM BRANCO',
  title = 'Seu dia começa no primeiro toque',
  description = 'Calibre sua energia ou toque em Começar para abrir sua primeira sessão.',
  primaryAction = null, // { label, action, icon, variant }
  secondaryAction = null,
  staggerIndex = 1
} = {}) {
  const primaryBtn = primaryAction
    ? renderButton({
        label: primaryAction.label,
        variant: primaryAction.variant || 'primary',
        icon: primaryAction.icon || null,
        action: primaryAction.action || ''
      })
    : '';

  const secondaryBtn = secondaryAction
    ? renderButton({
        label: secondaryAction.label,
        variant: secondaryAction.variant || 'secondary',
        icon: secondaryAction.icon || null,
        action: secondaryAction.action || ''
      })
    : '';

  return `
    <section class="c-empty-state stagger-item" style="--stagger-index: ${staggerIndex};">
      <div
        class="c-empty-state__art"
        data-interactive-art
        tabindex="0"
        role="button"
        aria-label="Toque para animar a escultura de argila"
      >
        ${getEmptyStateIllustration(variant)}
      </div>
      <div class="t-caption c-empty-state__eyebrow">${eyebrow}</div>
      <h2 class="t-h1 c-empty-state__title">${title}</h2>
      <p class="t-body c-empty-state__desc">${description}</p>
      <div class="c-empty-state__actions">
        ${primaryBtn}
        ${secondaryBtn}
      </div>
    </section>
  `;
}

export function bindInteractiveIllustrations(root = document) {
  const arts = root.querySelectorAll('[data-interactive-art]');
  arts.forEach((art) => {
    if (art.dataset.bound === 'true') return;
    art.dataset.bound = 'true';
    const pulse = () => {
      art.classList.add('is-touched');
      setTimeout(() => art.classList.remove('is-touched'), 520);
    };
    art.addEventListener('click', pulse);
    art.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pulse();
      }
    });
  });
}
