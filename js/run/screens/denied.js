/**
 * ============================================================================
 * CLAY FIT — TELA 3 DA CORRIDA: PERMISSÃO DE GPS NEGADA / INDISPONÍVEL (C3.3)
 * /js/run/screens/denied.js
 *
 * Especificação Prompt 4 (C3.3):
 * - Ilustração em argila (Parte E, item 3: telefone com pino e cadeado aberto).
 * - Título: "Precisamos da sua localização para medir a distância".
 * - 2 passos curtos e claros de como liberar no navegador.
 * - 2 botões:
 *   - Primário: "Tentar novamente"
 *   - Secundário: "Correr sem GPS (cronômetro + distância no fim)"
 * ============================================================================
 */

import { vibrate } from '../../motion.js';
import { getIconSvg } from '../../ui/illustrations.js';
import { renderRunDeniedScene, wireRunIllustrations } from '../../ui/illustrations-run.js';

export function renderRunDeniedScreen(container, tracker) {
  if (!container) return;

  container.innerHTML = `
    <section class="run-denied-screen" aria-label="Permissão de localização necessária">
      <header class="run-pre-topbar">
        <button type="button" class="run-icon-btn" data-action="denied-back" aria-label="Voltar">
          ${getIconSvg('voltar', 22)}
        </button>
        <h1 class="run-pre-title">Localização</h1>
        <span style="width:44px;"></span>
      </header>

      <div class="run-denied-body">
        ${renderRunDeniedScene()}
        <h2 class="run-denied-heading">Precisamos da sua localização para medir a distância</h2>

        <ol class="run-denied-steps">
          <li>
            <span class="run-step-badge">1</span>
            <span>Toque no ícone de cadeado ou ajustes ao lado do endereço do navegador.</span>
          </li>
          <li>
            <span class="run-step-badge">2</span>
            <span>Mude a permissão de <strong>Localização</strong> para <strong>Permitir</strong>.</span>
          </li>
        </ol>
      </div>

      <div class="run-denied-actions">
        <button type="button" class="run-primary-cta-btn" data-action="retry-gps">
          Tentar novamente
        </button>
        <button type="button" class="run-secondary-cta-btn" data-action="run-without-gps">
          Correr sem GPS (cronômetro + distância no fim)
        </button>
      </div>
    </section>
  `;

  wireRunIllustrations(container);

  container.querySelector('[data-action="denied-back"]')?.addEventListener('click', () => {
    vibrate('selecao');
    tracker.transitionTo('preparando');
  });

  container.querySelector('[data-action="retry-gps"]')?.addEventListener('click', () => {
    vibrate('selecao');
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          tracker.gpsStatus = 'ok';
          tracker.gpsAccuracyM = Math.round(pos.coords.accuracy || 10);
          tracker.transitionTo('contagem');
        },
        () => {
          tracker.startGpsListening();
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      tracker.startGpsListening();
    }
  });

  container.querySelector('[data-action="run-without-gps"]')?.addEventListener('click', () => {
    vibrate('confirmacao');
    tracker.requestStartRun({ semGps: true });
  });
}
