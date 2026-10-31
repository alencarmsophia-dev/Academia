import { sincronizarMetaThemeColor, corToken } from '../ui/theme.js';
/**
 * ============================================================================
 * CLAY FIT — ORQUESTRADOR DO MÓDULO DE CORRIDA AO VIVO (PARTE C)
 * /js/run/run.js
 *
 * Especificação Prompt 4 (C1–C8):
 * - Substitui a corrida provisória na rota `#/treino/:sessaoId` quando
 *   `sessao.tipo === 'corrida'`.
 * - Estados:
 *   `preparando -> buscando_gps -> pronta -> contagem -> correndo <-> pausada | pausa_auto -> finalizando -> resumo -> celebracao`
 * - Mantém Wake Lock ativo durante toda a corrida (`js/live/wake.js`).
 * - Limpa toasts ao entrar em pausa, resumo, celebração ou desmontar (`clearToasts()`).
 * ============================================================================
 */

import { store } from '../store.js';
import { clearToasts } from '../ui/toast.js';
import { closeAllSheets } from '../ui/bottom-sheet.js';
import { wakeLock } from '../live/wake.js';
import { RunSessionTracker } from './tracker.js';
import { renderRunPreScreen } from './screens/pre.js';
import { renderRunSearchingScreen } from './screens/searching.js';
import { renderRunDeniedScreen } from './screens/denied.js';
import { renderRunCountdownScreen } from './screens/countdown.js';
import { renderRunRunningScreen } from './screens/running.js';
import { renderRunPausedScreen } from './screens/paused.js';
import { renderRunFinishScreen } from './screens/finish.js';
import { renderRunCelebrateScreen } from './screens/celebrate.js';

let activeTracker = null;
let activeScreenController = null;

function cleanupCurrentRunScreen() {
  if (activeScreenController && typeof activeScreenController.destroy === 'function') {
    try {
      activeScreenController.destroy();
    } catch (_) {}
  }
  activeScreenController = null;
}

export function unmountLiveRun() {
  cleanupCurrentRunScreen();
  if (activeTracker) {
    activeTracker.destroy();
    activeTracker = null;
    clearToasts();
    wakeLock.release();
  }
}

export function mountLiveRun(hostEl, sessao, { onNavigateHome } = {}) {
  unmountLiveRun();
  closeAllSheets({ silent: true, clearContent: true });
  clearToasts();
  wakeLock.request();

  // Verifica se há pré-configuração vinda da Biblioteca ("Usar na corrida" C9.2)
  const preCfg = store.getState()?.hojeEstado?.corridaPreConfig;
  if (preCfg) {
    sessao =
      store.atualizarSessao(sessao.id, {
        nome: preCfg.nome || sessao.nome,
        modo: preCfg.modo || 'livre',
        meta: preCfg.meta || { tipo: null, valor: null },
        ritmoAlvoSegKm: preCfg.ritmoAlvoSegKm ?? null,
        intervalos: preCfg.intervalos ?? null,
        maquinaEstado: {
          ...(sessao.maquinaEstado || {}),
          fase: 'preparando'
        }
      }) || sessao;
    store.updateHojeEstado({ corridaPreConfig: null });
  }

  // Normaliza fase caso venha de versão anterior ('PRE' ou 'CORRIDA')
  const rawFase = sessao?.maquinaEstado?.fase || 'preparando';
  const normalizedFase =
    rawFase === 'PRE'
      ? 'preparando'
      : rawFase === 'CORRIDA'
      ? 'correndo'
      : rawFase === 'PAUSADO'
      ? 'pausada'
      : rawFase === 'RESUMO'
      ? 'resumo'
      : rawFase === 'CELEBRACAO'
      ? 'celebracao'
      : rawFase;

  if (normalizedFase !== rawFase) {
    sessao =
      store.atualizarSessao(sessao.id, {
        maquinaEstado: { ...(sessao.maquinaEstado || {}), fase: normalizedFase }
      }) || sessao;
  }

  let currentRenderedPhase = null;

  const tracker = new RunSessionTracker(sessao, {
    onStateChange: (trk) => {
      if (trk.fase !== currentRenderedPhase) {
        renderPhase(trk.fase);
      } else if (trk.fase === 'preparando' && activeScreenController?.updateSignalBadge) {
        activeScreenController.updateSignalBadge();
      } else if (trk.fase === 'correndo' && activeScreenController?.updateLiveMetrics) {
        // Re-renderiza caso o banner de meta atingida apareça
        renderPhase('correndo');
      }
    },
    onTick: (trk) => {
      if (trk.fase === 'correndo' || trk.fase === 'pausa_auto') {
        if (activeScreenController?.updateLiveMetrics) {
          activeScreenController.updateLiveMetrics();
        }
      } else if (trk.fase === 'buscando_gps') {
        if (activeScreenController?.updateAccuracy) {
          activeScreenController.updateAccuracy();
        }
      } else if (trk.fase === 'preparando') {
        if (activeScreenController?.updateSignalBadge) {
          activeScreenController.updateSignalBadge();
        }
      }
    }
  });

  activeTracker = tracker;

  // Se houver buffer de segurança correspondente a esta sessão (ou retomada de buffer), restaura
  const savedBuffer = store.lerBufferCorrida();
  if (
    savedBuffer &&
    (savedBuffer.sessaoId === sessao.id || sessao.restaurarDeBuffer)
  ) {
    tracker.restoreFromBuffer(savedBuffer);
  }

  // Inicia escuta de GPS já na Pré-corrida para adquirir sinal rápido
  if (
    normalizedFase === 'preparando' ||
    normalizedFase === 'buscando_gps' ||
    normalizedFase === 'correndo' ||
    normalizedFase === 'pausa_auto'
  ) {
    tracker.startGpsListening();
  }

  if (normalizedFase === 'correndo') {
    tracker.beginActiveRunning();
  }

  function applyThemeForPhase(fase) {
    const isLight = fase === 'resumo' || fase === 'celebracao';
    if (isLight) {
      document.documentElement.removeAttribute('data-mode');
      document.body.classList.remove('modo-energia');
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      sincronizarMetaThemeColor();
    } else {
      document.documentElement.setAttribute('data-mode', 'energia');
      document.body.classList.add('modo-energia');
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      sincronizarMetaThemeColor(corToken('--corrida-bg'));
    }
  }

  function renderPhase(fase) {
    cleanupCurrentRunScreen();
    currentRenderedPhase = fase;
    applyThemeForPhase(fase);

    if (!hostEl) return;

    if (fase === 'preparando' || fase === 'pronta') {
      activeScreenController = renderRunPreScreen(hostEl, tracker, {
        onBack: () => {
          store.descartarSessao(tracker.sessao.id);
          unmountLiveRun();
          if (onNavigateHome) onNavigateHome();
          else if (window.clayRouter) { window.clayRouter.navigate('#/hoje'); } else { window.location.hash = '#/hoje'; }
        }
      });
      return;
    }

    if (fase === 'buscando_gps') {
      activeScreenController = renderRunSearchingScreen(hostEl, tracker);
      return;
    }

    if (fase === 'gps_negado') {
      activeScreenController = renderRunDeniedScreen(hostEl, tracker);
      return;
    }

    if (fase === 'contagem') {
      activeScreenController = renderRunCountdownScreen(hostEl, tracker);
      return;
    }

    if (fase === 'correndo' || fase === 'pausa_auto') {
      activeScreenController = renderRunRunningScreen(hostEl, tracker);
      return;
    }

    if (fase === 'pausada') {
      clearToasts();
      activeScreenController = renderRunPausedScreen(hostEl, tracker, {
        onDiscardSession: () => {
          store.descartarSessao(tracker.sessao.id);
          unmountLiveRun();
          if (onNavigateHome) onNavigateHome();
          else if (window.clayRouter) { window.clayRouter.navigate('#/hoje'); } else { window.location.hash = '#/hoje'; }
        }
      });
      return;
    }

    if (fase === 'finalizando' || fase === 'resumo') {
      clearToasts();
      activeScreenController = renderRunFinishScreen(hostEl, tracker, {
        onSaved: (finalSessao) => {
          tracker.sessao = finalSessao;
        }
      });
      return;
    }

    if (fase === 'celebracao') {
      clearToasts();
      activeScreenController = renderRunCelebrateScreen(hostEl, tracker.sessao, {
        onNavigate: (hashTarget) => {
          unmountLiveRun();
          if (window.clayRouter) { window.clayRouter.navigate(hashTarget || '#/hoje'); } else { window.location.hash = hashTarget || '#/hoje'; }
        }
      });
    }
  }

  renderPhase(tracker.fase);
  return unmountLiveRun;
}
