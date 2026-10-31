/**
 * ============================================================================
 * CLAY FIT — ANEL DE PROGRESSO ANIMADO (Progress Ring)
 * /js/ui/progress-ring.js
 * ============================================================================
 */

export function renderProgressRing({
  size = 136,
  stroke = 12,
  progress = 68, // 0..100
  label = '68%',
  sublabel = 'Meta semanal'
} = {}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number(progress)));
  const offset = circumference - (clamped / 100) * circumference;

  return `
    <div
      class="c-progress-ring"
      style="width: ${size}px; height: ${size}px;"
      role="progressbar"
      aria-valuenow="${clamped}"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="${sublabel}: ${clamped}%"
    >
      <svg class="c-progress-ring__svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle
          class="c-progress-ring__track"
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          stroke-width="${stroke}"
        />
        <circle
          class="c-progress-ring__fill"
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          stroke-width="${stroke}"
          stroke-dasharray="${circumference.toFixed(2)}"
          stroke-dashoffset="${offset.toFixed(2)}"
          data-ring-circumference="${circumference.toFixed(2)}"
        />
      </svg>
      <div class="c-progress-ring__center">
        <span class="t-h2" style="font-variant-numeric: tabular-nums;">${label}</span>
        ${sublabel ? `<span class="t-caption" style="color: var(--text-muted); font-size: 10px;">${sublabel}</span>` : ''}
      </div>
    </div>
  `;
}
