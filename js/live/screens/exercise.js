/**
 * ============================================================================
 * CLAY FIT — TELA PRINCIPAL DE EXERCÍCIO (A1, A2, B8, B9, M1, M2, M4, M6)
 * /js/live/screens/exercise.js
 *
 * Especificações Prompt 4 (A1 e A2) + Prompt 3.1 (M1, M2, M4, M6):
 * - A1: Cartão `.live-metric-card` com `min-height` e altura ditada pelo conteúdo
 *   (nunca corta os botões circulares de 48px).
 * - A1: Coluna flex de 100dvh onde o CARTÃO DA ILUSTRAÇÃO (`.live-demo-zone`)
 *   cresce (`flex: 1 1 auto; min-height: 120px; max-height: 46dvh`) e absorve o
 *   espaço que sobra, mantendo no máximo 24px entre quaisquer blocos de texto.
 * - A1: Em alturas < 700px, junta os dois chips num único chip de 1 linha:
 *   "Sugerida 42,5 kg · Última 40 kg × 8".
 * - A2: Define `--live-toast-top` sobre a área da ilustração para que a pílula
 *   de 44px nunca cubra o nome do exercício, "Como fazer", chips ou botões.
 * ============================================================================
 */

import { getIconSvg } from '../../ui/illustrations.js';
import { renderEnergyExerciseScene } from '../../ui/illustrations-live.js';
import { TimestampCountdown, formatKg } from '../timer.js';
import { vibrate, prefersReducedMotion } from '../../motion.js';

export function renderExerciseScreen(sessao) {
  const estado = sessao.maquinaEstado || {};
  const exIdx = Math.max(0, Number(estado.exercicioIdx || 0));
  const exercicios = sessao.exercicios || [];
  const totalEx = exercicios.length || 1;
  const ex = exercicios[exIdx] || exercicios[0];
  const series = ex?.series || [];
  const totalSeries = series.length || 1;
  const sIdx = Math.max(0, Math.min(totalSeries - 1, Number(estado.serieIdx || 0)));
  const serieAtual = series[sIdx] || { n: 1, carga: 20, reps: 10, alvoReps: 10 };

  const segmentsHtml = exercicios
    .map((item, i) => {
      let fillPct = 0;
      if (i < exIdx) {
        fillPct = 100;
      } else if (i === exIdx) {
        const feitasCount = (item.series || []).filter((s) => s.feita || s.pulada).length;
        fillPct = Math.round((feitasCount / Math.max(1, (item.series || []).length)) * 100);
      }
      return `
        <div class="live-ex-seg">
          <div class="live-ex-seg__fill" style="width:${fillPct}%;"></div>
        </div>
      `;
    })
    .join('');

  const dotsHtml = series
    .map((s, idx) => {
      if (s.feita) {
        return `
          <span class="live-serie-dot live-serie-dot--done" data-serie-dot="${idx}" aria-label="Série ${idx + 1} concluída">
            <svg viewBox="0 0 14 14" width="10" height="10" fill="none" stroke="var(--energia-chip)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.5 7.5 5.5 10.5 11.5 4"/>
            </svg>
          </span>
        `;
      }
      if (idx === sIdx) {
        return `<span class="live-serie-dot live-serie-dot--current" data-serie-dot="${idx}" aria-label="Série ${idx + 1} atual"></span>`;
      }
      return `<span class="live-serie-dot live-serie-dot--future" data-serie-dot="${idx}" aria-label="Série ${idx + 1} pendente"></span>`;
    })
    .join('');

  const isPesoCorpo = Boolean(ex.isPesoCorpo);
  const usaColete = Boolean(ex.usaColete || Number(serieAtual.carga || 0) > 0);
  const isPorTempo = Boolean(ex.porTempo);
  const cargaAtual = Number(serieAtual.carga ?? ex.cargaSugerida ?? 0);
  const repsAtuais = Number(serieAtual.reps ?? serieAtual.alvoReps ?? 10);

  let loadColHtml = '';
  if (isPesoCorpo && !usaColete) {
    loadColHtml = `
      <div class="live-metric-card" data-focus-col="carga" tabindex="0">
        <span class="live-aa-pill live-aa-pill--tiny">CARGA</span>
        <div class="live-bodyweight-title">Peso do corpo</div>
        <button
          type="button"
          id="btn-toggle-vest"
          class="live-aa-pill live-vest-toggle-btn"
          aria-pressed="false"
        >
          <span>+ colete/mochila</span>
        </button>
      </div>
    `;
  } else {
    loadColHtml = `
      <div class="live-metric-card" data-focus-col="carga" tabindex="0">
        <div class="live-metric-card__top">
          <span class="live-aa-pill live-aa-pill--tiny">CARGA</span>
          ${
            isPesoCorpo
              ? `<button type="button" id="btn-toggle-vest" class="live-aa-pill live-aa-pill--tiny" aria-pressed="true">Sem colete</button>`
              : ''
          }
        </div>
        <div class="live-metric-value-row">
          <span class="live-metric-number" id="live-val-carga">${formatKg(cargaAtual)}</span>
          <span class="live-metric-unit">kg</span>
        </div>
        <div class="live-stepper-row">
          <button
            type="button"
            class="live-circle-step-btn"
            data-step-target="carga"
            data-step-dir="-1"
            aria-label="Diminuir carga"
          >
            ${getIconSvg('menos', 22)}
          </button>
          <button
            type="button"
            class="live-circle-step-btn"
            data-step-target="carga"
            data-step-dir="1"
            aria-label="Aumentar carga"
          >
            ${getIconSvg('mais', 22)}
          </button>
        </div>
      </div>
    `;
  }

  let repsColHtml = '';
  if (isPorTempo) {
    repsColHtml = `
      <div class="live-metric-card" data-focus-col="reps" tabindex="0">
        <span class="live-aa-pill live-aa-pill--tiny">CRONÔMETRO DA SÉRIE</span>
        <div class="live-metric-value-row">
          <span class="live-metric-number" id="live-val-reps">${repsAtuais}</span>
          <span class="live-metric-unit">s</span>
        </div>
        <div class="live-stepper-row">
          <button
            type="button"
            class="live-circle-step-btn"
            data-step-target="reps"
            data-step-dir="-5"
            aria-label="Diminuir 5 segundos"
          >
            ${getIconSvg('menos', 22)}
          </button>
          <button
            type="button"
            id="btn-start-timed-set"
            class="live-timed-start-pill"
          >
            <span>Começar série</span>
          </button>
          <button
            type="button"
            class="live-circle-step-btn"
            data-step-target="reps"
            data-step-dir="5"
            aria-label="Aumentar 5 segundos"
          >
            ${getIconSvg('mais', 22)}
          </button>
        </div>
      </div>
    `;
  } else {
    repsColHtml = `
      <div class="live-metric-card" data-focus-col="reps" tabindex="0">
        <span class="live-aa-pill live-aa-pill--tiny">REPETIÇÕES</span>
        <div class="live-metric-value-row">
          <span class="live-metric-number" id="live-val-reps">${repsAtuais}</span>
        </div>
        <div class="live-stepper-row">
          <button
            type="button"
            class="live-circle-step-btn"
            data-step-target="reps"
            data-step-dir="-1"
            aria-label="Diminuir repetições"
          >
            ${getIconSvg('menos', 22)}
          </button>
          <button
            type="button"
            class="live-circle-step-btn"
            data-step-target="reps"
            data-step-dir="1"
            aria-label="Aumentar repetições"
          >
            ${getIconSvg('mais', 22)}
          </button>
        </div>
      </div>
    `;
  }

  // (7) A1 & M1/M6: Linha de apoio com formatKg; em <700px de altura vira um único chip de 1 linha
  const sugeridaKg = Number(ex.cargaSugerida ?? 0);
  const hasUltima = ex.ultimaCarga !== null && ex.ultimaCarga !== undefined && ex.ultimaCarga > 0;
  const chipLeftHtml =
    sugeridaKg > 0
      ? `
        <button
          type="button"
          id="btn-apply-suggested-load"
          class="live-support-chip live-support-chip--normal-pair"
          data-suggested-kg="${sugeridaKg}"
          aria-label="Aplicar carga sugerida pelo Clay: ${formatKg(sugeridaKg)} kg"
        >
          ${getIconSvg('brilho', 14)}
          <span>Sugerida pelo Clay: ${formatKg(sugeridaKg)} kg</span>
        </button>
      `
      : `
        <span class="live-support-chip live-support-chip--normal-pair">
          ${getIconSvg('brilho', 14)}
          <span>Ritmo controlado</span>
        </span>
      `;

  const chipRightText = hasUltima
    ? `Última vez: ${formatKg(ex.ultimaCarga)} kg × ${ex.ultimaReps || 10}`
    : 'Primeira vez: comece leve';

  const compactSingleText =
    sugeridaKg > 0 && hasUltima
      ? `Sugerida ${formatKg(sugeridaKg)} kg · Última ${formatKg(ex.ultimaCarga)} kg × ${ex.ultimaReps || 10}`
      : sugeridaKg > 0
      ? `Sugerida ${formatKg(sugeridaKg)} kg · Primeira vez`
      : `Ritmo controlado · ${chipRightText}`;

  return `
    <div class="live-screen live-screen--exercise" id="live-exercise-root">
      <!-- (1) Barra superior -->
      <header class="live-topbar">
        <button
          type="button"
          class="live-icon-btn"
          data-live-action="open-exit-sheet"
          aria-label="Pausar ou sair do treino"
        >
          ${getIconSvg('fechar', 24)}
        </button>
        <span class="live-aa-pill">Exercício ${exIdx + 1} de ${totalEx}</span>
        <button
          type="button"
          class="live-icon-btn"
          id="btn-exercise-more-menu"
          aria-label="Mais opções do exercício"
        >
          ${getIconSvg('maisOpcoes', 24)}
        </button>
      </header>

      <!-- (2) Progresso do treino -->
      <div
        class="live-ex-progress-row"
        role="progressbar"
        aria-valuenow="${exIdx + 1}"
        aria-valuemin="1"
        aria-valuemax="${totalEx}"
        aria-label="Progresso dos exercícios"
      >
        ${segmentsHtml}
      </div>

      <!-- Corpo principal (A1: cartão da ilustração cresce e absorve o espaço livre; máximo <= 24px entre blocos de texto) -->
      <div class="live-exercise-body">
        <div class="live-exercise-left-col">
          <div
            class="live-demo-zone"
            id="live-demo-scene-box"
            data-howto-scene-card
          >
            ${renderEnergyExerciseScene(ex, { theme: 'energia' })}
            <button
              type="button"
              id="btn-open-howto-scene"
              class="live-aa-pill live-demo-zone__badge"
              aria-label="Como fazer ${ex.nome}"
            >
              <span>Como fazer</span>
            </button>
          </div>

          <div class="live-exercise-header-text">
            <h1 class="live-h1-exercise" tabindex="-1">${ex.nome}</h1>
            <div class="live-exercise-submeta">
              <span class="live-aa-pill">${ex.grupo} · ${ex.equipamento}</span>
            </div>
          </div>
        </div>

        <div class="live-exercise-right-col">
          <div class="live-series-status-row" id="live-set-counter-label">
            <span class="live-aa-pill live-aa-pill--caption">SÉRIE ${sIdx + 1} DE ${totalSeries}</span>
            <div class="live-series-dots" role="group" aria-label="Séries do exercício">
              ${dotsHtml}
            </div>
          </div>

          <div class="live-metrics-swipe-wrap" id="live-metrics-swipe-wrap">
            <div class="live-metrics-skip-bg" aria-hidden="true">
              <span>Pular</span>
            </div>
            <div class="live-metrics-grid" id="live-metrics-grid">
              ${loadColHtml}
              ${repsColHtml}
            </div>
          </div>

          <div class="live-support-row" id="live-support-row">
            ${chipLeftHtml}
            <span class="live-support-chip live-support-chip--normal-pair" id="live-support-last-chip">${chipRightText}</span>
            <button
              type="button"
              id="btn-apply-suggested-compact"
              class="live-support-chip live-support-chip--compact-single"
              data-suggested-kg="${sugeridaKg}"
              aria-label="${compactSingleText}"
            >
              ${getIconSvg('brilho', 14)}
              <span>${compactSingleText}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- (8) & M4: Rodapé com Faixa de Esforço de 88px e Botão Gigante "Série feita" -->
      <footer class="live-giant-footer">
        <div class="live-effort-bar" id="live-effort-bar" hidden aria-live="polite">
          <div class="live-effort-bar__label">COMO FOI?</div>
          <div class="live-effort-chips" role="radiogroup" aria-label="Como foi a série?">
            <button type="button" class="live-effort-chip" data-effort-choice="leve" data-effort-val="leve">
              <span>Leve</span>
            </button>
            <button type="button" class="live-effort-chip is-selected" data-effort-choice="medio" data-effort-val="medio">
              <span>Na medida</span>
            </button>
            <button type="button" class="live-effort-chip" data-effort-choice="pesado" data-effort-val="pesado">
              <span>Pesado</span>
            </button>
          </div>
          <div class="live-effort-bar__progress">
            <div class="live-effort-bar__progress-fill" id="live-effort-progress-fill"></div>
          </div>
        </div>

        <button
          type="button"
          id="btn-serie-feita"
          class="live-giant-btn"
        >
          <span class="live-giant-btn__label">Série feita</span>
        </button>
      </footer>
    </div>
  `;
}

export function bindExerciseScreen(
  root,
  sessao,
  {
    onUpdateCurrentSet,
    onCompleteSet,
    onSkipSet,
    onOpenHowTo,
    onOpenMoreMenu,
    onOpenExit,
    onToggleBodyweightVest
  }
) {
  const estado = sessao.maquinaEstado || {};
  const exIdx = Math.max(0, Number(estado.exercicioIdx || 0));
  const ex = (sessao.exercicios || [])[exIdx];
  if (!ex) return () => {};

  const sIdx = Math.max(0, Math.min((ex.series || []).length - 1, Number(estado.serieIdx || 0)));
  const serieAtual = ex.series[sIdx] || { n: 1, carga: 20, reps: 10 };

  let currentCarga = Number(serieAtual.carga ?? ex.cargaSugerida ?? 0);
  let currentReps = Number(serieAtual.reps ?? serieAtual.alvoReps ?? 10);
  const passoCarga = Number(ex.passoCargaKg || 1);

  const exerciseRoot = root.querySelector('#live-exercise-root');
  const demoZone = root.querySelector('#live-demo-scene-box') || root.querySelector('#btn-open-howto-scene');
  const cargaEl = root.querySelector('#live-val-carga');
  const repsEl = root.querySelector('#live-val-reps');
  const serieBtn = root.querySelector('#btn-serie-feita');
  const effortBar = root.querySelector('#live-effort-bar');
  const effortFill = root.querySelector('#live-effort-progress-fill');

  // A2 & Item 3: Posiciona a pílula de toast no topo da zona de ilustração sem cobrir "Como fazer" nem o título
  const syncToastTop = () => {
    if (demoZone) {
      const r = demoZone.getBoundingClientRect();
      if (r.height > 0) {
        document.documentElement.style.setProperty(
          '--live-toast-top',
          `${Math.max(56, Math.round(r.top + 4))}px`
        );
      }
    }
  };
  syncToastTop();
  requestAnimationFrame(syncToastTop);
  const exSyncT1 = setTimeout(syncToastTop, 180);
  const exSyncT2 = setTimeout(syncToastTop, 400);

  let repeatTimeout = null;
  let repeatInterval = null;
  let effortTimeout = null;
  let timedSetCountdown = null;
  let isTransitioningSet = false;
  let focusedColumn = 'carga';

  const clearRepeat = () => {
    if (repeatTimeout) {
      clearTimeout(repeatTimeout);
      repeatTimeout = null;
    }
    if (repeatInterval) {
      clearInterval(repeatInterval);
      repeatInterval = null;
    }
  };

  const applyStep = (target, dir) => {
    if (target === 'carga') {
      currentCarga = Math.max(0, Math.round((currentCarga + dir * passoCarga) * 10) / 10);
      if (cargaEl) cargaEl.textContent = formatKg(currentCarga);
    } else {
      currentReps = Math.max(1, Math.round(currentReps + dir));
      if (repsEl) repsEl.textContent = String(currentReps);
    }
    if (onUpdateCurrentSet) {
      onUpdateCurrentSet({ carga: currentCarga, reps: currentReps });
    }
  };

  root.querySelectorAll('[data-step-target]').forEach((btn) => {
    const target = btn.dataset.stepTarget;
    const dir = Number(btn.dataset.stepDir || 1);

    btn.addEventListener('click', () => {
      vibrate('selecao');
      applyStep(target, dir);
    });

    btn.addEventListener(
      'pointerdown',
      () => {
        clearRepeat();
    clearTimeout(exSyncT1);
    clearTimeout(exSyncT2);
        repeatTimeout = setTimeout(() => {
          repeatInterval = setInterval(() => {
            try {
              if (navigator.userActivation?.hasBeenActive && navigator.vibrate) {
                navigator.vibrate(6);
              }
            } catch (_) {}
            applyStep(target, dir);
          }, 90);
        }, 350);
      },
      { passive: true }
    );

    btn.addEventListener('pointerup', clearRepeat, { passive: true });
    btn.addEventListener('pointercancel', clearRepeat, { passive: true });
    btn.addEventListener('pointerleave', clearRepeat, { passive: true });
  });

  root.querySelector('#btn-toggle-vest')?.addEventListener('click', () => {
    vibrate('selecao');
    if (onToggleBodyweightVest) onToggleBodyweightVest();
  });

  const handleApplySuggested = (e) => {
    const sug = Number(e.currentTarget.dataset.suggestedKg || 0);
    if (sug <= 0) return;
    vibrate('selecao');
    currentCarga = sug;
    if (cargaEl) cargaEl.textContent = formatKg(currentCarga);
    if (onUpdateCurrentSet) {
      onUpdateCurrentSet({ carga: currentCarga, reps: currentReps });
    }
  };

  root.querySelector('#btn-apply-suggested-load')?.addEventListener('click', handleApplySuggested);
  root.querySelector('#btn-apply-suggested-compact')?.addEventListener('click', handleApplySuggested);

  const startTimedBtn = root.querySelector('#btn-start-timed-set');
  if (startTimedBtn) {
    startTimedBtn.addEventListener('click', () => {
      vibrate('confirmacao');
      if (timedSetCountdown) {
        timedSetCountdown.stop();
        timedSetCountdown = null;
        startTimedBtn.querySelector('span').textContent = 'Começar série';
        return;
      }
      startTimedBtn.querySelector('span').textContent = 'Contando...';
      timedSetCountdown = new TimestampCountdown({
        durationSec: currentReps,
        onSecond: (rem) => {
          if (repsEl) repsEl.textContent = String(rem);
        },
        onComplete: () => {
          timedSetCountdown = null;
          if (serieBtn && !serieBtn.disabled) {
            serieBtn.click();
          }
        }
      }).start();
    });
  }

  root.querySelector('#btn-open-howto-scene')?.addEventListener('click', (e) => {
    e.stopPropagation();
    vibrate('selecao');
    if (onOpenHowTo) onOpenHowTo(ex);
  });
  root.querySelector('#live-demo-scene-box')?.addEventListener('click', () => {
    vibrate('selecao');
    if (onOpenHowTo) onOpenHowTo(ex);
  });

  root.querySelector('#btn-exercise-more-menu')?.addEventListener('click', () => {
    vibrate('selecao');
    if (onOpenMoreMenu) onOpenMoreMenu(ex);
  });

  root.querySelector('[data-live-action="open-exit-sheet"]')?.addEventListener('click', () => {
    vibrate('selecao');
    if (onOpenExit) onOpenExit();
  });

  const finishWithEffort = (esforcoEscolhido = 'medio') => {
    if (effortTimeout) {
      clearTimeout(effortTimeout);
      effortTimeout = null;
    }
    if (onCompleteSet) {
      onCompleteSet({
        carga: currentCarga,
        reps: currentReps,
        esforco: esforcoEscolhido
      });
    }
  };

  if (serieBtn) {
    serieBtn.addEventListener('click', (e) => {
      if (isTransitioningSet || serieBtn.disabled) return;
      isTransitioningSet = true;
      serieBtn.disabled = true;

      if (timedSetCountdown) {
        timedSetCountdown.stop();
        timedSetCountdown = null;
      }

      if (!prefersReducedMotion()) {
        const rect = serieBtn.getBoundingClientRect();
        const rx = e.clientX ? e.clientX - rect.left : rect.width / 2;
        const ry = e.clientY ? e.clientY - rect.top : rect.height / 2;
        const ripple = document.createElement('span');
        ripple.className = 'live-giant-btn__ripple';
        ripple.style.left = `${rx}px`;
        ripple.style.top = `${ry}px`;
        serieBtn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 620);
      }

      vibrate('confirmacao');

      const curDot = root.querySelector('.live-serie-dot--current');
      if (curDot) {
        curDot.classList.remove('live-serie-dot--current');
        curDot.classList.add('live-serie-dot--done');
        curDot.innerHTML = `
          <svg viewBox="0 0 14 14" width="10" height="10" fill="none" stroke="var(--energia-chip)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2.5 7.5 5.5 10.5 11.5 4"/>
          </svg>
        `;
      }

      const isFast = window.clayTimer?.isFastMode ? window.clayTimer.isFastMode() : false;
      const delayOpenMs = isFast ? 40 : 280;
      const effortWindowMs = isFast ? 300 : 3000;

      setTimeout(() => {
        if (!effortBar) {
          finishWithEffort('medio');
          return;
        }
        if (exerciseRoot) exerciseRoot.classList.add('has-effort-open');
        effortBar.hidden = false;
        effortBar.classList.add('is-open');
        if (effortFill) {
          effortFill.style.transition = `transform ${effortWindowMs}ms linear`;
          effortFill.style.transform = 'scaleX(0)';
        }
        effortTimeout = setTimeout(() => {
          finishWithEffort('medio');
        }, effortWindowMs);
      }, delayOpenMs);
    });
  }

  root.querySelectorAll('[data-effort-choice]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const choice = chip.dataset.effortChoice || 'medio';
      vibrate('selecao');
      root.querySelectorAll('[data-effort-choice]').forEach((c) => {
        c.classList.toggle('is-selected', c === chip);
      });
      finishWithEffort(choice);
    });
  });

  const swipeWrap = root.querySelector('#live-metrics-swipe-wrap');
  const swipeGrid = root.querySelector('#live-metrics-grid');
  if (swipeWrap && swipeGrid) {
    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let swiping = false;

    swipeWrap.addEventListener(
      'pointerdown',
      (e) => {
        if (e.target.closest('button')) return;
        swiping = true;
        startX = e.clientX;
        startY = e.clientY;
        deltaX = 0;
      },
      { passive: true }
    );

    swipeWrap.addEventListener(
      'pointermove',
      (e) => {
        if (!swiping) return;
        const dx = e.clientX - startX;
        const dy = Math.abs(e.clientY - startY);
        if (dy > Math.abs(dx)) {
          swiping = false;
          swipeGrid.style.transform = '';
          return;
        }
        if (dx < 0) {
          deltaX = Math.max(-120, dx);
          swipeGrid.style.transform = `translateX(${deltaX}px)`;
        }
      },
      { passive: true }
    );

    const endSwipe = () => {
      if (!swiping) return;
      swiping = false;
      if (deltaX < -72) {
        vibrate('selecao');
        swipeGrid.style.transform = '';
        if (onSkipSet) onSkipSet();
      } else {
        swipeGrid.style.transform = '';
      }
      deltaX = 0;
    };

    swipeWrap.addEventListener('pointerup', endSwipe, { passive: true });
    swipeWrap.addEventListener('pointercancel', endSwipe, { passive: true });
  }

  root.querySelectorAll('[data-focus-col]').forEach((col) => {
    col.addEventListener('focus', () => {
      focusedColumn = col.dataset.focusCol || 'carga';
    });
    col.addEventListener('click', () => {
      focusedColumn = col.dataset.focusCol || 'carga';
    });
  });

  const handleKeyDown = (e) => {
    if (document.querySelector('.c-sheet-backdrop.is-open')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      applyStep(focusedColumn, -1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      applyStep(focusedColumn, 1);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', syncToastTop);

  return () => {
    clearRepeat();
    if (effortTimeout) clearTimeout(effortTimeout);
    if (timedSetCountdown) timedSetCountdown.stop();
    document.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', syncToastTop);
  };
}
