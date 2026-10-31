/**
 * ============================================================================
 * CLAY FIT — COMPONENTE ESQUELETO DE CARREGAMENTO (Skeleton)
 * /js/ui/skeleton.js
 * ============================================================================
 */

export function renderSkeletonCard() {
  return `
    <div class="c-card" aria-busy="true" aria-label="Carregando conteúdo">
      <div class="c-skeleton" style="width: 34%; height: 14px; margin-bottom: 14px;"></div>
      <div class="c-skeleton" style="width: 78%; height: 28px; margin-bottom: 18px;"></div>
      <div class="c-skeleton" style="width: 100%; height: 64px; margin-bottom: 14px;"></div>
      <div style="display:flex; gap: 10px;">
        <div class="c-skeleton" style="width: 96px; height: 40px; border-radius: 999px;"></div>
        <div class="c-skeleton" style="width: 112px; height: 40px; border-radius: 999px;"></div>
      </div>
    </div>
  `;
}
