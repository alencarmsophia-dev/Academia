/**
 * ============================================================================
 * CLAY FIT — TELA 2 DA CORRIDA: BUSCANDO SINAL DE GPS (C3.2)
 * /js/run/screens/searching.js
 *
 * Especificação Prompt 4 (C3.2):
 * - Acionada quando o usuário toca em "Iniciar corrida" antes de `accuracy <= 25 m`.
 * - Centro: cena vetorial de radar em argila (Parte E, item 2) com 3 ondas
 *   concêntricas em terracota/sálvia expandindo a partir de um pino central.
 * - Título: "Buscando sinal de GPS…" e subtítulo dinâmico
 *   ("Precisão atual: ±38 m · Aproxime-se de uma área aberta").
 * - Assim que `accuracy <= 25 m`, avança sozinho com vibração curta para a Contagem.
 * - Após 5 segundos de espera, mostra botão secundário "Começar mesmo assim"
 *   (usa o sinal disponível) e link "Correr em esteira / sem GPS" (modo sem GPS C2.9).
 * ============================================================================
 */

import { vibrate } from '../../motion.js';
import { getIconSvg } from '../../ui/illustrations.js';
import { renderRunSignalScene, wireRunIllustrations } from '../../ui/illustrations-run.js';

export function renderRunSearchingScreen(container, tracker, { onBack } = {}) {
  if (!container) return;

  let showFallbackButtons = false;
  const fallbackTimer = setTimeout(() => {
    showFallbackButtons = true;
    const actionsEl = container.querySelector('[data-searching-fallbacks]');
    if (actionsEl) {
      actionsEl.classList.add('is-visible');
    }
  }, 5000);

  function getSubtitleText() {
    if (tracker.gpsAccuracyM) {
      return `Precisão atual: ±${tracker.gpsAccuracyM} m · Aproxime-se de uma área aberta`;
    }
    return 'Ajustando satélites · Aproxime-se de uma área aberta';
  }

  const signalState = tracker.gpsStatus === 'weak' ? 'weak' : 'searching';

  container.innerHTML = `
    <section class="run-searching-screen" aria-label="Buscando sinal de GPS">
      <header class="run-pre-topbar">
        <button type="button" class="run-icon-btn" data-action="searching-back" aria-label="Voltar para pré-corrida">
          ${getIconSvg('voltar', 22)}
        </button>
        <h1 class="run-pre-title">Sinal de GPS</h1>
        <span style="width:44px;"></span>
      </header>

      <div class="run-searching-body">
        ${renderRunSignalScene(signalState)}
        <h2 class="run-searching-heading">Buscando sinal de GPS…</h2>
        <p class="run-searching-sub" data-searching-subtitle>${getSubtitleText()}</p>
      </div>

      <div class="run-searching-actions ${showFallbackButtons ? 'is-visible' : ''}" data-searching-fallbacks>
        <button type="button" class="run-secondary-cta-btn" data-action="start-anyway">
          Começar mesmo assim
        </button>
        <button type="button" class="run-text-link-btn" data-action="start-no-gps">
          Correr em esteira / sem GPS
        </button>
      </div>
    </section>
  `;

  wireRunIllustrations(container);

  container.querySelector('[data-action="searching-back"]')?.addEventListener('click', () => {
    clearTimeout(fallbackTimer);
    vibrate('selecao');
    tracker.transitionTo('preparando');
  });

  container.querySelector('[data-action="start-anyway"]')?.addEventListener('click', () => {
    clearTimeout(fallbackTimer);
    vibrate('confirmacao');
    tracker.transitionTo('contagem');
  });

  container.querySelector('[data-action="start-no-gps"]')?.addEventListener('click', () => {
    clearTimeout(fallbackTimer);
    vibrate('confirmacao');
    tracker.requestStartRun({ semGps: true });
  });

  return {
    updateAccuracy() {
      const subEl = container.querySelector('[data-searching-subtitle]');
      if (subEl) {
        subEl.textContent = getSubtitleText();
      }
    },
    destroy() {
      clearTimeout(fallbackTimer);
    }
  };
}
