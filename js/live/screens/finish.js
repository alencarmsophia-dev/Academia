/**
 * ============================================================================
 * CLAY FIT — TELA DE RESUMO PÓS-TREINO (B14 + M6)
 * /js/live/screens/finish.js
 *
 * Especificações Prompt 3 (B14) + Correção Prompt 3.1 (M6):
 * - Transição Energia -> claro: círculo expandindo (`clip-path: circle`) por
 *   600ms; fundo shader SÁLVIA intensidade .5.
 * - Legenda "TREINO CONCLUÍDO"; título H1 "Treino feito, {nome}." (sem exclamação).
 * - Quatro métricas em grade 2×2 (cartões de 96px, raio 24px):
 *   "Tempo ativo" ("42 min"), "Volume" ("3.240 kg"), "Séries" ("22"),
 *   "Recordes" ("2 novos" ou "Nenhum desta vez").
 *   Os números contam de 0 ao valor em 900ms com stagger de 60ms.
 * - M6: Todos os pesos e volumes usam `formatKg(n)` (vírgula decimal e ponto
 *   de milhar em pt-BR: "42,5 kg", "5.050 kg") e concordância singular/plural.
 * - Botão primário "Concluir" fixo na base (56px).
 * ============================================================================
 */

import { store } from '../../store.js';
import { renderCheckinFaceSvg } from '../../ui/illustrations.js';
import { renderSceneMTrophy } from '../../ui/illustrations-live.js';
import { computeActiveSeconds } from '../session.js';
import { formatKg } from '../timer.js';
import { spring, vibrate, prefersReducedMotion } from '../../motion.js';

export function renderFinishSummaryScreen(sessao) {
  const perfil = store.getEntity('perfil') || {};
  const nome = perfil.nome || 'Atleta';

  const activeSec = Math.max(60, Number(sessao.duracaoSeg || computeActiveSeconds(sessao) || 1800));
  const activeMin = Math.max(1, Math.round(activeSec / 60));

  const exercicios = sessao.exercicios || [];
  let volumeTotal = 0;
  let seriesFeitasCount = 0;
  const potenciaisRecordes = [];

  exercicios.forEach((ex) => {
    const feitas = (ex.series || []).filter((s) => s.feita && !s.pulada);
    seriesFeitasCount += feitas.length;
    feitas.forEach((s) => {
      const c = Number(s.carga || 0);
      const r = Number(s.reps || 0);
      if (c > 0 && r > 0 && !ex.porTempo) {
        volumeTotal += c * r;
      }
    });

    if (feitas.length > 0) {
      const maxCarga = Math.max(...feitas.map((s) => Number(s.carga || 0)));
      const ultima = Number(ex.ultimaCarga || 0);
      if (maxCarga > 0 && maxCarga > ultima) {
        potenciaisRecordes.push({
          exercicio: ex.nome,
          valor: `${formatKg(maxCarga)} kg`
        });
      }
    }
  });

  const recordesList =
    Array.isArray(sessao.recordes) && sessao.recordes.length > 0
      ? sessao.recordes.map((r) => ({
          exercicio: r.nome,
          valor: r.valor != null ? `${formatKg(r.valor)} kg` : String(r.valorTexto || '').replace(/(\d+)\.(\d+)/g, '$1,$2')
        }))
      : potenciaisRecordes;

  const isRun = sessao.tipo === 'corrida';
  const humorAtual = Number(sessao.humor || 4);
  const incomodosAtuais =
    Array.isArray(sessao.incomodo) && sessao.incomodo.length > 0
      ? sessao.incomodo
      : ['Nenhum'];

  const exerciciosRowsHtml = exercicios
    .map((ex) => {
      const feitas = (ex.series || []).filter((s) => s.feita && !s.pulada);
      const count = feitas.length || (ex.series || []).length || 3;
      const repsRef = feitas[0]?.reps ?? ex.series?.[0]?.alvoReps ?? 10;
      const maxCarga = feitas.length > 0
        ? Math.max(...feitas.map((s) => Number(s.carga || 0)))
        : Number(ex.cargaSugerida || 0);

      const detalheStr = ex.porTempo
        ? `${count} × ${repsRef} s`
        : maxCarga > 0
        ? `${count} × ${repsRef} · ${formatKg(maxCarga)} kg`
        : `${count} × ${repsRef} · Peso do corpo`;

      const subiu = maxCarga > 0 && maxCarga > Number(ex.ultimaCarga || 0);
      const badgeSymbol = subiu ? '↑' : '=';
      const badgeColor = subiu ? 'var(--sucesso)' : 'var(--tinta-3)';

      return `
        <div class="live-summary-ex-row">
          <div style="font-weight:600; color:var(--tinta); font-size:15px; line-height:20px;">
            ${ex.nome}
          </div>
          <div style="display:inline-flex; align-items:center; gap:8px; font-size:14px; color:var(--tinta-2); font-weight:600;">
            <span>${detalheStr}</span>
            <span style="color:${badgeColor}; font-weight:700; font-size:16px;" aria-label="${subiu ? 'Carga subiu' : 'Carga mantida'}">${badgeSymbol}</span>
          </div>
        </div>
      `;
    })
    .join('');

  const recordCardsHtml =
    recordesList.length > 0
      ? `
        <section style="display:flex; flex-direction:column; gap:10px;" aria-label="Novos recordes">
          ${recordesList
            .map(
              (rec) => `
                <div class="live-summary-record-card">
                  ${renderSceneMTrophy(44)}
                  <div style="font-size:15px; line-height:20px; font-weight:600; color:var(--tinta);">
                    Recorde: ${rec.exercicio} · ${rec.valor}
                  </div>
                </div>
              `
            )
            .join('')}
        </section>
      `
      : '';

  const faceLabels = {
    1: 'Muito cansativo',
    2: 'Pesado',
    3: 'Equilibrado',
    4: 'Muito bom',
    5: 'Excelente'
  };

  const discomfortOptions = ['Nenhum', 'Joelho', 'Ombro', 'Lombar'];

  return `
    <div class="live-summary-shell live-clip-circle-reveal" id="live-finish-root">
      <div id="shader-host-summary" class="onboarding-shader-bg" aria-hidden="true"></div>

      <div class="reading-column live-summary-content">
        <header style="padding-top: calc(20px + var(--safe-top));">
          <div class="t-caption" style="color:var(--terracota-profundo);">TREINO CONCLUÍDO</div>
          <h1 class="t-h1" tabindex="-1" style="margin-top:6px;">Treino feito, ${nome}.</h1>
        </header>

        <!-- Quatro métricas em grade 2×2 (cartões de 96px, raio 24px) -->
        <section class="live-summary-metrics-grid" aria-label="Métricas do treino">
          <div class="live-summary-metric-card">
            <span class="t-caption" style="color:var(--tinta-3);">Tempo ativo</span>
            <div class="live-summary-metric-val">
              <span data-countup-target="${activeMin}" data-countup-delay="0">${activeMin}</span> min
            </div>
          </div>

          <div class="live-summary-metric-card">
            <span class="t-caption" style="color:var(--tinta-3);">Volume</span>
            <div class="live-summary-metric-val">
              ${
                isRun
                  ? `<span>Ritmo livre</span>`
                  : `<span data-countup-target="${volumeTotal}" data-countup-delay="60">${formatKg(Math.round(volumeTotal))}</span> kg`
              }
            </div>
          </div>

          <div class="live-summary-metric-card">
            <span class="t-caption" style="color:var(--tinta-3);">Séries</span>
            <div class="live-summary-metric-val">
              <span data-countup-target="${seriesFeitasCount}" data-countup-delay="120">${seriesFeitasCount}</span>
            </div>
          </div>

          <div class="live-summary-metric-card">
            <span class="t-caption" style="color:var(--tinta-3);">Recordes</span>
            <div class="live-summary-metric-val" style="font-size:${recordesList.length > 0 ? '24px' : '16px'};">
              ${
                recordesList.length > 0
                  ? `<span data-countup-target="${recordesList.length}" data-countup-delay="180">${recordesList.length}</span> ${recordesList.length === 1 ? 'novo' : 'novos'}`
                  : 'Nenhum desta vez'
              }
            </div>
          </div>
        </section>

        <!-- Cartões de recorde com a Cena M (troféu de argila) -->
        ${recordCardsHtml}

        <!-- Lista "Seus exercícios" -->
        ${
          !isRun && exercicios.length > 0
            ? `
              <section class="c-card" style="padding-block:14px;" aria-label="Seus exercícios">
                <div class="t-caption" style="color:var(--tinta-3); margin-bottom:8px;">SEUS EXERCÍCIOS</div>
                ${exerciciosRowsHtml}
              </section>
            `
            : ''
        }

        <!-- Pergunta "Como foi o treino?" com os 5 rostos -->
        <section class="c-checkin-strip" aria-label="Como foi o treino?">
          <div class="c-checkin-strip__title">Como foi o treino?</div>
          <div class="c-checkin-strip__faces" role="radiogroup" aria-label="Avaliação de 1 a 5">
            ${[1, 2, 3, 4, 5]
              .map(
                (lvl) => `
                  <button
                    type="button"
                    role="radio"
                    aria-checked="${humorAtual === lvl ? 'true' : 'false'}"
                    class="checkin-face-btn"
                    data-summary-mood="${lvl}"
                    aria-label="${faceLabels[lvl]}"
                  >
                    ${renderCheckinFaceSvg(lvl, 44)}
                  </button>
                `
              )
              .join('')}
          </div>
        </section>

        <!-- Pergunta "Algum incômodo?" com chips múltiplos -->
        <section class="c-card" aria-label="Algum incômodo?">
          <div class="t-h3" style="margin-bottom:12px;">Algum incômodo?</div>
          <div class="c-chip-group" role="group" aria-label="Regiões com incômodo">
            ${discomfortOptions
              .map((opt) => {
                const selected = incomodosAtuais.includes(opt);
                return `
                  <button
                    type="button"
                    class="c-chip ${selected ? 'is-selected' : ''}"
                    data-summary-discomfort="${opt}"
                    aria-pressed="${selected ? 'true' : 'false'}"
                  >
                    <span class="c-chip__label">${opt}</span>
                  </button>
                `;
              })
              .join('')}
          </div>
        </section>
      </div>

      <!-- Botão primário "Concluir" fixo na base (56px) -->
      <div class="live-summary-footer">
        <div style="max-width:640px; margin:0 auto; width:100%;">
          <button
            type="button"
            id="btn-finish-workout-concluir"
            class="c-btn c-btn--primary c-btn--full"
            style="min-height:56px;"
          >
            <span>Concluir</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function bindFinishSummaryScreen(root, sessao, { onConcludeSummary }) {
  let selectedMood = Number(sessao.humor || 4);
  let selectedDiscomforts =
    Array.isArray(sessao.incomodo) && sessao.incomodo.length > 0
      ? [...sessao.incomodo]
      : ['Nenhum'];

  // Animação de contagem de 0 ao valor em 900ms com stagger de 60ms (B14)
  if (!prefersReducedMotion()) {
    root.querySelectorAll('[data-countup-target]').forEach((el) => {
      const target = Number(el.dataset.countupTarget || 0);
      const delay = Number(el.dataset.countupDelay || 0);
      if (target <= 0) return;

      setTimeout(() => {
        const start = performance.now();
        const dur = 900;
        const step = (now) => {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          const cur = Math.round(target * eased);
          el.textContent = formatKg(cur);
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, delay);
    });
  }

  // Seleção dos 5 rostos com spring
  const faceBtns = root.querySelectorAll('[data-summary-mood]');
  faceBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedMood = Number(btn.dataset.summaryMood || 4);
      vibrate('selecao');
      faceBtns.forEach((peer) => {
        peer.setAttribute('aria-checked', String(peer === btn));
      });
      spring({
        from: 1,
        to: 1.2,
        stiffness: 260,
        damping: 18,
        onUpdate: (s) => {
          btn.style.transform = `scale(${s.toFixed(3)})`;
        },
        onDone: () => {
          btn.style.transform = '';
        }
      });
    });
  });

  // Chips múltiplos "Algum incômodo?" ("Nenhum" desmarca os outros)
  const discBtns = root.querySelectorAll('[data-summary-discomfort]');
  discBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.summaryDiscomfort;
      vibrate('selecao');
      if (val === 'Nenhum') {
        selectedDiscomforts = ['Nenhum'];
      } else {
        selectedDiscomforts = selectedDiscomforts.filter((x) => x !== 'Nenhum');
        if (selectedDiscomforts.includes(val)) {
          selectedDiscomforts = selectedDiscomforts.filter((x) => x !== val);
        } else {
          selectedDiscomforts.push(val);
        }
        if (selectedDiscomforts.length === 0) {
          selectedDiscomforts = ['Nenhum'];
        }
      }

      discBtns.forEach((peer) => {
        const pVal = peer.dataset.summaryDiscomfort;
        const isSel = selectedDiscomforts.includes(pVal);
        peer.classList.toggle('is-selected', isSel);
        peer.setAttribute('aria-pressed', String(isSel));
      });
    });
  });

  // Botão "Concluir"
  root.querySelector('#btn-finish-workout-concluir')?.addEventListener('click', () => {
    vibrate('sucesso');
    if (onConcludeSummary) {
      onConcludeSummary({
        humor: selectedMood,
        incomodo: selectedDiscomforts
      });
    }
  });

  return () => {};
}
