/**
 * ============================================================================
 * CLAY FIT — FOLHA "COMO FAZER" (B10)
 * /js/live/screens/how-to-sheet.js
 *
 * Especificações Prompt 3 (B10):
 * - Folha arrastável, altura até 82dvh, tema claro por cima do terracota.
 * - Cena do exercício em tamanho grande (320×200) animada.
 * - "Passo a passo" com 3 passos curtos numerados (cada um 1 frase de até
 *   14 palavras, texto específico do exercício vindo do catalog.js).
 * - Bloco "Erro comum" com 1 frase.
 * - Bloco "Sente na articulação? Pare e procure um profissional." sempre
 *   presente, 13/18 tinta-3.
 * - Botão "Entendi" (primário, 56px). Voltar do aparelho fecha a folha.
 * ============================================================================
 */

import { openBottomSheet, closeBottomSheet } from '../../ui/bottom-sheet.js';
import { renderEnergyExerciseScene } from '../../ui/illustrations-live.js';
import { vibrate } from '../../motion.js';

export function openHowToSheet(ex = {}) {
  const passos =
    Array.isArray(ex.comoFazer) && ex.comoFazer.length >= 3
      ? ex.comoFazer.slice(0, 3)
      : [
          'Posicione os pés firmes no chão e mantenha a coluna alinhada.',
          'Execute o movimento com amplitude controlada sem usar impulso.',
          'Retorne devagar respirando de forma constante em cada repetição.'
        ];

  const erroComum =
    ex.erroComum ||
    (Array.isArray(ex.errosComuns) && ex.errosComuns[0]) ||
    'Usar impulso do tronco ou encurtar a fase de descida do movimento.';

  openBottomSheet('clay-sheet', {
    title: ex.nome || 'Como fazer',
    contentHtml: `
      <div class="live-howto-sheet">
        <!-- Cena do exercício em tamanho grande (320×200) animada -->
        <div class="live-howto-scene-box">
          ${renderEnergyExerciseScene(ex, { theme: 'claro', width: 320, height: 200 })}
        </div>

        <!-- Passo a passo com 3 passos curtos numerados -->
        <div class="live-howto-block">
          <div class="t-caption" style="color:var(--terracota-profundo); margin-bottom:10px;">
            PASSO A PASSO
          </div>
          <ol class="live-howto-steps">
            ${passos
              .map(
                (frase, idx) => `
                  <li class="live-howto-step-item">
                    <span class="live-howto-step-num">${idx + 1}</span>
                    <span class="live-howto-step-text">${frase}</span>
                  </li>
                `
              )
              .join('')}
          </ol>
        </div>

        <!-- Bloco "Erro comum" com 1 frase -->
        <div class="live-howto-error-box">
          <div class="t-caption" style="color:var(--terracota-profundo); margin-bottom:4px;">
            ERRO COMUM
          </div>
          <p style="font-size:15px; line-height:22px; color:var(--tinta); margin:0;">
            ${erroComum}
          </p>
        </div>

        <!-- Aviso articular obrigatório (13/18 tinta-3) -->
        <p style="font-size:13px; line-height:18px; color:var(--tinta-3); margin:0; text-align:center;">
          Sente na articulação? Pare e procure um profissional.
        </p>

        <!-- Botão primário "Entendi" (56px) -->
        <button
          type="button"
          id="btn-howto-understood"
          class="c-btn c-btn--primary c-btn--full"
          style="min-height:56px;"
        >
          <span>Entendi</span>
        </button>
      </div>
    `
  });

  document.getElementById('btn-howto-understood')?.addEventListener('click', () => {
    vibrate('selecao');
    closeBottomSheet('clay-sheet');
  });
}
