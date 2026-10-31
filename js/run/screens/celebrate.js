/**
 * ============================================================================
 * CLAY FIT — TELA 8 DA CORRIDA: CELEBRAÇÃO DA CORRIDA (C3.8)
 * /js/run/screens/celebrate.js
 *
 * Especificação Prompt 4 (C3.8):
 * - Chuva de partículas em terracota, sálvia e areia (1,4s).
 * - Título em `Instrument Serif 36px`: "Corrida entregue." (ou
 *   "Meta batida e corrida entregue." / "Novo recorde na rua.").
 * - Cartão-resumo com miniatura da rota + distância + tempo + ritmo médio.
 * - 2 botões: "Ver na Evolução" (`#/evolucao?tab=corrida`) e
 *   "Voltar para o início" (`#/hoje`).
 * ============================================================================
 */

import { vibrate } from '../../motion.js';
import { clearToasts } from '../../ui/toast.js';
import { playAchievementChord } from '../../live/audio.js';
import { renderRouteArtThumbSvg } from '../route-art.js';
import { formatKmWithUnit, formatPaceSegKm, formatRunClock } from '../geo.js';

export function renderRunCelebrateScreen(container, sessao, { onNavigate } = {}) {
  if (!container) return;

  clearToasts();
  playAchievementChord();
  vibrate('sucesso');

  const recordes = Array.isArray(sessao?.recordes) ? sessao.recordes : [];
  const metaAtiva =
    sessao?.meta?.valor &&
    ((sessao.meta.tipo === 'distancia' && Number(sessao.distanciaM || 0) >= sessao.meta.valor) ||
      (sessao.meta.tipo === 'tempo' && Number(sessao.movimentoSeg || 0) >= sessao.meta.valor));

  let headline = 'Corrida entregue.';
  if (recordes.length > 0) {
    headline = 'Novo recorde na rua.';
  } else if (metaAtiva) {
    headline = 'Meta batida e corrida entregue.';
  }

  const distTxt = formatKmWithUnit(sessao?.distanciaM || 0);
  const tempoTxt = formatRunClock(sessao?.movimentoSeg || sessao?.duracaoSeg || 0);
  const ritmoTxt = `${formatPaceSegKm(sessao?.ritmoMedioSegKm)} /km`;

  const particles = Array.from({ length: 22 }).map((_, i) => {
    const colors = ['var(--terracota)', 'var(--salvia)', 'var(--areia)', 'var(--terracota-profundo)'];
    const color = colors[i % colors.length];
    const left = 6 + ((i * 19) % 88);
    const delay = ((i * 55) % 450) / 1000;
    const size = 6 + (i % 5) * 2;
    return `<span class="run-confetti-dot" style="left:${left}%;background:${color};width:${size}px;height:${size}px;animation-delay:${delay}s;"></span>`;
  });

  container.innerHTML = `
    <section class="run-celebrate-screen" aria-label="Celebração de corrida concluída">
      <div class="run-confetti-layer" aria-hidden="true">
        ${particles.join('')}
      </div>

      <div class="run-celebrate-content">
        <span class="run-celebrate-badge">SESSÃO SALVA</span>
        <h1 class="run-celebrate-title">${headline}</h1>
        <p class="run-celebrate-subtitle">${sessao?.nome || 'Corrida ao vivo'} registrada no seu histórico.</p>

        <div class="run-celebrate-summary-card">
          <div class="run-celebrate-thumb">
            ${renderRouteArtThumbSvg(sessao?.rota, 72)}
          </div>
          <div class="run-celebrate-metrics">
            <div class="run-cel-metric">
              <span>Distância</span>
              <strong>${distTxt}</strong>
            </div>
            <div class="run-cel-metric">
              <span>Tempo</span>
              <strong>${tempoTxt}</strong>
            </div>
            <div class="run-cel-metric">
              <span>Ritmo médio</span>
              <strong>${ritmoTxt}</strong>
            </div>
          </div>
        </div>

        <div class="run-celebrate-actions">
          <button type="button" class="run-save-btn" data-action="go-evolution-run">
            Ver na Evolução
          </button>
          <button type="button" class="run-celebrate-home-btn" data-action="go-home">
            Voltar para o início
          </button>
        </div>
      </div>
    </section>
  `;

  container.querySelector('[data-action="go-evolution-run"]')?.addEventListener('click', () => {
    vibrate('selecao');
    if (onNavigate) onNavigate('#/evolucao?tab=corrida');
  });

  container.querySelector('[data-action="go-home"]')?.addEventListener('click', () => {
    vibrate('selecao');
    if (onNavigate) onNavigate('#/hoje');
  });
}
