/**
 * ============================================================================
 * CLAY FIT — TELA 4 DA CORRIDA: CONTAGEM 3–2–1–JÁ! (C3.4)
 * /js/run/screens/countdown.js
 *
 * Especificação Prompt 4 (C3.4):
 * - Tela cheia ``. Número gigante `clamp(96px, 26vw, 148px)` em
 *   `Instrument Serif` `` dentro de anel concêntrico que pulsa
 *   (`scale 0.7 -> 1.08 -> 1.0` com `spring()`) a cada segundo:
 *   `3` -> `2` -> `1` -> `"JÁ!"` (em ``), com bipe curto em 3/2/1,
 *   tom mais alto em `"JÁ!"` e vibração.
 * - Respeita `perfil.contagemInicialCorrida` (3s, 5s ou 0 = Sem contagem).
 * - Toque em qualquer lugar da tela pula a contagem e inicia na hora.
 * ============================================================================
 */

import { store } from '../../store.js';
import { spring, vibrate } from '../../motion.js';
import { playCountdownTick } from '../../live/audio.js';
import { renderRunCountdownScene } from '../../ui/illustrations-run.js';

export function renderRunCountdownScreen(container, tracker) {
  if (!container) return;

  const perfil = store.getState()?.perfil || {};
  const startSec = Number(perfil.contagemInicialCorrida ?? 3);

  if (startSec <= 0) {
    tracker.beginActiveRunning();
    return { destroy() {} };
  }

  let currentNum = startSec;
  let stepTimerId = null;
  let cancelSpring = null;
  let finished = false;

  function finishNow() {
    if (finished) return;
    finished = true;
    if (stepTimerId) clearTimeout(stepTimerId);
    if (cancelSpring) cancelSpring();
    tracker.beginActiveRunning();
  }

  function renderStep(label, isFinal = false) {
    container.innerHTML = `
      <section class="run-countdown-screen" role="button" tabindex="0" aria-label="Contagem regressiva: ${label}. Toque para iniciar agora">
        <div class="run-countdown-stage" data-countdown-stage>
          ${renderRunCountdownScene(label)}
        </div>
        <p class="run-countdown-hint">Toque na tela para começar agora</p>
      </section>
    `;

    const stageEl = container.querySelector('[data-countdown-stage]');
    if (stageEl) {
      if (cancelSpring) cancelSpring();
      cancelSpring = spring({
        from: 0.7,
        to: 1.0,
        stiffness: 320,
        damping: 18,
        onUpdate(val) {
          stageEl.style.transform = `scale(${val.toFixed(3)})`;
        }
      });
    }

    playCountdownTick(isFinal);
    vibrate(isFinal ? 'confirmacao' : 'selecao');

    container.querySelector('.run-countdown-screen')?.addEventListener('click', () => {
      finishNow();
    });
  }

  const stepDurationMs = tracker.speedMultiplier > 1 ? 220 : 900;

  function tick() {
    if (finished) return;
    if (currentNum > 0) {
      renderStep(String(currentNum), false);
      currentNum -= 1;
      stepTimerId = setTimeout(tick, stepDurationMs);
    } else {
      renderStep('JÁ!', true);
      stepTimerId = setTimeout(() => {
        finishNow();
      }, Math.round(stepDurationMs * 0.65));
    }
  }

  tick();

  return {
    destroy() {
      finished = true;
      if (stepTimerId) clearTimeout(stepTimerId);
      if (cancelSpring) cancelSpring();
    }
  };
}
