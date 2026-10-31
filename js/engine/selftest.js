/**
 * ============================================================================
 * CLAY FIT — AUTOAUDITORIA DE EVOLUÇÃO, PERSISTÊNCIA, CORRIDA E CONTRASTE WCAG
 * /js/engine/selftest.js
 *
 * Especificações Prompt 4 (D6), Prompt 4.1 (Itens 1 e 2) e Prompt 5 (A8):
 * - Chamável apenas no console via:
 *   • `window.clayAudit.evolucao()`
 *   • `window.clayAudit.persistencia()`
 *   • `window.clayAudit.recordesCorrida()`
 *   • `window.clayAudit.contraste()`
 * - Nenhum texto ou botão de desenvolvedor na interface.
 * ============================================================================
 */

import {
  STORAGE_KEY,
  LocalStorageAdapter,
  safeStorage,
  calcularEpley1RM,
  recomputeAllRecordsFromSessions,
  generateSyntheticRunRoute,
  buildDemoRunSplits,
  store
} from '../store.js';
import { decodeRouteToTrack } from '../run/polyline.js';
import {
  computeSlidingWindowBestTimes,
  computeBestWindowSeconds,
  computeBest100mPaceFromPoints
} from '../run/metrics.js';
import {
  listarExercicios,
  pesquisarCatalogo,
  TAXONOMIA_MUSCULOS,
  TIPOS_EQUIPAMENTO
} from '../data/exercicios/index.js';
import { normalizarTexto } from '../data/exercicios/sinonimos.js';
import { renderMapaMuscular } from '../ui/mapa-muscular.js';
import { buildSession } from './planner.js';

export function computeStreakForSessions(sessoes = [], diasPlanejados = [1, 2, 4, 5]) {
  const concluidas = (sessoes || []).filter((s) => s && s.status === 'concluida');
  if (concluidas.length === 0) {
    return { atual: 0, melhor: 0 };
  }

  const activeDaysSet = new Set(
    concluidas.map((s) => new Date(s.fim || s.data || s.inicio).toISOString().slice(0, 10))
  );

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let atual = 0;
  let cursor = new Date(today);
  for (let i = 0; i < 120; i++) {
    const key = cursor.toISOString().slice(0, 10);
    const dow = cursor.getDay();
    if (activeDaysSet.has(key)) {
      atual += 1;
    } else if (i === 0) {
      // Hoje ainda pode ser treinado mais tarde
    } else if (!diasPlanejados.includes(dow)) {
      // Dia de descanso planejado não quebra a sequência
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  let melhor = Math.max(atual, activeDaysSet.size > 0 ? 1 : 0);
  let temp = 0;
  const checkCursor = new Date(today);
  for (let i = 0; i < 180; i++) {
    const key = checkCursor.toISOString().slice(0, 10);
    const dow = checkCursor.getDay();
    if (activeDaysSet.has(key)) {
      temp += 1;
      if (temp > melhor) melhor = temp;
    } else if (!diasPlanejados.includes(dow)) {
      // Descanso planejado mantém
    } else if (i > 0) {
      temp = 0;
    }
    checkCursor.setDate(checkCursor.getDate() - 1);
  }

  return { atual, melhor };
}

/**
 * Item 1 (Prompt 4.1) — `clayAudit.persistencia()`:
 * - Grava um valor de teste, lê, remove e confere que `window.localStorage` real foi tocado.
 * - Grava o estado completo do store, recarrega via novo `LocalStorageAdapter` e confere
 *   que perfil, sessões e recordes voltaram iguais.
 */
export function runPersistenceSelfTest() {
  const testKey = '__clay_audit_persist_probe__';
  const testVal = `probe_${Date.now()}`;
  let localStorageRealTouched = false;
  let readBackOk = false;
  let removedOk = false;

  try {
    safeStorage.setItem(testKey, testVal);
    const fromSafe = safeStorage.getItem(testKey);
    readBackOk = fromSafe === testVal;

    try {
      const fromNative = window.localStorage.getItem(testKey);
      localStorageRealTouched = fromNative === testVal;
    } catch (_) {
      localStorageRealTouched = false;
    }

    safeStorage.removeItem(testKey);
    let afterNative = null;
    try {
      afterNative = window.localStorage.getItem(testKey);
    } catch (_) {}
    removedOk = safeStorage.getItem(testKey) === null && afterNative === null;
  } catch (_) {}

  const beforeState = JSON.parse(JSON.stringify(store.getState()));
  store.adapter.save(beforeState);

  const freshAdapter = new LocalStorageAdapter(STORAGE_KEY);
  const reloadedState = freshAdapter.load();

  let rawV5InLocalStorage = false;
  try {
    rawV5InLocalStorage = Boolean(window.localStorage.getItem(STORAGE_KEY));
  } catch (_) {}

  const perfilIgual =
    reloadedState?.perfil?.nome === beforeState?.perfil?.nome &&
    reloadedState?.perfil?.onboardingConcluido === beforeState?.perfil?.onboardingConcluido &&
    JSON.stringify(reloadedState?.perfil?.diasSemana) ===
      JSON.stringify(beforeState?.perfil?.diasSemana);

  const sessoesIguais =
    Array.isArray(reloadedState?.sessoes) &&
    reloadedState.sessoes.length === (beforeState?.sessoes || []).length &&
    reloadedState.sessoes.every((s, idx) => s.id === beforeState.sessoes[idx]?.id);

  const recordesIguais =
    Array.isArray(reloadedState?.recordes) &&
    reloadedState.recordes.length === (beforeState?.recordes || []).length &&
    reloadedState.recordes.every((r, idx) => r.id === beforeState.recordes[idx]?.id);

  const todosPassaram = Boolean(
    readBackOk &&
      removedOk &&
      perfilIgual &&
      sessoesIguais &&
      recordesIguais &&
      (localStorageRealTouched || (window.location.protocol === 'data:' || window.location.protocol === 'about:'))
  );

  return {
    todosPassaram,
    localStorageRealTouched,
    rawV5InLocalStorage,
    readBackOk,
    removedOk,
    perfilIgual,
    sessoesIguais,
    recordesIguais,
    sessoesCount: (reloadedState?.sessoes || []).length,
    recordesCount: (reloadedState?.recordes || []).length
  };
}

/**
 * Item 2 (Prompt 4.1) — `clayAudit.recordesCorrida()`:
 * Valida as 4 invariantes obrigatórias:
 * (a) o melhor 1 km de uma corrida nunca pode ser mais rápido que o melhor ritmo de 100 m dela;
 * (b) o melhor 5 km nunca pode ser mais rápido que o melhor 1 km repetido (5 × best1k);
 * (c) o tempo do melhor 5 km nunca pode ser menor que o tempo de uma janela de 5 km dentro da própria corrida;
 * (d) corridas com menos de 1 km não geram recorde de 1 km;
 * + testa recálculo ao excluir a corrida detentora do recorde.
 */
export function runRecordsInvariantsSelfTest() {
  const sessoesCorrida = (store.getState()?.sessoes || []).filter(
    (s) => s && s.status === 'concluida' && s.tipo === 'corrida'
  );

  const relatorioCorridas = [];
  let invAPassou = true;
  let invBPassou = true;
  let invCPassou = true;

  sessoesCorrida.forEach((s) => {
    const pts = s.rota?.polyline
      ? decodeRouteToTrack(s.rota.polyline, s.rota.temposB36 || '')
      : [];
    const best100m = computeBest100mPaceFromPoints(pts) || s.ritmoMelhorSegKm || 200;
    const rawWindow5k = computeBestWindowSeconds(pts, s.parciais || [], 5000);
    const win = computeSlidingWindowBestTimes(pts, s.parciais || [], best100m);

    const aOk = win.best1kSeg === null || win.best1kSeg >= best100m;
    const bOk =
      win.best5kSeg === null ||
      win.best1kSeg === null ||
      win.best5kSeg >= win.best1kSeg * 5;
    const cOk =
      win.best5kSeg === null ||
      rawWindow5k === null ||
      win.best5kSeg >= rawWindow5k;

    if (!aOk) invAPassou = false;
    if (!bOk) invBPassou = false;
    if (!cOk) invCPassou = false;

    relatorioCorridas.push({
      id: s.id,
      nome: s.nome,
      distanciaM: s.distanciaM,
      duracaoMovSeg: s.movimentoSeg,
      ritmoMedioSegKm: s.ritmoMedioSegKm,
      best100mSegKm: best100m,
      best1kSeg: win.best1kSeg,
      best5kSeg: win.best5kSeg,
      rawWindow5k,
      aOk,
      bOk,
      cOk
    });
  });

  const rotaCurta = generateSyntheticRunRoute(750, 240, 0);
  const ptsCurtos = decodeRouteToTrack(rotaCurta.polyline, rotaCurta.temposB36);
  const winCurta = computeSlidingWindowBestTimes(ptsCurtos, [], 280);
  const sessaoCurta = {
    id: 'test_short_750m',
    status: 'concluida',
    tipo: 'corrida',
    distanciaM: 750,
    movimentoSeg: 240,
    duracaoSeg: 240,
    rota: rotaCurta,
    parciais: []
  };
  const recsApenasCurta = recomputeAllRecordsFromSessions([sessaoCurta]);
  const invDPassou =
    winCurta.best1kSeg === null &&
    !recsApenasCurta.some((r) => r.tipo === 'corrida_1k');

  let handoffAoExcluirOk = true;
  if (sessoesCorrida.length >= 2) {
    const recsAntes = recomputeAllRecordsFromSessions(sessoesCorrida);
    const rec5kAntes = recsAntes.find((r) => r.tipo === 'corrida_5k');
    if (rec5kAntes) {
      const semDona = sessoesCorrida.filter((s) => s.id !== rec5kAntes.sessaoId);
      const recsDepois = recomputeAllRecordsFromSessions(semDona);
      const rec5kDepois = recsDepois.find((r) => r.tipo === 'corrida_5k');
      const temOutra5k = semDona.some((s) => Number(s.distanciaM || 0) >= 5000);
      if (temOutra5k) {
        handoffAoExcluirOk = Boolean(
          rec5kDepois &&
            rec5kDepois.sessaoId !== rec5kAntes.sessaoId &&
            rec5kDepois.valor >= rec5kAntes.valor
        );
      } else {
        handoffAoExcluirOk = !rec5kDepois;
      }
    }
  }

  const todosPassaram = Boolean(
    invAPassou && invBPassou && invCPassou && invDPassou && handoffAoExcluirOk
  );

  return {
    todosPassaram,
    invariantes: {
      a_1kNaoMaisRapidoQue100m: invAPassou,
      b_5kNaoMaisRapidoQue5x1k: invBPassou,
      c_5kNaoMenorQueJanela5k: invCPassou,
      d_menosDe1kSemRecorde1k: invDPassou,
      exclusaoTransfereRecorde: handoffAoExcluirOk
    },
    corridasAnalisadas: relatorioCorridas
  };
}

/**
 * A8 (Prompt 5) — `clayAudit.contraste()`:
 * Para cada tema ('escuro' e 'claro'), lê os tokens computados no DOM,
 * calcula a razão de contraste WCAG dos 9 pares obrigatórios:
 *   tinta/fundo, tinta/superficie, tinta-2/superficie, tinta-3/superficie-2,
 *   terracota-texto/superficie, salvia-texto/superficie, erro/superficie,
 *   sucesso/superficie, alerta/superficie
 * e imprime tabela com "passa AA" (>= 4,5:1 texto pequeno; >= 3:1 texto grande e ícones).
 */
function parseCssColorToRgb(rawColor) {
  const s = String(rawColor || '').trim();
  if (!s) return [0, 0, 0];

  if (s.charCodeAt(0) === 35) {
    const clean = s.slice(1);
    if (clean.length === 3) {
      return [
        parseInt(clean[0] + clean[0], 16),
        parseInt(clean[1] + clean[1], 16),
        parseInt(clean[2] + clean[2], 16)
      ];
    }
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16)
    ];
  }

  const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (m) {
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  return [0, 0, 0];
}

function computeRelativeLuminance([r, g, b]) {
  const toLinear = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function computeWcagContrast(fgStr, bgStr) {
  const l1 = computeRelativeLuminance(parseCssColorToRgb(fgStr));
  const l2 = computeRelativeLuminance(parseCssColorToRgb(bgStr));
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return Math.round(((brightest + 0.05) / (darkest + 0.05)) * 100) / 100;
}

export function runContrastSelfTest() {
  if (typeof document === 'undefined') {
    return { todosPassaram: false, tabela: [] };
  }

  const root = document.documentElement;
  const prevTheme = root.getAttribute('data-theme') || 'escuro';

  const pairs = [
    { par: 'tinta/fundo', fg: '--tinta', bg: '--fundo' },
    { par: 'tinta/superficie', fg: '--tinta', bg: '--superficie' },
    { par: 'tinta-2/superficie', fg: '--tinta-2', bg: '--superficie' },
    { par: 'tinta-3/superficie-2', fg: '--tinta-3', bg: '--superficie-2' },
    { par: 'terracota-texto/superficie', fg: '--terracota-texto', bg: '--superficie' },
    { par: 'salvia-texto/superficie', fg: '--salvia-texto', bg: '--superficie' },
    { par: 'erro/superficie', fg: '--erro', bg: '--superficie' },
    { par: 'sucesso/superficie', fg: '--sucesso', bg: '--superficie' },
    { par: 'alerta/superficie', fg: '--alerta', bg: '--superficie' }
  ];

  const tabela = [];
  const porTema = { escuro: [], claro: [] };

  ['escuro', 'claro'].forEach((tema) => {
    root.setAttribute('data-theme', tema);
    const cs = window.getComputedStyle(root);

    pairs.forEach(({ par, fg, bg }) => {
      const fgVal = cs.getPropertyValue(fg).trim();
      const bgVal = cs.getPropertyValue(bg).trim();
      const razao = computeWcagContrast(fgVal, bgVal);
      const passaAA = razao >= 4.5;
      const passaGrande = razao >= 3.0;
      const row = {
        tema,
        par,
        fg: fgVal,
        bg: bgVal,
        razao: `${razao.toFixed(2).replace('.', ',')}:1`,
        razaoNum: razao,
        'passa AA': passaAA ? 'Sim (>= 4,5:1)' : 'Não',
        passaTextoPequenoAA: passaAA,
        passaTextoGrandeIconesAA: passaGrande
      };
      tabela.push(row);
      porTema[tema].push(row);
    });
  });

  root.setAttribute('data-theme', prevTheme);

  const todosPassaram = tabela.every(
    (r) => r.passaTextoPequenoAA && r.passaTextoGrandeIconesAA
  );

  try {
    console.table(
      tabela.map((r) => ({
        Tema: r.tema,
        Par: r.par,
        FG: r.fg,
        BG: r.bg,
        Razao: r.razao,
        'passa AA': r['passa AA']
      }))
    );
  } catch (_) {}

  return {
    todosPassaram,
    escuro: porTema.escuro,
    claro: porTema.claro,
    tabela
  };
}

export function runEvolutionSelfTest() {
  const casos = [];

  // 1. 1RM Epley
  const epley1 = calcularEpley1RM(60, 10);
  const epley2 = calcularEpley1RM(100, 1);
  const epley3 = calcularEpley1RM(50, 15);
  casos.push({
    nome: '1RM Epley (1..12 reps e limite > 12)',
    passou: epley1 === 80 && epley2 === 100 && epley3 === 0,
    detalhe: { epley60x10: epley1, epley100x1: epley2, epley50x15: epley3 }
  });

  // 2. Volume de força e recálculo de recordes
  const nowIso = new Date().toISOString();
  const sessaoForcaA = {
    id: 'test_forca_a',
    status: 'concluida',
    tipo: 'forca',
    data: new Date(Date.now() - 86400000).toISOString(),
    volumeKg: 1200,
    exercicios: [
      {
        exercicioId: 'peito-supino-reto',
        nome: 'Supino reto com barra',
        grupo: 'Peito',
        series: [
          { n: 1, carga: 50, reps: 8, feita: true, pulada: false },
          { n: 2, carga: 50, reps: 8, feita: true, pulada: false },
          { n: 3, carga: 50, reps: 8, feita: true, pulada: false }
        ]
      }
    ]
  };
  const sessaoForcaB = {
    id: 'test_forca_b',
    status: 'concluida',
    tipo: 'forca',
    data: nowIso,
    volumeKg: 1320,
    exercicios: [
      {
        exercicioId: 'peito-supino-reto',
        nome: 'Supino reto com barra',
        grupo: 'Peito',
        series: [
          { n: 1, carga: 55, reps: 8, feita: true, pulada: false },
          { n: 2, carga: 55, reps: 8, feita: true, pulada: false },
          { n: 3, carga: 55, reps: 8, feita: true, pulada: false }
        ]
      }
    ]
  };

  const recsAB = recomputeAllRecordsFromSessions([sessaoForcaA, sessaoForcaB]);
  const recSupinoAB = recsAB.find((r) => r.exercicioId === 'peito-supino-reto');
  casos.push({
    nome: 'Volume de força e recorde de carga máxima',
    passou: Boolean(recSupinoAB && recSupinoAB.valor === 55 && recSupinoAB.sessaoId === 'test_forca_b'),
    detalhe: recSupinoAB || null
  });

  // 3. Janela deslizante de 1k/5k e ritmo médio coerente
  const splits6k = buildDemoRunSplits(6200, 1860, 1);
  const rota6k = generateSyntheticRunRoute(6200, 1860, 1, splits6k);
  const track6k = decodeRouteToTrack(rota6k.polyline, rota6k.temposB36);
  const windows6k = computeSlidingWindowBestTimes(track6k, splits6k);
  casos.push({
    nome: 'Janela deslizante 1 km e 5 km em corrida de 6,2 km (300 s/km médio)',
    passou:
      Boolean(windows6k.best1kSeg && windows6k.best1kSeg >= 275 && windows6k.best1kSeg <= 315) &&
      Boolean(windows6k.best5kSeg && windows6k.best5kSeg >= windows6k.best1kSeg * 5 && windows6k.best5kSeg <= 1560) &&
      windows6k.best10kSeg === null,
    detalhe: windows6k
  });

  // 4. Ritmo médio e recordes de corrida
  const sessaoCorrida = {
    id: 'test_run_6k',
    status: 'concluida',
    tipo: 'corrida',
    data: nowIso,
    distanciaM: 6200,
    movimentoSeg: 1860,
    duracaoSeg: 1860,
    ritmoMedioSegKm: 300,
    ritmoMelhorSegKm: windows6k.best100mSegKm || 282,
    rota: rota6k,
    parciais: splits6k
  };
  const recsComCorrida = recomputeAllRecordsFromSessions([sessaoForcaA, sessaoForcaB, sessaoCorrida]);
  const rec5k = recsComCorrida.find((r) => r.tipo === 'corrida_5k');
  const recMaiorDist = recsComCorrida.find((r) => r.tipo === 'corrida_maior_distancia');
  casos.push({
    nome: 'Recordes de corrida (Melhor 5 km e Maior distância)',
    passou: Boolean(rec5k && recMaiorDist && recMaiorDist.valor === 6200),
    detalhe: { rec5k: rec5k?.valorTexto, recMaiorDist: recMaiorDist?.valorTexto }
  });

  // 5. Recálculo após exclusão de sessão (`excluirSessao`)
  const recsAposExclusaoB = recomputeAllRecordsFromSessions([sessaoForcaA]);
  const recSupinoApos = recsAposExclusaoB.find((r) => r.exercicioId === 'peito-supino-reto');
  casos.push({
    nome: 'Recálculo de recorde após excluir sessão detentora do recorde',
    passou: Boolean(recSupinoApos && recSupinoApos.valor === 50 && recSupinoApos.sessaoId === 'test_forca_a'),
    detalhe: recSupinoApos || null
  });

  // 6. Agregados semanais, mensais e série semanal da store ativa
  const aggSem = store.agregadosSemana(0);
  const aggMes = store.agregadosMes(0);
  const serie12 = store.serieSemanal('sessoes', 12);
  casos.push({
    nome: 'Agregados semanais, mensais e série de 12 semanas',
    passou:
      typeof aggSem.sessoes === 'number' &&
      Array.isArray(aggSem.diasAtivos) &&
      aggSem.diasAtivos.length === 7 &&
      typeof aggMes.volumeKg === 'number' &&
      Array.isArray(serie12) &&
      serie12.length === 12 &&
      serie12[11].semanaLabel === 'Agora',
    detalhe: {
      semanaAtualSessoes: aggSem.sessoes,
      mesAtualSessoes: aggMes.sessoes,
      semanasSerie: serie12.length,
      ultimoRotulo: serie12[11]?.semanaLabel
    }
  });

  // 7. Sequência (streak) com descanso planejado
  const streakRes = computeStreakForSessions([sessaoForcaA, sessaoForcaB], [1, 2, 4, 5]);
  casos.push({
    nome: 'Cálculo de sequência (streak) ativa e recorde',
    passou: streakRes.atual >= 2 && streakRes.melhor >= 2,
    detalhe: streakRes
  });

  const todosPassaram = casos.every((c) => c.passou);
  return {
    todosPassaram,
    casos
  };
}


/**
 * F1 & C8. AUTOAUDITORIA DA NOVA BIBLIOTECA — LOTES 1 E 2 (`clayAudit.biblioteca()`)
 */
/**
 * C1 (Prompt 7.1). TESTE AUTOMÁTICO DE CORES COMPUTADAS DO MAPA MUSCULAR EM 12 EXERCÍCIOS NOS 2 TEMAS
 * Confirma getComputedStyle(path).fill === "rgb(226, 87, 59)" (principal, opacity 1)
 * e "rgb(217, 185, 138)" (secundário, opacity 0.8) nos temas escuro e claro.
 */
export function runMapaMuscularColorsSelfTest() {
  const nomesLotes1e2 = [
    "Supino reto com barra",
    "Puxada alta pela frente",
    "Elevação lateral com halteres",
    "Rosca direta com barra reta",
    "Tríceps na polia com corda",
    "Agachamento livre",
    "Stiff com barra",
    "Elevação pélvica com barra",
    "Panturrilha sentado",
    "Cadeira abdutora",
    "Levantamento terra",
    "Flexão de braço"
  ];
  const nomesLote3 = [
    "Prancha frontal",
    "Abdominal supra",
    "Roda abdominal",
    "Lenhador na polia",
    "Corrida na esteira",
    "Remo ergométrico",
    "Burpee",
    "Alongamento de posterior",
    "Mobilidade de quadril 90/90",
    "Extensão de coluna (cobra)",
    "Kettlebell swing",
    "Caminhada do fazendeiro"
  ];
  const nomes24 = [...nomesLotes1e2, ...nomesLote3];
  const todos = listarExercicios();
  const resultados = [];
  let todosPassaram = true;

  if (typeof document === "undefined" || !document.body) {
    return { passou: false, resultados: [] };
  }

  const htmlEl = document.documentElement;
  const temaOriginal = htmlEl.getAttribute("data-theme");
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed; left:-9999px; top:-9999px; width:360px; height:240px; pointer-events:none; opacity:0;";
  document.body.appendChild(probe);

  try {
    for (const tema of ["escuro", "claro"]) {
      htmlEl.setAttribute("data-theme", tema);
      for (const nome of nomes24) {
        const ex = todos.find((e) => e.nome === nome);
        if (!ex) {
          todosPassaram = false;
          resultados.push({ tema, nome, encontrado: false, passou: false });
          continue;
        }
        probe.innerHTML =
          `<div class="probe-mini">${renderMapaMuscular(ex, { tamanho: "mini" })}</div>` +
          `<div class="probe-grande">${renderMapaMuscular(ex, { tamanho: "grande" })}</div>`;

        const priMini = probe.querySelector('.probe-mini [data-muscle-role="principal"]');
        const secMini = probe.querySelector('.probe-mini [data-muscle-role="secundario"]');
        const priGrande = probe.querySelector('.probe-grande [data-muscle-role="principal"]');
        const secGrande = probe.querySelector('.probe-grande [data-muscle-role="secundario"]');
        const bodyPath = probe.querySelector(".probe-grande .muscle-map-body");

        const fillPrincipalMini = priMini ? getComputedStyle(priMini).fill : null;
        const fillSecundarioMini = secMini ? getComputedStyle(secMini).fill : null;
        const fillPrincipalGrande = priGrande ? getComputedStyle(priGrande).fill : null;
        const fillSecundarioGrande = secGrande ? getComputedStyle(secGrande).fill : null;
        const opacityPrincipal = priGrande ? getComputedStyle(priGrande).opacity : null;
        const opacitySecundario = secGrande ? getComputedStyle(secGrande).opacity : null;
        const fillCorpoBase = bodyPath ? getComputedStyle(bodyPath).fill : null;

        const okPri =
          fillPrincipalMini === "rgb(226, 87, 59)" &&
          fillPrincipalGrande === "rgb(226, 87, 59)" &&
          opacityPrincipal === "1";
        const okSec =
          fillSecundarioMini === "rgb(217, 185, 138)" &&
          fillSecundarioGrande === "rgb(217, 185, 138)" &&
          Number(opacitySecundario) === 0.8;
        const okBody = Boolean(fillCorpoBase && fillCorpoBase !== "rgb(0, 0, 0)");
        const itemPassou = okPri && okSec && okBody;
        if (!itemPassou) todosPassaram = false;

        resultados.push({
          tema,
          lote: nomesLote3.includes(nome) ? 3 : 1,
          id: ex.id,
          nome: ex.nome,
          musculoPrincipal: ex.musculoPrincipal,
          fillPrincipalMini,
          fillSecundarioMini,
          fillPrincipalGrande,
          fillSecundarioGrande,
          opacityPrincipal,
          opacitySecundario,
          fillCorpoBase,
          passou: itemPassou
        });
      }
    }
  } finally {
    probe.remove();
    if (temaOriginal === null) {
      htmlEl.removeAttribute("data-theme");
    } else {
      htmlEl.setAttribute("data-theme", temaOriginal);
    }
  }

  const resultadosLote3 = resultados.filter((r) => r.lote === 3);
  return {
    passou: todosPassaram && resultados.length === 48 && resultadosLote3.length === 24,
    passouLote3: resultadosLote3.every((r) => r.passou) && resultadosLote3.length === 24,
    totalVerificacoes: resultados.length,
    totalVerificacoesLote3: resultadosLote3.length,
    resultados
  };
}

export function runBibliotecaSelfTest() {
  const itens = listarExercicios();
  const peitoCount = itens.filter((e) => e.grupo === "Peito").length;
  const costasCount = itens.filter((e) => e.grupo === "Costas").length;
  const ombrosCount = itens.filter((e) => e.grupo === "Ombros").length;
  const bracosCount = itens.filter((e) => e.grupo === "Braços").length;
  const pernasCount = itens.filter((e) => e.grupo === "Pernas").length;
  const coreCount = itens.filter((e) => e.grupo === "Core").length;
  const cardioCount = itens.filter((e) => e.grupo === "Cardio").length;
  const mobilidadeCount = itens.filter((e) => e.grupo === "Mobilidade").length;
  const funcionalCount = itens.filter((e) => e.grupo === "Funcional").length;

  const subgruposCount = {
    Bíceps: itens.filter((e) => e.subgrupo === "Bíceps").length,
    Tríceps: itens.filter((e) => e.subgrupo === "Tríceps").length,
    Quadríceps: itens.filter((e) => e.subgrupo === "Quadríceps").length,
    "Posterior de coxa": itens.filter((e) => e.subgrupo === "Posterior de coxa").length,
    "Glúteos e adutores": itens.filter((e) => e.subgrupo === "Glúteos e adutores").length,
    Panturrilhas: itens.filter((e) => e.subgrupo === "Panturrilhas").length
  };

  const nomesEsperadosLote2 = [
    "Rosca direta com barra reta",
    "Rosca direta com barra W",
    "Rosca alternada",
    "Rosca simultânea",
    "Rosca martelo",
    "Rosca martelo na corda",
    "Rosca concentrada",
    "Rosca Scott com barra W",
    "Rosca Scott na máquina",
    "Rosca Scott unilateral",
    "Rosca inclinada",
    "Rosca na polia baixa",
    "Rosca na polia alta",
    "Rosca inversa",
    "Tríceps na polia com corda",
    "Tríceps na polia com barra reta",
    "Tríceps na polia com barra V",
    "Tríceps unilateral na polia",
    "Tríceps testa com barra W",
    "Tríceps testa com halteres",
    "Tríceps francês com halter",
    "Tríceps francês na polia",
    "Tríceps coice com halter",
    "Tríceps coice na polia",
    "Mergulho no banco",
    "Mergulho nas paralelas (foco tríceps)",
    "Supino fechado",
    "Tríceps na máquina",
    "Agachamento livre",
    "Agachamento no Smith",
    "Agachamento frontal",
    "Agachamento goblet",
    "Agachamento hack",
    "Agachamento sumô",
    "Agachamento búlgaro",
    "Leg press 45°",
    "Leg press horizontal",
    "Cadeira extensora",
    "Extensora unilateral",
    "Afundo com halteres",
    "Afundo no Smith",
    "Passada caminhando",
    "Passada reversa",
    "Subida no banco",
    "Mesa flexora",
    "Mesa flexora unilateral",
    "Cadeira flexora",
    "Flexora em pé",
    "Stiff com barra",
    "Stiff com halteres",
    "Stiff unilateral",
    "Terra romeno",
    "Terra sumô",
    "Good morning",
    "Flexão nórdica",
    "Flexora no cabo",
    "Elevação pélvica com barra",
    "Elevação pélvica no banco",
    "Elevação pélvica na máquina",
    "Elevação pélvica unilateral",
    "Ponte de glúteos",
    "Cadeira abdutora",
    "Cadeira adutora",
    "Coice na polia",
    "Coice na máquina",
    "Abdução na polia",
    "Abdução com elástico",
    "Passada lateral",
    "Agachamento com elástico",
    "Extensão de quadril em quatro apoios",
    "Panturrilha em pé na máquina",
    "Panturrilha sentado",
    "Panturrilha no leg press",
    "Panturrilha unilateral com halter",
    "Panturrilha no degrau",
    "Panturrilha no Smith"
  ];

  const nomesEsperadosLote3 = [
    // Core (18)
    "Abdominal supra",
    "Abdominal infra",
    "Abdominal remador",
    "Abdominal bicicleta",
    "Abdominal na polia",
    "Abdominal na máquina",
    "Abdominal canivete",
    "Prancha frontal",
    "Prancha lateral",
    "Prancha com toque no ombro",
    "Elevação de pernas na barra fixa",
    "Elevação de joelhos na paralela",
    "Rotação russa",
    "Roda abdominal",
    "Escalador (mountain climber)",
    "Lenhador na polia",
    "Dead bug",
    "Bird dog",
    // Cardio (12)
    "Corrida na esteira",
    "Caminhada inclinada",
    "Corrida na rua",
    "Tiros na esteira",
    "Bicicleta ergométrica",
    "Bicicleta spinning",
    "Elíptico",
    "Remo ergométrico",
    "Simulador de escada",
    "Pular corda",
    "Polichinelo",
    "Burpee",
    // Mobilidade (14)
    "Alongamento de quadríceps",
    "Alongamento de posterior",
    "Alongamento de peitoral",
    "Alongamento de dorsal (gato-vaca)",
    "Alongamento de ombro",
    "Alongamento de tríceps",
    "Alongamento de glúteo (figura 4)",
    "Alongamento de panturrilha",
    "Alongamento de flexor de quadril",
    "Mobilidade de quadril 90/90",
    "Rotação torácica",
    "Postura da criança",
    "Extensão de coluna (cobra)",
    "Joelhos ao peito",
    // Funcional (12)
    "Agachamento com salto",
    "Kettlebell swing",
    "Levantamento turco",
    "Wall ball",
    "Thruster",
    "Corda naval",
    "Prancha com remada",
    "Clean com halteres",
    "Caminhada do fazendeiro",
    "Salto na caixa",
    "Avanço com rotação",
    "Empurrar trenó"
  ];

  const nomesNoCatalogo = new Set(itens.map((e) => e.nome));
  const nomesFaltandoLote2 = nomesEsperadosLote2.filter((n) => !nomesNoCatalogo.has(n));
  const nomesFaltandoLote3 = nomesEsperadosLote3.filter((n) => !nomesNoCatalogo.has(n));

  const idsSet = new Set();
  const nomesNormSet = new Set();
  const idsDuplicados = [];
  const nomesDuplicados = [];
  const camposInvalidos = [];
  const mapasComErro = [];

  itens.forEach((ex) => {
    if (idsSet.has(ex.id)) idsDuplicados.push(ex.id);
    idsSet.add(ex.id);

    const nNorm = normalizarTexto(ex.nome);
    if (nomesNormSet.has(nNorm)) nomesDuplicados.push(ex.nome);
    nomesNormSet.add(nNorm);

    const comoOk = Array.isArray(ex.comoFazer) && ex.comoFazer.length >= 3 && ex.comoFazer.length <= 5;
    const errosOk = Array.isArray(ex.errosComuns) && ex.errosComuns.length >= 2 && ex.errosComuns.length <= 3;
    const dicasOk = Array.isArray(ex.dicas) && ex.dicas.length >= 1 && ex.dicas.length <= 2;
    const respOk = Boolean(ex.respiracao && String(ex.respiracao).trim());
    const avisoOk = Boolean(ex.avisoSeguranca && String(ex.avisoSeguranca).trim());
    const cuidadoOk = Boolean(ex.cuidado && String(ex.cuidado).trim());
    const musculoOk = Boolean(ex.musculoPrincipal && TAXONOMIA_MUSCULOS[ex.musculoPrincipal]);
    const equipOk = Boolean(ex.equipamentoTipo && TIPOS_EQUIPAMENTO.includes(ex.equipamentoTipo));

    if (!comoOk || !errosOk || !dicasOk || !respOk || !avisoOk || !cuidadoOk || !musculoOk || !equipOk) {
      camposInvalidos.push({
        id: ex.id,
        comoOk,
        errosOk,
        dicasOk,
        respOk,
        avisoOk,
        cuidadoOk,
        musculoOk,
        equipOk
      });
    }

    try {
      const svgMini = renderMapaMuscular(ex, { tamanho: "mini" });
      const svgGrande = renderMapaMuscular(ex, { tamanho: "grande" });
      if (!svgMini.includes("<svg") || !svgGrande.includes("<svg")) {
        mapasComErro.push(ex.id);
      }
    } catch (_) {
      mapasComErro.push(ex.id);
    }
  });

  // A1: Levantamento terra corrigido
  const levTerra = itens.find((e) => e.id === "costas-levantamento-terra");
  const a1Ok =
    Boolean(levTerra) &&
    levTerra.musculoPrincipal === "Posterior de coxa" &&
    JSON.stringify(levTerra.musculosSecundarios) ===
      JSON.stringify(["Glúteos", "Lombar", "Dorsais", "Trapézio"]) &&
    levTerra.grupo === "Costas";

  // A2: Remada invertida corrigida
  const remInv = itens.find((e) => e.id === "costas-remada-invertida");
  const a2Ok =
    Boolean(remInv) &&
    remInv.avisoSeguranca ===
      "Use uma barra bem presa e estável, em altura segura. Mantenha o corpo alinhado e não deixe o quadril cair.";

  // Planejador intacto em ?demo=1 (comparado à v0.5.1)
  const demoPerfil = {
    nome: "Marina",
    objetivo: "Os dois: ferro e asfalto",
    nivel: "Treino há alguns meses",
    locais: ["Academia completa"],
    diasSemana: [1, 2, 4, 5, 6],
    tempoTreinoMin: 45,
    cuidados: ["Nenhum"]
  };
  const candPeito = buildSession({ chave: "peito", duracaoMin: 45 }, demoPerfil).exercicios.map((e) => e.exercicioId);
  const candCorrida = buildSession({ chave: "corrida", duracaoMin: 45 }, demoPerfil).exercicios.map((e) => e.exercicioId);
  const esperadoPeito = [
    "peito-supino-reto",
    "peito-flexao-classica",
    "peito-crucifixo-polia-alta",
    "peito-supino-maquina",
    "bracos-rosca-direta-barra",
    "bracos-triceps-polia-corda"
  ];
  const esperadoCorrida = [
    "corrida-leve-20",
    "core-prancha-firme",
    "core-elevacao-pernas-solo",
    "core-estabilizacao-alternada"
  ];
  const planejadorIntacto =
    JSON.stringify(candPeito) === JSON.stringify(esperadoPeito) &&
    JSON.stringify(candCorrida) === JSON.stringify(esperadoCorrida);

  // Buscas do Lote 1 + 20 buscas do Lote 2 + 20 buscas obrigatórias do Lote 3 (C2)
  const buscasLote2 = [
    "leg press",
    "hack",
    "bulgaro",
    "stiff",
    "terra romeno",
    "hip thrust",
    "pelvica",
    "gluteo",
    "abdutora",
    "panturrilha",
    "biceps",
    "scott",
    "martelo",
    "triceps testa",
    "skull crusher",
    "pushdown",
    "extensora",
    "flexora",
    "mergulho",
    "supino fechado"
  ];
  const buscasLote3 = [
    "abdominal",
    "oblíquo",
    "prancha",
    "plank",
    "roda abdominal",
    "mountain climber",
    "esteira",
    "spinning",
    "elíptico",
    "pular corda",
    "burpee",
    "kettlebell",
    "wall ball",
    "thruster",
    "fazendeiro",
    "trenó",
    "cobra",
    "gato vaca",
    "figura 4",
    "90/90"
  ];
  const consultasBase = [
    "supino",
    "SUPINO RETO",
    "bench press",
    "remada",
    "puxador",
    "pulldown",
    "barra fixa",
    "face pull",
    "deadlift",
    "terra",
    "shrug",
    "sem equipamento",
    "ombro",
    "trapezio",
    "supno",
    ...buscasLote2,
    ...buscasLote3
  ];
  const falhasBusca = [];
  const resultadosBuscas = {};
  consultasBase.forEach((q) => {
    const t0 = performance.now();
    const res = pesquisarCatalogo(q);
    const dt = performance.now() - t0;
    resultadosBuscas[q] = {
      total: res.total,
      primeiro: res.itens[0]?.nome || null,
      nomes: res.itens.map((i) => i.nome),
      resultadosParecidos: res.resultadosParecidos,
      termoSugerido: res.termoSugerido || null,
      tempoMs: Number(dt.toFixed(2))
    };
  });

  const resSupino = pesquisarCatalogo("supino");
  const resBenchPress = pesquisarCatalogo("bench press");
  const resRemada = pesquisarCatalogo("remada");
  const resBarraFixa = pesquisarCatalogo("barra fixa");
  const resSemEquip = pesquisarCatalogo("sem equipamento");
  const resShrug = pesquisarCatalogo("shrug");
  const resFacePull = pesquisarCatalogo("face pull");
  const resDeadlift = pesquisarCatalogo("deadlift");
  const resOmbro = pesquisarCatalogo("ombro");
  const resTrapezio = pesquisarCatalogo("trapezio");
  const resSupno = pesquisarCatalogo("supno");

  // Verificação da regra A2 (Prompt 8): 1º nome contém termo -> 2º músculo principal -> 3º músculo secundário
  const resPanturrilha = pesquisarCatalogo("panturrilha");
  const resGluteo = pesquisarCatalogo("glúteo");
  const resAbdominal = pesquisarCatalogo("abdominal");
  const resBiceps = pesquisarCatalogo("bíceps");

  const a2OrdemPanturrilhaOk =
    resPanturrilha.itens.slice(0, 7).every((i) => normalizarTexto(i.nome).includes("panturrilha")) &&
    resPanturrilha.itens[7]?.nome === "Pular corda" &&
    resPanturrilha.itens[7]?.musculoPrincipal === "Panturrilhas" &&
    resPanturrilha.itens.slice(8).every((i) => (i.musculosSecundarios || []).includes("Panturrilhas"));

  const a2OrdemGluteoOk =
    resGluteo.itens.slice(0, 2).every((i) => normalizarTexto(i.nome).includes("gluteo")) &&
    resGluteo.itens[2]?.musculoPrincipal?.startsWith("Glúteo");

  const a2OrdemAbdominalOk =
    resAbdominal.itens.slice(0, 8).every((i) => normalizarTexto(i.nome).includes("abdominal")) &&
    ["Abdômen", "Reto abdominal", "Transverso"].includes(resAbdominal.itens[8]?.musculoPrincipal);

  const a2OrdemBicepsOk =
    resBiceps.itens.slice(0, 11).every((i) => i.musculoPrincipal === "Bíceps") &&
    resBiceps.itens.slice(11).every((i) => (i.musculosSecundarios || []).includes("Bíceps"));

  const testesAceitacao = {
    a1LevantamentoTerra: a1Ok,
    a2RemadaInvertida: a2Ok,
    a2OrdemMusculoBusca:
      a2OrdemPanturrilhaOk && a2OrdemGluteoOk && a2OrdemAbdominalOk && a2OrdemBicepsOk,
    lote2SetentaESeisNomes: nomesFaltandoLote2.length === 0,
    lote3CinquentaESeisNomes: nomesFaltandoLote3.length === 0,
    subgruposExatos:
      subgruposCount.Bíceps === 14 &&
      subgruposCount.Tríceps === 14 &&
      subgruposCount.Quadríceps === 16 &&
      subgruposCount["Posterior de coxa"] === 12 &&
      subgruposCount["Glúteos e adutores"] === 14 &&
      subgruposCount.Panturrilhas === 6,
    supino: resSupino.total === 11 && resSupino.itens[0]?.nome === "Supino reto com barra",
    benchPress:
      resBenchPress.total === 11 &&
      resBenchPress.itens[0]?.nome === "Supino reto com barra",
    remada:
      (resRemada.itens[0]?.nome === "Remada curvada com barra" ||
        resRemada.itens[0]?.nome === "Remada baixa com triângulo") &&
      resRemada.itens.slice(0, 10).every((i) => i.grupo === "Costas"),
    barraFixa: resBarraFixa.total >= 4,
    semEquipamento:
      resSemEquip.total >= 40 &&
      resSemEquip.itens.every((i) => i.equipamentoTipo === "Peso do corpo"),
    shrug: resShrug.total === 2,
    facePull: resFacePull.total === 1,
    deadlift: resDeadlift.total === 3 && resDeadlift.itens[0]?.nome === "Levantamento terra",
    ombro: resOmbro.total === 20 && resOmbro.itens.every((i) => i.grupo === "Ombros"),
    trapezio:
      resTrapezio.total > 3 &&
      resTrapezio.itens.slice(0, 3).every((i) => i.musculoPrincipal === "Trapézio"),
    supno: resSupno.resultadosParecidos === true && resSupno.termoSugerido === "supino",
    buscasLote2TodasComResultado: buscasLote2.every((q) => resultadosBuscas[q]?.total > 0),
    buscasLote3TodasComResultado: buscasLote3.every((q) => resultadosBuscas[q]?.total > 0)
  };

  Object.entries(testesAceitacao).forEach(([chave, ok]) => {
    if (!ok) falhasBusca.push(chave);
  });

  const domNodes =
    typeof document !== "undefined"
      ? document.querySelectorAll('#biblioteca-lista [role="listitem"]').length
      : 0;
  const domVirtualizadoOk = domNodes <= 30;

  const porMusculo = new Map();
  itens.forEach((ex) => {
    if (!porMusculo.has(ex.musculoPrincipal)) {
      porMusculo.set(ex.musculoPrincipal, ex);
    }
  });
  const musculosList = Array.from(porMusculo.keys());
  let colisoesMapa = 0;
  for (let i = 0; i < musculosList.length; i++) {
    for (let j = i + 1; j < musculosList.length; j++) {
      const exA = porMusculo.get(musculosList[i]);
      const exB = porMusculo.get(musculosList[j]);
      const svgA = renderMapaMuscular({ ...exA, id: "cmp-a", musculosSecundarios: [] }, { tamanho: "mini" });
      const svgB = renderMapaMuscular({ ...exB, id: "cmp-b", musculosSecundarios: [] }, { tamanho: "mini" });
      if (svgA === svgB) {
        colisoesMapa += 1;
      }
    }
  }

  const mapaCores12Exercicios = runMapaMuscularColorsSelfTest();

  const passou =
    mapaCores12Exercicios.passou &&
    itens.length === 200 &&
    peitoCount === 22 &&
    costasCount === 26 &&
    ombrosCount === 20 &&
    bracosCount === 28 &&
    pernasCount === 48 &&
    coreCount === 18 &&
    cardioCount === 12 &&
    mobilidadeCount === 14 &&
    funcionalCount === 12 &&
    idsDuplicados.length === 0 &&
    nomesDuplicados.length === 0 &&
    nomesFaltandoLote2.length === 0 &&
    nomesFaltandoLote3.length === 0 &&
    camposInvalidos.length === 0 &&
    mapasComErro.length === 0 &&
    planejadorIntacto &&
    falhasBusca.length === 0 &&
    domVirtualizadoOk &&
    colisoesMapa === 0;

  return {
    passou,
    total: itens.length,
    porGrupo: {
      Peito: peitoCount,
      Costas: costasCount,
      Ombros: ombrosCount,
      Braços: bracosCount,
      Pernas: pernasCount,
      Core: coreCount,
      Cardio: cardioCount,
      Mobilidade: mobilidadeCount,
      Funcional: funcionalCount
    },
    subgruposCount,
    nomesFaltandoLote2,
    nomesFaltandoLote3,
    idsDuplicados,
    nomesDuplicados,
    camposInvalidos,
    mapasComErro,
    planejadorIntacto,
    falhasBusca,
    domListItemsCount: domNodes,
    domVirtualizadoOk,
    colisoesMapaMuscular: colisoesMapa,
    mapaCores12Exercicios,
    testesAceitacao,
    resultadosBuscas
  };
}

export function runAmostraBibliotecaSelfTest(n = 8) {
  const itens = listarExercicios();
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copia[i];
    copia[i] = copia[j];
    copia[j] = tmp;
  }
  const sorteados = copia.slice(0, Math.max(1, Math.min(copia.length, Number(n) || 8)));
  const tabela = sorteados.map((ex) => {
    const comoOk = Array.isArray(ex.comoFazer) && ex.comoFazer.length >= 3 && ex.comoFazer.length <= 5;
    const errosOk = Array.isArray(ex.errosComuns) && ex.errosComuns.length >= 2 && ex.errosComuns.length <= 3;
    const dicasOk = Array.isArray(ex.dicas) && ex.dicas.length >= 1 && ex.dicas.length <= 2;
    const segurancaOk = Boolean(ex.avisoSeguranca && ex.respiracao && ex.cuidado);
    const taxOk = Boolean(TAXONOMIA_MUSCULOS[ex.musculoPrincipal] && TIPOS_EQUIPAMENTO.includes(ex.equipamentoTipo));
    return {
      id: ex.id,
      nome: ex.nome,
      grupo: ex.grupo,
      subgrupo: ex.subgrupo || "",
      musculoPrincipal: ex.musculoPrincipal,
      equipamentoTipo: ex.equipamentoTipo,
      cuidado: ex.cuidado,
      passos: ex.comoFazer?.length || 0,
      erros: ex.errosComuns?.length || 0,
      dicas: ex.dicas?.length || 0,
      validoA1E5: Boolean(comoOk && errosOk && dicasOk && segurancaOk && taxOk)
    };
  });
  if (typeof console !== "undefined" && typeof console.table === "function") {
    console.table(tabela);
  }
  return tabela;
}

if (typeof window !== "undefined") {
  window.clayAudit = {
    ...(window.clayAudit || {}),
    evolucao: runEvolutionSelfTest,
    persistencia: runPersistenceSelfTest,
    recordesCorrida: runRecordsInvariantsSelfTest,
    contraste: runContrastSelfTest,
    biblioteca: runBibliotecaSelfTest,
    mapaMuscular: runMapaMuscularColorsSelfTest,
    amostraBiblioteca: runAmostraBibliotecaSelfTest
  };
}
