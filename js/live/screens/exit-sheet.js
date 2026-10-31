/**
 * ============================================================================
 * CLAY FIT — FOLHA DE PAUSA E SAÍDA SEGURA (B13) + MENU DO EXERCÍCIO (B8) + G1
 * /js/live/screens/exit-sheet.js
 *
 * Especificações Prompt 3 (B8 e B13) + Correção Prompt 3.1 (G1):
 * - X no topo e botão voltar do aparelho abrem a MESMA folha "Pausar ou sair?":
 *   • Primário: "Continuar treino"
 *   • Secundário: "Pausar"
 *   • Fantasma: "Encerrar treino"
 * - G1: Toda ação dentro da folha que troca de tela/rota usa
 *   `closeBottomSheet('clay-sheet', { silent: true })` ANTES de navegar ou
 *   mudar a fase, disparando a ação no próximo tick (`requestAnimationFrame`).
 * ============================================================================
 */

import { openBottomSheet, closeBottomSheet } from '../../ui/bottom-sheet.js';
import { vibrate } from '../../motion.js';
import { countCompletedSets } from '../session.js';

export function openPauseOrExitSheet(sessao, { onContinue, onPause, onSaveAndSummary, onDiscard }) {
  openBottomSheet('clay-sheet', {
    title: 'Pausar ou sair?',
    contentHtml: `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <button
          type="button"
          id="btn-exit-continue"
          class="c-btn c-btn--primary c-btn--full"
          style="min-height:56px;"
        >
          <span>Continuar treino</span>
        </button>
        <button
          type="button"
          id="btn-exit-pause"
          class="c-btn c-btn--secondary c-btn--full"
          style="min-height:56px;"
        >
          <span>Pausar</span>
        </button>
        <button
          type="button"
          id="btn-exit-end"
          class="c-btn c-btn--ghost c-btn--full"
          style="min-height:52px;"
        >
          <span>Encerrar treino</span>
        </button>
      </div>
    `
  });

  document.getElementById('btn-exit-continue')?.addEventListener('click', () => {
    vibrate('selecao');
    closeBottomSheet('clay-sheet', { silent: true });
    requestAnimationFrame(() => {
      if (onContinue) onContinue();
    });
  });

  document.getElementById('btn-exit-pause')?.addEventListener('click', () => {
    vibrate('selecao');
    closeBottomSheet('clay-sheet', { silent: true });
    requestAnimationFrame(() => {
      if (onPause) onPause();
    });
  });

  document.getElementById('btn-exit-end')?.addEventListener('click', () => {
    vibrate('selecao');
    const setsDone = countCompletedSets(sessao);
    if (setsDone === 0 && sessao?.tipo !== 'corrida') {
      // B13: Se encerrar sem nenhuma série feita, não salvar nada e voltar para Hoje sem resumo
      closeBottomSheet('clay-sheet', { silent: true });
      requestAnimationFrame(() => {
        if (onDiscard) onDiscard();
      });
      return;
    }
    openSaveOrDiscardSheet(sessao, {
      onSaveAndSummary,
      onDiscard,
      onBack: () => {
        openPauseOrExitSheet(sessao, { onContinue, onPause, onSaveAndSummary, onDiscard });
      }
    });
  });
}

export function openSaveOrDiscardSheet(sessao, { onSaveAndSummary, onDiscard, onBack }) {
  openBottomSheet('clay-sheet', {
    title: 'Salvar o que você já fez?',
    contentHtml: `
      <div id="save-or-discard-body" style="display:flex; flex-direction:column; gap:12px;">
        <button
          type="button"
          id="btn-save-see-summary"
          class="c-btn c-btn--primary c-btn--full"
          style="min-height:56px;"
        >
          <span>Salvar e ver resumo</span>
        </button>
        <button
          type="button"
          id="btn-ask-discard"
          class="c-btn c-btn--secondary c-btn--full"
          style="min-height:56px; color:var(--erro); border-color:rgba(var(--erro-rgb), 0.35);"
        >
          <span>Descartar treino</span>
        </button>
        <button
          type="button"
          id="btn-back-to-workout"
          class="c-btn c-btn--ghost c-btn--full"
          style="min-height:52px;"
        >
          <span>Voltar</span>
        </button>
      </div>
    `
  });

  document.getElementById('btn-save-see-summary')?.addEventListener('click', () => {
    vibrate('confirmacao');
    closeBottomSheet('clay-sheet', { silent: true });
    requestAnimationFrame(() => {
      if (onSaveAndSummary) onSaveAndSummary();
    });
  });

  document.getElementById('btn-back-to-workout')?.addEventListener('click', () => {
    vibrate('selecao');
    if (onBack) onBack();
    else closeBottomSheet('clay-sheet', { silent: true });
  });

  document.getElementById('btn-ask-discard')?.addEventListener('click', () => {
    vibrate('erro');
    const body = document.getElementById('save-or-discard-body');
    if (!body) return;
    body.innerHTML = `
      <p class="t-body" style="color:var(--tinta-2); margin: 0 0 8px;">
        Tem certeza? Esse treino não será salvo.
      </p>
      <button
        type="button"
        id="btn-confirm-discard-final"
        class="c-btn c-btn--secondary c-btn--full"
        style="min-height:56px; color:var(--erro); border-color:var(--erro);"
      >
        <span>Descartar treino</span>
      </button>
      <button
        type="button"
        id="btn-cancel-discard-final"
        class="c-btn c-btn--primary c-btn--full"
        style="min-height:56px;"
      >
        <span>Manter treino</span>
      </button>
    `;

    document.getElementById('btn-confirm-discard-final')?.addEventListener('click', () => {
      vibrate('erro');
      closeBottomSheet('clay-sheet', { silent: true });
      requestAnimationFrame(() => {
        if (onDiscard) onDiscard();
      });
    });

    document.getElementById('btn-cancel-discard-final')?.addEventListener('click', () => {
      vibrate('selecao');
      closeBottomSheet('clay-sheet', { silent: true });
    });
  });
}

/**
 * B2 — Folha para sessão que ficou aberta por mais de 6 horas:
 * "Esse treino ficou aberto. Quer salvar o que você fez?" com "Salvar" e "Descartar".
 */
export function openStaleSessionSheet(sessao, { onSave, onDiscard }) {
  openBottomSheet('clay-sheet', {
    title: 'Esse treino ficou aberto. Quer salvar o que você fez?',
    contentHtml: `
      <p class="t-body" style="color:var(--tinta-2); margin-bottom:20px;">
        ${sessao.nome || 'Seu treino'} ficou aberto há mais de 6 horas.
      </p>
      <div style="display:flex; flex-direction:column; gap:12px;">
        <button
          type="button"
          id="btn-stale-save"
          class="c-btn c-btn--primary c-btn--full"
          style="min-height:56px;"
        >
          <span>Salvar</span>
        </button>
        <button
          type="button"
          id="btn-stale-discard"
          class="c-btn c-btn--secondary c-btn--full"
          style="min-height:56px; color:var(--erro);"
        >
          <span>Descartar</span>
        </button>
      </div>
    `
  });

  document.getElementById('btn-stale-save')?.addEventListener('click', () => {
    vibrate('confirmacao');
    closeBottomSheet('clay-sheet', { silent: true });
    requestAnimationFrame(() => {
      if (onSave) onSave();
    });
  });

  document.getElementById('btn-stale-discard')?.addEventListener('click', () => {
    vibrate('erro');
    closeBottomSheet('clay-sheet', { silent: true });
    requestAnimationFrame(() => {
      if (onDiscard) onDiscard();
    });
  });
}

/**
 * B8 (1) — Menu "⋯" no canto superior direito da tela de Exercício:
 * "Como fazer", "Trocar exercício", "Pular exercício", "Registrar incômodo".
 */
export function openExerciseMoreMenuSheet(ex, { onHowTo, onSwap, onSkipExercise, onReportDiscomfort }) {
  openBottomSheet('clay-sheet', {
    title: ex.nome || 'Opções do exercício',
    contentHtml: `
      <div id="ex-more-menu-body" style="display:flex; flex-direction:column; gap:10px;">
        <button type="button" id="btn-menu-howto" class="c-btn c-btn--secondary c-btn--full" style="justify-content:flex-start; padding-inline:20px;">
          <span>Como fazer</span>
        </button>
        <button type="button" id="btn-menu-swap" class="c-btn c-btn--secondary c-btn--full" style="justify-content:flex-start; padding-inline:20px;">
          <span>Trocar exercício</span>
        </button>
        <button type="button" id="btn-menu-skip-ex" class="c-btn c-btn--secondary c-btn--full" style="justify-content:flex-start; padding-inline:20px;">
          <span>Pular exercício</span>
        </button>
        <button type="button" id="btn-menu-discomfort" class="c-btn c-btn--secondary c-btn--full" style="justify-content:flex-start; padding-inline:20px; color:var(--terracota-profundo);">
          <span>Registrar incômodo</span>
        </button>
      </div>
    `
  });

  document.getElementById('btn-menu-howto')?.addEventListener('click', () => {
    vibrate('selecao');
    closeBottomSheet('clay-sheet', { silent: true });
    requestAnimationFrame(() => {
      if (onHowTo) onHowTo();
    });
  });

  document.getElementById('btn-menu-swap')?.addEventListener('click', () => {
    vibrate('confirmacao');
    closeBottomSheet('clay-sheet', { silent: true });
    requestAnimationFrame(() => {
      if (onSwap) onSwap();
    });
  });

  document.getElementById('btn-menu-skip-ex')?.addEventListener('click', () => {
    vibrate('selecao');
    closeBottomSheet('clay-sheet', { silent: true });
    requestAnimationFrame(() => {
      if (onSkipExercise) onSkipExercise();
    });
  });

  document.getElementById('btn-menu-discomfort')?.addEventListener('click', () => {
    vibrate('selecao');
    const body = document.getElementById('ex-more-menu-body');
    if (!body) return;
    body.innerHTML = `
      <p class="t-small" style="color:var(--tinta-2); margin:0 0 8px;">
        Onde você sentiu incômodo? Vamos trocar o exercício e proteger essa região por 7 dias.
      </p>
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px;">
        <button type="button" class="c-btn c-btn--secondary" data-discomfort-region="Joelho"><span>Joelho</span></button>
        <button type="button" class="c-btn c-btn--secondary" data-discomfort-region="Ombro"><span>Ombro</span></button>
        <button type="button" class="c-btn c-btn--secondary" data-discomfort-region="Lombar"><span>Lombar</span></button>
      </div>
    `;
    body.querySelectorAll('[data-discomfort-region]').forEach((b) => {
      b.addEventListener('click', () => {
        const reg = b.dataset.discomfortRegion;
        vibrate('confirmacao');
        closeBottomSheet('clay-sheet', { silent: true });
        requestAnimationFrame(() => {
          if (onReportDiscomfort) onReportDiscomfort(reg);
        });
      });
    });
  });
}
