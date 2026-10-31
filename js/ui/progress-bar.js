/**
 * ============================================================================
 * CLAY FIT — BARRA DE PROGRESSO
 * /js/ui/progress-bar.js
 * ============================================================================
 */

export function renderProgressBar({
  label = 'Consistência do ciclo',
  valueText = '3 de 4 sessões',
  progress = 75,
  tone = 'terracota' // 'terracota' | 'salvia'
} = {}) {
  const clamped = Math.max(0, Math.min(100, Number(progress)));
  const toneClass = tone === 'salvia' ? 'c-progress-bar--salvia' : '';

  return `
    <div
      class="c-progress-bar ${toneClass}"
      role="progressbar"
      aria-valuenow="${clamped}"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="${label}"
    >
      <div class="c-progress-bar__meta">
        <span style="font-weight: 600; color: var(--text-primary);">${label}</span>
        <span>${valueText}</span>
      </div>
      <div class="c-progress-bar__track">
        <div class="c-progress-bar__fill" style="width: ${clamped}%;"></div>
      </div>
    </div>
  `;
}
