/**
 * ============================================================================
 * CLAY FIT — TELA 6 DA CORRIDA: CORRIDA PAUSADA (C3.6 & C7)
 * /js/run/screens/paused.js
 *
 * Container obrigatório: `#live-pause-root`
 * Especificação Prompt 4 (C3.6 & C7):
 * - Topo: selo "CORRIDA PAUSADA" em `` + tempo pausado correndo discreto
 *   ("Em pausa há 0:24").
 * - Resumo até aqui em 4 cartões 2×2: Distância, Tempo em movimento, Ritmo médio, Calorias.
 * - Miniatura da Arte do Trajeto até o momento + lista compacta das parciais já fechadas.
 * - 2 botões grandes na base:
 *   - Primário (`72px`, ``): "Retomar corrida"
 *   - Secundário (`64px`, ``): "Segure para finalizar" — exige pressionar e
 *     segurar por 1,2 s com preenchimento contínuo em terracota e vibração ao completar
 *     (se tocar rápido, mostra dica "Segure por 1 segundo para finalizar").
 * - Link discreto abaixo: "Descartar corrida" (abre folha de confirmação).
 * - Caso de borda C7: se `< 100 m` ou `< 60 s` (exceto no modo sem GPS), abre folha
 *   "Corrida muito curta. Salvar mesmo assim?" com "Salvar" e "Descartar".
 * ============================================================================
 */

import { vibrate } from '../../motion.js';
import { showToast, clearToasts } from '../../ui/toast.js';
import { openBottomSheet, closeBottomSheet } from '../../ui/bottom-sheet.js';
import { renderRouteArtSvg } from '../route-art.js';
import { formatKmWithUnit, formatPaceSegKm, formatRunClock } from '../geo.js';

export function renderRunPausedScreen(container, tracker, { onDiscardSession } = {}) {
  if (!container) return;

  // A2: Limpa toasts ao entrar em pausa
  clearToasts();

  const pauseEnteredAtMs = Date.now();
  let holdStartMs = 0;
  let holdRafId = null;
  let holdCompleted = false;

  function getPauseElapsedLabel() {
    const sec = Math.max(0, Math.floor((Date.now() - pauseEnteredAtMs) / 1000));
    return `Em pausa há ${formatRunClock(sec)}`;
  }

  function handleConfirmFinish() {
    // C7: Corrida muito curta (< 100m ou < 60s)
    const isShort =
      (!tracker.semGpsModo && tracker.distanciaM < 100) || tracker.movimentoSeg < 60;
    if (isShort) {
      const sheetId = 'run-short-confirm-sheet';
      const sheetEl = openBottomSheet({
        id: sheetId,
        title: 'Corrida muito curta',
        html: `
          <div class="run-confirm-sheet">
            <h3 class="sheet-title">Corrida muito curta. Salvar mesmo assim?</h3>
            <p class="sheet-subtitle">Você registrou ${formatKmWithUnit(tracker.distanciaM)} em ${formatRunClock(tracker.movimentoSeg)}.</p>
            <div class="run-confirm-sheet-actions">
              <button type="button" class="btn btn-primary btn-full" data-action="short-save">Salvar</button>
              <button type="button" class="btn btn-secondary btn-full" data-action="short-discard">Descartar</button>
            </div>
          </div>
        `
      });
      if (!sheetEl) {
        tracker.enterSummaryState();
        return;
      }
      sheetEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="short-save"]')) {
          vibrate('confirmacao');
          closeBottomSheet(sheetId, { silent: true });
          tracker.enterSummaryState();
        } else if (e.target.closest('[data-action="short-discard"]')) {
          vibrate('erro');
          closeBottomSheet(sheetId, { silent: true });
          if (onDiscardSession) onDiscardSession();
        }
      });
      return;
    }

    tracker.enterSummaryState();
  }

  function openDiscardConfirmSheet() {
    const sheetId = 'run-discard-confirm-sheet';
    const sheetEl = openBottomSheet({
      id: sheetId,
      title: 'Descartar corrida',
      html: `
        <div class="run-confirm-sheet">
          <h3 class="sheet-title">Descartar esta corrida?</h3>
          <p class="sheet-subtitle">O tempo e o trajeto percorridos até aqui não serão salvos.</p>
          <div class="run-confirm-sheet-actions">
            <button type="button" class="btn btn-primary btn-full" data-action="keep-run">Continuar na corrida</button>
            <button type="button" class="btn btn-secondary btn-full" data-action="confirm-discard-run">Descartar corrida</button>
          </div>
        </div>
      `
    });
    if (!sheetEl) return;
    sheetEl.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="keep-run"]')) {
        vibrate('selecao');
        closeBottomSheet(sheetId, { silent: true });
      } else if (e.target.closest('[data-action="confirm-discard-run"]')) {
        vibrate('erro');
        closeBottomSheet(sheetId, { silent: true });
        if (onDiscardSession) onDiscardSession();
      }
    });
  }

  const splitsHtml =
    tracker.parciais.length > 0
      ? `
        <div class="run-paused-splits-list">
          ${tracker.parciais
            .slice(-3)
            .map(
              (p) => `
                <span class="run-paused-split-pill">
                  Km ${p.km}: ${formatPaceSegKm(p.ritmoSegKm)} /km
                </span>
              `
            )
            .join('')}
        </div>
      `
      : '';

  container.innerHTML = `
    <section id="live-pause-root" class="run-paused-screen" aria-label="Corrida pausada">
      <header class="run-paused-header">
        <span class="run-paused-badge">CORRIDA PAUSADA</span>
        <span class="run-paused-elapsed" data-paused-elapsed>${getPauseElapsedLabel()}</span>
      </header>

      <!-- Grade 2×2 de métricas até o momento -->
      <div class="run-paused-metrics-grid">
        <div class="run-paused-metric-card">
          <span class="run-sec-label">DISTÂNCIA</span>
          <strong class="run-paused-metric-val">${formatKmWithUnit(tracker.distanciaM)}</strong>
        </div>
        <div class="run-paused-metric-card">
          <span class="run-sec-label">TEMPO EM MOVIMENTO</span>
          <strong class="run-paused-metric-val">${formatRunClock(tracker.movimentoSeg)}</strong>
        </div>
        <div class="run-paused-metric-card">
          <span class="run-sec-label">RITMO MÉDIO</span>
          <strong class="run-paused-metric-val">${formatPaceSegKm(tracker.ritmoMedioSegKm)} /km</strong>
        </div>
        <div class="run-paused-metric-card">
          <span class="run-sec-label">CALORIAS</span>
          <strong class="run-paused-metric-val">${tracker.calorias || 0} kcal</strong>
        </div>
      </div>

      <!-- Miniatura da Arte do Trajeto + parciais já fechadas -->
      <div class="run-paused-route-card">
        <div class="run-paused-route-preview">
          ${renderRouteArtSvg({
            points: tracker.rawPoints,
            width: 320,
            height: 118,
            isDark: true,
            isFinished: false
          })}
        </div>
        ${splitsHtml}
      </div>

      <!-- 2 botões grandes na base + link Descartar -->
      <footer class="run-paused-footer">
        <button type="button" class="run-primary-cta-btn" data-action="resume-run">
          Retomar corrida
        </button>

        <button
          type="button"
          class="run-hold-finish-btn"
          data-action="hold-finish-run"
          aria-label="Segure por 1,2 segundo para finalizar a corrida"
        >
          <span class="run-hold-fill-bar" data-hold-fill-bar style="width:0%"></span>
          <span class="run-hold-btn-label" data-hold-label>Segure para finalizar</span>
        </button>

        <button type="button" class="run-discard-link-btn" data-action="discard-run">
          Descartar corrida
        </button>
      </footer>
    </section>
  `;

  const elapsedInterval = setInterval(() => {
    const el = container.querySelector('[data-paused-elapsed]');
    if (el) el.textContent = getPauseElapsedLabel();
  }, 1000);

  const root = container.querySelector('#live-pause-root');
  const holdBtn = root?.querySelector('[data-action="hold-finish-run"]');
  const fillBar = root?.querySelector('[data-hold-fill-bar]');

  function startHold(e) {
    if (holdCompleted) return;
    if (e.type === 'pointerdown' && e.button !== undefined && e.button !== 0) return;
    holdStartMs = Date.now();
    vibrate('selecao');

    const step = () => {
      const elapsed = Date.now() - holdStartMs;
      const frac = Math.min(1, elapsed / 1200);
      if (fillBar) {
        fillBar.style.width = `${Math.round(frac * 100)}%`;
      }
      if (frac >= 1) {
        holdCompleted = true;
        vibrate('confirmacao');
        handleConfirmFinish();
        return;
      }
      holdRafId = requestAnimationFrame(step);
    };
    holdRafId = requestAnimationFrame(step);
  }

  function endHold() {
    if (holdCompleted) return;
    if (holdRafId) {
      cancelAnimationFrame(holdRafId);
      holdRafId = null;
    }
    const elapsed = holdStartMs ? Date.now() - holdStartMs : 0;
    holdStartMs = 0;
    if (fillBar) {
      fillBar.style.width = '0%';
    }
    if (elapsed > 15 && elapsed < 1200) {
      showToast({ message: 'Segure por 1 segundo para finalizar' });
    }
  }

  if (holdBtn) {
    holdBtn.addEventListener('pointerdown', startHold);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => {
      holdBtn.addEventListener(ev, endHold);
    });
    // Evento customizado para automação de acessibilidade / teclado
    holdBtn.addEventListener('holdcomplete', () => {
      holdCompleted = true;
      vibrate('confirmacao');
      handleConfirmFinish();
    });
    holdBtn.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !holdStartMs) {
        startHold(e);
      }
    });
    holdBtn.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        endHold();
      }
    });
  }

  root?.querySelector('[data-action="resume-run"]')?.addEventListener('click', () => {
    vibrate('confirmacao');
    tracker.resumeRun(false);
  });

  root?.querySelector('[data-action="discard-run"]')?.addEventListener('click', () => {
    vibrate('selecao');
    openDiscardConfirmSheet();
  });

  return {
    destroy() {
      clearInterval(elapsedInterval);
      if (holdRafId) cancelAnimationFrame(holdRafId);
    }
  };
}
