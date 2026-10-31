/**
 * ============================================================================
 * CLAY FIT — TELA 1 DA CORRIDA: PRÉ-CORRIDA (C3.1)
 * /js/run/screens/pre.js
 *
 * Container obrigatório: `#live-pre-root`
 * Layout em coluna flex (`100dvh`), tudo visível sem rolar:
 * 1. Barra superior (`52px`): botão `←` (`44×44`), título "Corrida ao vivo",
 *    selo de sinal de GPS à direita.
 * 2. Zona visual (`flex: 1 1 auto; min-height: 110px; max-height: 36dvh`):
 *    ilustração animada da Parte E (item 1) ou prévia na Arte do Trajeto.
 * 3. Seletor de modo (4 pílulas horizontais, `44px`):
 *    "Livre" · "Meta" · "Ritmo" · "Intervalos".
 * 4. Cartão de configuração do modo escolhido (compacto, tudo por toque).
 * 5. Linha de preferências rápidas: "Voz: ligada" · "Pausa automática: ligada".
 * 6. CTA primário fixo na base (`height: 80px`, `72px` em `<700px`):
 *    "Iniciar corrida".
 * ============================================================================
 */

import { store } from '../../store.js';
import { vibrate } from '../../motion.js';
import { getIconSvg } from '../../ui/illustrations.js';
import { renderRunPreScene, wireRunIllustrations } from '../../ui/illustrations-run.js';
import { renderRouteArtSvg } from '../route-art.js';
import { formatPaceSegKm, formatKmNumber } from '../geo.js';
import { openBottomSheet, closeBottomSheet } from '../../ui/bottom-sheet.js';

export function renderRunPreScreen(container, tracker, { onBack } = {}) {
  if (!container) return;

  let activeTab =
    tracker.modo === 'meta_distancia' || tracker.modo === 'meta_tempo'
      ? 'meta'
      : tracker.modo || 'livre';
  let metaSubType =
    tracker.modo === 'meta_tempo' || tracker.meta?.tipo === 'tempo'
      ? 'tempo'
      : 'distancia';
  let metaDistM = Number(
    tracker.meta?.tipo === 'distancia' && tracker.meta?.valor
      ? tracker.meta.valor
      : 5000
  );
  let metaTempoSeg = Number(
    tracker.meta?.tipo === 'tempo' && tracker.meta?.valor
      ? tracker.meta.valor
      : 1800
  );
  let ritmoAlvoSeg = Number(tracker.ritmoAlvoSegKm || 330);
  let avisosKmAtivo = true;

  let ivPresetKey = '6x1m';
  let ivCustom = {
    aquecimentoSeg: tracker.intervalosConfig?.aquecimentoSeg ?? 180,
    tiroSeg: tracker.intervalosConfig?.tiroSeg ?? 60,
    tiroM: tracker.intervalosConfig?.tiroM ?? null,
    troteSeg: tracker.intervalosConfig?.troteSeg ?? 60,
    rodadas: tracker.intervalosConfig?.rodadas ?? 6,
    voltaCalmaSeg: tracker.intervalosConfig?.voltaCalmaSeg ?? 180
  };

  function syncTrackerConfig() {
    if (activeTab === 'livre') {
      tracker.setModeConfig({
        modo: 'livre',
        meta: { tipo: null, valor: null },
        ritmoAlvoSegKm: null,
        intervalos: null
      });
    } else if (activeTab === 'meta') {
      if (metaSubType === 'tempo') {
        tracker.setModeConfig({
          modo: 'meta_tempo',
          meta: { tipo: 'tempo', valor: metaTempoSeg }
        });
      } else {
        tracker.setModeConfig({
          modo: 'meta_distancia',
          meta: { tipo: 'distancia', valor: metaDistM }
        });
      }
    } else if (activeTab === 'ritmo') {
      tracker.setModeConfig({
        modo: 'ritmo',
        ritmoAlvoSegKm: ritmoAlvoSeg
      });
    } else if (activeTab === 'intervalos') {
      tracker.setModeConfig({
        modo: 'intervalos',
        intervalos: ivCustom
      });
    }
  }

  function getGpsBadgeHtml() {
    if (tracker.gpsStatus === 'ok') {
      const acc = tracker.gpsAccuracyM || 8;
      return `
        <span class="run-gps-pill is-ready" data-gps-badge>
          <span class="run-gps-dot is-ready"></span>
          <span>Sinal pronto · ±${acc} m</span>
        </span>
      `;
    }
    if (tracker.gpsStatus === 'denied' || tracker.gpsStatus === 'none') {
      return `
        <span class="run-gps-pill is-error" data-gps-badge>
          <span class="run-gps-dot is-error"></span>
          <span>Sem sinal</span>
        </span>
      `;
    }
    return `
      <span class="run-gps-pill is-searching" data-gps-badge>
        <span class="run-gps-dot is-searching"></span>
        <span>Buscando sinal…</span>
      </span>
    `;
  }

  function renderModeConfigCardHtml() {
    if (activeTab === 'livre') {
      return `
        <div class="run-pre-config-card">
          <p class="run-pre-config-desc">Corra no seu ritmo. Marcamos tempo, distância e cada quilômetro.</p>
          <button type="button" class="run-pre-inline-toggle ${avisosKmAtivo ? 'is-on' : ''}" data-action="toggle-km-alerts">
            <span>Avisos a cada km</span>
            <span class="run-pre-toggle-state">${avisosKmAtivo ? 'Ativado' : 'Desativado'}</span>
          </button>
        </div>
      `;
    }

    if (activeTab === 'meta') {
      const isTempo = metaSubType === 'tempo';
      const distKm = metaDistM / 1000;
      const tempoMin = Math.round(metaTempoSeg / 60);
      return `
        <div class="run-pre-config-card">
          <div class="run-pre-subtabs" role="tablist">
            <button type="button" class="run-pre-subtab ${!isTempo ? 'is-active' : ''}" data-meta-sub="distancia">Distância</button>
            <button type="button" class="run-pre-subtab ${isTempo ? 'is-active' : ''}" data-meta-sub="tempo">Tempo</button>
          </div>
          ${
            !isTempo
              ? `
                <div class="run-pre-Quick-chips">
                  ${[3000, 5000, 8000, 10000]
                    .map(
                      (m) => `
                        <button type="button" class="run-pre-chip ${metaDistM === m ? 'is-active' : ''}" data-dist-preset="${m}">
                          ${m / 1000} km
                        </button>
                      `
                    )
                    .join('')}
                </div>
                <div class="run-pre-stepper-row">
                  <button type="button" class="run-pre-step-btn" data-dist-step="-500" aria-label="Diminuir 0,5 km">− 0,5 km</button>
                  <strong class="run-pre-step-val">${formatKmNumber(metaDistM, 1)} km</strong>
                  <button type="button" class="run-pre-step-btn" data-dist-step="500" aria-label="Aumentar 0,5 km">+ 0,5 km</button>
                </div>
              `
              : `
                <div class="run-pre-Quick-chips">
                  ${[20, 30, 45, 60]
                    .map(
                      (min) => `
                        <button type="button" class="run-pre-chip ${tempoMin === min ? 'is-active' : ''}" data-time-preset="${min * 60}">
                          ${min} min
                        </button>
                      `
                    )
                    .join('')}
                </div>
                <div class="run-pre-stepper-row">
                  <button type="button" class="run-pre-step-btn" data-time-step="-300" aria-label="Diminuir 5 minutos">− 5 min</button>
                  <strong class="run-pre-step-val">${tempoMin} min</strong>
                  <button type="button" class="run-pre-step-btn" data-time-step="300" aria-label="Aumentar 5 minutos">+ 5 min</button>
                </div>
              `
          }
        </div>
      `;
    }

    if (activeTab === 'ritmo') {
      return `
        <div class="run-pre-config-card">
          <div class="run-pre-Quick-chips">
            ${[300, 330, 360, 390]
              .map(
                (sec) => `
                  <button type="button" class="run-pre-chip ${ritmoAlvoSeg === sec ? 'is-active' : ''}" data-pace-preset="${sec}">
                    ${formatPaceSegKm(sec)} /km
                  </button>
                `
              )
              .join('')}
          </div>
          <div class="run-pre-stepper-row">
            <button type="button" class="run-pre-step-btn" data-pace-step="-5" aria-label="Ritmo 5 segundos mais rápido">− 5 s</button>
            <strong class="run-pre-step-val">${formatPaceSegKm(ritmoAlvoSeg)} /km</strong>
            <button type="button" class="run-pre-step-btn" data-pace-step="5" aria-label="Ritmo 5 segundos mais leve">+ 5 s</button>
          </div>
          <p class="run-pre-config-note">Avisamos se você sair ±15 s/km do alvo.</p>
        </div>
      `;
    }

    // Intervalos
    const resumoCustom = ivCustom.tiroM
      ? `${ivCustom.rodadas} × ${ivCustom.tiroM} m / ${ivCustom.troteSeg} s trote`
      : `${ivCustom.rodadas} × ${Math.round(ivCustom.tiroSeg / 60 || 1)} min forte / ${Math.round(ivCustom.troteSeg / 60 || 1)} min leve`;

    return `
      <div class="run-pre-config-card">
        <div class="run-pre-interval-chips">
          <button type="button" class="run-pre-chip ${ivPresetKey === '6x1m' ? 'is-active' : ''}" data-iv-preset="6x1m">
            6 × 1 min forte / 1 min leve
          </button>
          <button type="button" class="run-pre-chip ${ivPresetKey === '8x400' ? 'is-active' : ''}" data-iv-preset="8x400">
            8 × 400 m / 90 s trote
          </button>
          <button type="button" class="run-pre-chip ${ivPresetKey === '5x2m' ? 'is-active' : ''}" data-iv-preset="5x2m">
            5 × 2 min forte / 1 min leve
          </button>
        </div>
        <div class="run-pre-iv-footer">
          <span class="run-pre-iv-summary">${resumoCustom}</span>
          <button type="button" class="run-pre-custom-btn" data-action="customize-intervals">Personalizar</button>
        </div>
      </div>
    `;
  }

  function openCustomizeIntervalsSheet() {
    const sheetId = 'run-custom-intervals-sheet';
    let temp = { ...ivCustom };
    const renderBody = () => `
      <div class="run-iv-sheet">
        <h3 class="sheet-title">Personalizar intervalos</h3>
        <div class="run-iv-sheet-row">
          <span>Rodadas</span>
          <div class="run-iv-sheet-stepper">
            <button type="button" class="run-pre-step-btn" data-iv-field="rodadas" data-delta="-1">−</button>
            <strong data-iv-val="rodadas">${temp.rodadas}</strong>
            <button type="button" class="run-pre-step-btn" data-iv-field="rodadas" data-delta="1">+</button>
          </div>
        </div>
        <div class="run-iv-sheet-row">
          <span>Duração do tiro</span>
          <div class="run-iv-sheet-stepper">
            <button type="button" class="run-pre-step-btn" data-iv-field="tiroSeg" data-delta="-15">− 15 s</button>
            <strong data-iv-val="tiroSeg">${temp.tiroSeg || 60} s</strong>
            <button type="button" class="run-pre-step-btn" data-iv-field="tiroSeg" data-delta="15">+ 15 s</button>
          </div>
        </div>
        <div class="run-iv-sheet-row">
          <span>Trote de recuperação</span>
          <div class="run-iv-sheet-stepper">
            <button type="button" class="run-pre-step-btn" data-iv-field="troteSeg" data-delta="-15">− 15 s</button>
            <strong data-iv-val="troteSeg">${temp.troteSeg} s</strong>
            <button type="button" class="run-pre-step-btn" data-iv-field="troteSeg" data-delta="15">+ 15 s</button>
          </div>
        </div>
        <div class="run-iv-sheet-row">
          <span>Aquecimento e volta à calma</span>
          <button type="button" class="run-pre-chip ${temp.aquecimentoSeg > 0 ? 'is-active' : ''}" data-iv-toggle-warmup>
            ${temp.aquecimentoSeg > 0 ? '3 min incluídos' : 'Sem aquecimento'}
          </button>
        </div>
        <button type="button" class="btn btn-primary btn-full" data-action="save-custom-intervals" style="margin-top:12px;">
          Confirmar intervalos
        </button>
      </div>
    `;

    const sheetEl = openBottomSheet({
      id: sheetId,
      title: 'Personalizar intervalos',
      html: renderBody()
    });

    if (!sheetEl) return;
    sheetEl.addEventListener('click', (e) => {
      const stepBtn = e.target.closest('[data-iv-field]');
      if (stepBtn) {
        vibrate('selecao');
        const field = stepBtn.dataset.ivField;
        const delta = Number(stepBtn.dataset.delta || 0);
        if (field === 'rodadas') {
          temp.rodadas = Math.max(1, Math.min(20, (temp.rodadas || 6) + delta));
        } else if (field === 'tiroSeg') {
          temp.tiroM = null;
          temp.tiroSeg = Math.max(15, Math.min(600, (temp.tiroSeg || 60) + delta));
        } else if (field === 'troteSeg') {
          temp.troteSeg = Math.max(15, Math.min(300, (temp.troteSeg || 60) + delta));
        }
        const valEl = sheetEl.querySelector(`[data-iv-val="${field}"]`);
        if (valEl) {
          valEl.textContent = field === 'rodadas' ? `${temp.rodadas}` : `${temp[field]} s`;
        }
        return;
      }

      const warmBtn = e.target.closest('[data-iv-toggle-warmup]');
      if (warmBtn) {
        vibrate('selecao');
        const nextWarm = temp.aquecimentoSeg > 0 ? 0 : 180;
        temp.aquecimentoSeg = nextWarm;
        temp.voltaCalmaSeg = nextWarm;
        warmBtn.classList.toggle('is-active', nextWarm > 0);
        warmBtn.textContent = nextWarm > 0 ? '3 min incluídos' : 'Sem aquecimento';
        return;
      }

      if (e.target.closest('[data-action="save-custom-intervals"]')) {
        vibrate('confirmacao');
        ivPresetKey = 'custom';
        ivCustom = { ...temp };
        syncTrackerConfig();
        closeBottomSheet(sheetId, { silent: true });
        render();
      }
    });
  }

  function render() {
    const perfil = store.getState()?.perfil || {};
    const vozLigada = perfil.vozEmCorrida !== false && perfil.somAtivo !== false;
    const pausaAutoLigada = perfil.pausaAutomaticaCorrida !== false;

    container.innerHTML = `
      <section id="live-pre-root" class="run-pre-screen" aria-label="Preparação da corrida ao vivo">
        <!-- 1. Barra superior (52px) -->
        <header class="run-pre-topbar">
          <button type="button" class="run-icon-btn" data-action="pre-back" aria-label="Voltar">
            ${getIconSvg('voltar', 22)}
          </button>
          <h1 class="run-pre-title">Corrida ao vivo</h1>
          <div class="run-pre-gps-slot">
            ${getGpsBadgeHtml()}
          </div>
        </header>

        <!-- 2. Zona visual (flex: 1 1 auto; min-height: 110px; max-height: 36dvh) -->
        <div class="run-pre-visual-zone">
          ${renderRunPreScene()}
        </div>

        <!-- 3. Seletor de modo (4 pílulas horizontais, 44px) -->
        <div class="run-mode-pills" role="tablist" aria-label="Modo da corrida">
          <button type="button" role="tab" class="run-mode-pill ${activeTab === 'livre' ? 'is-active' : ''}" data-mode-tab="livre" aria-selected="${activeTab === 'livre'}">Livre</button>
          <button type="button" role="tab" class="run-mode-pill ${activeTab === 'meta' ? 'is-active' : ''}" data-mode-tab="meta" aria-selected="${activeTab === 'meta'}">Meta</button>
          <button type="button" role="tab" class="run-mode-pill ${activeTab === 'ritmo' ? 'is-active' : ''}" data-mode-tab="ritmo" aria-selected="${activeTab === 'ritmo'}">Ritmo</button>
          <button type="button" role="tab" class="run-mode-pill ${activeTab === 'intervalos' ? 'is-active' : ''}" data-mode-tab="intervalos" aria-selected="${activeTab === 'intervalos'}">Intervalos</button>
        </div>

        <!-- 4. Cartão de configuração do modo escolhido -->
        <div class="run-pre-config-slot">
          ${renderModeConfigCardHtml()}
        </div>

        <!-- 5. Linha de preferências rápidas -->
        <div class="run-pre-prefs-row">
          <button type="button" class="run-pref-chip ${vozLigada ? 'is-on' : ''}" data-action="toggle-voice-pref">
            <span>Voz: ${vozLigada ? 'ligada' : 'desligada'}</span>
          </button>
          <button type="button" class="run-pref-chip ${pausaAutoLigada ? 'is-on' : ''}" data-action="toggle-autopause-pref">
            <span>Pausa automática: ${pausaAutoLigada ? 'ligada' : 'desligada'}</span>
          </button>
        </div>

        <!-- 6. CTA primário fixo na base -->
        <div class="run-pre-cta-bar">
          <button type="button" class="run-primary-cta-btn" data-action="start-run-cta">
            <span class="run-cta-play-icon">${getIconSvg('comecar', 20)}</span>
            <span>Iniciar corrida</span>
          </button>
        </div>
      </section>
    `;

    wireRunIllustrations(container);
    bindEvents();
  }

  function bindEvents() {
    const root = container.querySelector('#live-pre-root');
    if (!root) return;

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="pre-back"]')) {
        vibrate('selecao');
        if (onBack) onBack();
        return;
      }

      const modeBtn = e.target.closest('[data-mode-tab]');
      if (modeBtn) {
        vibrate('selecao');
        activeTab = modeBtn.dataset.modeTab;
        syncTrackerConfig();
        render();
        return;
      }

      const metaSubBtn = e.target.closest('[data-meta-sub]');
      if (metaSubBtn) {
        vibrate('selecao');
        metaSubType = metaSubBtn.dataset.metaSub;
        syncTrackerConfig();
        render();
        return;
      }

      const distPreset = e.target.closest('[data-dist-preset]');
      if (distPreset) {
        vibrate('selecao');
        metaDistM = Number(distPreset.dataset.distPreset);
        syncTrackerConfig();
        render();
        return;
      }

      const distStep = e.target.closest('[data-dist-step]');
      if (distStep) {
        vibrate('selecao');
        const delta = Number(distStep.dataset.distStep);
        metaDistM = Math.max(1000, Math.min(42000, metaDistM + delta));
        syncTrackerConfig();
        render();
        return;
      }

      const timePreset = e.target.closest('[data-time-preset]');
      if (timePreset) {
        vibrate('selecao');
        metaTempoSeg = Number(timePreset.dataset.timePreset);
        syncTrackerConfig();
        render();
        return;
      }

      const timeStep = e.target.closest('[data-time-step]');
      if (timeStep) {
        vibrate('selecao');
        const delta = Number(timeStep.dataset.timeStep);
        metaTempoSeg = Math.max(300, Math.min(14400, metaTempoSeg + delta));
        syncTrackerConfig();
        render();
        return;
      }

      const pacePreset = e.target.closest('[data-pace-preset]');
      if (pacePreset) {
        vibrate('selecao');
        ritmoAlvoSeg = Number(pacePreset.dataset.pacePreset);
        syncTrackerConfig();
        render();
        return;
      }

      const paceStep = e.target.closest('[data-pace-step]');
      if (paceStep) {
        vibrate('selecao');
        const delta = Number(paceStep.dataset.paceStep);
        ritmoAlvoSeg = Math.max(180, Math.min(720, ritmoAlvoSeg + delta));
        syncTrackerConfig();
        render();
        return;
      }

      const ivPreset = e.target.closest('[data-iv-preset]');
      if (ivPreset) {
        vibrate('selecao');
        ivPresetKey = ivPreset.dataset.ivPreset;
        if (ivPresetKey === '6x1m') {
          ivCustom = { aquecimentoSeg: 180, tiroSeg: 60, tiroM: null, troteSeg: 60, rodadas: 6, voltaCalmaSeg: 180 };
        } else if (ivPresetKey === '8x400') {
          ivCustom = { aquecimentoSeg: 180, tiroSeg: null, tiroM: 400, troteSeg: 90, rodadas: 8, voltaCalmaSeg: 180 };
        } else if (ivPresetKey === '5x2m') {
          ivCustom = { aquecimentoSeg: 180, tiroSeg: 120, tiroM: null, troteSeg: 60, rodadas: 5, voltaCalmaSeg: 180 };
        }
        syncTrackerConfig();
        render();
        return;
      }

      if (e.target.closest('[data-action="customize-intervals"]')) {
        vibrate('selecao');
        openCustomizeIntervalsSheet();
        return;
      }

      if (e.target.closest('[data-action="toggle-km-alerts"]')) {
        vibrate('selecao');
        avisosKmAtivo = !avisosKmAtivo;
        render();
        return;
      }

      if (e.target.closest('[data-action="toggle-voice-pref"]')) {
        vibrate('selecao');
        const cur = store.getState()?.perfil?.vozEmCorrida !== false;
        store.updatePerfil({ vozEmCorrida: !cur, somAtivo: !cur ? true : store.getState()?.perfil?.somAtivo });
        render();
        return;
      }

      if (e.target.closest('[data-action="toggle-autopause-pref"]')) {
        vibrate('selecao');
        const cur = store.getState()?.perfil?.pausaAutomaticaCorrida !== false;
        store.updatePerfil({ pausaAutomaticaCorrida: !cur });
        render();
        return;
      }

      if (e.target.closest('[data-action="start-run-cta"]')) {
        vibrate('confirmacao');
        syncTrackerConfig();
        tracker.requestStartRun();
      }
    });
  }

  syncTrackerConfig();
  render();

  return {
    updateSignalBadge() {
      const slot = container.querySelector('.run-pre-gps-slot');
      if (slot) {
        slot.innerHTML = getGpsBadgeHtml();
      }
    }
  };
}
