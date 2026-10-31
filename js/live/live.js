import { sincronizarMetaThemeColor, corToken } from '../ui/theme.js';
/* ============================================================================
 * PLANO DE ARQUITETURA — TREINO AO VIVO (js/live/live.js — máx. 25 linhas)
 * ----------------------------------------------------------------------------
 * 1. Máquina de Estados Explícita (`maquinaEstado.fase` persistida no `store`):
 *    PRE -> AQUECIMENTO -> [EXERCICIO(i) <-> DESCANSO -> TRANSICAO]xN ->
 *    PERGUNTA_ALONGAMENTO -> ALONGAMENTO -> RESUMO -> CELEBRACAO -> HOJE.
 *    Estados auxiliares: PAUSADO (registra intervalo em `pausas[]`) e CORRIDA (B16).
 * 2. Persistência Resiliente (`session.js` + `store.js`):
 *    Cada série feita, ajuste de carga/reps e troca de estado grava em `store`,
 *    garantindo retomada exata após reload na mesma fase (inclusive RESUMO).
 * 3. Precisão de Tempo e Sensores (`timer.js`, `audio.js`, `wake.js`):
 *    Cronômetros usam `Date.now()` (`?fast=1` divide por 10), recalculam após
 *    aba oculta, disparam tons 880Hz/1320Hz e mantêm tela acesa via Wake Lock.
 * 4. Ergonomia Modo Energia (`live.css` + `screens/*` + correções G1/G2/M1–M6):
 *    Alvos >=48px, botão gigante 88px sempre visível em 360x640, toast no topo,
 *    fechamento silencioso de folhas na montagem e limpeza de toasts ao sair.
 * ============================================================================ */

import { store } from '../store.js';
import { clayFlow } from '../gl/clayflow.js';
import { vibrate } from '../motion.js';
import { showToast, clearToasts, resolveEnergyToastPlacement } from '../ui/toast.js';
import { closeBottomSheet, closeAllSheets, isAnySheetOpen } from '../ui/bottom-sheet.js';
import { getIconSvg } from '../ui/illustrations.js';
import { renderEnergyExerciseScene } from '../ui/illustrations-live.js';
import { wakeLock } from './wake.js';
import { scaleMs, nowMs, formatElapsedClock } from './timer.js';
import {
  getOrRestoreSession,
  startNewLiveSession,
  swapCurrentExercise,
  computeActiveSeconds
} from './session.js';
import { renderWarmupScreen, bindWarmupScreen } from './screens/warmup.js';
import { renderExerciseScreen, bindExerciseScreen } from './screens/exercise.js';
import { renderRestScreen, bindRestScreen } from './screens/rest.js';
import {
  renderTransitionScreen,
  bindTransitionScreen,
  renderCooldownPromptScreen,
  bindCooldownPromptScreen
} from './screens/transition.js';
import { renderPauseScreen, bindPauseScreen } from './screens/pause.js';
import {
  openPauseOrExitSheet,
  openExerciseMoreMenuSheet
} from './screens/exit-sheet.js';
import { openHowToSheet } from './screens/how-to-sheet.js';
import { renderFinishSummaryScreen, bindFinishSummaryScreen } from './screens/finish.js';
import { renderCelebrateScreen, bindCelebrateScreen } from './screens/celebrate.js';
import { mountLiveRun, unmountLiveRun } from '../run/run.js';

let currentScreenCleanup = null;
let activeSessionId = null;
let undoSnapshot = null;
let keydownBound = false;
let runIntervalId = null;

function cleanupActiveScreen() {
  unmountLiveRun();
  if (typeof currentScreenCleanup === 'function') {
    try {
      currentScreenCleanup();
    } catch (_) {}
    currentScreenCleanup = null;
  }
  if (runIntervalId) {
    clearInterval(runIntervalId);
    runIntervalId = null;
  }
}

/**
 * B6 — TELA PRÉ-TREINO (1,6s, automática, pulável com toque)
 * Fundo terracota com shader TERRACOTA intensidade .35. Contagem "3 · 2 · 1"
 * em Métrica 96/96 Fraunces 600, cada número entrando com scale(1.4->1) + fade
 * em 300ms. Abaixo, nome do treino em Fraunces 28/34 e "6 exercícios · 45 min".
 */
function renderPreWorkoutScreen(sessao) {
  const numEx = (sessao.exercicios || []).length || 6;
  const durMin = Number(sessao.duracaoEstimadaMin || 45);
  const subLabel =
    sessao.tipo === 'corrida'
      ? `Corrida contínua · ${durMin} min`
      : `${numEx} ${numEx === 1 ? 'exercício' : 'exercícios'} · ${durMin} min`;

  return `
    <div
      class="live-screen live-screen--pre"
      id="live-pre-root"
      role="button"
      tabindex="0"
      aria-label="Iniciando ${sessao.nome}. Toque para pular contagem."
    >
      <div id="shader-host-pre" class="live-fullscreen-shader" aria-hidden="true"></div>
      <div class="live-pre-center">
        <span class="live-aa-pill live-aa-pill--caption">PREPARAR</span>
        <div class="live-pre-countdown-num" id="live-pre-num">3</div>
        <h1 class="live-pre-title" tabindex="-1">${sessao.nome}</h1>
        <div class="live-aa-pill" style="margin-top:8px;">${subLabel}</div>
      </div>
      <footer class="live-warmup-footer">
        <span class="live-aa-pill live-aa-pill--tiny">Toque em qualquer lugar para começar agora</span>
      </footer>
    </div>
  `;
}

function bindPreWorkoutScreen(root, sessao, { onDone }) {
  const numEl = root.querySelector('#live-pre-num');
  const stepMs = scaleMs(520);
  let step = 3;
  let finished = false;

  const finishPre = () => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    vibrate('confirmacao');
    onDone();
  };

  vibrate('selecao');
  const timer = setInterval(() => {
    step -= 1;
    if (step >= 1) {
      if (numEl) {
        numEl.textContent = String(step);
        numEl.classList.remove('is-popping');
        void numEl.offsetWidth;
        numEl.classList.add('is-popping');
      }
      vibrate('selecao');
    } else {
      finishPre();
    }
  }, stepMs);

  const preRoot = root.querySelector('#live-pre-root');
  preRoot?.addEventListener('click', finishPre);

  return () => {
    finished = true;
    clearInterval(timer);
  };
}

/**
 * B16 — TREINO DE CORRIDA (PROVISÓRIO NESTA ETAPA)
 * Tempo decorrido em 96/96, botão gigante "Pausar" e "Finalizar" (88px),
 * sem GPS e sem mapa. Ao finalizar, usa o mesmo Resumo e salva com tipo 'corrida'.
 */
function renderProvisionalRunScreen(sessao) {
  const isPaused = sessao.status === 'pausada';
  const elapsedSec = computeActiveSeconds(sessao);
  const clockStr = formatElapsedClock(elapsedSec);

  return `
    <div class="live-screen live-screen--exercise" id="live-run-root">
      <header class="live-topbar">
        <button
          type="button"
          class="live-icon-btn"
          data-live-action="open-exit-sheet"
          aria-label="Pausar ou sair da corrida"
        >
          ${getIconSvg('fechar', 24)}
        </button>
        <span class="live-aa-pill live-aa-pill--caption">CORRIDA AO VIVO</span>
        <span style="width:48px;height:48px;"></span>
      </header>

      <div class="live-pause-center" style="gap:14px;">
        <div style="height:140px; display:flex; align-items:center; justify-content:center;">
          ${renderEnergyExerciseScene({ grupo: 'Corrida', nome: sessao.nome }, { theme: 'energia' })}
        </div>
        <span class="live-aa-pill">${sessao.nome || 'Corrida ritmada'}</span>
        <h1
          id="live-run-elapsed-clock"
          class="live-rest-timer-digits ${isPaused ? 'is-pulsing-pause' : ''}"
          tabindex="-1"
        >
          ${clockStr}
        </h1>
        <span class="live-aa-pill live-aa-pill--tiny">
          ${isPaused ? 'Corrida pausada' : 'Tempo ativo em andamento'}
        </span>
      </div>

      <footer class="live-giant-footer" style="display:flex; flex-direction:column; gap:12px;">
        <button
          type="button"
          id="btn-run-pause-toggle"
          class="live-giant-btn"
        >
          <span>${isPaused ? 'Continuar' : 'Pausar'}</span>
        </button>
        <button
          type="button"
          id="btn-run-finish"
          class="live-giant-btn live-giant-btn--secondary"
        >
          <span>Finalizar</span>
        </button>
      </footer>
    </div>
  `;
}

function bindProvisionalRunScreen(root, sessao, { onTogglePause, onFinishRun, onOpenExit }) {
  const clockEl = root.querySelector('#live-run-elapsed-clock');

  if (sessao.status !== 'pausada') {
    runIntervalId = setInterval(() => {
      const latest = getOrRestoreSession(sessao.id);
      if (!latest || latest.status === 'pausada') return;
      const sec = computeActiveSeconds(latest);
      if (clockEl) clockEl.textContent = formatElapsedClock(sec);
    }, 500);
  }

  root.querySelector('#btn-run-pause-toggle')?.addEventListener('click', () => {
    vibrate('selecao');
    if (onTogglePause) onTogglePause();
  });

  root.querySelector('#btn-run-finish')?.addEventListener('click', () => {
    vibrate('confirmacao');
    if (onFinishRun) onFinishRun();
  });

  root.querySelector('[data-live-action="open-exit-sheet"]')?.addEventListener('click', () => {
    vibrate('selecao');
    if (onOpenExit) onOpenExit();
  });

  return () => {
    if (runIntervalId) {
      clearInterval(runIntervalId);
      runIntervalId = null;
    }
  };
}

/**
 * Monta e atualiza a máquina de estados do Treino ao Vivo dentro de `hostEl`.
 */
export function mountLiveWorkout(hostEl, sessaoParam = 'hoje', { getDefaultWorkout, onNavigateHome }) {
  cleanupActiveScreen();
  // G1 (c): garante que qualquer folha aberta em #/hoje foi fechada e limpa
  closeAllSheets({ silent: true, clearContent: true });
  // G2 (c): limpa todos os toasts ao montar a rota de treino
  clearToasts();
  wakeLock.request();

  let sessao = getOrRestoreSession(sessaoParam !== 'hoje' ? sessaoParam : null);

  if (!sessao) {
    const defaultWorkout = getDefaultWorkout ? getDefaultWorkout() : { nome: 'Treino de hoje', grupoPrincipal: 'Peito' };
    if (sessaoParam === 'corrida') {
      sessao = startNewLiveSession({
        sessaoId: `ses_corrida_${Date.now()}`,
        nome: 'Corrida livre',
        grupoPrincipal: 'Corrida',
        tipo: 'corrida',
        duracaoMin: 30
      });
    } else if (sessaoParam === 'rapido15') {
      sessao = startNewLiveSession({
        ...defaultWorkout,
        sessaoId: `ses_rapido_${Date.now()}`,
        nome: `${defaultWorkout.nome} · Rápido 15 min`,
        duracaoMin: 20
      });
    } else {
      sessao = startNewLiveSession(defaultWorkout);
    }
  }

  activeSessionId = sessao.id;

  // Parte C: Se a sessão for de corrida, delega ao módulo completo de Corrida Ao Vivo (GPS)
  if (sessao.tipo === "corrida") {
    return mountLiveRun(hostEl, sessao, { onNavigateHome });
  }

  const setPhase = (novaFase, extraStatePatch = {}, topPatch = {}) => {
    const cur = getOrRestoreSession(activeSessionId) || sessao;
    const prevMaq = cur.maquinaEstado || {};
    sessao = store.atualizarSessao(cur.id, {
      ...topPatch,
      maquinaEstado: {
        ...prevMaq,
        ...extraStatePatch,
        fase: novaFase,
        ultimoTimestampAtivo: nowMs()
      }
    });
    renderCurrentPhase();
  };

  const enterPause = () => {
    clearToasts();
    const cur = getOrRestoreSession(activeSessionId) || sessao;
    const maq = cur.maquinaEstado || {};
    if (maq.fase === 'PAUSADO') return;

    const pausas = [...(cur.pausas || []), { de: new Date(nowMs()).toISOString(), ate: null }];
    sessao = store.atualizarSessao(cur.id, {
      status: 'pausada',
      pausas,
      maquinaEstado: {
        ...maq,
        faseAnteriorPausa: maq.fase,
        fase: 'PAUSADO'
      }
    });
    renderCurrentPhase();
  };

  const resumeFromPause = () => {
    const cur = getOrRestoreSession(activeSessionId) || sessao;
    const maq = cur.maquinaEstado || {};
    const pausas = [...(cur.pausas || [])];
    let lastPauseDurationMs = 0;

    if (pausas.length > 0 && !pausas[pausas.length - 1].ate) {
      const ateIso = new Date(nowMs()).toISOString();
      pausas[pausas.length - 1].ate = ateIso;
      lastPauseDurationMs = Math.max(
        0,
        new Date(ateIso).getTime() - new Date(pausas[pausas.length - 1].de).getTime()
      );
    }

    const nextFase = maq.faseAnteriorPausa || 'EXERCICIO';
    const nextDescansoFimMs =
      maq.descansoFimMs && lastPauseDurationMs > 0
        ? maq.descansoFimMs + lastPauseDurationMs
        : maq.descansoFimMs;

    sessao = store.atualizarSessao(cur.id, {
      status: 'andamento',
      pausas,
      maquinaEstado: {
        ...maq,
        fase: nextFase,
        faseAnteriorPausa: null,
        descansoFimMs: nextDescansoFimMs
      }
    });
    renderCurrentPhase();
  };

  const handleOpenExitSheet = () => {
    const cur = getOrRestoreSession(activeSessionId) || sessao;
    openPauseOrExitSheet(cur, {
      onContinue: () => {},
      onPause: () => enterPause(),
      onSaveAndSummary: () => {
        clearToasts();
        setPhase('RESUMO', {}, { status: 'andamento', duracaoSeg: computeActiveSeconds(cur) });
      },
      onDiscard: () => {
        cleanupActiveScreen();
        clearToasts();
        wakeLock.release();
        store.descartarSessao(cur.id);
        if (onNavigateHome) onNavigateHome();
      }
    });
  };

  const renderCurrentPhase = () => {
    cleanupActiveScreen();
    clayFlow.unmount();

    sessao = getOrRestoreSession(activeSessionId) || sessao;
    if (!sessao || !hostEl) return;

    const maq = sessao.maquinaEstado || { fase: 'PRE', exercicioIdx: 0, serieIdx: 0 };
    const fase = maq.fase || 'PRE';

    // Ajusta modo de cor (Modo Energia vs Resumo/Celebração claro)
    const isLightSummary = fase === 'RESUMO' || fase === 'CELEBRACAO';
    if (isLightSummary) {
      clearToasts();
      closeAllSheets({ silent: true, clearContent: true });
      document.documentElement.removeAttribute('data-mode');
      document.body.classList.remove('modo-energia');
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      sincronizarMetaThemeColor();
    } else {
      document.documentElement.setAttribute('data-mode', 'energia');
      document.body.classList.add('modo-energia');
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      sincronizarMetaThemeColor(corToken('--terracota'));
    }

    // 1. Fase PRE (contagem 3 · 2 · 1 de 1,6s)
    if (fase === 'PRE') {
      hostEl.innerHTML = renderPreWorkoutScreen(sessao);
      const shaderHost = hostEl.querySelector('#shader-host-pre');
      if (shaderHost) clayFlow.mount(shaderHost, { palette: 'TERRACOTA', intensity: 0.35 });

      currentScreenCleanup = bindPreWorkoutScreen(hostEl, sessao, {
        onDone: () => {
          if (sessao.tipo === 'corrida') {
            setPhase('CORRIDA');
          } else {
            setPhase('AQUECIMENTO');
          }
        }
      });
      focusScreenH1(hostEl);
      return;
    }

    // 2. Fase CORRIDA (B16 — Provisório nesta etapa)
    if (fase === 'CORRIDA') {
      hostEl.innerHTML = renderProvisionalRunScreen(sessao);
      currentScreenCleanup = bindProvisionalRunScreen(hostEl, sessao, {
        onTogglePause: () => {
          if (sessao.status === 'pausada') resumeFromPause();
          else enterPause();
        },
        onFinishRun: () => {
          setPhase('RESUMO', {}, { status: 'andamento', duracaoSeg: computeActiveSeconds(sessao) });
        },
        onOpenExit: handleOpenExitSheet
      });
      focusScreenH1(hostEl);
      return;
    }

    // 3. Fase AQUECIMENTO (B7 — 4 movimentos de mobilidade)
    if (fase === 'AQUECIMENTO') {
      hostEl.innerHTML = renderWarmupScreen(sessao, { isCooldown: false });
      currentScreenCleanup = bindWarmupScreen(hostEl, sessao, {
        isCooldown: false,
        onAdvanceMovement: () => {
          const cur = getOrRestoreSession(activeSessionId) || sessao;
          const aq = cur.aquecimento || {};
          const nextIdx = Number(aq.indiceMovimento || 0) + 1;
          const totalMovs = Math.min(4, (aq.movimentos || []).length || 4);
          if (nextIdx < totalMovs) {
            sessao = store.atualizarSessao(cur.id, {
              aquecimento: { ...aq, indiceMovimento: nextIdx }
            });
            renderCurrentPhase();
          } else {
            sessao = store.atualizarSessao(cur.id, {
              aquecimento: { ...aq, feito: true }
            });
            setPhase('EXERCICIO', { exercicioIdx: 0, serieIdx: 0 });
          }
        },
        onFinishBlock: (feito = false) => {
          const cur = getOrRestoreSession(activeSessionId) || sessao;
          store.atualizarSessao(cur.id, {
            aquecimento: { ...(cur.aquecimento || {}), feito }
          });
          setPhase('EXERCICIO', { exercicioIdx: 0, serieIdx: 0 });
        },
        onOpenExit: handleOpenExitSheet
      });
      focusScreenH1(hostEl);
      return;
    }

    // 4. Fase EXERCICIO (B8 e B9)
    if (fase === 'EXERCICIO') {
      hostEl.innerHTML = renderExerciseScreen(sessao);
      currentScreenCleanup = bindExerciseScreen(hostEl, sessao, {
        onUpdateCurrentSet: ({ carga, reps }) => {
          const cur = getOrRestoreSession(activeSessionId) || sessao;
          const eIdx = Number(cur.maquinaEstado?.exercicioIdx || 0);
          const sIdx = Number(cur.maquinaEstado?.serieIdx || 0);
          const novosEx = (cur.exercicios || []).map((ex, i) => {
            if (i !== eIdx) return ex;
            const novasSeries = (ex.series || []).map((s, j) =>
              j === sIdx ? { ...s, carga, reps } : s
            );
            return { ...ex, series: novasSeries };
          });
          sessao = store.atualizarSessao(cur.id, { exercicios: novosEx });
        },
        onToggleBodyweightVest: () => {
          const cur = getOrRestoreSession(activeSessionId) || sessao;
          const eIdx = Number(cur.maquinaEstado?.exercicioIdx || 0);
          const novosEx = (cur.exercicios || []).map((ex, i) => {
            if (i !== eIdx) return ex;
            const nextVest = !ex.usaColete;
            const novasSeries = (ex.series || []).map((s) => ({
              ...s,
              carga: nextVest ? Math.max(5, Number(s.carga || 5)) : 0
            }));
            return { ...ex, usaColete: nextVest, series: novasSeries };
          });
          sessao = store.atualizarSessao(cur.id, { exercicios: novosEx });
          renderCurrentPhase();
        },
        onCompleteSet: ({ carga, reps, esforco }) => {
          const cur = getOrRestoreSession(activeSessionId) || sessao;
          const eIdx = Number(cur.maquinaEstado?.exercicioIdx || 0);
          const sIdx = Number(cur.maquinaEstado?.serieIdx || 0);

          // Salva snapshot para o botão "Desfazer" do toast de 5s (B8.9)
          undoSnapshot = JSON.parse(JSON.stringify(cur));

          const exAtual = (cur.exercicios || [])[eIdx];
          const totalSeries = (exAtual?.series || []).length || 1;
          const totalExercicios = (cur.exercicios || []).length || 1;

          const novosExercicios = (cur.exercicios || []).map((ex, i) => {
            if (i !== eIdx) return ex;
            const novasSeries = (ex.series || []).map((s, j) => {
              if (j === sIdx) {
                return {
                  ...s,
                  carga,
                  reps,
                  esforco: esforco || 'medio',
                  feita: true,
                  pulada: false
                };
              }
              // Propaga a carga ajustada para as próximas séries do mesmo exercício
              if (j > sIdx && !s.feita) {
                return { ...s, carga };
              }
              return s;
            });
            return { ...ex, series: novasSeries };
          });

          const isLastSetOfExercise = sIdx + 1 >= totalSeries;
          const isLastExercise = eIdx + 1 >= totalExercicios;

          showToast({
            message: 'Série registrada',
            actionLabel: 'Desfazer',
            onAction: () => {
              if (!undoSnapshot) return;
              sessao = store.atualizarSessao(cur.id, {
                exercicios: undoSnapshot.exercicios,
                maquinaEstado: undoSnapshot.maquinaEstado
              });
              undoSnapshot = null;
              renderCurrentPhase();
            }
          });

          if (!isLastSetOfExercise) {
            const descansoNominal = Number(exAtual?.descansoSeg || 60);
            const scale = window.clayTimer?.getTimeScale ? window.clayTimer.getTimeScale() : 1;
            const endTimeMs = nowMs() + Math.max(200, descansoNominal * 1000 * scale);

            setPhase(
              'DESCANSO',
              {
                exercicioIdx: eIdx,
                serieIdx: sIdx + 1,
                descansoTotalSeg: descansoNominal,
                descansoFimMs: endTimeMs
              },
              { exercicios: novosExercicios }
            );
          } else if (!isLastExercise) {
            setPhase(
              'TRANSICAO',
              {
                exercicioConcluidoIdx: eIdx,
                exercicioIdx: eIdx + 1,
                serieIdx: 0,
                descansoFimMs: null
              },
              { exercicios: novosExercicios }
            );
          } else {
            setPhase(
              'PERGUNTA_ALONGAMENTO',
              {
                exercicioConcluidoIdx: eIdx,
                descansoFimMs: null
              },
              { exercicios: novosExercicios }
            );
          }
        },
        onSkipSet: () => {
          const cur = getOrRestoreSession(activeSessionId) || sessao;
          const eIdx = Number(cur.maquinaEstado?.exercicioIdx || 0);
          const sIdx = Number(cur.maquinaEstado?.serieIdx || 0);
          undoSnapshot = JSON.parse(JSON.stringify(cur));

          const exAtual = (cur.exercicios || [])[eIdx];
          const totalSeries = (exAtual?.series || []).length || 1;
          const totalExercicios = (cur.exercicios || []).length || 1;

          const novosExercicios = (cur.exercicios || []).map((ex, i) => {
            if (i !== eIdx) return ex;
            const novasSeries = (ex.series || []).map((s, j) =>
              j === sIdx ? { ...s, feita: false, pulada: true } : s
            );
            return { ...ex, series: novasSeries };
          });

          showToast({
            message: 'Série pulada',
            actionLabel: 'Desfazer',
            onAction: () => {
              if (!undoSnapshot) return;
              sessao = store.atualizarSessao(cur.id, {
                exercicios: undoSnapshot.exercicios,
                maquinaEstado: undoSnapshot.maquinaEstado
              });
              undoSnapshot = null;
              renderCurrentPhase();
            }
          });

          if (sIdx + 1 < totalSeries) {
            setPhase(
              'EXERCICIO',
              { exercicioIdx: eIdx, serieIdx: sIdx + 1 },
              { exercicios: novosExercicios }
            );
          } else if (eIdx + 1 < totalExercicios) {
            setPhase(
              'TRANSICAO',
              { exercicioConcluidoIdx: eIdx, exercicioIdx: eIdx + 1, serieIdx: 0 },
              { exercicios: novosExercicios }
            );
          } else {
            setPhase('PERGUNTA_ALONGAMENTO', {}, { exercicios: novosExercicios });
          }
        },
        onOpenHowTo: (ex) => openHowToSheet(ex),
        onOpenMoreMenu: (ex) => {
          const cur = getOrRestoreSession(activeSessionId) || sessao;
          const eIdx = Number(cur.maquinaEstado?.exercicioIdx || 0);
          const totalExercicios = (cur.exercicios || []).length || 1;

          openExerciseMoreMenuSheet(ex, {
            onHowTo: () => openHowToSheet(ex),
            onSwap: () => {
              sessao = swapCurrentExercise(cur, eIdx);
              showToast({ message: 'Exercício trocado' });
              renderCurrentPhase();
            },
            onSkipExercise: () => {
              if (eIdx + 1 < totalExercicios) {
                setPhase('TRANSICAO', {
                  exercicioConcluidoIdx: eIdx,
                  exercicioIdx: eIdx + 1,
                  serieIdx: 0
                });
              } else {
                setPhase('PERGUNTA_ALONGAMENTO');
              }
            },
            onReportDiscomfort: (regiao) => {
              const incomodos = Array.from(new Set([...(cur.incomodo || []), regiao]));
              store.atualizarSessao(cur.id, { incomodo: incomodos });
              sessao = swapCurrentExercise(cur, eIdx);
              showToast({ message: `Protegendo ${regiao.toLowerCase()} · exercício trocado` });
              renderCurrentPhase();
            }
          });
        },
        onOpenExit: handleOpenExitSheet
      });
      focusScreenH1(hostEl);
      return;
    }

    // 5. Fase DESCANSO (B11)
    if (fase === 'DESCANSO') {
      hostEl.innerHTML = renderRestScreen(sessao);
      const shaderHost = hostEl.querySelector('#shader-host-rest-ring');
      if (shaderHost) clayFlow.mount(shaderHost, { palette: 'TERRACOTA', intensity: 0.35 });

      currentScreenCleanup = bindRestScreen(hostEl, sessao, {
        onFinishRest: () => {
          setPhase('EXERCICIO', { descansoFimMs: null });
        },
        onUpdateNextSetLoad: (novaCarga) => {
          const cur = getOrRestoreSession(activeSessionId) || sessao;
          const eIdx = Number(cur.maquinaEstado?.exercicioIdx || 0);
          const sIdx = Number(cur.maquinaEstado?.serieIdx || 0);
          const novosEx = (cur.exercicios || []).map((ex, i) => {
            if (i !== eIdx) return ex;
            const novasSeries = (ex.series || []).map((s, j) =>
              j >= sIdx && !s.feita ? { ...s, carga: novaCarga } : s
            );
            return { ...ex, series: novasSeries };
          });
          sessao = store.atualizarSessao(cur.id, { exercicios: novosEx });
        },
        onPersistRestTimer: ({ descansoFimMs, descansoTotalSeg }) => {
          const cur = getOrRestoreSession(activeSessionId) || sessao;
          sessao = store.atualizarSessao(cur.id, {
            maquinaEstado: {
              ...(cur.maquinaEstado || {}),
              descansoFimMs,
              descansoTotalSeg
            }
          });
        },
        onOpenExit: handleOpenExitSheet
      });
      focusScreenH1(hostEl);
      return;
    }

    // 6. Fase TRANSICAO (B12)
    if (fase === 'TRANSICAO') {
      hostEl.innerHTML = renderTransitionScreen(sessao);
      currentScreenCleanup = bindTransitionScreen(hostEl, sessao, {
        onStartNextExercise: () => {
          setPhase('EXERCICIO', { serieIdx: 0, descansoFimMs: null });
        },
        onOpenExit: handleOpenExitSheet
      });
      focusScreenH1(hostEl);
      return;
    }

    // 7. Fase PERGUNTA_ALONGAMENTO (B12 — "Alongar 2 minutos?")
    if (fase === 'PERGUNTA_ALONGAMENTO') {
      hostEl.innerHTML = renderCooldownPromptScreen(sessao);
      currentScreenCleanup = bindCooldownPromptScreen(hostEl, {
        onStartCooldown: () => {
          setPhase('ALONGAMENTO');
        },
        onSkipCooldown: () => {
          setPhase('RESUMO', {}, { status: 'andamento', duracaoSeg: computeActiveSeconds(sessao) });
        }
      });
      focusScreenH1(hostEl);
      return;
    }

    // 8. Fase ALONGAMENTO (B12 — 3 movimentos de 30s)
    if (fase === 'ALONGAMENTO') {
      hostEl.innerHTML = renderWarmupScreen(sessao, { isCooldown: true });
      currentScreenCleanup = bindWarmupScreen(hostEl, sessao, {
        isCooldown: true,
        onAdvanceMovement: () => {
          const cur = getOrRestoreSession(activeSessionId) || sessao;
          const al = cur.alongamento || {};
          const nextIdx = Number(al.indiceMovimento || 0) + 1;
          const totalMovs = Math.min(3, (al.movimentos || []).length || 3);
          if (nextIdx < totalMovs) {
            sessao = store.atualizarSessao(cur.id, {
              alongamento: { ...al, indiceMovimento: nextIdx }
            });
            renderCurrentPhase();
          } else {
            sessao = store.atualizarSessao(cur.id, {
              alongamento: { ...al, feito: true },
              duracaoSeg: computeActiveSeconds(cur)
            });
            setPhase('RESUMO', {}, { status: 'andamento' });
          }
        },
        onFinishBlock: (feito = false) => {
          const cur = getOrRestoreSession(activeSessionId) || sessao;
          store.atualizarSessao(cur.id, {
            alongamento: { ...(cur.alongamento || {}), feito },
            duracaoSeg: computeActiveSeconds(cur)
          });
          setPhase('RESUMO', {}, { status: 'andamento' });
        },
        onOpenExit: handleOpenExitSheet
      });
      focusScreenH1(hostEl);
      return;
    }

    // 9. Fase PAUSADO (B13)
    if (fase === 'PAUSADO') {
      hostEl.innerHTML = renderPauseScreen(sessao);
      currentScreenCleanup = bindPauseScreen(hostEl, sessao, {
        onResume: () => resumeFromPause(),
        onOpenExit: handleOpenExitSheet
      });
      focusScreenH1(hostEl);
      return;
    }

    // 10. Fase RESUMO (B14 + V7)
    if (fase === 'RESUMO') {
      hostEl.innerHTML = renderFinishSummaryScreen(sessao);
      const shaderHost = hostEl.querySelector('#shader-host-summary');
      if (shaderHost) clayFlow.mount(shaderHost, { palette: 'SALVIA', intensity: 0.5 });

      currentScreenCleanup = bindFinishSummaryScreen(hostEl, sessao, {
        onConcludeSummary: ({ humor, incomodo }) => {
          const cur = getOrRestoreSession(activeSessionId) || sessao;
          store.finalizarSessao(cur.id, {
            humor,
            incomodo,
            duracaoSeg: cur.duracaoSeg || computeActiveSeconds(cur)
          });
          // Vai para a tela de Celebração B15 (1,8s) antes de voltar para #/hoje
          hostEl.innerHTML = renderCelebrateScreen();
          currentScreenCleanup = bindCelebrateScreen(hostEl, {
            onDone: () => {
              cleanupActiveScreen();
              clearToasts();
              wakeLock.release();
              if (onNavigateHome) onNavigateHome();
            }
          });
          focusScreenH1(hostEl);
        }
      });
      focusScreenH1(hostEl);
      return;
    }
  };

  // B17 — Atalhos de teclado: Espaço/Enter = "Série feita", P = pausar, Esc = folha de saída
  const onGlobalKeyDown = (e) => {
    if (!document.body.classList.contains('modo-energia') && !document.getElementById('live-finish-root')) {
      return;
    }
    if (isAnySheetOpen()) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeBottomSheet('clay-sheet');
      }
      return;
    }

    const cur = getOrRestoreSession(activeSessionId);
    if (!cur) return;
    const fase = cur.maquinaEstado?.fase;

    if (e.key === 'Escape') {
      e.preventDefault();
      handleOpenExitSheet();
    } else if ((e.key === 'p' || e.key === 'P') && fase !== 'RESUMO' && fase !== 'CELEBRACAO') {
      e.preventDefault();
      if (fase === 'PAUSADO') resumeFromPause();
      else enterPause();
    } else if ((e.key === ' ' || e.key === 'Enter') && fase === 'EXERCICIO') {
      const activeTag = document.activeElement?.tagName;
      if (activeTag !== 'BUTTON') {
        e.preventDefault();
        document.getElementById('btn-serie-feita')?.click();
      }
    }
  };

  if (!keydownBound) {
    keydownBound = true;
    document.addEventListener('keydown', onGlobalKeyDown);
  }

  renderCurrentPhase();

  return () => {
    cleanupActiveScreen();
    clearToasts();
    wakeLock.release();
  };
}

function focusScreenH1(hostEl) {
  requestAnimationFrame(() => {
    const h1 = hostEl?.querySelector('h1');
    if (h1) {
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }
  });
}

export function unmountLiveWorkout() {
  cleanupActiveScreen();
  clearToasts();
  wakeLock.release();
}
