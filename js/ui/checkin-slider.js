/**
 * ============================================================================
 * CLAY FIT — SLIDER DE CHECK-IN DIÁRIO COM 5 FACES EM SVG
 * /js/ui/checkin-slider.js
 * ============================================================================
 */

export const CHECKIN_LEVELS = [
  {
    level: 1,
    label: 'Exausto',
    desc: 'Corpo pedindo pausa ou mobilidade leve.',
    svg: `
      <svg viewBox="0 0 36 36" width="32" height="32" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill="var(--superficie-2)" stroke="currentColor" stroke-width="1.75"/>
        <path d="M11 15.5c1.2 1 2.8 1 4 0M21 15.5c1.2 1 2.8 1 4 0" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
        <path d="M13 24c1.6-2 8.4-2 10 0" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
      </svg>
    `
  },
  {
    level: 2,
    label: 'Lento',
    desc: 'Energia baixa, bom para ritmo constante e técnico.',
    svg: `
      <svg viewBox="0 0 36 36" width="32" height="32" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill="var(--superficie-2)" stroke="currentColor" stroke-width="1.75"/>
        <circle cx="13" cy="15" r="1.5" fill="currentColor"/>
        <circle cx="23" cy="15" r="1.5" fill="currentColor"/>
        <path d="M13.5 23.5c1.5-1 7.5-1 9 0" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
      </svg>
    `
  },
  {
    level: 3,
    label: 'Estável',
    desc: 'Pronto para cumprir a sessão planejada com fluidez.',
    svg: `
      <svg viewBox="0 0 36 36" width="32" height="32" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill="var(--salvia-suave)" stroke="currentColor" stroke-width="1.75"/>
        <circle cx="13" cy="15" r="1.6" fill="currentColor"/>
        <circle cx="23" cy="15" r="1.6" fill="currentColor"/>
        <path d="M13 22.5h10" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
      </svg>
    `
  },
  {
    level: 4,
    label: 'Forte',
    desc: 'Corpo desperto e articulado para subir cargas.',
    svg: `
      <svg viewBox="0 0 36 36" width="32" height="32" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill="var(--terracota-suave)" stroke="currentColor" stroke-width="1.75"/>
        <circle cx="13" cy="14.5" r="1.7" fill="currentColor"/>
        <circle cx="23" cy="14.5" r="1.7" fill="currentColor"/>
        <path d="M12.5 21.5c1.8 2.4 9.2 2.4 11 0" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
      </svg>
    `
  },
  {
    level: 5,
    label: 'No Pico',
    desc: 'Energia máxima! Dia perfeito para buscar recorde.',
    svg: `
      <svg viewBox="0 0 36 36" width="32" height="32" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill="var(--terracota)" stroke="currentColor" stroke-width="1.75"/>
        <path d="M11 14l2.5 2L16 14M20 14l2.5 2L25 14" stroke="var(--creme-fixo)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 21c2 3.5 10 3.5 12 0Z" fill="var(--creme-fixo)"/>
      </svg>
    `
  }
];

export function renderCheckinSlider({
  id = 'checkin-energia',
  value = 4,
  disabled = false
} = {}) {
  const current = CHECKIN_LEVELS.find((l) => l.level === Number(value)) || CHECKIN_LEVELS[3];

  const facesHtml = CHECKIN_LEVELS.map((item) => {
    const isActive = item.level === current.level;
    return `
      <button
        type="button"
        class="c-checkin__face-btn ${isActive ? 'is-active' : ''}"
        data-checkin-level="${item.level}"
        aria-label="Energia ${item.level} de 5: ${item.label}"
        aria-pressed="${isActive ? 'true' : 'false'}"
        ${disabled ? 'disabled' : ''}
      >
        ${item.svg}
        <span class="c-checkin__face-label">${item.label}</span>
      </button>
    `;
  }).join('');

  return `
    <div id="${id}" class="c-checkin ${disabled ? 'is-disabled' : ''}" data-checkin-widget>
      <div class="c-checkin__header">
        <div>
          <div class="t-caption" style="color: var(--text-muted);">Prontidão de hoje</div>
          <div class="t-h3" data-checkin-desc>${current.desc}</div>
        </div>
        <span class="c-checkin__status-badge" data-checkin-badge>
          ${current.level}/5 · ${current.label}
        </span>
      </div>
      <div class="c-checkin__faces" role="group" aria-label="Níveis de energia com 5 expressões">
        ${facesHtml}
      </div>
      <div class="c-checkin__track-wrap">
        <label for="${id}-range" class="sr-only">Deslize para ajustar sua energia de 1 a 5</label>
        <input
          id="${id}-range"
          type="range"
          min="1"
          max="5"
          step="1"
          value="${current.level}"
          class="c-checkin__range"
          data-checkin-range
          ${disabled ? 'disabled' : ''}
        />
      </div>
    </div>
  `;
}

export function bindCheckinSliders(root = document, onChange = null) {
  const widgets = root.querySelectorAll('[data-checkin-widget]');
  widgets.forEach((widget) => {
    if (widget.dataset.bound === 'true') return;
    widget.dataset.bound = 'true';

    const range = widget.querySelector('[data-checkin-range]');
    const faceBtns = widget.querySelectorAll('[data-checkin-level]');
    const badge = widget.querySelector('[data-checkin-badge]');
    const desc = widget.querySelector('[data-checkin-desc]');

    const updateUI = (newVal) => {
      const levelNum = Number(newVal);
      const info = CHECKIN_LEVELS.find((l) => l.level === levelNum) || CHECKIN_LEVELS[2];
      if (range && Number(range.value) !== levelNum) {
        range.value = String(levelNum);
      }
      faceBtns.forEach((btn) => {
        const active = Number(btn.dataset.checkinLevel) === levelNum;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
      if (badge) badge.textContent = `${info.level}/5 · ${info.label}`;
      if (desc) desc.textContent = info.desc;
      if (typeof onChange === 'function') {
        onChange(info);
      }
    };

    if (range) {
      range.addEventListener('input', (e) => updateUI(e.target.value));
    }
    faceBtns.forEach((btn) => {
      btn.addEventListener('click', () => updateUI(btn.dataset.checkinLevel));
    });
  });
}
