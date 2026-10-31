/**
 * ============================================================================
 * CLAY FIT — CARTÃO DE ESCOLHA (Choice Card — Seção 6)
 * /js/ui/choice-card.js
 * Suporta escolha única (role="radio") e múltipla (role="checkbox"),
 * animação de "squish" (1 -> .98 -> 1.01 -> 1 em 360ms) e check desenhado.
 * ============================================================================
 */

import { getIconSvg } from './illustrations.js';
import { vibrate } from '../motion.js';

export function renderChoiceCard({
  id = '',
  title = 'Mais força e músculo',
  subtitle = 'Treino de academia com carga progressiva',
  icon = 'haltere',
  value = 'Mais força e músculo',
  group = 'objetivo',
  multiple = false,
  selected = false,
  state = 'normal'
} = {}) {
  const isDisabled = state === 'disabled';
  const role = multiple ? 'checkbox' : 'radio';
  const stateClass =
    state === 'hover'
      ? 'is-hover'
      : state === 'focused'
      ? 'is-focused'
      : state === 'pressed'
      ? 'is-pressed'
      : state === 'disabled'
      ? 'is-disabled'
      : '';

  return `
    <button
      type="button"
      ${id ? `id="${id}"` : ''}
      role="${role}"
      aria-checked="${selected ? 'true' : 'false'}"
      class="c-choice-card ${selected ? 'is-selected' : ''} ${stateClass}"
      data-choice-group="${group}"
      data-choice-value="${value}"
      data-choice-multiple="${multiple ? 'true' : 'false'}"
      ${isDisabled ? 'disabled aria-disabled="true"' : ''}
    >
      <span class="c-choice-card__icon" aria-hidden="true">
        ${getIconSvg(icon, 22)}
      </span>
      <span class="c-choice-card__content">
        <span class="c-choice-card__title" style="display:block;">${title}</span>
        ${subtitle ? `<span class="c-choice-card__subtitle" style="display:block;">${subtitle}</span>` : ''}
      </span>
      <span class="c-choice-card__check" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12.5 10 17l9-10"/>
        </svg>
      </span>
    </button>
  `;
}

export function bindChoiceCards(root = document, onChange = null) {
  const cards = root.querySelectorAll('.c-choice-card[data-choice-group]');
  cards.forEach((card) => {
    if (card.dataset.bound === 'true') return;
    card.dataset.bound = 'true';

    card.addEventListener('click', () => {
      if (card.disabled) return;
      vibrate('selecao');

      const group = card.dataset.choiceGroup;
      const isMulti = card.dataset.choiceMultiple === 'true';
      const val = card.dataset.choiceValue;
      const peers = Array.from(
        root.querySelectorAll(`.c-choice-card[data-choice-group="${group}"]`)
      );

      // Dispara squish 360ms
      card.classList.remove('is-squishing');
      void card.offsetWidth;
      card.classList.add('is-squishing');

      if (!isMulti) {
        peers.forEach((peer) => {
          const isTarget = peer === card;
          peer.classList.toggle('is-selected', isTarget);
          peer.setAttribute('aria-checked', String(isTarget));
        });
        if (typeof onChange === 'function') {
          onChange({ group, value: val, values: [val], card, peers });
        }
      } else {
        // Regra exclusiva de F7: "Nenhum" desmarca os outros e vice-versa
        if (val === 'Nenhum') {
          peers.forEach((peer) => {
            const isNenhum = peer.dataset.choiceValue === 'Nenhum';
            peer.classList.toggle('is-selected', isNenhum);
            peer.setAttribute('aria-checked', String(isNenhum));
          });
        } else {
          const nenhumCard = peers.find((p) => p.dataset.choiceValue === 'Nenhum');
          if (nenhumCard) {
            nenhumCard.classList.remove('is-selected');
            nenhumCard.setAttribute('aria-checked', 'false');
          }
          const next = card.getAttribute('aria-checked') !== 'true';
          card.classList.toggle('is-selected', next);
          card.setAttribute('aria-checked', String(next));
        }

        const selectedValues = peers
          .filter((p) => p.getAttribute('aria-checked') === 'true')
          .map((p) => p.dataset.choiceValue);

        if (typeof onChange === 'function') {
          onChange({ group, value: val, values: selectedValues, card, peers });
        }
      }
    });
  });
}
