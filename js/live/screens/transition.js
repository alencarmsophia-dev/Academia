/**
 * ============================================================================
 * CLAY FIT — TRANSIÇÃO ENTRE EXERCÍCIOS E PERGUNTA DE ALONGAMENTO (A2, B12, M6, V1)
 * /js/live/screens/transition.js
 *
 * Especificações Prompt 3, Prompt 3.1 (B12, M6, V1) e Prompt 4 (A2):
 * - Faixa de conquista: "Exercício concluído" e "{n} séries · {carga} kg"
 *   (usando `formatKg(n)` com vírgula decimal e concordância "1 série" / "2 séries").
 * - Cartão "A seguir" ocupando a tela com cena animada, nome Fraunces 32/36,
 *   "4 séries · 8 repetições · descanso 90 s", botão gigante "Começar" (88px) e
 *   barra de contagem de 6s que inicia sozinha (com botão "Esperar" que cancel).
 * - A2: Define `--live-toast-top` sobre a área da cena `.live-next-exercise-scene`.
 * ============================================================================
 */

import { getIconSvg } from '../../ui/illustrations.js';
import { renderEnergyExerciseScene, renderSceneOWarmup } from '../../ui/illustrations-live.js';
import { scaleMs, formatKg } from '../timer.js';
import { vibrate } from '../../motion.js';

export function renderTransitionScreen(sessao) {
  const estado = sessao.maquinaEstado || {};
  const completedIdx = Math.max(0, Number(estado.exercicioConcluidoIdx ?? estado.exercicioIdx - 1));
  const nextIdx = Math.max(0, Number(estado.exercicioIdx || 0));
  const exercicios = sessao.exercicios || [];
  const exDone = exercicios[completedIdx] || exercicios[0] || {};
  const exNext = exercicios[nextIdx] || exercicios[0] || {};

  const doneSeries = (exDone.series || []).filter((s) => s.feita && !s.pulada);
  const doneCount = doneSeries.length || (exDone.series || []).length || 3;
  const maxCargaDone = doneSeries.length > 0
    ? Math.max(...doneSeries.map((s) => Number(s.carga || 0)))
    : Number(exDone.cargaSugerida || 0);

  const serieWordDone = doneCount === 1 ? '1 série' : `${doneCount} séries`;
  const doneStatsText =
    maxCargaDone > 0
      ? `${serieWordDone} · ${formatKg(maxCargaDone)} kg`
      : `${serieWordDone} ${doneCount === 1 ? 'concluída' : 'concluídas'}`;

  const nextSeriesCount = (exNext.series || []).length || 3;
  const nextSerieWord = nextSeriesCount === 1 ? '1 série' : `${nextSeriesCount} séries`;
  const nextReps = exNext.porTempo
    ? `${exNext.duracaoSerieSeg || 35} s`
    : `${(exNext.series && exNext.series[0]?.alvoReps) || 10} repetições`;
  const nextRest = `${exNext.descansoSeg || 60} s`;

  return `
    <div class="live-screen live-screen--transition" id="live-transition-root">
      <header class="live-topbar">
        <button
          type="button"
          class="live-icon-btn"
          data-live-action="open-exit-sheet"
          aria-label="Pausar ou sair do treino"
        >
          ${getIconSvg('fechar', 24)}
        </button>
        <span class="live-aa-pill live-aa-pill--caption">A SEGUIR</span>
        <span class="live-aa-pill">Exercício ${nextIdx + 1} de ${exercicios.length}</span>
      </header>

      <section class="live-achievement-banner" id="transition-achievement-banner">
        <span class="live-achievement-check">
          <svg viewBox="0 0 28 28" width="24" height="24" fill="none" stroke="var(--energia-chip)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path class="live-check-draw-360" d="M6 14.5 11.5 20 22 8.5"/>
          </svg>
        </span>
        <div>
          <div class="live-aa-pill live-aa-pill--tiny">Exercício concluído · ${exDone.nome || ''}</div>
          <div class="live-achievement-stats" id="transition-done-stats">${doneStatsText}</div>
        </div>
      </section>

      <div class="live-next-exercise-card" id="transition-next-card">
        <div class="live-next-exercise-scene" id="transition-scene-zone">
          ${renderEnergyExerciseScene(exNext, { theme: 'energia' })}
        </div>

        <span class="live-aa-pill live-aa-pill--caption">PRÓXIMO EXERCÍCIO</span>
        <h1 class="live-h1-warmup" tabindex="-1">${exNext.nome}</h1>
        <p class="live-next-exercise-meta">
          ${nextSerieWord} · ${nextReps} · descanso ${nextRest}
        </p>

        <div class="live-transition-wait-row">
          <button
            type="button"
            id="btn-transition-wait"
            class="live-aa-pill live-wait-btn"
          >
            <span id="transition-wait-label">Avançando em 6 s · Esperar</span>
          </button>
        </div>
      </div>

      <footer class="live-giant-footer">
        <div class="live-auto-bar-track" id="transition-auto-bar-track">
          <div class="live-auto-bar-fill" id="transition-auto-bar-fill"></div>
        </div>
        <button
          type="button"
          id="btn-transition-start-next"
          class="live-giant-btn"
        >
          <span>Começar</span>
        </button>
      </footer>
    </div>
  `;
}

export function bindTransitionScreen(root, sessao, { onStartNextExercise, onOpenExit }) {
  const autoFill = root.querySelector('#transition-auto-bar-fill');
  const waitBtn = root.querySelector('#btn-transition-wait');
  const waitLabel = root.querySelector('#transition-wait-label');
  const sceneZone = root.querySelector('#transition-scene-zone');

  const syncToastTop = () => {
    if (sceneZone) {
      const r = sceneZone.getBoundingClientRect();
      if (r.height > 0) {
        document.documentElement.style.setProperty(
          '--live-toast-top',
          `${Math.max(58, Math.round(r.top + 4))}px`
        );
      }
    }
  };
  syncToastTop();
  requestAnimationFrame(syncToastTop);
  const trSyncT1 = setTimeout(syncToastTop, 180);
  const trSyncT2 = setTimeout(syncToastTop, 400);

  const totalAutoMs = scaleMs(6000);
  let autoTimeout = null;
  let cancelled = false;

  requestAnimationFrame(() => {
    if (autoFill) {
      autoFill.style.transition = `transform ${totalAutoMs}ms linear`;
      autoFill.style.transform = 'scaleX(0)';
    }
  });

  autoTimeout = setTimeout(() => {
    if (!cancelled && onStartNextExercise) {
      vibrate('confirmacao');
      onStartNextExercise();
    }
  }, totalAutoMs);

  waitBtn?.addEventListener('click', () => {
    vibrate('selecao');
    cancelled = true;
    clearTimeout(trSyncT1);
    clearTimeout(trSyncT2);
    if (autoTimeout) {
      clearTimeout(autoTimeout);
      autoTimeout = null;
    }
    if (autoFill) {
      autoFill.style.transition = 'none';
      autoFill.style.transform = 'scaleX(1)';
    }
    if (waitLabel) {
      waitLabel.textContent = 'No seu tempo · Toque em Começar quando quiser';
    }
  });

  root.querySelector('#btn-transition-start-next')?.addEventListener('click', () => {
    vibrate('confirmacao');
    cancelled = true;
    if (autoTimeout) clearTimeout(autoTimeout);
    if (onStartNextExercise) onStartNextExercise();
  });

  root.querySelector('[data-live-action="open-exit-sheet"]')?.addEventListener('click', () => {
    vibrate('selecao');
    if (onOpenExit) onOpenExit();
  });

  window.addEventListener('resize', syncToastTop);

  return () => {
    cancelled = true;
    if (autoTimeout) clearTimeout(autoTimeout);
    window.removeEventListener('resize', syncToastTop);
  };
}

export function renderCooldownPromptScreen() {
  return `
    <div class="live-screen live-screen--transition" id="live-cooldown-prompt-root">
      <header class="live-topbar">
        <span></span>
        <span class="live-aa-pill live-aa-pill--caption">FINALIZAÇÃO</span>
        <span></span>
      </header>

      <div class="live-next-exercise-card" style="justify-content:center; text-align:center;">
        <div class="live-warmup-scene-zone">
          ${renderSceneOWarmup('coluna')}
        </div>
        <span class="live-aa-pill live-aa-pill--caption">SÉRIES CONCLUÍDAS</span>
        <h1 class="live-h1-warmup" tabindex="-1">Alongar 2 minutos?</h1>
        <p class="live-next-exercise-meta">
          3 movimentos leves de mobilidade de 30 s para desacelerar o corpo.
        </p>
      </div>

      <footer class="live-giant-footer" style="display:flex; flex-direction:column; gap:12px;">
        <button
          type="button"
          id="btn-cooldown-yes"
          class="live-giant-btn"
        >
          <span>Sim, vamos</span>
        </button>
        <button
          type="button"
          id="btn-cooldown-skip"
          class="live-ghost-btn"
          style="width:100%;"
        >
          <span>Pular</span>
        </button>
      </footer>
    </div>
  `;
}

export function bindCooldownPromptScreen(root, { onStartCooldown, onSkipCooldown }) {
  root.querySelector('#btn-cooldown-yes')?.addEventListener('click', () => {
    vibrate('confirmacao');
    if (onStartCooldown) onStartCooldown();
  });

  root.querySelector('#btn-cooldown-skip')?.addEventListener('click', () => {
    vibrate('selecao');
    if (onSkipCooldown) onSkipCooldown();
  });

  return () => {};
}
