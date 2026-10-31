/**
 * ============================================================================
 * CLAY FIT — COMPONENTE DE LINHA DE EXERCÍCIO (C3)
 * /js/ui/exercicio-row.js
 *
 * Especificações Prompt 6 (Parte C3):
 * - Altura fixa 80px, border-radius: 20px, fundo --superficie, borda 1px solid var(--linha).
 * - Linha inteira clicável (scale(.98) por 120ms ao tocar).
 * - À esquerda: miniatura redonda 64×64px com mapa muscular (`renderMapaMuscular(ex, { tamanho: 'mini' })`)
 *   e suporte a `<img loading="lazy" width="64" height="64">` se `imagem.mini` existir,
 *   caindo automaticamente para o mapa muscular em caso de erro.
 * - Ao centro: nome em pt-BR (16/22 600 --tinta, 1 linha com reticências; em >= 390px, até 2 linhas)
 *   e linha de apoio com `musculoPrincipal` (13/18 --tinta-3) + selo discreto do equipamento (12/16).
 * - À direita: botão (i) 48×48px com `aria-label="Ver detalhes de {nome}"`.
 * ============================================================================
 */

import { renderMapaMuscular } from './mapa-muscular.js';

function escapeAttr(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderExercicioRow(ex, { style = '', extraClass = '' } = {}) {
  if (!ex) return '';
  const nome = ex.nome || 'Exercício';
  const musculoPrincipal = ex.musculoPrincipal || ex.grupo || 'Músculo';
  const equipSelo = ex.equipamentoTipo || ex.equipamento || 'Equipamento';
  const hasMiniImg = Boolean(ex.imagem && ex.imagem.mini);

  const mapaSvg = renderMapaMuscular(ex, { tamanho: 'mini' });
  const imgLayer = hasMiniImg
    ? `<img
         class="ex-row__thumb-img"
         src="${escapeAttr(ex.imagem.mini)}"
         alt=""
         loading="lazy"
         width="64"
         height="64"
         onerror="this.remove()"
       />`
    : '';

  return `
    <div
      class="ex-row ${extraClass}"
      role="listitem"
      tabindex="0"
      data-open-exercise="${escapeAttr(ex.id)}"
      data-ex-id="${escapeAttr(ex.id)}"
      aria-label="${escapeAttr(`${nome} — ${musculoPrincipal} · ${equipSelo}`)}"
      ${style ? `style="${style}"` : ''}
    >
      <div class="ex-row__thumb">
        ${mapaSvg}
        ${imgLayer}
      </div>

      <div class="ex-row__body">
        <div class="ex-row__title">${nome}</div>
        <div class="ex-row__meta">
          <span class="ex-row__muscle">${musculoPrincipal}</span>
          <span class="ex-row__equip-badge">${equipSelo}</span>
        </div>
      </div>

      <button
        type="button"
        class="ex-row__info-btn"
        data-open-exercise="${escapeAttr(ex.id)}"
        aria-label="${escapeAttr(`Ver detalhes de ${nome}`)}"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <circle cx="12" cy="8.5" r="0.6" fill="currentColor" />
        </svg>
      </button>
    </div>
  `;
}

export default {
  renderExercicioRow
};
