/**
 * ============================================================================
 * CLAY FIT — TELA DE PAUSA DO TREINO AO VIVO (B13)
 * /js/live/screens/pause.js
 *
 * Especificações Prompt 3 (B13):
 * - O tempo ativo para; tela de pausa com fundo terracota.
 * - Cronômetro total piscando suave (opacidade 1 <-> .5, 1.2s).
 * - Texto "Treino pausado" e botão gigante "Continuar" (88px).
 * - Registra o intervalo em `pausas[]`.
 * ============================================================================
 */

import { getIconSvg } from '../../ui/illustrations.js';
import { formatElapsedClock } from '../timer.js';
import { computeActiveSeconds } from '../session.js';
import { vibrate } from '../../motion.js';

export function renderPauseScreen(sessao) {
  const activeSec = computeActiveSeconds(sessao);
  const clockStr = formatElapsedClock(activeSec);

  return `
    <div class="live-screen live-screen--pause" id="live-pause-root">
      <header class="live-topbar">
        <button
          type="button"
          class="live-icon-btn"
          data-live-action="open-exit-sheet"
          aria-label="Sair ou encerrar treino"
        >
          ${getIconSvg('fechar', 24)}
        </button>
        <span class="live-aa-pill live-aa-pill--caption">PAUSA</span>
        <span style="width:48px;height:48px;"></span>
      </header>

      <div class="live-pause-center">
        <span class="live-aa-pill" style="margin-bottom:16px;">${sessao.nome || 'Treino do dia'}</span>
        <div class="live-pause-clock" aria-label="Tempo ativo até agora: ${clockStr}">
          ${clockStr}
        </div>
        <h1 class="live-pause-title" tabindex="-1">Treino pausado</h1>
        <p class="live-pause-sub">
          Respire e tome água. Suas séries já feitas estão salvas.
        </p>
      </div>

      <footer class="live-giant-footer">
        <button
          type="button"
          id="btn-pause-resume"
          class="live-giant-btn"
        >
          <span>Continuar</span>
        </button>
      </footer>
    </div>
  `;
}

export function bindPauseScreen(root, sessao, { onResume, onOpenExit }) {
  root.querySelector('#btn-pause-resume')?.addEventListener('click', () => {
    vibrate('confirmacao');
    if (onResume) onResume();
  });

  root.querySelector('[data-live-action="open-exit-sheet"]')?.addEventListener('click', () => {
    vibrate('selecao');
    if (onOpenExit) onOpenExit();
  });

  return () => {};
}
