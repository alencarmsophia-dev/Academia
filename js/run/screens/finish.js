/**
 * ============================================================================
 * CLAY FIT — TELA 7 DA CORRIDA: RESUMO DA CORRIDA (C3.7)
 * /js/run/screens/finish.js
 *
 * Container obrigatório: `#live-finish-root`
 * Especificação Prompt 4 (C3.7):
 * - Usa o tema claro "Studio Clay" (``) para sinalizar que o esforço terminou.
 * - Cabeçalho: título editável por chips ("Corrida da manhã" / "Trote leve" /
 *   "Treino de ritmo" / "Intervalado" / "Longão") + data e hora.
 * - Cartão da Arte do Trajeto (`height: 220px`, `border-radius: 24px`) com animação
 *   `stroke-dashoffset` em `900ms`, marcos de km tocáveis e botão "Ruas".
 * - Grade de métricas principais (6 cartões 2×3):
 *   1. Distância total (com stepper -0,1/+0,1 km se `sem_gps`)
 *   2. Tempo em movimento (subtítulo "Tempo total ...")
 *   3. Ritmo médio
 *   4. Melhor ritmo
 *   5. Ganho de elevação ("+42 m" ou "Plano")
 *   6. Calorias estimadas
 * - Tabela de Parciais por km com barra proporcional, selo "Mais rápido" e
 *   leitura automática de 1 linha (`computeSplitInsight`).
 * - Recordes batidos com medalha em argila (`renderClayRecordMedal`).
 * - "Como você se sentiu?" (5 chips) e "Algum incômodo?" (6 chips).
 * - CTA primário (`64px`): "Salvar corrida".
 * ============================================================================
 */

import { store, recomputeAllRecordsFromSessions } from '../../store.js';
import { vibrate } from '../../motion.js';
import { clearToasts } from '../../ui/toast.js';
import { renderClayRecordMedal, wireRunIllustrations } from '../../ui/illustrations-run.js';
import { renderRouteArtSvg } from '../route-art.js';
import { renderOsmTilesOnCanvas } from '../tiles.js';
import { formatKmWithUnit, formatPaceSegKm, formatRunClock } from '../geo.js';
import { computeSplitInsight, estimateRunCalories } from '../metrics.js';

function getDefaultRunTitle(modo) {
  if (modo === 'intervalos') return 'Intervalado';
  if (modo === 'ritmo') return 'Treino de ritmo';
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Corrida da manhã';
  if (hour >= 12 && hour < 18) return 'Corrida da tarde';
  return 'Corrida da noite';
}

export function renderRunFinishScreen(container, tracker, { onSaved } = {}) {
  if (!container) return;

  // A2: Limpa qualquer toast pendente ao entrar no Resumo
  clearToasts();

  const titleOptions = [
    'Corrida da manhã',
    'Corrida da tarde',
    'Corrida da noite',
    'Trote leve',
    'Treino de ritmo',
    'Intervalado',
    'Longão'
  ];

  let selectedTitle = getDefaultRunTitle(tracker.modo);
  if (!titleOptions.includes(selectedTitle)) {
    selectedTitle = titleOptions[0];
  }

  let customDistM = Math.max(
    tracker.semGpsModo && tracker.distanciaM < 100 ? 3000 : 0,
    Math.round(tracker.distanciaM || 0)
  );
  let selectedFeeling = 4; // 1..5 -> "No ponto" = 3, "Leve" = 4
  let selectedFeelingLabel = 'No ponto';
  let selectedIncomodos = ['Nenhum'];
  let highlightedKm = null;

  const feelingOptions = [
    { label: 'Muito leve', val: 5 },
    { label: 'Leve', val: 4 },
    { label: 'No ponto', val: 3 },
    { label: 'Pesado', val: 2 },
    { label: 'Exaustivo', val: 1 }
  ];

  const incomodoOptions = ['Nenhum', 'Joelho', 'Tornozelo', 'Canela', 'Quadril', 'Lombar'];

  function getPreviewRecords() {
    const sessoesAtuais = store.getState()?.sessoes || [];
    const movSeg = Math.max(1, tracker.movimentoSeg || 1);
    const fakeSession = {
      ...tracker.sessao,
      id: tracker.sessao.id,
      tipo: 'corrida',
      status: 'concluida',
      distanciaM: customDistM,
      movimentoSeg: movSeg,
      duracaoSeg: Math.max(movSeg, tracker.duracaoSeg || movSeg),
      ritmoMedioSegKm: customDistM >= 50 ? Math.round(movSeg / (customDistM / 1000)) : null,
      parciais: tracker.parciais,
      rota: tracker.sessao.rota
    };
    const outras = sessoesAtuais.filter((s) => s.id !== tracker.sessao.id && s.status === 'concluida');
    const todos = recomputeAllRecordsFromSessions([fakeSession, ...outras]);
    return todos.filter((r) => r.sessaoId === tracker.sessao.id);
  }

  function renderSplitsSectionHtml() {
    const parciais = Array.isArray(tracker.parciais) ? tracker.parciais : [];
    if (parciais.length === 0) {
      return `
        <div class="run-finish-card">
          <h3 class="run-finish-section-title">Parciais por quilômetro</h3>
          <p class="run-finish-empty-note">Percurso abaixo de 1 km completo — sem parciais fechadas.</p>
        </div>
      `;
    }

    const fullSplits = parciais.filter((p) => !p.parcialM && p.ritmoSegKm > 0);
    const fastestPace =
      fullSplits.length > 0
        ? Math.min(...fullSplits.map((p) => p.ritmoSegKm))
        : Math.min(...parciais.map((p) => p.ritmoSegKm || 999));
    const slowestPace = Math.max(...parciais.map((p) => p.ritmoSegKm || 300), fastestPace + 30);

    const insightText = computeSplitInsight(parciais);

    return `
      <div class="run-finish-card">
        <h3 class="run-finish-section-title">Parciais por quilômetro</h3>
        <div class="run-splits-table">
          ${parciais
            .map((p) => {
              const isFastest = !p.parcialM && p.ritmoSegKm === fastestPace && fullSplits.length > 1;
              const isSelected = Number(highlightedKm) === Number(p.km);
              // Barra mais comprida para ritmo mais rápido
              const ratio =
                slowestPace > fastestPace
                  ? 1 - (p.ritmoSegKm - fastestPace) / (slowestPace - fastestPace)
                  : 0.85;
              const barPct = Math.round(52 + Math.max(0, Math.min(1, ratio)) * 48);
              const elevTxt =
                typeof p.elevDeltaM === 'number'
                  ? `${p.elevDeltaM >= 0 ? '+' : ''}${p.elevDeltaM} m`
                  : '0 m';
              const kmLabel = p.parcialM
                ? `Parcial ${(p.parcialM / 1000).toFixed(2).replace('.', ',')} km`
                : `Km ${p.km}`;

              return `
                <div class="run-split-row ${isFastest ? 'is-fastest' : ''} ${isSelected ? 'is-selected' : ''}" data-split-row-km="${p.km}">
                  <div class="run-split-km-col">
                    <strong>${kmLabel}</strong>
                    ${isFastest ? `<span class="run-fastest-badge">Mais rápido</span>` : ''}
                  </div>
                  <div class="run-split-bar-col">
                    <div class="run-split-bar-track">
                      <div class="run-split-bar-fill ${isFastest ? 'is-fastest' : ''}" style="width:${barPct}%"></div>
                    </div>
                  </div>
                  <div class="run-split-pace-col">
                    <strong>${formatPaceSegKm(p.ritmoSegKm)} /km</strong>
                    <span class="run-split-elev">${elevTxt}</span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
        ${insightText ? `<p class="run-splits-insight">${insightText}</p>` : ''}
      </div>
    `;
  }

  function render() {
    const movSeg = Math.max(1, tracker.movimentoSeg || 1);
    const totalSeg = Math.max(movSeg, tracker.duracaoSeg || movSeg);
    const ritmoMedio =
      customDistM >= 50 ? Math.round(movSeg / (customDistM / 1000)) : tracker.ritmoMedioSegKm;
    const ritmoMelhor = tracker.ritmoMelhorSegKm || ritmoMedio;
    const ganhoElev =
      typeof tracker.sessao?.ganhoElevM === 'number'
        ? `+${tracker.sessao.ganhoElevM} m`
        : 'Plano';
    const pesoKg = store.getState()?.perfil?.pesoKg || 70;
    const calorias = estimateRunCalories(customDistM, pesoKg);
    const streetsActive = Boolean(store.getState()?.perfil?.mostrarRuasNoMapa);
    const novosRecordes = getPreviewRecords();

    const nowDateStr = new Date().toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    container.innerHTML = `
      <section id="live-finish-root" class="run-finish-screen" aria-label="Resumo da corrida concluída">
        <div class="run-finish-scroll">
          <!-- Cabeçalho com título editável por chips -->
          <header class="run-finish-header">
            <span class="run-finish-kicker">CORRIDA CONCLUÍDA · ${nowDateStr}</span>
            <h1 class="run-finish-title">${selectedTitle}</h1>
            <div class="run-finish-title-chips" role="listbox" aria-label="Escolher título da corrida">
              ${titleOptions
                .map(
                  (t) => `
                    <button type="button" class="run-title-chip ${selectedTitle === t ? 'is-active' : ''}" data-title-chip="${t}">
                      ${t}
                    </button>
                  `
                )
                .join('')}
            </div>
          </header>

          <!-- Cartão da Arte do Trajeto (220px, border-radius 24px) -->
          <div class="run-finish-route-card">
            ${renderRouteArtSvg({
              points: tracker.rawPoints,
              rota: tracker.sessao?.rota,
              width: 350,
              height: 220,
              isDark: false,
              isFinished: true,
              animateDraw: true,
              showStreetToggle: true,
              streetsActive,
              highlightKm: highlightedKm
            })}
          </div>

          <!-- Grade de métricas principais (6 cartões 2×3) -->
          <div class="run-finish-metrics-grid">
            <div class="run-finish-metric-card ${tracker.semGpsModo ? 'is-editable-dist' : ''}">
              <span class="run-finish-metric-label">Distância total</span>
              <strong class="run-finish-metric-val">${formatKmWithUnit(customDistM)}</strong>
              ${
                tracker.semGpsModo
                  ? `
                    <div class="run-nogps-stepper">
                      <button type="button" class="run-nogps-step-btn" data-nogps-delta="-100">− 0,1 km</button>
                      <button type="button" class="run-nogps-step-btn" data-nogps-delta="100">+ 0,1 km</button>
                    </div>
                  `
                  : `<span class="run-finish-metric-sub">Percurso registrado</span>`
              }
            </div>

            <div class="run-finish-metric-card">
              <span class="run-finish-metric-label">Tempo em movimento</span>
              <strong class="run-finish-metric-val">${formatRunClock(movSeg)}</strong>
              <span class="run-finish-metric-sub">Tempo total ${formatRunClock(totalSeg)}</span>
            </div>

            <div class="run-finish-metric-card">
              <span class="run-finish-metric-label">Ritmo médio</span>
              <strong class="run-finish-metric-val">${formatPaceSegKm(ritmoMedio)} /km</strong>
              <span class="run-finish-metric-sub">Média em movimento</span>
            </div>

            <div class="run-finish-metric-card">
              <span class="run-finish-metric-label">Melhor ritmo</span>
              <strong class="run-finish-metric-val">${formatPaceSegKm(ritmoMelhor)} /km</strong>
              <span class="run-finish-metric-sub">Pico de 100 m</span>
            </div>

            <div class="run-finish-metric-card">
              <span class="run-finish-metric-label">Ganho de elevação</span>
              <strong class="run-finish-metric-val">${ganhoElev}</strong>
              <span class="run-finish-metric-sub">Altimetria suavizada</span>
            </div>

            <div class="run-finish-metric-card">
              <span class="run-finish-metric-label">Calorias estimadas</span>
              <strong class="run-finish-metric-val">${calorias} kcal</strong>
              <span class="run-finish-metric-sub">Estimativa metabólica</span>
            </div>
          </div>

          <!-- Recordes batidos nesta corrida -->
          ${
            novosRecordes.length > 0
              ? `
                <div class="run-finish-records-box">
                  <h3 class="run-finish-section-title">Recordes batidos nesta corrida</h3>
                  <div class="run-finish-records-list">
                    ${novosRecordes
                      .map(
                        (r) => `
                          <div class="run-finish-record-card">
                            ${renderClayRecordMedal({ isMuted: false, size: 42 })}
                            <div class="run-finish-record-texts">
                              <strong>${r.nome}</strong>
                              <span>${r.detalhe || ''}</span>
                            </div>
                            <strong class="run-finish-record-val">${r.valorTexto}</strong>
                          </div>
                        `
                      )
                      .join('')}
                  </div>
                </div>
              `
              : ''
          }

          <!-- Tabela de Parciais por km -->
          ${renderSplitsSectionHtml()}

          <!-- Como você se sentiu? -->
          <div class="run-finish-card">
            <h3 class="run-finish-section-title">Como você se sentiu?</h3>
            <div class="run-finish-chips-row">
              ${feelingOptions
                .map(
                  (f) => `
                    <button
                      type="button"
                      class="run-finish-choice-chip ${selectedFeelingLabel === f.label ? 'is-active' : ''}"
                      data-feeling-label="${f.label}"
                      data-feeling-val="${f.val}"
                    >
                      ${f.label}
                    </button>
                  `
                )
                .join('')}
            </div>
          </div>

          <!-- Algum incômodo? -->
          <div class="run-finish-card">
            <h3 class="run-finish-section-title">Algum incômodo?</h3>
            <div class="run-finish-chips-row">
              ${incomodoOptions
                .map(
                  (inc) => `
                    <button
                      type="button"
                      class="run-finish-choice-chip ${selectedIncomodos.includes(inc) ? 'is-active' : ''}"
                      data-incomodo="${inc}"
                    >
                      ${inc}
                    </button>
                  `
                )
                .join('')}
            </div>
          </div>

          <!-- CTA primário (64px): Salvar corrida -->
          <div class="run-finish-cta-wrap">
            <button type="button" class="run-save-btn" data-action="save-finished-run">
              Salvar corrida
            </button>
          </div>
        </div>
      </section>
    `;

    wireRunIllustrations(container);

    if (streetsActive) {
      const canvasEl = container.querySelector('.route-osm-canvas');
      const boxEl = container.querySelector('.clay-route-art-box');
      if (canvasEl && boxEl) {
        const bboxAttr = boxEl.dataset.routeBbox;
        const bbox = bboxAttr ? bboxAttr.split(',').map(Number).filter(Number.isFinite) : null;
        renderOsmTilesOnCanvas(canvasEl, bbox && bbox.length === 4 ? bbox : null, { isDark: false });
      }
    }

    bindEvents();
  }

  function bindEvents() {
    const root = container.querySelector('#live-finish-root');
    if (!root) return;

    root.addEventListener('click', (e) => {
      const titleChip = e.target.closest('[data-title-chip]');
      if (titleChip) {
        vibrate('selecao');
        selectedTitle = titleChip.dataset.titleChip;
        render();
        return;
      }

      const nogpsBtn = e.target.closest('[data-nogps-delta]');
      if (nogpsBtn) {
        vibrate('selecao');
        const delta = Number(nogpsBtn.dataset.nogpsDelta || 0);
        customDistM = Math.max(100, Math.min(42000, customDistM + delta));
        render();
        return;
      }

      const kmMarker = e.target.closest('[data-km-marker]');
      if (kmMarker) {
        vibrate('selecao');
        const km = Number(kmMarker.dataset.kmMarker);
        highlightedKm = highlightedKm === km ? null : km;
        render();
        const rowEl = container.querySelector(`[data-split-row-km="${km}"]`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }

      const splitRow = e.target.closest('[data-split-row-km]');
      if (splitRow) {
        vibrate('selecao');
        const km = Number(splitRow.dataset.splitRowKm);
        highlightedKm = highlightedKm === km ? null : km;
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

      const feelBtn = e.target.closest('[data-feeling-label]');
      if (feelBtn) {
        vibrate('selecao');
        selectedFeelingLabel = feelBtn.dataset.feelingLabel;
        selectedFeeling = Number(feelBtn.dataset.feelingVal || 4);
        render();
        return;
      }

      const incBtn = e.target.closest('[data-incomodo]');
      if (incBtn) {
        vibrate('selecao');
        const inc = incBtn.dataset.incomodo;
        if (inc === 'Nenhum') {
          selectedIncomodos = ['Nenhum'];
        } else {
          const semNenhum = selectedIncomodos.filter((i) => i !== 'Nenhum');
          if (semNenhum.includes(inc)) {
            const next = semNenhum.filter((i) => i !== inc);
            selectedIncomodos = next.length > 0 ? next : ['Nenhum'];
          } else {
            selectedIncomodos = [...semNenhum, inc];
          }
        }
        render();
        return;
      }

      if (e.target.closest('[data-action="save-finished-run"]')) {
        vibrate('sucesso');
        const movSeg = Math.max(1, tracker.movimentoSeg || 1);
        const totalSeg = Math.max(movSeg, tracker.duracaoSeg || movSeg);
        const ritmoMedio =
          customDistM >= 50 ? Math.round(movSeg / (customDistM / 1000)) : tracker.ritmoMedioSegKm;
        const pesoKg = store.getState()?.perfil?.pesoKg || 70;
        const calorias = estimateRunCalories(customDistM, pesoKg);

        const finalizada = store.finalizarSessao(tracker.sessao.id, {
          tipo: 'corrida',
          nome: selectedTitle,
          grupoPrincipal: 'Corrida',
          modo: tracker.modo,
          meta: tracker.meta,
          ritmoAlvoSegKm: tracker.ritmoAlvoSegKm,
          intervalos: tracker.modo === 'intervalos' ? tracker.intervalosConfig : null,
          movimentoSeg: movSeg,
          pausadoSeg: tracker.pausadoSeg,
          duracaoSeg: totalSeg,
          distanciaM: customDistM,
          ritmoMedioSegKm: ritmoMedio,
          ritmoMelhorSegKm: tracker.ritmoMelhorSegKm || ritmoMedio,
          ganhoElevM: tracker.sessao?.ganhoElevM ?? null,
          perdaElevM: tracker.sessao?.perdaElevM ?? null,
          calorias,
          parciais: tracker.parciais,
          rota: tracker.sessao?.rota || null,
          sentimento: selectedFeeling,
          humor: selectedFeeling,
          incomodo: selectedIncomodos,
          origem: tracker.semGpsModo ? 'sem_gps' : tracker.origem
        });

        tracker.sessao = finalizada || tracker.sessao;
        tracker.transitionTo('celebracao');
        if (onSaved) onSaved(tracker.sessao);
      }
    });
  }

  render();
}
