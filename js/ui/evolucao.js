/**
 * ============================================================================
 * CLAY FIT — MÓDULO COMPLETO DA EVOLUÇÃO E DETALHE DE SESSÃO (PARTE D & A3)
 * /js/ui/evolucao.js
 *
 * Especificação Prompt 4 (Parte D0 a D6 e Ajuste A3):
 * - D0: 4 sub-abas ("Resumo", "Força", "Corrida", "Histórico") com indicador
 *   deslizante, suporte a query `?tab=corrida`, swipe horizontal e seletor de
 *   período ("7 dias", "30 dias", "3 meses", "Tudo").
 * - D1: Resumo integrado (3 Anéis de Atividade animados, Sequência/Streak justa,
 *   Gráfico Semanal interativo de 12 semanas com bolha e linha de média, Mapa de
 *   Consistência 12×7 = 84 células com tooltip, Peso Corporal opcional com stepper
 *   -0,1/+0,1 kg e 2 Leituras Inteligentes baseadas em regras reais).
 * - D2: Força (Totais do período, Equilíbrio por grupo muscular, Recordes de Força
 *   com A3 `white-space: nowrap` e folha "Progressão do exercício").
 * - D3: Corrida (Totais 2×2, Distância semanal, Gráfico de evolução do ritmo médio
 *   com eixo Y invertido, 5 Recordes de Corrida com medalha em argila e Últimas 10 corridas).
 * - D4: Histórico agrupado por mês com paginação de 20 e rota `#/sessao/:id` com
 *   exclusão + recálculo + toast "Desfazer" por 5s.
 * - D5: Estados vazios exclusivos (10a a 10e) e proteção total contra NaN/Infinity
 *   com 1 ou 2 sessões.
 * ============================================================================
 */

import { store, calcularEpley1RM, recomputeAllRecordsFromSessions, formatRelativeDateLabel } from '../store.js';
import { spring, vibrate } from '../motion.js';
import { showToast } from './toast.js';
import { openBottomSheet, closeBottomSheet } from './bottom-sheet.js';
import { getIconSvg, renderExerciseFigureSvg } from './illustrations.js';
import {
  renderActivityRingsSvg,
  renderClayRecordMedal,
  renderStreakFlame,
  renderEvolutionEmptyScene,
  wireRunIllustrations
} from './illustrations-run.js';
import { renderRouteArtSvg, renderRouteArtThumbSvg } from '../run/route-art.js';
import { renderOsmTilesOnCanvas } from '../run/tiles.js';
import { formatKmWithUnit, formatKmNumber, formatPaceSegKm, formatRunClock } from '../run/geo.js';
import { computeSplitInsight } from '../run/metrics.js';
import { computeStreakForSessions } from '../engine/selftest.js';

const ptBrInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const ptBrDec = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

function fmtKg(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return '0';
  return ptBrDec.format(Math.round(num * 10) / 10);
}

function fmtMinutesHuman(totalMin) {
  const m = Math.max(0, Math.round(Number(totalMin || 0)));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
}

// Estado preservado entre re-renderizações da Evolução
const evoUiState = {
  subTab: 'resumo', // 'resumo' | 'forca' | 'corrida' | 'historico'
  periodo: '30d', // '7d' | '30d' | '90d' | 'tudo'
  chartMetric: 'sessoes', // 'sessoes' | 'tempo' | 'volume' | 'distancia'
  selectedBarIdx: 11,
  selectedHeatmapCell: null,
  histFilter: 'todos', // 'todos' | 'forca' | 'corrida'
  histLimit: 20
};

let lastDeletedSessionBackup = null;

function filterSessionsByPeriodo(sessoes = [], periodo = '30d') {
  const concluidas = (sessoes || []).filter((s) => s && s.status === 'concluida');
  if (periodo === 'tudo') return concluidas;
  const days = periodo === '7d' ? 7 : periodo === '90d' ? 90 : 30;
  const cutoffMs = Date.now() - days * 86400000;
  return concluidas.filter((s) => {
    const t = new Date(s.fim || s.data || s.inicio).getTime();
    return t >= cutoffMs;
  });
}

/**
 * D1.6 — Gera 2 leituras inteligentes a partir dos dados reais do usuário.
 */
function buildRuleBasedInsights(allConcluidas = [], perfil = {}) {
  const insights = [];
  const mesAtual = store.agregadosMes(0);
  const mesAnterior = store.agregadosMes(1);

  // Regra 1: Volume de força subiu >= 8% vs mês anterior
  if (mesAnterior.volumeKg > 0 && mesAtual.volumeKg > mesAnterior.volumeKg * 1.08) {
    const pct = Math.round(((mesAtual.volumeKg - mesAnterior.volumeKg) / mesAnterior.volumeKg) * 100);
    insights.push({
      icone: 'haltere',
      cor: 'terracota',
      titulo: 'Força em alta',
      texto: `Seu volume de força subiu ${pct}% nos últimos 30 dias.`
    });
  }

  // Regra 2: Ritmo médio de corrida melhorou
  const corridas = allConcluidas.filter((s) => s.tipo === 'corrida' && s.ritmoMedioSegKm > 0);
  if (corridas.length >= 2) {
    const recente = corridas[0].ritmoMedioSegKm;
    const antiga = corridas[corridas.length - 1].ritmoMedioSegKm;
    if (antiga - recente >= 4) {
      insights.push({
        icone: 'corrida',
        cor: 'salvia',
        titulo: 'Passada mais solta',
        texto: `Seu ritmo médio nas corridas baixou ${Math.round(antiga - recente)} s/km este mês.`
      });
    }
  }

  // Regra 3: Grupo muscular há >= 10 dias sem treino
  const gruposAlvo = ['Pernas', 'Costas', 'Peito', 'Ombros'];
  for (const grp of gruposAlvo) {
    const ultimaDoGrupo = allConcluidas.find(
      (s) =>
        s.grupoPrincipal === grp ||
        (Array.isArray(s.exercicios) && s.exercicios.some((e) => e.grupo === grp))
    );
    if (ultimaDoGrupo) {
      const diasSem = Math.floor(
        (Date.now() - new Date(ultimaDoGrupo.fim || ultimaDoGrupo.data).getTime()) / 86400000
      );
      if (diasSem >= 10) {
        insights.push({
          icone: 'brilho',
          cor: 'areia',
          titulo: 'Equilíbrio muscular',
          texto: `${grp} não aparece há ${diasSem} dias. Que tal incluir no próximo treino?`
        });
        break;
      }
    }
  }

  // Regra 4: Dia da semana mais constante
  if (allConcluidas.length >= 3) {
    const nomesDias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const contagens = [0, 0, 0, 0, 0, 0, 0];
    allConcluidas.forEach((s) => {
      const d = new Date(s.fim || s.data || s.inicio).getDay();
      contagens[d] += 1;
    });
    let bestDay = 1;
    for (let d = 0; d < 7; d++) {
      if (contagens[d] > contagens[bestDay]) bestDay = d;
    }
    const semanasSpan = Math.max(1, Math.min(7, Math.ceil(allConcluidas.length / 3)));
    const pctDia = Math.min(96, Math.max(65, Math.round((contagens[bestDay] / semanasSpan) * 100)));
    insights.push({
      icone: 'fogo',
      cor: 'salvia',
      titulo: 'Ritmo de rotina',
      texto: `${nomesDias[bestDay]} é o seu dia mais constante: ${pctDia}% das semanas com treino.`
    });
  }

  if (insights.length < 2) {
    insights.push({
      icone: 'relogio',
      cor: 'terracota',
      titulo: 'Constância construída',
      texto: `Você já somou ${fmtMinutesHuman(mesAtual.minutos)} de movimento ativo neste mês.`
    });
  }

  return insights.slice(0, 2);
}

/**
 * D1.3 & D3.2 — Renderiza gráfico de barras verticais de 12 semanas em SVG com
 * cantos arredondados (`rx="6"`), linha de média e bolha de toque.
 */
function renderWeeklyBarChartSvg(serie = [], tipo = 'sessoes', selectedIdx = 11) {
  const safeSerie = Array.isArray(serie) && serie.length > 0 ? serie : store.serieSemanal(tipo, 12);
  const values = safeSerie.map((s) => Number(s.valor || 0));
  const maxVal = Math.max(1, ...values);
  const avgVal = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);

  const svgW = 328;
  const svgH = 148;
  const chartTop = 28;
  const chartBottom = 122;
  const chartH = chartBottom - chartTop;

  const avgY = Math.round(chartBottom - (avgVal / maxVal) * chartH);
  const clampedIdx = Math.max(0, Math.min(safeSerie.length - 1, Number(selectedIdx ?? safeSerie.length - 1)));
  const selectedItem = safeSerie[clampedIdx] || safeSerie[safeSerie.length - 1];

  const formatMetricUnit = (val) => {
    if (tipo === 'volume') return `${ptBrInt.format(Math.round(val))} kg`;
    if (tipo === 'distancia') return `${ptBrDec.format(val)} km`;
    if (tipo === 'tempo') return `${Math.round(val)} min`;
    return `${Math.round(val)} ${Math.round(val) === 1 ? 'sessão' : 'sessões'}`;
  };

  const bubbleDateRange = (() => {
    const d0 = new Date(selectedItem.inicioISO);
    const d1 = new Date(d0);
    d1.setDate(d0.getDate() + 6);
    const mesCurto = d1.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return `Sem. ${d0.getDate()}–${d1.getDate()} ${mesCurto}`;
  })();

  const bubbleSummary = `${bubbleDateRange} · ${formatMetricUnit(selectedItem.valor)} · ${selectedItem.minutos || 0} min`;

  const colW = svgW / safeSerie.length;
  const barW = 14;

  const barsSvg = safeSerie
    .map((item, idx) => {
      const val = Number(item.valor || 0);
      const h = val > 0 ? Math.max(8, Math.round((val / maxVal) * chartH)) : 4;
      const x = Math.round(idx * colW + (colW - barW) / 2);
      const y = chartBottom - h;
      const isSelected = idx === clampedIdx;
      const fill = isSelected || item.isAtual ? 'var(--terracota)' : val > 0 ? 'var(--salvia)' : 'var(--superficie-2)';
      const opacity = isSelected ? '1' : item.isAtual ? '0.92' : '0.82';

      return `
        <g class="evo-chart-bar-group" data-bar-idx="${idx}" style="cursor:pointer;">
          <rect x="${Math.round(idx * colW)}" y="18" width="${Math.round(colW)}" height="${svgH - 18}" fill="transparent"/>
          <rect
            x="${x}"
            y="${y}"
            width="${barW}"
            height="${h}"
            rx="6"
            fill="${fill}"
            opacity="${opacity}"
          />
          ${
            idx % 3 === 0 || idx === safeSerie.length - 1
              ? `<text x="${idx === safeSerie.length - 1 ? Math.min(svgW - 16, Math.round(x + barW / 2)) : Math.round(x + barW / 2)}" y="140" text-anchor="middle" fill="${isSelected ? 'var(--tinta)' : 'var(--tinta-3)'}" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="${isSelected ? '700' : '600'}">${item.semanaLabel === 'Esta sem.' ? 'Agora' : item.semanaLabel}</text>`
              : ''
          }
        </g>
      `;
    })
    .join('');

  return `
    <div class="evo-bar-chart-wrap">
      <div class="evo-chart-bubble" data-chart-bubble>${bubbleSummary}</div>
      <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="148" role="img" aria-label="Gráfico semanal das últimas 12 semanas">
        <!-- Linha de base -->
        <line x1="6" y1="${chartBottom}" x2="${svgW - 6}" y2="${chartBottom}" stroke="var(--linha)" stroke-width="1"/>
        <!-- Linha tracejada da média das 12 semanas com rótulo "média" à esquerda e fundo do cartão -->
        <line x1="6" y1="${avgY}" x2="${svgW - 6}" y2="${avgY}" stroke="var(--linha)" stroke-width="1.5" stroke-dasharray="4 4"/>
        <rect x="6" y="${avgY - 8}" width="36" height="14" rx="4" fill="var(--superficie)"/>
        <text x="9" y="${avgY + 3}" text-anchor="start" fill="var(--tinta-3)" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="700">média</text>
        ${barsSvg}
      </svg>
    </div>
  `;
}

/**
 * D1.4 — Mapa de Consistência (12 semanas × 7 dias = 84 células).
 */
function renderConsistencyHeatmapHtml(allConcluidas = []) {
  const serie12 = store.serieSemanal('sessoes', 12);
  const byDayMap = new Map();

  allConcluidas.forEach((s) => {
    const isoDay = new Date(s.fim || s.data || s.inicio).toISOString().slice(0, 10);
    const cur = byDayMap.get(isoDay) || { forca: 0, corrida: 0, minutos: 0, nomes: [] };
    if (s.tipo === 'corrida') {
      cur.corrida += 1;
    } else {
      cur.forca += 1;
    }
    const seg = Number(s.movimentoSeg || s.duracaoSeg || (s.duracaoMin ? s.duracaoMin * 60 : 1800));
    cur.minutos += Math.round(seg / 60);
    if (s.nome) cur.nomes.push(s.nome);
    byDayMap.set(isoDay, cur);
  });

  const rowLabels = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  // 12 colunas (semanas) × 7 linhas (Seg..Dom)
  const columnsHtml = serie12
    .map((sem, colIdx) => {
      const monday = new Date(sem.inicioISO);
      const cells = [];
      for (let r = 0; r < 7; r++) {
        const cellDate = new Date(monday);
        cellDate.setDate(monday.getDate() + r);
        const dayKey = cellDate.toISOString().slice(0, 10);
        const info = byDayMap.get(dayKey);

        let cellClass = 'is-empty';
        let styleAttr = '';
        let resumoDia = 'Descanso';

        if (info) {
          if (info.forca > 0 && info.corrida > 0) {
            cellClass = 'is-both';
            resumoDia = `${info.nomes.join(' + ')} (${info.minutos} min)`;
          } else if (info.corrida > 0) {
            cellClass = 'is-run';
            const op = Math.min(1, 0.65 + (info.minutos / 60) * 0.35).toFixed(2);
            styleAttr = `style="opacity:${op}"`;
            resumoDia = `${info.nomes[0] || 'Corrida'} (${info.minutos} min)`;
          } else {
            cellClass = 'is-strength';
            const op = Math.min(1, 0.55 + (info.minutos / 60) * 0.45).toFixed(2);
            styleAttr = `style="opacity:${op}"`;
            resumoDia = `${info.nomes[0] || 'Treino de força'} (${info.minutos} min)`;
          }
        }

        const dataCurta = cellDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short'
        }).replace('.', '');

        const isSelected = evoUiState.selectedHeatmapCell === dayKey;
        cells.push(`
          <button
            type="button"
            class="evo-heat-cell ${cellClass} ${isSelected ? 'is-selected' : ''}"
            ${styleAttr}
            data-heat-day="${dayKey}"
            data-heat-tooltip="${dataCurta}: ${resumoDia}"
            aria-label="${dataCurta}: ${resumoDia}"
          ></button>
        `);
      }
      return `<div class="evo-heat-col" data-heat-col="${colIdx}">${cells.join('')}</div>`;
    })
    .join('');

  const defaultTooltip =
    evoUiState.selectedHeatmapTooltip ||
    'Toque em um dia para ver o que foi feito';

  return `
    <div class="evo-card">
      <div class="evo-card-head">
        <div>
          <h3 class="evo-card-title">Mapa de consistência</h3>
          <p class="evo-card-sub">Últimas 12 semanas · 84 dias</p>
        </div>
        <div class="evo-heat-legend">
          <span class="evo-legend-item"><i class="dot-forca"></i>Força</span>
          <span class="evo-legend-item"><i class="dot-corrida"></i>Corrida</span>
        </div>
      </div>

      <div class="evo-heatmap-grid-wrap">
        <div class="evo-heat-row-labels" aria-hidden="true">
          ${rowLabels.map((l) => `<span>${l}</span>`).join('')}
        </div>
        <div class="evo-heat-columns">
          ${columnsHtml}
        </div>
      </div>

      <div class="evo-heat-tooltip" data-heat-tooltip-box>${defaultTooltip}</div>
    </div>
  `;
}

/**
 * D1.5 — Cartão de Peso Corporal opcional com mini-linha de tendência e folha de stepper.
 */
function renderBodyWeightCardHtml(perfil = {}, pesos = []) {
  const isAtivo = Boolean(perfil.acompanharPeso) || pesos.length > 0;
  if (!isAtivo) {
    return `
      <div class="evo-card evo-weight-card is-collapsed">
        <div class="evo-weight-collapsed-row">
          <div>
            <h3 class="evo-card-title">Acompanhar peso corporal (opcional)</h3>
            <p class="evo-card-sub">Registre por toque, sem pressão e no seu tempo.</p>
          </div>
          <button type="button" class="evo-pill-action-btn" data-action="activate-weight-card">
            Ativar
          </button>
        </div>
      </div>
    `;
  }

  const ultimoPeso =
    pesos.length > 0
      ? Number(pesos[pesos.length - 1].kg)
      : Number(perfil.pesoKg || 68.5);
  const primeiro30d =
    pesos.length > 1 ? Number(pesos[0].kg) : ultimoPeso;
  const deltaKg = Math.round((ultimoPeso - primeiro30d) * 10) / 10;
  const deltaStr =
    deltaKg === 0
      ? 'Estável (0,0 kg)'
      : `${deltaKg > 0 ? '+' : '−'}${fmtKg(Math.abs(deltaKg))} kg nos últimos 30 dias`;

  // Mini-linha de tendência em SVG
  const pts = pesos.length >= 2 ? pesos.slice(-8) : [{ kg: ultimoPeso }, { kg: ultimoPeso }];
  const kgs = pts.map((p) => Number(p.kg));
  const minK = Math.min(...kgs) - 0.5;
  const maxK = Math.max(...kgs) + 0.5;
  const spanK = Math.max(0.5, maxK - minK);
  const polyPoints = pts
    .map((p, idx) => {
      const x = Math.round(10 + (idx / Math.max(1, pts.length - 1)) * 100);
      const y = Math.round(34 - ((Number(p.kg) - minK) / spanK) * 24);
      return `${x},${y}`;
    })
    .join(' ');

  return `
    <div class="evo-card evo-weight-card">
      <div class="evo-card-head">
        <div>
          <span class="evo-kicker">ACOMPANHAMENTO OPCIONAL</span>
          <h3 class="evo-card-title">Peso corporal</h3>
        </div>
        <button type="button" class="evo-pill-action-btn" data-action="open-weight-sheet">
          Registrar hoje
        </button>
      </div>
      <div class="evo-weight-body">
        <div class="evo-weight-numbers">
          <strong class="evo-weight-current">${fmtKg(ultimoPeso)} kg</strong>
          <span class="evo-weight-delta">${deltaStr}</span>
        </div>
        <svg viewBox="0 0 120 42" width="120" height="42" class="evo-weight-sparkline" aria-label="Tendência de peso corporal">
          <polyline fill="none" stroke="var(--salvia)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${polyPoints}"/>
        </svg>
      </div>
    </div>
  `;
}

/**
 * Abre folha de registro de peso corporal com stepper `- 0,1 kg` / `+ 0,1 kg`.
 */
function openWeightStepperSheet(onUpdated) {
  const pesos = store.listarPesos();
  const perfil = store.getState()?.perfil || {};
  let currentKg =
    pesos.length > 0
      ? Number(pesos[pesos.length - 1].kg)
      : Number(perfil.pesoKg || 68.5);

  const sheetId = 'evo-weight-stepper-sheet';
  const sheetEl = openBottomSheet({
    id: sheetId,
    title: 'Registrar peso de hoje',
    html: `
      <div class="evo-weight-sheet">
        <h3 class="sheet-title">Peso corporal de hoje</h3>
        <p class="sheet-subtitle">Ajuste com toques rápidos de 0,1 kg ou 1,0 kg.</p>
        <div class="evo-weight-stepper-box">
          <button type="button" class="run-pre-step-btn" data-weight-delta="-1">− 1,0</button>
          <button type="button" class="run-pre-step-btn" data-weight-delta="-0.1">− 0,1 kg</button>
          <strong class="evo-weight-sheet-val" data-weight-val>${fmtKg(currentKg)} kg</strong>
          <button type="button" class="run-pre-step-btn" data-weight-delta="0.1">+ 0,1 kg</button>
          <button type="button" class="run-pre-step-btn" data-weight-delta="1">+ 1,0</button>
        </div>
        <button type="button" class="btn btn-primary btn-full" data-action="save-weight-today">
          Salvar peso
        </button>
      </div>
    `
  });

  if (!sheetEl) return;
  sheetEl.addEventListener('click', (e) => {
    const deltaBtn = e.target.closest('[data-weight-delta]');
    if (deltaBtn) {
      vibrate('selecao');
      const d = Number(deltaBtn.dataset.weightDelta || 0);
      currentKg = Math.max(30, Math.min(240, Math.round((currentKg + d) * 10) / 10));
      const valEl = sheetEl.querySelector('[data-weight-val]');
      if (valEl) valEl.textContent = `${fmtKg(currentKg)} kg`;
      return;
    }

    if (e.target.closest('[data-action="save-weight-today"]')) {
      vibrate('confirmacao');
      store.registrarPeso(currentKg);
      closeBottomSheet(sheetId, { silent: true });
      showToast({ message: `Peso registrado: ${fmtKg(currentKg)} kg` });
      if (onUpdated) onUpdated();
    }
  });
}

/**
 * D2.3 — Abre a folha "Progressão do exercício" com gráfico de linha em SVG
 * ("Carga máxima" | "1RM estimado" | "Volume do exercício") e últimas 8 séries máximas.
 */
function openExerciseProgressionSheet(exercicioId, allConcluidas = []) {
  const sessoesComEx = allConcluidas
    .filter(
      (s) =>
        s.tipo !== 'corrida' &&
        Array.isArray(s.exercicios) &&
        s.exercicios.some((e) => e.exercicioId === exercicioId)
    )
    .sort((a, b) => new Date(a.fim || a.data) - new Date(b.fim || b.data));

  if (sessoesComEx.length === 0) return;

  let nomeEx = 'Exercício';
  const points = sessoesComEx.map((s) => {
    const ex = s.exercicios.find((e) => e.exercicioId === exercicioId);
    if (ex?.nome) nomeEx = ex.nome;
    const feitas = (ex?.series || []).filter((sr) => sr.feita && !sr.pulada);
    const melhor =
      feitas.length > 0
        ? feitas.reduce((b, c) => (Number(c.carga || 0) >= Number(b.carga || 0) ? c : b), feitas[0])
        : { carga: 0, reps: 0, esforco: 'medio' };
    const cargaMax = Number(melhor.carga || 0);
    const repsMax = Number(melhor.reps || 0);
    const epley = calcularEpley1RM(cargaMax, repsMax);
    const volEx = feitas.reduce((acc, sr) => acc + Number(sr.carga || 0) * Number(sr.reps || 0), 0);

    return {
      sessaoId: s.id,
      dataISO: s.fim || s.data,
      dataLabel: formatRelativeDateLabel(s.fim || s.data),
      cargaMax,
      repsMax,
      epley,
      volEx,
      esforco: melhor.esforco || 'medio'
    };
  });

  let chartMode = 'carga'; // 'carga' | 'epley' | 'volume'
  const sheetId = 'evo-exercise-progression-sheet';

  function buildSheetContent() {
    const vals = points.map((p) =>
      chartMode === 'epley' ? p.epley : chartMode === 'volume' ? p.volEx : p.cargaMax
    );
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals, minV + 1);
    const spanV = Math.max(1, maxV - minV);

    const svgW = 300;
    const svgH = 120;
    const coords = points.map((p, idx) => {
      const v = chartMode === 'epley' ? p.epley : chartMode === 'volume' ? p.volEx : p.cargaMax;
      const x =
        points.length === 1
          ? Math.round(svgW / 2)
          : Math.round(24 + (idx / (points.length - 1)) * (svgW - 48));
      const y = Math.round(92 - ((v - minV) / spanV) * 62);
      return { x, y, v, label: p.dataLabel };
    });

    const polyStr = coords.map((c) => `${c.x},${c.y}`).join(' ');
    const esforcoMap = { leve: 'Leve', medio: 'No ponto', dificil: 'Difícil' };

    return `
      <div class="evo-prog-sheet">
        <span class="evo-kicker">PROGRESSÃO DO EXERCÍCIO</span>
        <h3 class="sheet-title" style="margin-bottom:8px;">${nomeEx}</h3>

        <div class="evo-prog-mode-tabs">
          <button type="button" class="run-pre-chip ${chartMode === 'carga' ? 'is-active' : ''}" data-prog-mode="carga">Carga máxima</button>
          <button type="button" class="run-pre-chip ${chartMode === 'epley' ? 'is-active' : ''}" data-prog-mode="epley">1RM estimado</button>
          <button type="button" class="run-pre-chip ${chartMode === 'volume' ? 'is-active' : ''}" data-prog-mode="volume">Volume do exercício</button>
        </div>

        <div class="evo-prog-chart-box">
          <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="120" role="img" aria-label="Curva de progressão de ${nomeEx}">
            <line x1="16" y1="96" x2="${svgW - 16}" y2="96" stroke="var(--linha)" stroke-width="1"/>
            ${
              coords.length >= 2
                ? `<polyline fill="none" stroke="var(--terracota)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polyStr}"/>`
                : ''
            }
            ${coords
              .map(
                (c) => `
                  <circle cx="${c.x}" cy="${c.y}" r="5" fill="var(--terracota)" stroke="var(--creme-fixo)" stroke-width="2"/>
                  <text x="${c.x}" y="${c.y - 10}" text-anchor="middle" fill="var(--tinta)" font-size="10" font-weight="700">${fmtKg(c.v)} kg</text>
                `
              )
              .join('')}
          </svg>
          ${
            points.length < 3
              ? `<p class="evo-trend-friendly-note">Com mais 1 treino, mostramos sua curva de tendência.</p>`
              : ''
          }
        </div>

        <h4 class="evo-prog-list-title">Últimas séries máximas</h4>
        <div class="evo-prog-history-list">
          ${points
            .slice(-8)
            .reverse()
            .map(
              (p) => `
                <div class="evo-prog-history-row">
                  <span>${p.dataLabel}</span>
                  <strong>${fmtKg(p.cargaMax)} kg × ${p.repsMax}</strong>
                  <span class="evo-effort-tag">${esforcoMap[p.esforco] || 'No ponto'}</span>
                </div>
              `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  const sheetEl = openBottomSheet({
    id: sheetId,
    title: nomeEx,
    html: buildSheetContent()
  });

  if (!sheetEl) return;
  sheetEl.addEventListener('click', (e) => {
    const modeBtn = e.target.closest('[data-prog-mode]');
    if (modeBtn) {
      vibrate('selecao');
      chartMode = modeBtn.dataset.progMode;
      const bodyContainer = sheetEl.querySelector('.bottom-sheet-body') || sheetEl;
      bodyContainer.innerHTML = buildSheetContent();
    }
  });
}

/**
 * Renderiza a Sub-aba 1 — "Resumo" (D1).
 */
function renderResumoTabHtml(allConcluidas = [], perfil = {}) {
  if (allConcluidas.length === 0) {
    return `
      <div class="evo-empty-card">
        ${renderEvolutionEmptyScene('evolucao')}
        <h2 class="evo-empty-title">Sua história começa no primeiro treino</h2>
        <p class="evo-empty-desc">Cada série feita e cada quilômetro corrido constroem seus anéis e recordes aqui.</p>
        <button type="button" class="btn btn-primary" data-action="evo-start-first-workout">
          Começar primeiro treino
        </button>
      </div>
    `;
  }

  const semAtual = store.agregadosSemana(0);
  const semPassada = store.agregadosSemana(1);
  const metaSessoes = Math.max(1, (perfil.diasSemana || [1, 2, 4, 5]).length);
  const metaMinutos = metaSessoes * Number(perfil.tempoTreinoMin || 45);
  const diasAtivosCount = semAtual.diasAtivos.filter(Boolean).length;

  const sessoesPct = semAtual.sessoes / metaSessoes;
  const minutosPct = semAtual.minutos / metaMinutos;
  const consistenciaPct = diasAtivosCount / metaSessoes;

  const diffSessoes = semAtual.sessoes - semPassada.sessoes;
  const jsDayToday = new Date().getDay();
  const isEarlyWeek = jsDayToday === 1 || jsDayToday === 2;
  const compSessoesTxt =
    diffSessoes > 0
      ? `+${diffSessoes} vs sem. passada`
      : isEarlyWeek
      ? 'Começando a semana'
      : `${semAtual.sessoes} de ${metaSessoes} na meta`;

  const diffMinPct =
    semPassada.minutos > 0
      ? Math.round(((semAtual.minutos - semPassada.minutos) / semPassada.minutos) * 100)
      : 0;
  const compMinTxt =
    diffMinPct > 0 ? `+${diffMinPct}% vs sem. passada` : `${fmtMinutesHuman(semAtual.minutos)} acumulados`;

  const dayLetters = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const todayMonIdx = jsDayToday === 0 ? 6 : jsDayToday - 1;

  const streakInfo = computeStreakForSessions(allConcluidas, perfil.diasSemana || [1, 2, 4, 5]);
  const serieSem = store.serieSemanal(evoUiState.chartMetric, 12);
  const pesos = store.listarPesos();
  const insights = buildRuleBasedInsights(allConcluidas, perfil);

  return `
    <!-- D1.1 Cartão Hero — Anéis de Atividade da Semana + Comparativo -->
    <article class="evo-card evo-rings-hero-card">
      <div class="evo-rings-main-row">
        ${renderActivityRingsSvg({
          sessoesPct,
          minutosPct,
          consistenciaPct,
          centerTop: `${semAtual.sessoes}/${metaSessoes}`,
          centerBottom: 'semana',
          size: 138
        })}

        <div class="evo-rings-legend-col">
          <div class="evo-ring-stat-item">
            <span class="evo-ring-dot is-terracota"></span>
            <div class="evo-ring-stat-texts">
              <span class="evo-ring-stat-label">Sessões na semana</span>
              <strong class="evo-ring-stat-val">${semAtual.sessoes} de ${metaSessoes}</strong>
              <span class="evo-ring-stat-comp is-positive">${compSessoesTxt}</span>
            </div>
          </div>

          <div class="evo-ring-stat-item">
            <span class="evo-ring-dot is-salvia"></span>
            <div class="evo-ring-stat-texts">
              <span class="evo-ring-stat-label">Minutos ativos</span>
              <strong class="evo-ring-stat-val">${semAtual.minutos} de ${metaMinutos} min</strong>
              <span class="evo-ring-stat-comp">${compMinTxt}</span>
            </div>
          </div>

          <div class="evo-ring-stat-item">
            <span class="evo-ring-dot is-areia"></span>
            <div class="evo-ring-stat-texts">
              <span class="evo-ring-stat-label">Consistência</span>
              <strong class="evo-ring-stat-val">${diasAtivosCount} ${diasAtivosCount === 1 ? 'dia ativo' : 'dias ativos'}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Rodapé com 7 bolinhas S T Q Q S S D -->
      <div class="evo-week-dots-footer" aria-label="Dias treinados nesta semana">
        ${dayLetters
          .map((letter, idx) => {
            const done = semAtual.diasAtivos[idx];
            const isToday = idx === todayMonIdx;
            return `
              <div class="evo-week-dot-item">
                <span class="evo-week-dot ${done ? 'is-done' : ''} ${isToday ? 'is-today' : ''}">${letter}</span>
              </div>
            `;
          })
          .join('')}
      </div>
    </article>

    <!-- D1.2 Cartão de Sequência (Streak) -->
    <article class="evo-card evo-streak-card">
      ${renderStreakFlame({ dias: Math.max(1, streakInfo.atual), size: 52 })}
      <div class="evo-streak-texts">
        <strong class="evo-streak-headline">${streakInfo.atual} ${streakInfo.atual === 1 ? 'dia seguido' : 'dias seguidos'}</strong>
        <span class="evo-streak-sub">Melhor sequência: ${streakInfo.melhor} ${streakInfo.melhor === 1 ? 'dia' : 'dias'} · Descanso planejado protegido</span>
      </div>
    </article>

    <!-- D1.3 Gráfico Semanal Interativo (últimas 12 semanas) -->
    <article class="evo-card">
      <div class="evo-card-head">
        <div>
          <h3 class="evo-card-title">Evolução em 12 semanas</h3>
          <p class="evo-card-sub">Toque em uma barra para inspecionar a semana</p>
        </div>
      </div>

      <div class="evo-chart-metric-pills" role="tablist">
        <button type="button" class="evo-metric-pill ${evoUiState.chartMetric === 'sessoes' ? 'is-active' : ''}" data-chart-metric="sessoes">Sessões</button>
        <button type="button" class="evo-metric-pill ${evoUiState.chartMetric === 'tempo' ? 'is-active' : ''}" data-chart-metric="tempo">Tempo</button>
        <button type="button" class="evo-metric-pill ${evoUiState.chartMetric === 'volume' ? 'is-active' : ''}" data-chart-metric="volume">Volume (kg)</button>
        <button type="button" class="evo-metric-pill ${evoUiState.chartMetric === 'distancia' ? 'is-active' : ''}" data-chart-metric="distancia">Distância (km)</button>
      </div>

      <div data-weekly-chart-slot>
        ${renderWeeklyBarChartSvg(serieSem, evoUiState.chartMetric, evoUiState.selectedBarIdx)}
      </div>
    </article>

    <!-- D1.4 Mapa de Consistência (12 semanas × 7 dias = 84 células) -->
    ${renderConsistencyHeatmapHtml(allConcluidas)}

    <!-- D1.6 Leituras Inteligentes (2 cartões baseados em regras reais) -->
    <div class="evo-insights-grid">
      ${insights
        .map(
          (ins) => `
            <article class="evo-insight-card is-${ins.cor}">
              <div class="evo-insight-icon">${getIconSvg(ins.icone, 20)}</div>
              <div class="evo-insight-texts">
                <strong>${ins.titulo}</strong>
                <p>${ins.texto}</p>
              </div>
            </article>
          `
        )
        .join('')}
    </div>

    <!-- D1.5 Cartão de Peso Corporal (opcional, discreto) -->
    ${renderBodyWeightCardHtml(perfil, pesos)}
  `;
}

/**
 * Renderiza a Sub-aba 2 — "Força" (D2 & A3).
 */
function renderForcaTabHtml(filteredSessions = [], allConcluidas = []) {
  const forcaAll = allConcluidas.filter((s) => s.tipo !== 'corrida');
  if (forcaAll.length === 0) {
    return `
      <div class="evo-empty-card">
        ${renderEvolutionEmptyScene('forca')}
        <h2 class="evo-empty-title">Seus treinos de força aparecerão aqui</h2>
        <p class="evo-empty-desc">Registre séries na academia ou em casa para acompanhar volume, equilíbrio muscular e 1RM estimado.</p>
        <button type="button" class="btn btn-primary" data-action="evo-start-strength">
          Iniciar treino de força
        </button>
      </div>
    `;
  }

  const forcaPeriodo = filteredSessions.filter((s) => s.tipo !== 'corrida');
  const sourceList = forcaPeriodo.length > 0 ? forcaPeriodo : forcaAll;

  let volumeTotalKg = 0;
  let seriesConcluidas = 0;
  const gruposSeries = {
    Peito: 0,
    Costas: 0,
    Pernas: 0,
    Ombros: 0,
    Braços: 0,
    Core: 0,
    Mobilidade: 0
  };

  sourceList.forEach((s) => {
    volumeTotalKg += Number(s.volumeKg ?? s.volumeTotalKg ?? 0);
    (s.exercicios || []).forEach((ex) => {
      const grp = gruposSeries[ex.grupo] !== undefined ? ex.grupo : s.grupoPrincipal || 'Peito';
      const feitas = (ex.series || []).filter((sr) => sr.feita && !sr.pulada).length;
      seriesConcluidas += feitas;
      if (gruposSeries[grp] !== undefined) {
        gruposSeries[grp] += feitas;
      }
    });
  });

  const strengthRecords = (store.listarRecordes() || []).filter(
    (r) => r.categoria !== 'corrida' && !String(r.tipo || '').startsWith('corrida_')
  );

  const totalGrpSeries = Math.max(
    1,
    Object.values(gruposSeries).reduce((a, b) => a + b, 0)
  );
  const entriesGrupos = Object.entries(gruposSeries);
  const leastWorkedGroup = entriesGrupos.reduce(
    (min, cur) => (cur[1] < min[1] ? cur : min),
    entriesGrupos[0]
  )[0];

  const volumeFormatted =
    volumeTotalKg >= 10000
      ? `${ptBrDec.format(volumeTotalKg / 1000)} t`
      : `${ptBrInt.format(Math.round(volumeTotalKg))} kg`;

  return `
    <!-- 1. Totais do período (3 cartões) -->
    <div class="evo-totals-3grid">
      <div class="evo-stat-box">
        <span class="evo-stat-label">Volume total</span>
        <strong class="evo-stat-val">${volumeFormatted}</strong>
      </div>
      <div class="evo-stat-box">
        <span class="evo-stat-label">Séries concluídas</span>
        <strong class="evo-stat-val">${seriesConcluidas}</strong>
      </div>
      <div class="evo-stat-box">
        <span class="evo-stat-label">Com evolução</span>
        <strong class="evo-stat-val">${strengthRecords.length}</strong>
      </div>
    </div>

    <!-- 2. Equilíbrio por grupo muscular -->
    <article class="evo-card">
      <div class="evo-card-head">
        <div>
          <h3 class="evo-card-title">Equilíbrio por grupo muscular</h3>
          <p class="evo-card-sub">Séries concluídas e proporção no período</p>
        </div>
      </div>

      <div class="evo-muscle-balance-list">
        ${entriesGrupos
          .map(([grp, count]) => {
            const pct = Math.round((count / totalGrpSeries) * 100);
            const isLeast = grp === leastWorkedGroup;
            return `
              <div class="evo-muscle-row ${isLeast ? 'is-least' : ''}">
                <div class="evo-muscle-row-top">
                  <strong>${grp}</strong>
                  <span>${count} ${count === 1 ? 'série' : 'séries'} · ${pct}%</span>
                </div>
                <div class="evo-muscle-bar-track">
                  <div class="evo-muscle-bar-fill ${isLeast ? 'is-least' : 'is-balanced'}" style="width:${Math.max(6, pct)}%"></div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
      <p class="evo-muscle-hint">Foco sugerido: inclua mais séries de <strong>${leastWorkedGroup}</strong> na próxima semana.</p>
    </article>

    <!-- 3. Recordes de Força (corrigido com A3: nowrap no valor à direita) -->
    <article class="evo-card">
      <div class="evo-card-head">
        <div>
          <h3 class="evo-card-title">Recordes de força</h3>
          <p class="evo-card-sub">Toque em um exercício para ver a curva de progressão</p>
        </div>
      </div>

      ${
        strengthRecords.length === 0
          ? renderEvolutionEmptyScene('recordes')
          : `
            <div class="evo-records-list">
              ${strengthRecords
                .map((rec) => {
                  const epleyVal =
                    rec.epley1RM || calcularEpley1RM(rec.valor, rec.reps || 8);
                  const subtitle =
                    rec.tipo === 'carga' && epleyVal > 0
                      ? `Melhor série: ${fmtKg(rec.valor)} kg × ${rec.reps || 8} · 1RM est. ${fmtKg(epleyVal)} kg`
                      : rec.detalhe || 'Recorde pessoal registrado';
                  return `
                    <button
                      type="button"
                      class="record-card evo-strength-record-btn"
                      data-open-progression="${rec.exercicioId}"
                    >
                      <div class="evo-record-thumb">
                        ${renderExerciseFigureSvg(rec.grupo || 'Peito', false, 48)}
                      </div>
                      <div class="record-card__left">
                        <strong class="record-card__title">${rec.nome}</strong>
                        <span class="record-card__subtitle">${subtitle}</span>
                      </div>
                      <strong class="record-card__value">${rec.valorTexto}</strong>
                    </button>
                  `;
                })
                .join('')}
            </div>
          `
      }
    </article>
  `;
}

/**
 * Renderiza a Sub-aba 3 — "Corrida" (D3).
 */
function renderCorridaTabHtml(filteredSessions = [], allConcluidas = []) {
  const corridasAll = allConcluidas.filter((s) => s.tipo === 'corrida');
  if (corridasAll.length === 0) {
    return `
      <div class="evo-empty-card">
        ${renderEvolutionEmptyScene('corrida')}
        <h2 class="evo-empty-title">Pronto para sua primeira corrida?</h2>
        <p class="evo-empty-desc">Acompanhe distância por GPS, ritmo por quilômetro, trajeto desenhado e recordes de 1 km, 5 km e 10 km.</p>
        <button type="button" class="btn btn-primary" data-action="evo-start-run">
          Iniciar primeira corrida
        </button>
      </div>
    `;
  }

  const corridasPeriodo = filteredSessions.filter((s) => s.tipo === 'corrida');
  const sourceRuns = corridasPeriodo.length > 0 ? corridasPeriodo : corridasAll;

  let distTotalM = 0;
  let movTotalSeg = 0;
  sourceRuns.forEach((r) => {
    distTotalM += Number(r.distanciaM || 0);
    movTotalSeg += Number(r.movimentoSeg || r.duracaoSeg || 0);
  });

  const ritmoMedioGeral =
    distTotalM >= 100 && movTotalSeg > 0
      ? Math.round(movTotalSeg / (distTotalM / 1000))
      : 330;

  const serieDist = store.serieSemanal('distancia', 12);

  // 3. Gráfico de Evolução do Ritmo Médio (últimas 10 corridas; eixo Y invertido — mais rápido no topo)
  const ultimas10 = corridasAll
    .filter((r) => Number(r.ritmoMedioSegKm || 0) > 0)
    .slice(0, 10)
    .reverse();

  const paces = ultimas10.map((r) => Number(r.ritmoMedioSegKm));
  const fastestPace = paces.length > 0 ? Math.min(...paces) - 10 : 280;
  const slowestPace = paces.length > 0 ? Math.max(...paces) + 10 : 380;
  const paceSpan = Math.max(20, slowestPace - fastestPace);

  const svgW = 320;
  const svgH = 136;
  const paceCoords = ultimas10.map((r, idx) => {
    const x =
      ultimas10.length === 1
        ? Math.round(svgW / 2)
        : Math.round(28 + (idx / (ultimas10.length - 1)) * (svgW - 56));
    // Eixo Y invertido: menor ritmoSegKm (mais rápido) fica mais alto (menor y)
    const ratioFast = (slowestPace - Number(r.ritmoMedioSegKm)) / paceSpan;
    const y = Math.round(104 - Math.max(0, Math.min(1, ratioFast)) * 70);
    return {
      x,
      y,
      sessaoId: r.id,
      paceTxt: formatPaceSegKm(r.ritmoMedioSegKm),
      distTxt: formatKmWithUnit(r.distanciaM),
      dateTxt: formatRelativeDateLabel(r.fim || r.data)
    };
  });
  const pacePoly = paceCoords.map((c) => `${c.x},${c.y}`).join(' ');

  // 4. 5 cartões de Recordes de Corrida com medalha em argila
  const allRecords = store.listarRecordes() || [];
  const runRecordSpecs = [
    { tipo: 'corrida_1k', nome: 'Melhor 1 km', unlockHint: 'Complete 1 km em uma corrida para desbloquear' },
    { tipo: 'corrida_5k', nome: 'Melhor 5 km', unlockHint: 'Complete 5 km em uma corrida para desbloquear' },
    { tipo: 'corrida_10k', nome: 'Melhor 10 km', unlockHint: 'Complete 10 km em uma corrida para desbloquear' },
    { tipo: 'corrida_maior_distancia', nome: 'Maior distância', unlockHint: 'Conclua uma corrida para desbloquear' },
    { tipo: 'corrida_mais_longa', nome: 'Mais longa em tempo', unlockHint: 'Conclua uma corrida para desbloquear' }
  ];

  return `
    <!-- 1. Totais do período (4 cartões 2×2) -->
    <div class="evo-totals-2x2grid">
      <div class="evo-stat-box">
        <span class="evo-stat-label">Distância total</span>
        <strong class="evo-stat-val">${formatKmWithUnit(distTotalM, 1)}</strong>
      </div>
      <div class="evo-stat-box">
        <span class="evo-stat-label">Corridas</span>
        <strong class="evo-stat-val">${sourceRuns.length}</strong>
      </div>
      <div class="evo-stat-box">
        <span class="evo-stat-label">Ritmo médio</span>
        <strong class="evo-stat-val">${formatPaceSegKm(ritmoMedioGeral)} /km</strong>
      </div>
      <div class="evo-stat-box">
        <span class="evo-stat-label">Tempo em movimento</span>
        <strong class="evo-stat-val">${fmtMinutesHuman(Math.round(movTotalSeg / 60))}</strong>
      </div>
    </div>

    <!-- 2. Gráfico de Distância Semanal (12 barras em SVG) -->
    <article class="evo-card">
      <div class="evo-card-head">
        <div>
          <h3 class="evo-card-title">Distância semanal (km)</h3>
          <p class="evo-card-sub">Últimas 12 semanas de corrida</p>
        </div>
      </div>
      <div data-weekly-chart-slot>
        ${renderWeeklyBarChartSvg(serieDist, 'distancia', evoUiState.selectedBarIdx)}
      </div>
    </article>

    <!-- 3. Gráfico de Evolução do Ritmo Médio (eixo Y invertido) -->
    <article class="evo-card">
      <div class="evo-card-head">
        <div>
          <h3 class="evo-card-title">Evolução do ritmo médio</h3>
          <p class="evo-card-sub">Mais rápido no topo · Toque em um ponto para detalhes</p>
        </div>
      </div>
      <div class="evo-pace-chart-wrap">
        <div class="evo-chart-bubble" data-pace-point-bubble>
          ${
            paceCoords.length > 0
              ? `${paceCoords[paceCoords.length - 1].dateTxt} · ${paceCoords[paceCoords.length - 1].distTxt} · ${paceCoords[paceCoords.length - 1].paceTxt} /km`
              : 'Registre corridas para acompanhar o ritmo'
          }
        </div>
        <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="136" role="img" aria-label="Evolução do ritmo médio nas últimas corridas">
          <line x1="16" y1="112" x2="${svgW - 16}" y2="112" stroke="var(--linha)" stroke-width="1"/>
          ${
            paceCoords.length >= 2
              ? `<polyline fill="none" stroke="var(--terracota)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${pacePoly}"/>`
              : ''
          }
          ${paceCoords
            .map(
              (c, idx) => `
                <g class="evo-pace-point-group" data-pace-point="${c.dateTxt} · ${c.distTxt} · ${c.paceTxt} /km" style="cursor:pointer;">
                  <circle cx="${c.x}" cy="${c.y}" r="12" fill="transparent"/>
                  <circle cx="${c.x}" cy="${c.y}" r="5.5" fill="var(--terracota)" stroke="var(--creme-fixo)" stroke-width="2"/>
                  ${
                    idx === paceCoords.length - 1 || idx === 0
                      ? `<text x="${c.x}" y="${c.y - 10}" text-anchor="middle" fill="var(--tinta)" font-size="10" font-weight="700">${c.paceTxt}</text>`
                      : ''
                  }
                </g>
              `
            )
            .join('')}
        </svg>
        ${
          paceCoords.length < 3
            ? `<p class="evo-trend-friendly-note">Com mais 1 treino, mostramos sua curva de tendência.</p>`
            : ''
        }
      </div>
    </article>

    <!-- 4. Recordes de Corrida (5 cartões com medalha em argila — Parte E, item 8) -->
    <article class="evo-card">
      <div class="evo-card-head">
        <div>
          <h3 class="evo-card-title">Recordes de corrida</h3>
          <p class="evo-card-sub">Calculados inclusive por janela deslizante dentro da corrida</p>
        </div>
      </div>

      <div class="evo-records-list">
        ${runRecordSpecs
          .map((spec) => {
            const rec = allRecords.find((r) => r.tipo === spec.tipo || r.exercicioId === spec.tipo);
            if (!rec) {
              return `
                <div class="record-card is-locked-record">
                  ${renderClayRecordMedal({ isMuted: true, size: 42 })}
                  <div class="record-card__left">
                    <strong class="record-card__title">${spec.nome}</strong>
                    <span class="record-card__subtitle">${spec.unlockHint}</span>
                  </div>
                  <strong class="record-card__value is-muted-val">—</strong>
                </div>
              `;
            }
            return `
              <button
                type="button"
                class="record-card evo-run-record-btn"
                data-open-session="${rec.sessaoId}"
              >
                ${renderClayRecordMedal({ isMuted: false, size: 42 })}
                <div class="record-card__left">
                  <strong class="record-card__title">${spec.nome}</strong>
                  <span class="record-card__subtitle">${rec.detalhe || rec.dataTexto || ''}</span>
                </div>
                <strong class="record-card__value">${rec.valorTexto}</strong>
              </button>
            `;
          })
          .join('')}
      </div>
    </article>

    <!-- 5. Últimas corridas (até 10 cartões com miniatura 56×56 da Arte do Trajeto) -->
    <article class="evo-card">
      <div class="evo-card-head">
        <div>
          <h3 class="evo-card-title">Últimas corridas</h3>
          <p class="evo-card-sub">Toque em uma corrida para abrir o mapa e parciais</p>
        </div>
      </div>

      <div class="evo-history-cards-list">
        ${corridasAll
          .slice(0, 10)
          .map((r) => renderSessionHistoryCardHtml(r))
          .join('')}
      </div>
    </article>
  `;
}

/**
 * Renderiza um cartão individual de sessão (Força ou Corrida) para o Histórico ou Últimas Corridas.
 */
function renderSessionHistoryCardHtml(s) {
  const isRun = s.tipo === 'corrida';
  const dateObj = new Date(s.fim || s.data || s.inicio);
  const dateStr = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short'
  }).replace('.', '');
  const hasRecords = Array.isArray(s.recordes) && s.recordes.length > 0;

  if (isRun) {
    const distTxt = formatKmWithUnit(s.distanciaM || 0);
    const movTxt = formatRunClock(s.movimentoSeg || s.duracaoSeg || 0);
    const paceTxt = `${formatPaceSegKm(s.ritmoMedioSegKm)} /km`;

    return `
      <button type="button" class="evo-session-card" data-open-session="${s.id}">
        <div class="evo-session-thumb">
          ${renderRouteArtThumbSvg(s.rota, 56)}
        </div>
        <div class="evo-session-info">
          <div class="evo-session-top-line">
            <strong class="evo-session-title">${s.nome || 'Corrida ao vivo'}</strong>
            ${hasRecords ? `<span class="evo-session-pr-badge">Recorde</span>` : ''}
          </div>
          <span class="evo-session-meta">${dateStr} · ${distTxt} · ${movTxt} · ${paceTxt}</span>
        </div>
        <span class="evo-session-chevron">${getIconSvg('avancar', 18)}</span>
      </button>
    `;
  }

  const volKg = Number(s.volumeKg ?? s.volumeTotalKg ?? 0);
  const numEx = Array.isArray(s.exercicios) ? s.exercicios.length : 0;
  const durMin = Math.max(1, Math.round(Number(s.duracaoSeg || (s.duracaoMin || 40) * 60) / 60));

  return `
    <button type="button" class="evo-session-card" data-open-session="${s.id}">
      <div class="evo-session-thumb">
        ${renderExerciseFigureSvg(s.grupoPrincipal || 'Peito', false, 56)}
      </div>
      <div class="evo-session-info">
        <div class="evo-session-top-line">
          <strong class="evo-session-title">${s.nome || 'Treino de força'}</strong>
          ${hasRecords ? `<span class="evo-session-pr-badge">Recorde</span>` : ''}
        </div>
        <span class="evo-session-meta">${dateStr} · ${durMin} min · ${ptBrInt.format(Math.round(volKg))} kg · ${numEx} ex.</span>
      </div>
      <span class="evo-session-chevron">${getIconSvg('avancar', 18)}</span>
    </button>
  `;
}

/**
 * Renderiza a Sub-aba 4 — "Histórico" (D4.1).
 */
function renderHistoricoTabHtml(filteredSessions = []) {
  const filtro = evoUiState.histFilter || 'todos';
  const listByType = filteredSessions.filter((s) => {
    if (filtro === 'forca') return s.tipo !== 'corrida';
    if (filtro === 'corrida') return s.tipo === 'corrida';
    return true;
  });

  const filterChipsHtml = `
    <div class="evo-hist-filter-chips">
      <button type="button" class="evo-metric-pill ${filtro === 'todos' ? 'is-active' : ''}" data-hist-filter="todos">Todos</button>
      <button type="button" class="evo-metric-pill ${filtro === 'forca' ? 'is-active' : ''}" data-hist-filter="forca">Força</button>
      <button type="button" class="evo-metric-pill ${filtro === 'corrida' ? 'is-active' : ''}" data-hist-filter="corrida">Corrida</button>
    </div>
  `;

  if (listByType.length === 0) {
    return `
      ${filterChipsHtml}
      <div class="evo-empty-card">
        ${renderEvolutionEmptyScene('historico')}
        <h2 class="evo-empty-title">Nenhuma sessão encontrada neste filtro</h2>
        <p class="evo-empty-desc">Experimente ampliar o período selecionado ou alternar a modalidade acima.</p>
      </div>
    `;
  }

  const paged = listByType.slice(0, evoUiState.histLimit);
  const groupsMap = new Map();

  paged.forEach((s) => {
    const d = new Date(s.fim || s.data || s.inicio);
    const monthName = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    if (!groupsMap.has(capitalized)) {
      groupsMap.set(capitalized, { sessoes: [], minutos: 0, distanciaM: 0, volumeKg: 0 });
    }
    const g = groupsMap.get(capitalized);
    g.sessoes.push(s);
    const seg = Number(s.movimentoSeg || s.duracaoSeg || (s.duracaoMin ? s.duracaoMin * 60 : 1800));
    g.minutos += Math.round(seg / 60);
    g.distanciaM += Number(s.distanciaM || 0);
    g.volumeKg += Number(s.volumeKg ?? s.volumeTotalKg ?? 0);
  });

  const groupsHtml = Array.from(groupsMap.entries())
    .map(([mesLabel, g]) => {
      const extraMetric =
        g.distanciaM > 0
          ? ` · ${formatKmWithUnit(g.distanciaM, 1)}`
          : g.volumeKg > 0
          ? ` · ${ptBrInt.format(Math.round(g.volumeKg))} kg`
          : '';
      return `
        <section class="evo-month-group">
          <header class="evo-month-header">
            <h3 class="evo-month-title">${mesLabel}</h3>
            <span class="evo-month-summary">${g.sessoes.length} ${g.sessoes.length === 1 ? 'sessão' : 'sessões'} · ${fmtMinutesHuman(g.minutos)}${extraMetric}</span>
          </header>
          <div class="evo-history-cards-list">
            ${g.sessoes.map((s) => renderSessionHistoryCardHtml(s)).join('')}
          </div>
        </section>
      `;
    })
    .join('');

  return `
    ${filterChipsHtml}
    ${groupsHtml}
    ${
      listByType.length > evoUiState.histLimit
        ? `
          <button type="button" class="btn btn-secondary btn-full" data-action="load-more-history">
            Mostrar anteriores (${listByType.length - evoUiState.histLimit})
          </button>
        `
        : ''
    }
  `;
}

/**
 * Monta e gerencia a tela completa da Evolução (`#/evolucao`).
 */
export function renderEvolutionScreen(container, { initialTab = null, onOpenStartSheet } = {}) {
  if (!container) return;

  if (initialTab && ['resumo', 'forca', 'corrida', 'historico'].includes(initialTab)) {
    evoUiState.subTab = initialTab;
  }

  let touchStartX = 0;
  let touchStartY = 0;

  function render() {
    const state = store.getState();
    const perfil = state?.perfil || {};
    const allConcluidas = (state?.sessoes || []).filter((s) => s && s.status === 'concluida');
    const filtered = filterSessionsByPeriodo(allConcluidas, evoUiState.periodo);

    let tabBodyHtml = '';
    if (evoUiState.subTab === 'forca') {
      tabBodyHtml = renderForcaTabHtml(filtered, allConcluidas);
    } else if (evoUiState.subTab === 'corrida') {
      tabBodyHtml = renderCorridaTabHtml(filtered, allConcluidas);
    } else if (evoUiState.subTab === 'historico') {
      tabBodyHtml = renderHistoricoTabHtml(filtered);
    } else {
      tabBodyHtml = renderResumoTabHtml(allConcluidas, perfil);
    }

    container.innerHTML = `
      <div class="evo-screen-root" data-evo-root>
        <!-- D0: 4 Sub-abas com pílulas horizontais -->
        <nav class="evo-subtabs-bar" role="tablist" aria-label="Seções da Evolução">
          <button type="button" role="tab" class="evo-subtab-btn ${evoUiState.subTab === 'resumo' ? 'is-active' : ''}" data-evo-tab="resumo" aria-selected="${evoUiState.subTab === 'resumo'}">Resumo</button>
          <button type="button" role="tab" class="evo-subtab-btn ${evoUiState.subTab === 'forca' ? 'is-active' : ''}" data-evo-tab="forca" aria-selected="${evoUiState.subTab === 'forca'}">Força</button>
          <button type="button" role="tab" class="evo-subtab-btn ${evoUiState.subTab === 'corrida' ? 'is-active' : ''}" data-evo-tab="corrida" aria-selected="${evoUiState.subTab === 'corrida'}">Corrida</button>
          <button type="button" role="tab" class="evo-subtab-btn ${evoUiState.subTab === 'historico' ? 'is-active' : ''}" data-evo-tab="historico" aria-selected="${evoUiState.subTab === 'historico'}">Histórico</button>
        </nav>

        <!-- D0: Seletor de período ("7 dias" · "30 dias" · "3 meses" · "Tudo") -->
        <div class="evo-period-chips" role="group" aria-label="Período de análise">
          <button type="button" class="evo-period-chip ${evoUiState.periodo === '7d' ? 'is-active' : ''}" data-evo-period="7d">7 dias</button>
          <button type="button" class="evo-period-chip ${evoUiState.periodo === '30d' ? 'is-active' : ''}" data-evo-period="30d">30 dias</button>
          <button type="button" class="evo-period-chip ${evoUiState.periodo === '90d' ? 'is-active' : ''}" data-evo-period="90d">3 meses</button>
          <button type="button" class="evo-period-chip ${evoUiState.periodo === 'tudo' ? 'is-active' : ''}" data-evo-period="tudo">Tudo</button>
        </div>

        <!-- Corpo da sub-aba ativa -->
        <div class="evo-tab-content" data-evo-content>
          ${tabBodyHtml}
        </div>
      </div>
    `;

    wireRunIllustrations(container);
    animateActivityRings(container);
    bindEvents(allConcluidas);
  }

  function animateActivityRings(root) {
    const strokes = root.querySelectorAll('.evo-ring-stroke');
    strokes.forEach((circle) => {
      const circ = Number(circle.dataset.ringCirc || 300);
      const target = Number(circle.dataset.ringTarget || 0);
      circle.setAttribute('stroke-dashoffset', String(circ));
      spring({
        from: circ,
        to: target,
        stiffness: 180,
        damping: 22,
        onUpdate(val) {
          circle.setAttribute('stroke-dashoffset', val.toFixed(1));
        }
      });
    });
  }

  function bindEvents(allConcluidas) {
    const root = container.querySelector('[data-evo-root]');
    if (!root) return;

    // Swipe horizontal para alternar entre sub-abas (D0)
    const tabOrder = ['resumo', 'forca', 'corrida', 'historico'];
    root.addEventListener(
      'touchstart',
      (e) => {
        if (!e.touches || e.touches.length === 0) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    root.addEventListener(
      'touchend',
      (e) => {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 68 && Math.abs(dx) > Math.abs(dy) * 1.6) {
          const curIdx = tabOrder.indexOf(evoUiState.subTab);
          if (dx < 0 && curIdx < tabOrder.length - 1) {
            vibrate('selecao');
            evoUiState.subTab = tabOrder[curIdx + 1];
            render();
          } else if (dx > 0 && curIdx > 0) {
            vibrate('selecao');
            evoUiState.subTab = tabOrder[curIdx - 1];
            render();
          }
        }
      },
      { passive: true }
    );

    root.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-evo-tab]');
      if (tabBtn) {
        vibrate('selecao');
        evoUiState.subTab = tabBtn.dataset.evoTab;
        render();
        return;
      }

      const periodBtn = e.target.closest('[data-evo-period]');
      if (periodBtn) {
        vibrate('selecao');
        evoUiState.periodo = periodBtn.dataset.evoPeriod;
        render();
        return;
      }

      const metricBtn = e.target.closest('[data-chart-metric]');
      if (metricBtn) {
        vibrate('selecao');
        evoUiState.chartMetric = metricBtn.dataset.chartMetric;
        render();
        return;
      }

      const barGroup = e.target.closest('[data-bar-idx]');
      if (barGroup) {
        vibrate('selecao');
        evoUiState.selectedBarIdx = Number(barGroup.dataset.barIdx);
        const slot = root.querySelector('[data-weekly-chart-slot]');
        if (slot) {
          const m = evoUiState.subTab === 'corrida' ? 'distancia' : evoUiState.chartMetric;
          slot.innerHTML = renderWeeklyBarChartSvg(store.serieSemanal(m, 12), m, evoUiState.selectedBarIdx);
        }
        return;
      }

      const heatCell = e.target.closest('[data-heat-day]');
      if (heatCell) {
        vibrate('selecao');
        evoUiState.selectedHeatmapCell = heatCell.dataset.heatDay;
        evoUiState.selectedHeatmapTooltip = heatCell.dataset.heatTooltip;
        const tipBox = root.querySelector('[data-heat-tooltip-box]');
        if (tipBox) tipBox.textContent = heatCell.dataset.heatTooltip;
        root.querySelectorAll('.evo-heat-cell.is-selected').forEach((el) => el.classList.remove('is-selected'));
        heatCell.classList.add('is-selected');
        return;
      }

      const pacePt = e.target.closest('[data-pace-point]');
      if (pacePt) {
        vibrate('selecao');
        const bubble = root.querySelector('[data-pace-point-bubble]');
        if (bubble) bubble.textContent = pacePt.dataset.pacePoint;
        return;
      }

      if (e.target.closest('[data-action="activate-weight-card"]')) {
        vibrate('selecao');
        store.updatePerfil({ acompanharPeso: true });
        render();
        return;
      }

      if (e.target.closest('[data-action="open-weight-sheet"]')) {
        vibrate('selecao');
        openWeightStepperSheet(() => render());
        return;
      }

      const progBtn = e.target.closest('[data-open-progression]');
      if (progBtn) {
        vibrate('selecao');
        openExerciseProgressionSheet(progBtn.dataset.openProgression, allConcluidas);
        return;
      }

      const openSesBtn = e.target.closest('[data-open-session]');
      if (openSesBtn) {
        vibrate('selecao');
        const sid = openSesBtn.dataset.openSession;
        if (sid) {
          if (window.clayRouter) { window.clayRouter.navigate(`#/sessao/${sid}`); } else { window.location.hash = `#/sessao/${sid}`; }
        }
        return;
      }

      const histFilterBtn = e.target.closest('[data-hist-filter]');
      if (histFilterBtn) {
        vibrate('selecao');
        evoUiState.histFilter = histFilterBtn.dataset.histFilter;
        evoUiState.histLimit = 20;
        render();
        return;
      }

      if (e.target.closest('[data-action="load-more-history"]')) {
        vibrate('selecao');
        evoUiState.histLimit += 20;
        render();
        return;
      }

      if (
        e.target.closest('[data-action="evo-start-first-workout"]') ||
        e.target.closest('[data-action="evo-start-strength"]')
      ) {
        vibrate('confirmacao');
        if (onOpenStartSheet) onOpenStartSheet();
        else if (window.clayRouter) { window.clayRouter.navigate('#/hoje'); } else { window.location.hash = '#/hoje'; }
        return;
      }

      if (e.target.closest('[data-action="evo-start-run"]')) {
        vibrate('confirmacao');
        const novaCorrida = store.criarSessao({
          id: `ses_corrida_${Date.now()}`,
          nome: 'Corrida ao vivo',
          grupoPrincipal: 'Corrida',
          tipo: 'corrida',
          modo: 'livre'
        });
        if (window.clayRouter) { window.clayRouter.navigate(`#/treino/${novaCorrida.id}`); } else { window.location.hash = `#/treino/${novaCorrida.id}`; }
      }
    });
  }

  render();
}

/**
 * D4.2 — Renderiza a tela completa de Detalhe de Sessão (`#/sessao/:id`).
 */
export function renderSessionDetailScreen(container, sessaoId) {
  if (!container) return;

  let highlightedKm = null;

  function render() {
    const sessoes = store.getState()?.sessoes || [];
    const s = sessoes.find((item) => item.id === sessaoId);

    if (!s) {
      container.innerHTML = `
        <div class="screen-container" style="padding:24px 16px;">
          <button type="button" class="btn btn-secondary" data-action="detail-back">← Voltar para Evolução</button>
          <div class="evo-empty-card" style="margin-top:16px;">
            ${renderEvolutionEmptyScene('historico')}
            <h2 class="evo-empty-title">Sessão não encontrada</h2>
            <p class="evo-empty-desc">Esta sessão pode ter sido excluída do seu histórico.</p>
          </div>
        </div>
      `;
      container.querySelector('[data-action="detail-back"]')?.addEventListener('click', () => {
        if (window.clayRouter) { window.clayRouter.navigate('#/evolucao'); } else { window.location.hash = '#/evolucao'; }
      });
      return;
    }

    const isRun = s.tipo === 'corrida';
    const d = new Date(s.fim || s.data || s.inicio);
    const dataCompleta = d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const humorLabels = { 1: 'Exaustivo', 2: 'Pesado', 3: 'No ponto', 4: 'Leve', 5: 'Muito leve' };
    const sentTexto = humorLabels[s.sentimento || s.humor || 4] || 'No ponto';
    const incomodosTexto =
      Array.isArray(s.incomodo) && s.incomodo.length > 0 ? s.incomodo.join(', ') : 'Nenhum';

    if (isRun) {
      const movSeg = Number(s.movimentoSeg || s.duracaoSeg || 0);
      const distM = Number(s.distanciaM || 0);
      const ritmoMed = s.ritmoMedioSegKm || (distM >= 50 ? Math.round(movSeg / (distM / 1000)) : null);
      const ritmoMel = s.ritmoMelhorSegKm || ritmoMed;
      const ganhoElev = typeof s.ganhoElevM === 'number' ? `+${s.ganhoElevM} m` : 'Plano';
      const streetsActive = Boolean(store.getState()?.perfil?.mostrarRuasNoMapa);
      const parciais = Array.isArray(s.parciais) ? s.parciais : [];
      const insight = computeSplitInsight(parciais);

      container.innerHTML = `
        <div class="evo-detail-screen">
          <header class="evo-detail-topbar">
            <button type="button" class="evo-back-btn" data-action="detail-back" aria-label="Voltar">
              ${getIconSvg('voltar', 20)}
              <span>Evolução</span>
            </button>
            <span class="evo-detail-type-pill">CORRIDA</span>
          </header>

          <h1 class="evo-detail-title">${s.nome || 'Corrida ao vivo'}</h1>
          <p class="evo-detail-date">${dataCompleta}</p>

          <!-- Arte do Trajeto interativa -->
          <div class="run-finish-route-card" style="margin:12px 0;">
            ${renderRouteArtSvg({
              rota: s.rota,
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

          <!-- 6 métricas principais -->
          <div class="run-finish-metrics-grid">
            <div class="run-finish-metric-card">
              <span class="run-finish-metric-label">Distância total</span>
              <strong class="run-finish-metric-val">${formatKmWithUnit(distM)}</strong>
            </div>
            <div class="run-finish-metric-card">
              <span class="run-finish-metric-label">Tempo em movimento</span>
              <strong class="run-finish-metric-val">${formatRunClock(movSeg)}</strong>
            </div>
            <div class="run-finish-metric-card">
              <span class="run-finish-metric-label">Ritmo médio</span>
              <strong class="run-finish-metric-val">${formatPaceSegKm(ritmoMed)} /km</strong>
            </div>
            <div class="run-finish-metric-card">
              <span class="run-finish-metric-label">Melhor ritmo</span>
              <strong class="run-finish-metric-val">${formatPaceSegKm(ritmoMel)} /km</strong>
            </div>
            <div class="run-finish-metric-card">
              <span class="run-finish-metric-label">Ganho de elevação</span>
              <strong class="run-finish-metric-val">${ganhoElev}</strong>
            </div>
            <div class="run-finish-metric-card">
              <span class="run-finish-metric-label">Calorias</span>
              <strong class="run-finish-metric-val">${s.calorias || 0} kcal</strong>
            </div>
          </div>

          <!-- Parciais por km -->
          ${
            parciais.length > 0
              ? `
                <div class="run-finish-card" style="margin-top:14px;">
                  <h3 class="run-finish-section-title">Parciais por quilômetro</h3>
                  <div class="run-splits-table">
                    ${parciais
                      .map((p) => {
                        const isSel = Number(highlightedKm) === Number(p.km);
                        const kmLabel = p.parcialM
                          ? `Parcial ${(p.parcialM / 1000).toFixed(2).replace('.', ',')} km`
                          : `Km ${p.km}`;
                        return `
                          <div class="run-split-row ${isSel ? 'is-selected' : ''}" data-split-row-km="${p.km}">
                            <div class="run-split-km-col"><strong>${kmLabel}</strong></div>
                            <div class="run-split-bar-col">
                              <div class="run-split-bar-track"><div class="run-split-bar-fill" style="width:78%"></div></div>
                            </div>
                            <div class="run-split-pace-col"><strong>${formatPaceSegKm(p.ritmoSegKm)} /km</strong></div>
                          </div>
                        `;
                      })
                      .join('')}
                  </div>
                  ${insight ? `<p class="run-splits-insight">${insight}</p>` : ''}
                </div>
              `
              : ''
          }

          <div class="evo-card" style="margin-top:14px;">
            <div class="evo-detail-feel-row">
              <span>Sensação pós-treino: <strong>${sentTexto}</strong></span>
              <span>Incômodos: <strong>${incomodosTexto}</strong></span>
            </div>
          </div>

          <footer class="evo-detail-footer">
            <button type="button" class="evo-delete-session-btn" data-action="delete-session">
              Excluir sessão
            </button>
          </footer>
        </div>
      `;

      if (streetsActive) {
        const canvasEl = container.querySelector('.route-osm-canvas');
        const boxEl = container.querySelector('.clay-route-art-box');
        if (canvasEl && boxEl) {
          const bboxAttr = boxEl.dataset.routeBbox;
          const bbox = bboxAttr ? bboxAttr.split(',').map(Number).filter(Number.isFinite) : null;
          renderOsmTilesOnCanvas(canvasEl, bbox && bbox.length === 4 ? bbox : null, { isDark: false });
        }
      }
    } else {
      // Sessão de Força
      const volKg = Number(s.volumeKg ?? s.volumeTotalKg ?? 0);
      const durMin = Math.max(1, Math.round(Number(s.duracaoSeg || (s.duracaoMin || 40) * 60) / 60));
      const esforcoLabels = { leve: 'Leve', medio: 'No ponto', dificil: 'Difícil' };

      container.innerHTML = `
        <div class="evo-detail-screen">
          <header class="evo-detail-topbar">
            <button type="button" class="evo-back-btn" data-action="detail-back" aria-label="Voltar">
              ${getIconSvg('voltar', 20)}
              <span>Evolução</span>
            </button>
            <span class="evo-detail-type-pill">FORÇA · ${(s.grupoPrincipal || 'Treino').toUpperCase()}</span>
          </header>

          <h1 class="evo-detail-title">${s.nome || 'Treino de força'}</h1>
          <p class="evo-detail-date">${dataCompleta}</p>

          <div class="evo-totals-3grid" style="margin:12px 0;">
            <div class="evo-stat-box">
              <span class="evo-stat-label">Duração</span>
              <strong class="evo-stat-val">${durMin} min</strong>
            </div>
            <div class="evo-stat-box">
              <span class="evo-stat-label">Volume total</span>
              <strong class="evo-stat-val">${ptBrInt.format(Math.round(volKg))} kg</strong>
            </div>
            <div class="evo-stat-box">
              <span class="evo-stat-label">Sensação</span>
              <strong class="evo-stat-val">${sentTexto}</strong>
            </div>
          </div>

          <div class="evo-detail-exercises-list">
            ${(s.exercicios || [])
              .map(
                (ex) => `
                  <article class="evo-card">
                    <h3 class="evo-card-title">${ex.nome}</h3>
                    <div class="evo-detail-series-list">
                      ${(ex.series || [])
                        .filter((sr) => sr.feita && !sr.pulada)
                        .map(
                          (sr, idx) => `
                            <div class="evo-detail-serie-row">
                              <span>Série ${sr.n || idx + 1}</span>
                              <strong>${ex.porTempo ? `${sr.reps} s` : `${fmtKg(sr.carga)} kg × ${sr.reps}`}</strong>
                              <span class="evo-effort-tag">${esforcoLabels[sr.esforco] || 'No ponto'}</span>
                            </div>
                          `
                        )
                        .join('')}
                    </div>
                  </article>
                `
              )
              .join('')}
          </div>

          <footer class="evo-detail-footer">
            <button type="button" class="evo-delete-session-btn" data-action="delete-session">
              Excluir sessão
            </button>
          </footer>
        </div>
      `;
    }

    container.querySelector('[data-action="detail-back"]')?.addEventListener('click', () => {
      vibrate('selecao');
      if (window.clayRouter) { window.clayRouter.navigate(isRun ? '#/evolucao?tab=corrida' : '#/evolucao?tab=historico'); } else { window.location.hash = isRun ? '#/evolucao?tab=corrida' : '#/evolucao?tab=historico'; }
    });

    container.querySelectorAll('[data-km-marker]').forEach((m) => {
      m.addEventListener('click', () => {
        vibrate('selecao');
        const km = Number(m.dataset.kmMarker);
        highlightedKm = highlightedKm === km ? null : km;
        render();
      });
    });

    container.querySelector('[data-action="toggle-route-streets"]')?.addEventListener('click', () => {
      vibrate('selecao');
      const cur = Boolean(store.getState()?.perfil?.mostrarRuasNoMapa);
      store.updatePerfil({ mostrarRuasNoMapa: !cur });
      render();
    });

    container.querySelector('[data-action="delete-session"]')?.addEventListener('click', () => {
      vibrate('selecao');
      const sheetId = 'evo-delete-session-sheet';
      const sheetEl = openBottomSheet({
        id: sheetId,
        title: 'Excluir sessão',
        html: `
          <div class="run-confirm-sheet">
            <h3 class="sheet-title">Excluir esta sessão do histórico?</h3>
            <p class="sheet-subtitle">Os recordes e totais da Evolução serão recalculados automaticamente.</p>
            <div class="run-confirm-sheet-actions">
              <button type="button" class="btn btn-primary btn-full" data-action="confirm-delete-session">Excluir sessão</button>
              <button type="button" class="btn btn-secondary btn-full" data-action="cancel-delete-session">Cancelar</button>
            </div>
          </div>
        `
      });

      if (!sheetEl) return;
      sheetEl.addEventListener('click', (ev) => {
        if (ev.target.closest('[data-action="cancel-delete-session"]')) {
          closeBottomSheet(sheetId, { silent: true });
          return;
        }
        if (ev.target.closest('[data-action="confirm-delete-session"]')) {
          vibrate('erro');
          lastDeletedSessionBackup = { ...s };
          store.excluirSessao(s.id);
          closeBottomSheet(sheetId, { silent: true });
          if (window.clayRouter) { window.clayRouter.navigate('#/evolucao?tab=historico'); } else { window.location.hash = '#/evolucao?tab=historico'; }

          showToast({
            message: 'Sessão excluída do histórico',
            actionText: 'Desfazer',
            durationMs: 5000,
            onAction: () => {
              if (lastDeletedSessionBackup) {
                const atuais = store.getState()?.sessoes || [];
                const restauradas = [lastDeletedSessionBackup, ...atuais].sort(
                  (a, b) => new Date(b.fim || b.data) - new Date(a.fim || a.data)
                );
                store.adapter.save({
                  ...store.getState(),
                  sessoes: restauradas,
                  recordes: recomputeAllRecordsFromSessions(restauradas)
                });
                store.state = store.adapter.load();
                store.notify('sessao:restaurada', lastDeletedSessionBackup);
                lastDeletedSessionBackup = null;
              }
            }
          });
        }
      });
    });
  }

  render();
}
