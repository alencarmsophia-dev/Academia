/**
 * ============================================================================
 * CLAY FIT — TELA 5 DA CORRIDA: CORRIDA EM ANDAMENTO (C3.5 & C4)
 * /js/run/screens/running.js
 *
 * Container obrigatório: `#live-run-root`
 * Layout em coluna flex (`100dvh`), tudo visível sem rolar:
 * 1. Barra superior (`48px`): pílula do modo + ponto de status do GPS à esquerda;
 *    botão de som/voz (`40×40`) e botão Bloquear tela (`40×40`) à direita.
 * 2. Faixa do modo (somente quando `Meta`, `Ritmo` ou `Intervalos` — C4).
 * 3. Métrica principal (Hero): Distância em `clamp(52px, 14vw, 76px) 700 tabular-nums`
 *    (alternável com Tempo ao tocar; no modo `sem_gps` destaca Tempo).
 * 4. Grade de 3 métricas secundárias: TEMPO, RITMO ATUAL, RITMO MÉDIO (ou CALORIAS).
 * 5. Zona do Mapa / Arte do Trajeto (`flex: 1 1 auto; min-height: 120px; max-height: 38dvh`)
 *    com botão discreto "Ruas" (`32px`) e chip da última parcial.
 * 6. Barra de controle inferior (`height: 80px`, `72px` em `<700px`, margem `16px`):
 *    botão central largo "Pausar" ou pílula "Tela bloqueada · Segure o cadeado por 1 s para desbloquear".
 * ============================================================================
 */

import { store } from '../../store.js';
import { spring, vibrate } from '../../motion.js';
import { showToast } from '../../ui/toast.js';
import { getIconSvg } from '../../ui/illustrations.js';
import { renderIntervalPhaseIcon } from '../../ui/illustrations-run.js';
import { renderRouteArtSvg } from '../route-art.js';
import { renderOsmTilesOnCanvas } from '../tiles.js';
import { formatKmNumber, formatKmWithUnit, formatPaceSegKm, formatRunClock } from '../geo.js';
import { computeTargetPaceBand } from '../metrics.js';

export function renderRunRunningScreen(container, tracker) {
  if (!container) return;

  let heroPrimary = tracker.semGpsModo ? 'tempo' : 'distancia';
  let thirdMetricMode = 'ritmo_medio'; // 'ritmo_medio' | 'calorias'
  let unlockHoldTimer = null;
  let unlockHoldStartMs = 0;
  let unlockRafId = null;
  let lastNeedlePos = 0;
  let cancelNeedleSpring = null;

  function getModePillLabel() {
    if (tracker.modo === 'meta_distancia') {
      return `Meta ${formatKmWithUnit(tracker.meta?.valor || 5000, 1)}`;
    }
    if (tracker.modo === 'meta_tempo') {
      return `Meta ${Math.round((tracker.meta?.valor || 1800) / 60)} min`;
    }
    if (tracker.modo === 'ritmo') {
      return `Ritmo ${formatPaceSegKm(tracker.ritmoAlvoSegKm || 330)} /km`;
    }
    if (tracker.modo === 'intervalos') {
      const iv = tracker.intervalState || tracker.intervalsEngine.update(tracker.movimentoSeg, tracker.distanciaM);
      return `Intervalos · ${iv.rodada}/${iv.totalRodadas}`;
    }
    return 'Corrida livre';
  }

  function getGpsStatusDotClass() {
    if (tracker.semGpsModo) return 'is-nogps';
    const acc = Number(tracker.gpsAccuracyM ?? 99);
    if (acc <= 15) return 'is-good';
    if (acc <= 35) return 'is-medium';
    return 'is-nogps';
  }

  function buildModeBannerHtml() {
    // Pausa automática (C2.8)
    if (tracker.fase === 'pausa_auto') {
      return `
        <div class="run-mode-banner is-autopause">
          <div class="run-autopause-pill">
            <span class="run-autopause-dot"></span>
            <span>Pausa automática · Retoma quando você voltar a correr</span>
            <button type="button" class="run-autopause-resume-btn" data-action="manual-resume-autopause">Retomar</button>
          </div>
        </div>
      `;
    }

    // C4.2 Modo Meta
    if (tracker.modo === 'meta_distancia' || tracker.modo === 'meta_tempo') {
      const gStatus = tracker.getGoalStatus();
      if (!gStatus) return '';
      if (gStatus.showReachedBanner) {
        return `
          <div class="run-mode-banner is-goal-reached">
            <div class="run-goal-reached-head">
              <strong>Meta atingida! ${gStatus.resumoMeta}</strong>
            </div>
            <div class="run-goal-reached-actions">
              <button type="button" class="run-goal-btn is-secondary" data-action="goal-keep-running">Continuar correndo</button>
              <button type="button" class="run-goal-btn is-primary" data-action="goal-finish-now">Finalizar</button>
            </div>
          </div>
        `;
      }
      const pctWidth = Math.round(gStatus.progresso * 100);
      return `
        <div class="run-mode-banner is-goal">
          <div class="run-goal-bar-row">
            <div class="run-goal-progress-track">
              <div class="run-goal-progress-fill" style="width:${pctWidth}%" data-goal-fill></div>
            </div>
            <span class="run-goal-remaining" data-goal-rem>${gStatus.restanteTexto}</span>
          </div>
        </div>
      `;
    }

    // C4.3 Modo Ritmo Alvo
    if (tracker.modo === 'ritmo') {
      const band = computeTargetPaceBand(tracker.ritmoAtualSegKm, tracker.ritmoAlvoSegKm);
      const pctLeft = Math.round(((band.needlePos + 1) / 2) * 100);
      return `
        <div class="run-mode-banner is-pace">
          <div class="run-pace-band-labels">
            <span class="${band.zona === 'acelere' ? 'is-active' : ''}">Acelere</span>
            <span class="${band.zona === 'no_ritmo' ? 'is-active is-ok' : ''}" data-pace-zone-label>${band.label}</span>
            <span class="${band.zona === 'segure' ? 'is-active' : ''}">Segure</span>
          </div>
          <div class="run-pace-band-track">
            <div class="run-pace-zone-left"></div>
            <div class="run-pace-zone-center"></div>
            <div class="run-pace-zone-right"></div>
            <div class="run-pace-needle" style="left:${pctLeft}%" data-pace-needle></div>
          </div>
        </div>
      `;
    }

    // C4.4 Modo Intervalos
    if (tracker.modo === 'intervalos') {
      const iv =
        tracker.intervalState ||
        tracker.intervalsEngine.update(tracker.movimentoSeg, tracker.distanciaM);
      const isTiro = iv.fase === 'tiro';
      return `
        <div class="run-mode-banner is-intervals ${isTiro ? 'is-tiro-inverted' : 'is-trote'}">
          <div class="run-iv-banner-left">
            ${renderIntervalPhaseIcon(iv.fase, 26)}
            <div class="run-iv-banner-texts">
              <strong class="run-iv-phase-title" data-iv-title>${iv.titulo}</strong>
              <span class="run-iv-next-text" data-iv-next>${iv.proximaTexto}</span>
            </div>
          </div>
          <div class="run-iv-phase-timer" data-iv-timer>${iv.restanteTexto}</div>
        </div>
      `;
    }

    return '';
  }

  function getHeroHtml() {
    if (heroPrimary === 'tempo') {
      return `
        <div class="run-hero-value-wrap" data-action="toggle-hero-metric" role="button" tabindex="0" aria-label="Tempo em movimento. Toque para alternar com Distância">
          <span class="run-hero-number" data-hero-num>${formatRunClock(tracker.movimentoSeg)}</span>
          <span class="run-hero-unit" data-hero-unit>min</span>
        </div>
        ${
          tracker.semGpsModo
            ? `<p class="run-hero-subnote">Modo sem GPS · você ajusta a distância no fim</p>`
            : `<p class="run-hero-subnote" data-hero-sub>${formatKmWithUnit(tracker.distanciaM)}</p>`
        }
      `;
    }

    return `
      <div class="run-hero-value-wrap" data-action="toggle-hero-metric" role="button" tabindex="0" aria-label="Distância percorrida. Toque para alternar com Tempo">
        <span class="run-hero-number" data-hero-num>${formatKmNumber(tracker.distanciaM, 2)}</span>
        <span class="run-hero-unit" data-hero-unit>km</span>
      </div>
    `;
  }

  function updateToastAnchor() {
    const mapZone = container.querySelector('.run-map-zone');
    const liveOverlay = document.getElementById('live-workout-overlay');
    if (mapZone && liveOverlay) {
      const rect = mapZone.getBoundingClientRect();
      if (rect.top > 0) {
        liveOverlay.style.setProperty('--live-toast-top', `${Math.round(rect.top + 10)}px`);
      }
    }
  }

  function refreshOsmCanvasIfActive() {
    const streetsActive = Boolean(store.getState()?.perfil?.mostrarRuasNoMapa);
    if (!streetsActive) return;
    const canvasEl = container.querySelector('.route-osm-canvas');
    const boxEl = container.querySelector('.clay-route-art-box');
    if (!canvasEl || !boxEl) return;
    const bboxAttr = boxEl.dataset.routeBbox;
    const bbox = bboxAttr ? bboxAttr.split(',').map(Number).filter(Number.isFinite) : null;
    renderOsmTilesOnCanvas(canvasEl, bbox && bbox.length === 4 ? bbox : null, { isDark: true }).then((ok) => {
      if (!ok) {
        canvasEl.style.display = 'none';
        const bgRect = boxEl.querySelector('.route-art-bg-rect');
        if (bgRect) bgRect.setAttribute('fill', 'var(--corrida-superficie)');
      }
    });
  }

  function render() {
    const perfil = store.getState()?.perfil || {};
    const somVozAtivo = perfil.somAtivo !== false && perfil.vozEmCorrida !== false;
    const streetsActive = Boolean(perfil.mostrarRuasNoMapa);
    const ultimaParcial =
      tracker.parciais.length > 0 ? tracker.parciais[tracker.parciais.length - 1] : null;

    const thirdLabel = thirdMetricMode === 'calorias' ? 'CALORIAS' : 'RITMO MÉDIO';
    const thirdValue =
      thirdMetricMode === 'calorias'
        ? `${tracker.calorias || 0}`
        : formatPaceSegKm(tracker.ritmoMedioSegKm);
    const thirdUnit = thirdMetricMode === 'calorias' ? 'kcal' : '/km';

    container.innerHTML = `
      <section id="live-run-root" class="run-active-screen ${tracker.screenLocked ? 'is-screen-locked' : ''}" aria-label="Corrida ao vivo em andamento">
        <!-- 1. Barra superior (48px) -->
        <header class="run-active-topbar">
          <div class="run-active-mode-badge">
            <span class="run-gps-status-dot ${getGpsStatusDotClass()}" data-run-gps-dot></span>
            <span data-run-mode-pill>${getModePillLabel()}</span>
          </div>
          <div class="run-active-top-actions">
            <button type="button" class="run-top-icon-btn ${somVozAtivo ? 'is-on' : ''}" data-action="toggle-run-sound" aria-label="${somVozAtivo ? 'Desativar avisos de voz e som' : 'Ativar avisos de voz e som'}">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                ${somVozAtivo ? `<path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>` : `<line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>`}
              </svg>
            </button>
            <button type="button" class="run-top-icon-btn ${tracker.screenLocked ? 'is-locked' : ''}" data-action="lock-run-screen" aria-label="${tracker.screenLocked ? 'Segure por 1 segundo para desbloquear a tela' : 'Bloquear tela contra toques acidentais'}">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="3"/>
                ${tracker.screenLocked ? `<path d="M8 11V7a4 4 0 0 1 8 0v4"/>` : `<path d="M8 11V7a4 4 0 0 1 7.4-2"/>`}
              </svg>
            </button>
          </div>
        </header>

        <!-- 2. Faixa do modo (Meta, Ritmo, Intervalos ou Pausa Automática) -->
        <div class="run-mode-banner-slot" data-mode-banner-slot>
          ${buildModeBannerHtml()}
        </div>

        <!-- 3. Métrica principal (Hero) -->
        <div class="run-hero-zone" data-hero-zone>
          ${getHeroHtml()}
        </div>

        <!-- 4. Grade de 3 métricas secundárias -->
        <div class="run-secondary-metrics-grid">
          <div class="run-sec-metric-card">
            <span class="run-sec-label">${heroPrimary === 'tempo' ? 'DISTÂNCIA' : 'TEMPO'}</span>
            <div class="run-sec-val-row">
              <strong class="run-sec-val" data-sec-time>${heroPrimary === 'tempo' ? formatKmNumber(tracker.distanciaM, 2) : formatRunClock(tracker.movimentoSeg)}</strong>
              <span class="run-sec-unit">${heroPrimary === 'tempo' ? 'km' : ''}</span>
            </div>
          </div>

          <div class="run-sec-metric-card">
            <span class="run-sec-label">RITMO ATUAL</span>
            <div class="run-sec-val-row">
              <strong class="run-sec-val" data-sec-cur-pace>${formatPaceSegKm(tracker.ritmoAtualSegKm)}</strong>
              <span class="run-sec-unit">/km</span>
            </div>
          </div>

          <div class="run-sec-metric-card is-tappable" data-action="toggle-third-metric" role="button" tabindex="0" aria-label="Alternar entre Ritmo Médio e Calorias">
            <span class="run-sec-label" data-sec-third-label>${thirdLabel}</span>
            <div class="run-sec-val-row">
              <strong class="run-sec-val" data-sec-third-val>${thirdValue}</strong>
              <span class="run-sec-unit" data-sec-third-unit>${thirdUnit}</span>
            </div>
          </div>
        </div>

        <!-- 5. Zona do Mapa / Arte do Trajeto -->
        <div class="run-map-zone" data-run-map-zone>
          ${renderRouteArtSvg({
            points: tracker.rawPoints,
            width: 340,
            height: 170,
            isDark: true,
            isFinished: false,
            showStreetToggle: true,
            streetsActive
          })}
          ${
            ultimaParcial
              ? `<span class="run-last-split-chip" data-last-split-chip>Último km: ${formatPaceSegKm(ultimaParcial.ritmoSegKm)}</span>`
              : ''
          }
        </div>

        <!-- 6. Barra de controle inferior -->
        <footer class="run-bottom-control-bar">
          ${
            tracker.screenLocked
              ? `
                <div class="run-locked-pill" data-action="hold-unlock-pill" role="button" tabindex="0">
                  <svg viewBox="0 0 36 36" width="28" height="28" class="run-unlock-ring-svg">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(var(--energia-fg-rgb), 0.2)" stroke-width="3"/>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="var(--terracota)" stroke-width="3" stroke-dasharray="88" stroke-dashoffset="88" stroke-linecap="round" data-unlock-progress-circle/>
                  </svg>
                  <span>Tela bloqueada · Segure o cadeado por 1 s para desbloquear</span>
                </div>
              `
              : `
                <button type="button" class="run-pause-btn" data-action="pause-run">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="5" width="4.5" height="14" rx="1.5"/>
                    <rect x="13.5" y="5" width="4.5" height="14" rx="1.5"/>
                  </svg>
                  <span>Pausar</span>
                </button>
              `
          }
        </footer>
      </section>
    `;

    requestAnimationFrame(() => {
      updateToastAnchor();
      refreshOsmCanvasIfActive();
    });
    bindEvents();
  }

  function startUnlockHold() {
    if (!tracker.screenLocked) return;
    unlockHoldStartMs = Date.now();
    const circleEl = container.querySelector('[data-unlock-progress-circle]');

    const step = () => {
      const elapsed = Date.now() - unlockHoldStartMs;
      const frac = Math.min(1, elapsed / 1000);
      if (circleEl) {
        circleEl.setAttribute('stroke-dashoffset', String(Math.round(88 * (1 - frac))));
      }
      if (frac >= 1) {
        tracker.screenLocked = false;
        vibrate('confirmacao');
        showToast({ message: 'Tela desbloqueada' });
        render();
        return;
      }
      unlockRafId = requestAnimationFrame(step);
    };
    unlockRafId = requestAnimationFrame(step);
  }

  function cancelUnlockHold() {
    if (unlockRafId) {
      cancelAnimationFrame(unlockRafId);
      unlockRafId = null;
    }
    const circleEl = container.querySelector('[data-unlock-progress-circle]');
    if (circleEl) {
      circleEl.setAttribute('stroke-dashoffset', '88');
    }
  }

  function bindEvents() {
    const root = container.querySelector('#live-run-root');
    if (!root) return;

    // Suporte a segurar por 1s no cadeado ou na pílula quando bloqueado
    const lockBtn = root.querySelector('[data-action="lock-run-screen"]');
    const lockPill = root.querySelector('[data-action="hold-unlock-pill"]');
    [lockBtn, lockPill].filter(Boolean).forEach((el) => {
      el.addEventListener('pointerdown', (e) => {
        if (!tracker.screenLocked) return;
        e.preventDefault();
        startUnlockHold();
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((evName) => {
        el.addEventListener(evName, () => {
          if (tracker.screenLocked) cancelUnlockHold();
        });
      });
    });

    root.addEventListener('click', (e) => {
      const lockTrigger = e.target.closest('[data-action="lock-run-screen"]');
      if (lockTrigger) {
        if (!tracker.screenLocked) {
          vibrate('selecao');
          tracker.screenLocked = true;
          render();
        }
        return;
      }

      if (tracker.screenLocked) {
        return;
      }

      if (e.target.closest('[data-action="toggle-run-sound"]')) {
        vibrate('selecao');
        const cur = store.getState()?.perfil || {};
        const nextVal = !(cur.somAtivo !== false && cur.vozEmCorrida !== false);
        store.updatePerfil({ somAtivo: nextVal, vozEmCorrida: nextVal });
        render();
        return;
      }

      if (e.target.closest('[data-action="toggle-hero-metric"]')) {
        vibrate('selecao');
        heroPrimary = heroPrimary === 'distancia' ? 'tempo' : 'distancia';
        render();
        return;
      }

      if (e.target.closest('[data-action="toggle-third-metric"]')) {
        vibrate('selecao');
        thirdMetricMode = thirdMetricMode === 'ritmo_medio' ? 'calorias' : 'ritmo_medio';
        render();
        return;
      }

      if (e.target.closest('[data-action="toggle-route-streets"]')) {
        vibrate('selecao');
        const cur = Boolean(store.getState()?.perfil?.mostrarRuasNoMapa);
        store.updatePerfil({ mostrarRuasNoMapa: !cur });
        render();
        return;
      }

      if (e.target.closest('[data-action="manual-resume-autopause"]')) {
        vibrate('confirmacao');
        tracker.resumeRun(false);
        return;
      }

      if (e.target.closest('[data-action="goal-keep-running"]')) {
        vibrate('selecao');
        tracker.goalReachedBannerDismissed = true;
        render();
        return;
      }

      if (e.target.closest('[data-action="goal-finish-now"]')) {
        vibrate('confirmacao');
        tracker.enterSummaryState();
        return;
      }

      if (e.target.closest('[data-action="pause-run"]')) {
        vibrate('selecao');
        tracker.pauseRun(false);
      }
    });
  }

  let lastRenderedPointCount = -1;

  function updateLiveMetrics() {
    const root = container.querySelector('#live-run-root');
    if (!root) return;

    const heroNumEl = root.querySelector('[data-hero-num]');
    if (heroNumEl) {
      heroNumEl.textContent =
        heroPrimary === 'tempo'
          ? formatRunClock(tracker.movimentoSeg)
          : formatKmNumber(tracker.distanciaM, 2);
    }

    const heroSubEl = root.querySelector('[data-hero-sub]');
    if (heroSubEl) {
      heroSubEl.textContent = formatKmWithUnit(tracker.distanciaM);
    }

    const secTimeEl = root.querySelector('[data-sec-time]');
    if (secTimeEl) {
      secTimeEl.textContent =
        heroPrimary === 'tempo'
          ? formatKmNumber(tracker.distanciaM, 2)
          : formatRunClock(tracker.movimentoSeg);
    }

    const curPaceEl = root.querySelector('[data-sec-cur-pace]');
    if (curPaceEl) {
      curPaceEl.textContent = formatPaceSegKm(tracker.ritmoAtualSegKm);
    }

    const thirdValEl = root.querySelector('[data-sec-third-val]');
    if (thirdValEl) {
      thirdValEl.textContent =
        thirdMetricMode === 'calorias'
          ? `${tracker.calorias || 0}`
          : formatPaceSegKm(tracker.ritmoMedioSegKm);
    }

    const modePillEl = root.querySelector('[data-run-mode-pill]');
    if (modePillEl) {
      modePillEl.textContent = getModePillLabel();
    }

    // Atualiza faixa de modo
    if (tracker.modo === 'meta_distancia' || tracker.modo === 'meta_tempo') {
      const gStatus = tracker.getGoalStatus();
      if (gStatus) {
        const fillEl = root.querySelector('[data-goal-fill]');
        const remEl = root.querySelector('[data-goal-rem]');
        if (fillEl) fillEl.style.width = `${Math.round(gStatus.progresso * 100)}%`;
        if (remEl) remEl.textContent = gStatus.restanteTexto;
      }
    } else if (tracker.modo === 'ritmo') {
      const band = computeTargetPaceBand(tracker.ritmoAtualSegKm, tracker.ritmoAlvoSegKm);
      const needleEl = root.querySelector('[data-pace-needle]');
      const labelEl = root.querySelector('[data-pace-zone-label]');
      if (labelEl) labelEl.textContent = band.label;
      if (needleEl && Math.abs(band.needlePos - lastNeedlePos) > 0.01) {
        const fromPos = lastNeedlePos;
        const toPos = band.needlePos;
        lastNeedlePos = toPos;
        if (cancelNeedleSpring) cancelNeedleSpring();
        cancelNeedleSpring = spring({
          from: fromPos,
          to: toPos,
          stiffness: 220,
          damping: 22,
          onUpdate(val) {
            const pct = Math.round(((val + 1) / 2) * 100);
            needleEl.style.left = `${pct}%`;
          }
        });
      }
    } else if (tracker.modo === 'intervalos') {
      const bannerSlot = root.querySelector('[data-mode-banner-slot]');
      if (bannerSlot) {
        bannerSlot.innerHTML = buildModeBannerHtml();
      }
    }

    // Re-renderiza o mapa quando novos pontos de GPS chegam
    if (tracker.rawPoints.length !== lastRenderedPointCount) {
      lastRenderedPointCount = tracker.rawPoints.length;
      const mapZone = root.querySelector('[data-run-map-zone]');
      if (mapZone) {
        const streetsActive = Boolean(store.getState()?.perfil?.mostrarRuasNoMapa);
        const ultimaParcial =
          tracker.parciais.length > 0 ? tracker.parciais[tracker.parciais.length - 1] : null;
        mapZone.innerHTML = `
          ${renderRouteArtSvg({
            points: tracker.rawPoints,
            width: 340,
            height: 170,
            isDark: true,
            isFinished: false,
            showStreetToggle: true,
            streetsActive
          })}
          ${
            ultimaParcial
              ? `<span class="run-last-split-chip" data-last-split-chip>Último km: ${formatPaceSegKm(ultimaParcial.ritmoSegKm)}</span>`
              : ''
          }
        `;
        refreshOsmCanvasIfActive();
      }
    }
  }

  render();

  return {
    updateLiveMetrics,
    destroy() {
      cancelUnlockHold();
      if (cancelNeedleSpring) cancelNeedleSpring();
      if (unlockHoldTimer) clearTimeout(unlockHoldTimer);
    }
  };
}
