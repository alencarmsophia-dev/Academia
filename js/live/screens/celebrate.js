/**
 * ============================================================================
 * CLAY FIT — TELA DE CELEBRAÇÃO (B15 — 1,8s ENTRE "CONCLUIR" E HOJE)
 * /js/live/screens/celebrate.js
 *
 * Especificações Prompt 3 (B15):
 * - Cena N (única, tela cheia, fundo sálvia): sol nascente de argila terracota
 *   subindo atrás de uma silhueta de colinas em sálvia e areia, com o texto
 *   "Mais um dia cumprido." em Fraunces 28/34.
 * - Confetes de argila: 28 formas orgânicas (terracota, sálvia, areia),
 *   desenhadas em canvas 2D com gravidade, rotação e opacidade, auto-removidas
 *   ao final. Tocar na tela faz as formas saltarem (interativo).
 * - Vibração de sucesso [12,40,12,40,24].
 * - Se `prefers-reduced-motion`: sem confete, só a cena estática e o check.
 * ============================================================================
 */

import { renderSceneNSunrise, mountClayConfettiCanvas } from '../../ui/illustrations-live.js';
import { scaleMs } from '../timer.js';
import { vibrate } from '../../motion.js';

export function renderCelebrateScreen() {
  return `
    <div class="live-celebrate-shell" id="live-celebrate-root">
      <div class="live-celebrate-center">
        <div class="live-celebrate-scene">
          ${renderSceneNSunrise()}
        </div>
        <h1 class="live-celebrate-title" tabindex="-1">
          Mais um dia cumprido.
        </h1>
      </div>
    </div>
  `;
}

export function bindCelebrateScreen(root, { onDone }) {
  vibrate('sucesso');

  const cleanupConfetti = mountClayConfettiCanvas(root);
  const waitMs = scaleMs(1800);

  const timerId = setTimeout(() => {
    cleanupConfetti();
    if (onDone) onDone();
  }, waitMs);

  return () => {
    clearTimeout(timerId);
    cleanupConfetti();
  };
}
