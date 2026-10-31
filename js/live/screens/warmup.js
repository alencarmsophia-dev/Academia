/**
 * ============================================================================
 * CLAY FIT — TELA DE AQUECIMENTO (B7) E ALONGAMENTO (B12)
 * /js/live/screens/warmup.js
 *
 * Especificações Prompt 3 (B7 e B12):
 * - Topo: X (48×48) à esquerda, legenda "AQUECIMENTO" (ou "ALONGAMENTO") ao
 *   centro (12/16 caixa alta em pílula  para contraste AA), "1 de 4"
 *   (ou "1 de 3") à direita.
 * - Cena O (única): silhueta de argila em  fazendo o movimento atual
 *   em loop de 2s, com arcos tracejados indicando o movimento; zona de 240px.
 * - Nome do movimento Fraunces 600 32/36; instrução de 1 frase 16/24.
 * - Cronômetro em anel de 160px (stroke 10,  sobre  a 25%) com
 *   os segundos no centro em Fraunces 56/56; 30s por movimento (45s se iniciante).
 *   Ao zerar, avança sozinho com transição horizontal de 240ms.
 * - Botões: "Pular aquecimento" / "Pular alongamento" (fantasma, 48px) na base;
 *   toque no anel pausa e retoma.
 * ============================================================================
 */

import { getIconSvg } from '../../ui/illustrations.js';
import { renderSceneOWarmup } from '../../ui/illustrations-live.js';
import { TimestampCountdown } from '../timer.js';
import { vibrate } from '../../motion.js';

export function renderWarmupScreen(sessao, { isCooldown = false } = {}) {
  const block = isCooldown ? sessao.alongamento || {} : sessao.aquecimento || {};
  const movimentos = Array.isArray(block.movimentos) && block.movimentos.length > 0
    ? block.movimentos
    : [
        {
          id: 'mob_ombro',
          nome: 'Círculos amplos de ombros',
          movimentoWarmup: 'ombro',
          instrucaoWarmup: 'Gire os ombros para trás, devagar, 10 vezes.'
        },
        {
          id: 'mob_quadril',
          nome: 'Transição de quadril',
          movimentoWarmup: 'quadril',
          instrucaoWarmup: 'Solte o quadril de um lado para o outro com calma.'
        },
        {
          id: 'mob_agachamento',
          nome: 'Agachamento leve sem peso',
          movimentoWarmup: 'agachamento',
          instrucaoWarmup: 'Desça devagar abrindo os quadris e suba empurrando o chão.'
        },
        {
          id: 'mob_tornozelo',
          nome: 'Elevação de joelhos e tornozelos',
          movimentoWarmup: 'joelhos',
          instrucaoWarmup: 'Eleve os joelhos alternadamente preparando a passada.'
        }
      ];

  const totalCount = isCooldown ? Math.min(3, movimentos.length) : Math.min(4, movimentos.length);
  const idx = Math.max(0, Math.min(totalCount - 1, Number(block.indiceMovimento || 0)));
  const movAtual = movimentos[idx] || movimentos[0];
  const duracaoSeg = isCooldown ? 30 : Number(block.duracaoPorMovSeg || 30);

  const r = 70;
  const circ = Number((2 * Math.PI * r).toFixed(2));

  const captionLabel = isCooldown ? 'ALONGAMENTO' : 'AQUECIMENTO';
  const skipLabel = isCooldown ? 'Pular alongamento' : 'Pular aquecimento';
  const instrucao =
    movAtual.instrucaoWarmup ||
    (Array.isArray(movAtual.comoFazer) && movAtual.comoFazer[0]) ||
    'Gire os ombros para trás, devagar, 10 vezes.';

  return `
    <div class="live-screen live-screen--warmup" id="live-warmup-root">
      <!-- Barra superior (56px + safe-area) -->
      <header class="live-topbar">
        <button
          type="button"
          class="live-icon-btn"
          data-live-action="open-exit-sheet"
          aria-label="Pausar ou sair do treino"
        >
          ${getIconSvg('fechar', 24)}
        </button>
        <span class="live-aa-pill live-aa-pill--caption">${captionLabel}</span>
        <span class="live-aa-pill" id="warmup-step-counter">${idx + 1} de ${totalCount}</span>
      </header>

      <!-- Conteúdo central com transição horizontal de 240ms -->
      <div class="live-warmup-stage" id="warmup-slide-stage">
        <!-- Cena O: zona de 240px de altura -->
        <div class="live-warmup-scene-zone" id="warmup-scene-slot">
          ${renderSceneOWarmup(movAtual.movimentoWarmup || movAtual.regiao || 'ombro')}
        </div>

        <div class="live-warmup-text">
          <h1 class="live-h1-warmup" tabindex="-1" id="warmup-mov-title">${movAtual.nome}</h1>
          <p class="live-warmup-inst" id="warmup-mov-inst">${instrucao}</p>
        </div>

        <!-- Cronômetro em anel de 160px (toque pausa e retoma) -->
        <button
          type="button"
          class="live-warmup-ring-btn"
          id="btn-warmup-ring-toggle"
          aria-label="Cronômetro de ${captionLabel.toLowerCase()}: ${duracaoSeg} segundos. Toque para pausar ou retomar."
        >
          <svg viewBox="0 0 160 160" width="160" height="160" aria-hidden="true">
            <circle
              cx="80"
              cy="80"
              r="${r}"
              fill="none"
              stroke="rgba(var(--energia-fg-rgb), 0.2)"
              stroke-width="10"
            />
            <circle
              id="warmup-ring-stroke"
              cx="80"
              cy="80"
              r="${r}"
              fill="none"
              stroke="var(--energia-fg)"
              stroke-width="10"
              stroke-linecap="round"
              stroke-dasharray="${circ}"
              stroke-dashoffset="0"
              transform="rotate(-90 80 80)"
            />
          </svg>
          <div class="live-warmup-ring-center">
            <span class="live-warmup-seconds" id="warmup-seconds-val">${duracaoSeg}</span>
            <span class="live-aa-pill live-aa-pill--tiny" id="warmup-pause-hint">Toque para pausar</span>
          </div>
        </button>
      </div>

      <!-- Rodapé com botão fantasma 48px -->
      <footer class="live-warmup-footer">
        <button
          type="button"
          class="live-ghost-btn"
          id="btn-skip-warmup"
          data-live-action="${isCooldown ? 'skip-cooldown' : 'skip-warmup'}"
        >
          <span>${skipLabel}</span>
        </button>
      </footer>
    </div>
  `;
}

export function bindWarmupScreen(root, sessao, { isCooldown = false, onAdvanceMovement, onFinishBlock, onOpenExit }) {
  const block = isCooldown ? sessao.alongamento || {} : sessao.aquecimento || {};
  const duracaoSeg = isCooldown ? 30 : Number(block.duracaoPorMovSeg || 30);
  const strokeEl = root.querySelector('#warmup-ring-stroke');
  const secEl = root.querySelector('#warmup-seconds-val');
  const hintEl = root.querySelector('#warmup-pause-hint');
  const stageEl = root.querySelector('#warmup-slide-stage');
  const r = 70;
  const circ = 2 * Math.PI * r;

  const timer = new TimestampCountdown({
    durationSec: duracaoSeg,
    onFrame: ({ fraction }) => {
      if (strokeEl) {
        const offset = circ * (1 - fraction);
        strokeEl.style.strokeDashoffset = offset.toFixed(2);
      }
    },
    onSecond: (remSec) => {
      if (secEl) secEl.textContent = String(remSec);
    },
    onComplete: () => {
      vibrate('selecao');
      if (stageEl) {
        stageEl.classList.add('is-sliding-out');
      }
      setTimeout(() => {
        onAdvanceMovement();
      }, 240);
    }
  }).start();

  root.querySelector('#btn-warmup-ring-toggle')?.addEventListener('click', () => {
    vibrate('selecao');
    const paused = timer.togglePause();
    if (hintEl) {
      hintEl.textContent = paused ? 'Pausado · Toque para retomar' : 'Toque para pausar';
    }
  });

  root.querySelector('#btn-skip-warmup')?.addEventListener('click', () => {
    vibrate('confirmacao');
    timer.stop();
    onFinishBlock(false);
  });

  root.querySelector('[data-live-action="open-exit-sheet"]')?.addEventListener('click', () => {
    vibrate('selecao');
    onOpenExit();
  });

  return () => {
    timer.stop();
  };
}
