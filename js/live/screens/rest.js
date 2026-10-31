/**
 * ============================================================================
 * CLAY FIT — TELA DE DESCANSO AUTOMÁTICO (B11) E CORREÇÕES A2/M3/M6
 * /js/live/screens/rest.js
 *
 * Correções Prompt 3.1 (M3 e M6) e Prompt 4 (A2):
 * - M3: Os chips "−15 s" e "+15 s" ficam lado a lado (96×48 cada, centralizados
 *   com 12px de espaço); "Pular descanso" fica em linha própria abaixo (largura
 *   220px, altura 56px, fundo transparente, borda 1.5px  a 60%, texto
 *    16/20 600, white-space: nowrap, line-height: 1).
 * - M6: Usa `formatKg(n)` para formatar a carga da próxima série no cartão "A seguir".
 * - A2: Define `--live-toast-top` sobre o anel central para nunca cobrir "A seguir".
 * ============================================================================
 */

import { getIconSvg } from '../../ui/illustrations.js';
import { renderScenePBreathing } from '../../ui/illustrations-live.js';
import { REST_TIPS } from '../../engine/catalog.js';
import { TimestampCountdown, formatRestClock, formatKg } from '../timer.js';
import { playCountdownTick, playRestCompleteTone } from '../audio.js';
import { vibrate } from '../../motion.js';

let lastTipIndex = -1;

function pickNextRestTip() {
  let idx = Math.floor(Math.random() * REST_TIPS.length);
  if (idx === lastTipIndex) {
    idx = (idx + 1) % REST_TIPS.length;
  }
  lastTipIndex = idx;
  return REST_TIPS[idx];
}

function formatVerboseRestAnnouncement(sec) {
  const s = Math.max(0, Math.round(Number(sec || 0)));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m > 0 && rem > 0) {
    return `Descanso, ${m} ${m === 1 ? 'minuto' : 'minutos'} e ${rem} segundos`;
  }
  if (m > 0) {
    return `Descanso, ${m} ${m === 1 ? 'minuto' : 'minutos'}`;
  }
  return `Descanso, ${rem} segundos`;
}

export function renderRestScreen(sessao) {
  const estado = sessao.maquinaEstado || {};
  const exIdx = Math.max(0, Number(estado.exercicioIdx || 0));
  const ex = (sessao.exercicios || [])[exIdx] || {};
  const series = ex.series || [];
  const totalSeries = series.length || 1;
  const nextSerieIdx = Math.max(0, Math.min(totalSeries - 1, Number(estado.serieIdx || 0)));
  const nextSerie = series[nextSerieIdx] || { n: nextSerieIdx + 1, carga: 20, reps: 10 };

  const nominalSec = Number(estado.descansoTotalSeg || ex.descansoSeg || 60);
  const clockStr = formatRestClock(nominalSec);

  const r = 126;
  const circ = Number((2 * Math.PI * r).toFixed(2));
  const tipText = pickNextRestTip();

  const cargaProx = Number(nextSerie.carga ?? ex.cargaSugerida ?? 0);
  const repsProx = Number(nextSerie.reps ?? nextSerie.alvoReps ?? 10);
  const summaryFormula = ex.porTempo
    ? `${repsProx} s`
    : cargaProx > 0
    ? `${formatKg(cargaProx)} kg × ${repsProx}`
    : `Peso do corpo × ${repsProx}`;

  return `
    <div class="live-screen live-screen--rest live-enter-up-360" id="live-rest-root">
      <div id="rest-aria-announcer" class="sr-only" aria-live="polite" aria-atomic="true">
        ${formatVerboseRestAnnouncement(nominalSec)}
      </div>

      <header class="live-topbar">
        <button
          type="button"
          class="live-icon-btn"
          data-live-action="open-exit-sheet"
          aria-label="Pausar ou sair do treino"
        >
          ${getIconSvg('fechar', 24)}
        </button>
        <span class="live-aa-pill live-aa-pill--caption">DESCANSO</span>
        <span style="width:48px;height:48px;"></span>
      </header>

      <div class="live-rest-hero">
        <div class="live-rest-ring-stage" id="live-rest-ring-stage">
          <div id="shader-host-rest-ring" class="live-rest-shader-circle" aria-hidden="true"></div>
          <div class="live-rest-scene-p-wrap" aria-hidden="true">
            ${renderScenePBreathing()}
          </div>

          <svg class="live-rest-ring-svg" viewBox="0 0 280 280" width="280" height="280" aria-hidden="true">
            <circle
              cx="140"
              cy="140"
              r="${r}"
              fill="none"
              stroke="rgba(var(--energia-fg-rgb), 0.2)"
              stroke-width="12"
            />
            <circle
              id="rest-ring-progress"
              cx="140"
              cy="140"
              r="${r}"
              fill="none"
              stroke="var(--energia-fg)"
              stroke-width="12"
              stroke-linecap="round"
              stroke-dasharray="${circ}"
              stroke-dashoffset="0"
              transform="rotate(-90 140 140)"
            />
          </svg>

          <div class="live-rest-ring-center">
            <h1 id="rest-clock-display" class="live-rest-timer-digits" tabindex="-1">${clockStr}</h1>
            <span id="rest-breath-caption" class="live-aa-pill live-breath-pill">
              Inspire pelo nariz
            </span>
          </div>
        </div>

        <!-- M3: Chips −15 s e +15 s lado a lado (96×48 cada, 12px de espaço) -->
        <div class="live-rest-adjust-row">
          <button
            type="button"
            id="btn-rest-minus15"
            class="live-rest-delta-chip"
            data-rest-delta="-15"
            aria-label="Diminuir 15 segundos de descanso"
          >
            <span>−15 s</span>
          </button>
          <button
            type="button"
            id="btn-rest-plus15"
            class="live-rest-delta-chip"
            data-rest-delta="15"
            aria-label="Adicionar 15 segundos de descanso"
          >
            <span>+15 s</span>
          </button>
        </div>

        <!-- M3: "Pular descanso" em linha própria abaixo (220×56, fantasma, white-space: nowrap) -->
        <div class="live-rest-skip-row">
          <button
            type="button"
            id="btn-skip-rest"
            class="live-skip-rest-btn"
          >
            <span>Pular descanso</span>
          </button>
        </div>
      </div>

      <!-- Cartão "A seguir" (altura 88px, raio 24px) com ajuste de carga − e + -->
      <div class="live-rest-bottom">
        <div class="live-next-set-card">
          <div class="live-next-set-card__info">
            <span class="live-aa-pill live-aa-pill--tiny">
              A seguir · Série ${nextSerieIdx + 1} de ${totalSeries}
            </span>
            <div class="live-next-set-card__formula" id="rest-next-formula">
              ${summaryFormula}
            </div>
          </div>
          ${
            !ex.porTempo && !ex.isPesoCorpo
              ? `
                <div class="live-next-set-card__LoadBtns">
                  <button
                    type="button"
                    class="live-mini-step-btn"
                    data-rest-load-dir="-1"
                    aria-label="Diminuir carga da próxima série"
                  >
                    ${getIconSvg('menos', 18)}
                  </button>
                  <button
                    type="button"
                    class="live-mini-step-btn"
                    data-rest-load-dir="1"
                    aria-label="Aumentar carga da próxima série"
                  >
                    ${getIconSvg('mais', 18)}
                  </button>
                </div>
              `
              : ''
          }
        </div>

        <div class="live-rest-tip-row">
          <span class="live-aa-pill">${tipText}</span>
        </div>
      </div>
    </div>
  `;
}

export function bindRestScreen(
  root,
  sessao,
  { onFinishRest, onUpdateNextSetLoad, onPersistRestTimer, onOpenExit }
) {
  const estado = sessao.maquinaEstado || {};
  const exIdx = Math.max(0, Number(estado.exercicioIdx || 0));
  const ex = (sessao.exercicios || [])[exIdx] || {};
  const series = ex.series || [];
  const nextSerieIdx = Math.max(0, Math.min(series.length - 1, Number(estado.serieIdx || 0)));
  const nextSerie = series[nextSerieIdx] || { carga: 20, reps: 10 };

  let nextCarga = Number(nextSerie.carga ?? ex.cargaSugerida ?? 0);
  const nextReps = Number(nextSerie.reps ?? nextSerie.alvoReps ?? 10);
  const passoCarga = Number(ex.passoCargaKg || 1);

  const ringStage = root.querySelector('#live-rest-ring-stage');
  const ringStroke = root.querySelector('#rest-ring-progress');
  const clockEl = root.querySelector('#rest-clock-display');
  const announcerEl = root.querySelector('#rest-aria-announcer');
  const breathCaptionEl = root.querySelector('#rest-breath-caption');
  const formulaEl = root.querySelector('#rest-next-formula');

  // Item 3 (Prompt 4.1) & A2: Posiciona a pílula de toast na faixa livre entre a barra superior
  // e o topo do anel/cronômetro, nunca cobrindo o número do descanso ("1:30"), os botões ou "A seguir".
  const topbarEl = root.querySelector('.live-topbar');
  const syncToastTop = () => {
    const tbBottom = topbarEl
      ? topbarEl.offsetTop + topbarEl.offsetHeight
      : 54;
    const topPx = Math.max(52, Math.round(tbBottom + 2));
    document.documentElement.style.setProperty('--live-toast-top', `${topPx}px`);
  };
  syncToastTop();
  requestAnimationFrame(syncToastTop);
  const syncTimer1 = setTimeout(syncToastTop, 180);
  const syncTimer2 = setTimeout(syncToastTop, 400);

  const r = 126;
  const circ = 2 * Math.PI * r;
  const nominalSec = Number(estado.descansoTotalSeg || ex.descansoSeg || 60);

  let inhaling = true;
  const breathInterval = setInterval(() => {
    if (!breathCaptionEl) return;
    inhaling = !inhaling;
    breathCaptionEl.style.opacity = '0';
    setTimeout(() => {
      if (breathCaptionEl) {
        breathCaptionEl.textContent = inhaling ? 'Inspire pelo nariz' : 'Solte devagar';
        breathCaptionEl.style.opacity = '1';
      }
    }, 200);
  }, 4000);

  const countdown = new TimestampCountdown({
    durationSec: nominalSec,
    existingEndTimeMs: estado.descansoFimMs || null,
    existingNominalSec: nominalSec,
    onFrame: ({ remainingSec, fraction }) => {
      if (ringStroke) {
        const offset = circ * (1 - fraction);
        ringStroke.style.strokeDashoffset = offset.toFixed(2);
        if (remainingSec <= 10) {
          ringStroke.setAttribute('stroke', 'var(--energia-fg)');
          ringStroke.setAttribute('stroke-width', '14');
        }
      }
    },
    onSecond: (remSec) => {
      if (clockEl) {
        clockEl.textContent = formatRestClock(remSec);
      }

      if (announcerEl) {
        if (remSec > 3 && remSec % 30 === 0) {
          announcerEl.textContent = formatVerboseRestAnnouncement(remSec);
        } else if (remSec === 3 || remSec === 2 || remSec === 1) {
          announcerEl.textContent = String(remSec);
        }
      }

      if (remSec === 3 || remSec === 2 || remSec === 1) {
        playCountdownTick();
        vibrate('confirmacao');
      }
    },
    onComplete: ({ expiredWhileHidden }) => {
      clearInterval(breathInterval);
    clearTimeout(syncTimer1);
    clearTimeout(syncTimer2);
      playRestCompleteTone();
      vibrate('sucesso');
      const delayMs = expiredWhileHidden ? 0 : 240;
      setTimeout(() => {
        if (onFinishRest) onFinishRest();
      }, delayMs);
    }
  }).start();

  if (onPersistRestTimer && !estado.descansoFimMs) {
    onPersistRestTimer({
      descansoFimMs: countdown.endTimeMs,
      descansoTotalSeg: countdown.nominalTotalSec
    });
  }

  root.querySelectorAll('[data-rest-delta]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const delta = Number(btn.dataset.restDelta || 15);
      vibrate('selecao');
      countdown.adjustSeconds(delta);
      if (onPersistRestTimer) {
        onPersistRestTimer({
          descansoFimMs: countdown.endTimeMs,
          descansoTotalSeg: countdown.nominalTotalSec
        });
      }
    });
  });

  root.querySelector('#btn-skip-rest')?.addEventListener('click', () => {
    vibrate('confirmacao');
    clearInterval(breathInterval);
    clearTimeout(syncTimer1);
    clearTimeout(syncTimer2);
    countdown.stop();
    if (onFinishRest) onFinishRest();
  });

  root.querySelectorAll('[data-rest-load-dir]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = Number(btn.dataset.restLoadDir || 1);
      vibrate('selecao');
      nextCarga = Math.max(0, Math.round((nextCarga + dir * passoCarga) * 10) / 10);
      if (formulaEl) {
        formulaEl.textContent = `${formatKg(nextCarga)} kg × ${nextReps}`;
      }
      if (onUpdateNextSetLoad) {
        onUpdateNextSetLoad(nextCarga);
      }
    });
  });

  root.querySelector('[data-live-action="open-exit-sheet"]')?.addEventListener('click', () => {
    vibrate('selecao');
    if (onOpenExit) onOpenExit();
  });

  window.addEventListener('resize', syncToastTop);

  return () => {
    clearInterval(breathInterval);
    clearTimeout(syncTimer1);
    clearTimeout(syncTimer2);
    countdown.stop();
    window.removeEventListener('resize', syncToastTop);
  };
}
