/**
 * ============================================================================
 * CLAY FIT — COMPONENTE CONTADOR +/- (Stepper sem digitação)
 * /js/ui/stepper.js
 * ============================================================================
 */

import { getIconSvg } from './illustrations.js';

export function renderStepper({
  id = 'stepper-carga',
  value = 24,
  min = 0,
  max = 300,
  step = 2,
  unit = 'kg',
  label = 'Carga alvo',
  disabled = false
} = {}) {
  return `
    <div
      id="${id}"
      class="c-stepper"
      data-stepper
      data-value="${value}"
      data-min="${min}"
      data-max="${max}"
      data-step="${step}"
      aria-label="${label}"
    >
      <button
        type="button"
        class="c-stepper__btn"
        data-stepper-dir="-1"
        aria-label="Diminuir ${label}"
        ${disabled || value <= min ? 'disabled' : ''}
      >
        ${getIconSvg('menos', 20)}
      </button>
      <div class="c-stepper__display" aria-live="polite">
        <span class="c-stepper__value" data-stepper-val>${value}</span>
        <span class="c-stepper__unit">${unit}</span>
      </div>
      <button
        type="button"
        class="c-stepper__btn"
        data-stepper-dir="1"
        aria-label="Aumentar ${label}"
        ${disabled || value >= max ? 'disabled' : ''}
      >
        ${getIconSvg('mais', 20)}
      </button>
    </div>
  `;
}

export function bindSteppers(root = document, onChange = null) {
  const steppers = root.querySelectorAll('[data-stepper]');
  steppers.forEach((el) => {
    if (el.dataset.bound === 'true') return;
    el.dataset.bound = 'true';

    const valNode = el.querySelector('[data-stepper-val]');
    const decBtn = el.querySelector('[data-stepper-dir="-1"]');
    const incBtn = el.querySelector('[data-stepper-dir="1"]');

    const update = (dir) => {
      const min = Number(el.dataset.min ?? 0);
      const max = Number(el.dataset.max ?? 999);
      const step = Number(el.dataset.step ?? 1);
      const current = Number(el.dataset.value ?? 0);
      const next = Math.max(min, Math.min(max, Number((current + dir * step).toFixed(1))));
      el.dataset.value = String(next);
      if (valNode) valNode.textContent = String(next);
      if (decBtn) decBtn.disabled = next <= min;
      if (incBtn) incBtn.disabled = next >= max;
      if (typeof onChange === 'function') {
        onChange({ id: el.id, value: next });
      }
    };

    if (decBtn) decBtn.addEventListener('click', () => update(-1));
    if (incBtn) incBtn.addEventListener('click', () => update(1));
  });
}
