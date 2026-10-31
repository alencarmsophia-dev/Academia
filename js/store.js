/**
 * ============================================================================
 * CLAY FIT — CAMADA DE ESTADO, SESSÕES AO VIVO, CORRIDA GPS E EVOLUÇÃO (v5)
 * /js/store.js
 *
 * Especificações Prompt 4 (Parte B, C7, C9.3, C10, D1.5, D4.2):
 * - B1: SCHEMA_VERSION = 5 (chave `clay_fit_store_v5`). Migra de `clay_fit_store_v4`
 *   (e anteriores) sem perder nenhum dado e mantém `clay_fit_store_v4` intacto no
 *   localStorage como backup.
 * - B2: Entidade `sessao` estendida para corrida (`modo`, `meta`, `ritmoAlvoSegKm`,
 *   `intervalos`, `inicioISO`, `fimISO`, `duracaoSeg`, `movimentoSeg`, `pausadoSeg`,
 *   `distanciaM`, `ritmoMedioSegKm`, `ritmoMelhorSegKm`, `ganhoElevM`, `perdaElevM`,
 *   `calorias`, `parciais`, `rota`, `sentimento`, `incomodo`, `recordes`, `origem`).
 * - B3: Buffer de segurança `clay_fit_run_buffer` salvo a cada 10s e em
 *   `visibilitychange`/`pagehide`, com detecção de corrida interrompida (< 12h).
 * - B4: Recordes de corrida por janela deslizante (`Melhor 1 km`, `Melhor 5 km`,
 *   `Melhor 10 km`, `Maior distância`, `Mais longa em tempo`) e funções agregadoras:
 *   `agregadosSemana`, `agregadosMes`, `serieSemanal`, `registrarPeso`, `listarPesos`,
 *   `excluirSessao`.
 * ============================================================================
 */

import { showToast } from './ui/toast.js';
import { encodeTrackToRoute, decodeRouteToTrack } from './run/polyline.js';
import { capToMaxPoints } from './run/simplify.js';
import { formatKmWithUnit, formatPaceSegKm, formatRunClock } from './run/geo.js';
import { computeSlidingWindowBestTimes, computeBest100mPaceFromPoints, estimateRunCalories } from './run/metrics.js';

export const SCHEMA_VERSION = 5;
export const STORAGE_KEY = 'clay_fit_store_v5';
export const RUN_BUFFER_KEY = 'clay_fit_run_buffer';
const _memKV = new Map();
export const safeStorage = {
  getItem(k) {
    try {
      return window.localStorage.getItem(k);
    } catch (_) {
      return _memKV.has(k) ? _memKV.get(k) : null;
    }
  },
  setItem(k, v) {
    const str = String(v);
    try {
      window.localStorage.setItem(k, str);
    } catch (_) {
      _memKV.set(k, str);
    }
  },
  removeItem(k) {
    try {
      window.localStorage.removeItem(k);
    } catch (_) {
      _memKV.delete(k);
    }
  }
};
if (typeof window !== "undefined") {
  window.clayStorage = safeStorage;
}

const LEGACY_KEYS = ['clay_fit_store_v4', 'clay_fit_store_v3', 'clay_fit_store_v2'];

const ptBrNumberFmt = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

function fmtKgStore(n) {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return '0';
  return ptBrNumberFmt.format(Math.round(num * 10) / 10);
}

/**
 * Calcula 1RM estimado pela fórmula de Epley: carga * (1 + reps/30),
 * válido somente para repetições entre 1 e 12 (B3).
 */
export function calcularEpley1RM(carga, reps) {
  const c = Number(carga || 0);
  const r = Number(reps || 0);
  if (c <= 0 || r < 1 || r > 12) return 0;
  if (r === 1) return c;
  return Math.round(c * (1 + r / 30) * 10) / 10;
}

/**
 * Gera uma rota GPS sintética em curva suave para corridas de demonstração (?demo=1).
 */
export function generateSyntheticRunRoute(distanciaM = 5000, duracaoSeg = 1560, seedIndex = 0, parciais = null) {
  let curLat = -23.5874 + (seedIndex % 3) * 0.0042;
  let curLng = -46.6576 - (seedIndex % 2) * 0.0038;
  // Passo fixo de 25 m garante precisão de 100 m e de 1 km sem distorção de perímetro
  const totalPoints = Math.max(40, Math.min(360, Math.round(distanciaM / 25)));
  const stepDistM = distanciaM / totalPoints;
  const startMs = Date.now() - (seedIndex + 1) * 86400000 - duracaoSeg * 1000;

  const avgPaceSegKm = duracaoSeg / Math.max(0.1, distanciaM / 1000);
  const splits = Array.isArray(parciais) && parciais.length > 0
    ? parciais
    : buildDemoRunSplits(distanciaM, duracaoSeg, seedIndex);

  const rawTimed = [];
  let cumDistM = 0;
  let cumTimeSec = 0;

  for (let i = 0; i <= totalPoints; i++) {
    if (i > 0) {
      cumDistM += stepDistM;
      const frac = i / totalPoints;
      // Curva suave orgânica com passo exato em metros (Haversine == stepDistM)
      const heading =
        frac * Math.PI * 1.85 +
        seedIndex * 0.55 +
        0.28 * Math.sin(frac * Math.PI * 4 + seedIndex);
      const dLat = (stepDistM * Math.cos(heading)) / 111320;
      const dLng =
        (stepDistM * Math.sin(heading)) /
        (111320 * Math.cos((curLat * Math.PI) / 180));
      curLat += dLat;
      curLng += dLng;

      const kmIdx = Math.min(splits.length - 1, Math.floor((cumDistM - 0.01) / 1000));
      const baseSplitPace = Number(splits[kmIdx]?.ritmoSegKm || avgPaceSegKm);
      // Pequena variação natural de ±1.8% com média zero dentro de cada km
      const waveFactor = 1 - 0.018 * Math.sin((cumDistM / 1000) * Math.PI * 2);
      const segSec = (stepDistM / 1000) * baseSplitPace * waveFactor;
      cumTimeSec += segSec;
    }

    const alt = 752 + Math.sin((i / totalPoints) * Math.PI * 4 + seedIndex) * 9;
    rawTimed.push({
      lat: curLat,
      lng: curLng,
      offsetRawSec: cumTimeSec,
      alt
    });
  }

  // Normaliza para que o tempo final bata exatamente com duracaoSeg
  const scaleT = cumTimeSec > 0 ? duracaoSeg / cumTimeSec : 1;
  const points = rawTimed.map((pt) => {
    const offsetSeg = Math.round(pt.offsetRawSec * scaleT);
    return {
      lat: pt.lat,
      lng: pt.lng,
      offsetSeg,
      t: startMs + offsetSeg * 1000,
      alt: pt.alt
    };
  });

  return encodeTrackToRoute(points, false, points.length);
}

/**
 * Constrói parciais por km realistas para uma corrida de demonstração.
 */
export function buildDemoRunSplits(distanciaM, duracaoSeg, seedIndex = 0) {
  const fullKms = Math.floor(distanciaM / 1000);
  const remM = Math.round(distanciaM - fullKms * 1000);
  const avgPace = duracaoSeg / (distanciaM / 1000);
  const parciais = [];

  for (let k = 1; k <= fullKms; k++) {
    // Progressão levemente mais rápida no terço final
    const progressDelta = (fullKms / 2 - k) * 3.5 + ((k + seedIndex) % 3 - 1) * 2;
    const ritmoSegKm = Math.max(210, Math.round(avgPace + progressDelta));
    const elevDeltaM = ((k + seedIndex) % 4) * 3 - 4;
    parciais.push({
      km: k,
      tempoSeg: ritmoSegKm,
      ritmoSegKm,
      elevDeltaM
    });
  }

  if (remM >= 50) {
    const ritmoFinal = Math.max(205, Math.round(avgPace - 5));
    const tempoParcial = Math.round((remM / 1000) * ritmoFinal);
    parciais.push({
      km: fullKms + 1,
      parcialM: remM,
      tempoSeg: tempoParcial,
      ritmoSegKm: ritmoFinal,
      elevDeltaM: 2
    });
  }

  return parciais;
}

export function createInitialState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    perfil: {
      id: 'usr_clay_01',
      nome: 'Atleta',
      objetivo: '',
      nivel: '',
      locais: ['Academia completa'],
      diasSemana: [1, 2, 4, 5],
      tempoTreinoMin: 45,
      cuidados: ['Nenhum'],
      incomodosRecentes: [],
      onboardingPassoAtual: 1,
      etapaOnboarding: 'questionario', // 'questionario' | 'montando' | 'plano' | 'concluido'
      onboardingConcluido: false,
      somAtivo: true,
      vibracaoAtiva: true,
      // C9.3 — Preferências de Corrida e Peso
      vozEmCorrida: true,
      pausaAutomaticaCorrida: true,
      mostrarRuasNoMapa: false,
      contagemInicialCorrida: 3, // 3 | 5 | 0
      acompanharPeso: false,
      pesoKg: 70,
      tema: 'escuro'
    },
    hojeEstado: {
      hipoteseEscolhidaId: null,
      hipoteseAnteriorId: null,
      exerciciosExtrasIds: [],
      checkinExpandido: false,
      animarCheckHoje: false,
      corridaPreConfig: null
    },
    checkins: [],
    planos: [],
    sessoes: [],
    corridas: [],
    pesos: [],
    recordes: [
      {
        id: 'rec_supino',
        exercicioId: 'peito-supino-inclinado-halteres',
        categoria: 'forca',
        tipo: 'carga',
        valor: 22,
        epley1RM: 29.3,
        data: new Date(Date.now() - 6 * 86400000).toISOString(),
        sessaoId: 'ses_seed_1',
        nome: 'Supino inclinado com halteres',
        valorTexto: '22 kg',
        detalhe: '4 × 10 repetições · 1RM est. 29,3 kg',
        dataTexto: 'Há 6 dias',
        isDemo: true
      },
      {
        id: 'rec_agachamento',
        exercicioId: 'pernas-agachamento-livre',
        categoria: 'forca',
        tipo: 'carga',
        valor: 64,
        epley1RM: 81.1,
        data: new Date(Date.now() - 4 * 86400000).toISOString(),
        sessaoId: 'ses_seed_2',
        nome: 'Agachamento livre com barra',
        valorTexto: '64 kg',
        detalhe: '4 × 8 repetições · 1RM est. 81,1 kg',
        dataTexto: 'Há 4 dias',
        isDemo: true
      },
      {
        id: 'rec_corrida_5k',
        exercicioId: 'corrida_5k',
        categoria: 'corrida',
        tipo: 'corrida_5k',
        valor: 1510,
        data: new Date(Date.now() - 7 * 86400000).toISOString(),
        sessaoId: 'ses_seed_3',
        nome: 'Melhor 5 km',
        valorTexto: '25:10',
        detalhe: 'Ritmo médio 5:02 /km',
        dataTexto: 'Semana passada',
        isDemo: true
      }
    ]
  };
}

/**
 * C10 — Gera 7 semanas de histórico realista com contagens [3, 4, 3, 4, 4, 3, 3]
 * incluindo 6 corridas completas nas últimas 6 semanas (distâncias entre 3,2 km e 8,5 km,
 * rotas em curva suave, parciais completas e recordes de corrida) quando `?demo=1`.
 */
export function buildDemoSessions() {
  const now = new Date();
  const countsPorSemana = [3, 4, 3, 4, 4, 3, 3];
  const sessoes = [];

  const startOfCurrentWeek = new Date(now);
  startOfCurrentWeek.setHours(9, 30, 0, 0);
  startOfCurrentWeek.setDate(now.getDate() - now.getDay());

  // 6 corridas realistas distribuídas nas últimas 6 semanas (weeksAgo 5..0)
  const demoRunsSpec = [
    { weeksAgo: 5, distanciaM: 3200, movimentoSeg: 1056, modo: 'livre', nome: 'Corrida leve no parque', ganhoElevM: 18 },
    { weeksAgo: 4, distanciaM: 4500, movimentoSeg: 1440, modo: 'ritmo', ritmoAlvoSegKm: 320, nome: 'Ritmo controlado', ganhoElevM: 24 },
    { weeksAgo: 3, distanciaM: 5200, movimentoSeg: 1580, modo: 'meta_distancia', metaVal: 5000, nome: 'Meta de 5 km', ganhoElevM: 31 },
    { weeksAgo: 2, distanciaM: 6400, movimentoSeg: 1984, modo: 'intervalos', nome: 'Intervalado 6 × 1 min', ganhoElevM: 28 },
    { weeksAgo: 1, distanciaM: 8500, movimentoSeg: 2686, modo: 'meta_distancia', metaVal: 8000, nome: 'Longão de domingo', ganhoElevM: 54 },
    { weeksAgo: 0, distanciaM: 5400, movimentoSeg: 1576, modo: 'ritmo', ritmoAlvoSegKm: 295, nome: 'Corrida ritmada matinal', ganhoElevM: 26 }
  ];

  const strengthCatalogSample = [
    {
      grupoPrincipal: 'Peito',
      grupoSecundario: 'Braços',
      nome: 'Peito e tríceps',
      exercicios: [
        { exercicioId: 'peito-supino-reto', nome: 'Supino reto com barra', grupo: 'Peito', equip: 'barra', baseCarga: 37.5, baseReps: 8 },
        { exercicioId: 'peito-supino-inclinado-halteres', nome: 'Supino inclinado com halteres', grupo: 'Peito', equip: 'halteres', baseCarga: 18, baseReps: 10 },
        { exercicioId: 'bracos-triceps-corda', nome: 'Tríceps na polia', grupo: 'Braços', equip: 'polia', baseCarga: 20, baseReps: 12 }
      ]
    },
    {
      grupoPrincipal: 'Pernas',
      grupoSecundario: 'Core',
      nome: 'Pernas e estabilidade',
      exercicios: [
        { exercicioId: 'pernas-agachamento-livre', nome: 'Agachamento livre com barra', grupo: 'Pernas', equip: 'barra', baseCarga: 55, baseReps: 8 },
        { exercicioId: 'pernas-leg-press', nome: 'Leg press 45°', grupo: 'Pernas', equip: 'maquina', baseCarga: 110, baseReps: 10 },
        { exercicioId: 'core-prancha-isometrica', nome: 'Prancha abdominal', grupo: 'Core', equip: 'corpo', porTempo: true, baseCarga: 0, baseReps: 45 }
      ]
    },
    {
      grupoPrincipal: 'Costas',
      grupoSecundario: 'Braços',
      nome: 'Costas e bíceps',
      exercicios: [
        { exercicioId: 'costas-remada-curvada', nome: 'Remada curvada com barra', grupo: 'Costas', equip: 'barra', baseCarga: 40, baseReps: 8 },
        { exercicioId: 'costas-puxada-frente', nome: 'Puxada alta na polia', grupo: 'Costas', equip: 'polia', baseCarga: 45, baseReps: 10 },
        { exercicioId: 'bracos-rosca-direta-barra', nome: 'Rosca direta com barra', grupo: 'Braços', equip: 'barra', baseCarga: 22, baseReps: 10 }
      ]
    },
    {
      grupoPrincipal: 'Ombros',
      grupoSecundario: 'Mobilidade',
      nome: 'Ombros e postura',
      exercicios: [
        { exercicioId: 'ombros-desenvolvimento-halteres', nome: 'Desenvolvimento com halteres', grupo: 'Ombros', equip: 'halteres-alto', baseCarga: 14, baseReps: 10 },
        { exercicioId: 'ombros-elevacao-lateral', nome: 'Elevação lateral com halteres', grupo: 'Ombros', equip: 'halteres', baseCarga: 8, baseReps: 12 }
      ]
    }
  ];

  countsPorSemana.forEach((qtd, idx) => {
    const weeksAgo = 6 - idx;
    const weekStart = new Date(startOfCurrentWeek);
    weekStart.setDate(startOfCurrentWeek.getDate() - weeksAgo * 7);

    const runSpecForWeek = demoRunsSpec.find((r) => r.weeksAgo === weeksAgo);
    const diasOffset = [1, 2, 4, 6].slice(0, qtd);

    diasOffset.forEach((dOffset, j) => {
      const sessionDate = new Date(weekStart);
      sessionDate.setDate(weekStart.getDate() + dOffset);
      if (weeksAgo === 0 && sessionDate > now) {
        sessionDate.setTime(now.getTime() - (qtd - j) * 16 * 3600 * 1000);
      }

      const isRunSlot = Boolean(runSpecForWeek && j === diasOffset.length - 1);

      if (isRunSlot) {
        const rSpec = runSpecForWeek;
        const inicioISO = sessionDate.toISOString();
        const duracaoSeg = rSpec.movimentoSeg + 35;
        const fimISO = new Date(sessionDate.getTime() + duracaoSeg * 1000).toISOString();
        const ritmoMedioSegKm = Math.round(rSpec.movimentoSeg / (rSpec.distanciaM / 1000));
        const parciais = buildDemoRunSplits(rSpec.distanciaM, rSpec.movimentoSeg, idx);
        const rota = generateSyntheticRunRoute(rSpec.distanciaM, rSpec.movimentoSeg, idx, parciais);
        const decodedPts = decodeRouteToTrack(rota.polyline, rota.temposB36);
        const fastestSplitPace = Math.min(...parciais.map((p) => p.ritmoSegKm));
        const computedBest100 = computeBest100mPaceFromPoints(decodedPts);
        const ritmoMelhorSegKm = computedBest100
          ? Math.min(fastestSplitPace - 3, computedBest100)
          : Math.max(215, fastestSplitPace - 6);
        const calorias = estimateRunCalories(rSpec.distanciaM, 68);
        const recBadges = [];
        if (rSpec.weeksAgo === 1) recBadges.push('Maior distância', 'Mais longa em tempo');
        if (rSpec.weeksAgo === 0) recBadges.push('Melhor 5 km', 'Melhor 1 km');

        sessoes.push({
          id: `ses_demo_run_${weeksAgo}`,
          isDemo: true,
          tipo: 'corrida',
          status: 'concluida',
          nome: rSpec.nome,
          grupoPrincipal: 'Corrida',
          treinoId: `demo_corrida_${rSpec.modo}`,
          modo: rSpec.modo,
          meta: rSpec.metaVal
            ? { tipo: 'distancia', valor: rSpec.metaVal }
            : { tipo: null, valor: null },
          ritmoAlvoSegKm: rSpec.ritmoAlvoSegKm || null,
          intervalos:
            rSpec.modo === 'intervalos'
              ? { aquecimentoSeg: 180, tiroSeg: 60, tiroM: null, troteSeg: 90, rodadas: 6, voltaCalmaSeg: 180 }
              : null,
          data: fimISO,
          inicio: inicioISO,
          fim: fimISO,
          inicioISO,
          fimISO,
          diaSemana: sessionDate.getDay(),
          semanaOffset: weeksAgo,
          duracaoMin: Math.round(rSpec.movimentoSeg / 60),
          duracaoSeg,
          movimentoSeg: rSpec.movimentoSeg,
          pausadoSeg: 35,
          distanciaM: rSpec.distanciaM,
          ritmoMedioSegKm,
          ritmoMelhorSegKm,
          ganhoElevM: rSpec.ganhoElevM,
          perdaElevM: Math.max(10, rSpec.ganhoElevM - 4),
          calorias,
          parciais,
          rota,
          sentimento: 5,
          humor: 5,
          incomodo: [],
          recordes: recBadges,
          origem: 'simulada',
          volumeKg: 0,
          volumeTotalKg: 0,
          exercicios: []
        });
      } else {
        const sTemplate = strengthCatalogSample[(idx + j) % strengthCatalogSample.length];
        const progressBonus = Math.max(0, (6 - weeksAgo) * 1.25);
        const duracaoMin = 38 + ((idx + j) % 3) * 4;
        const duracaoSeg = duracaoMin * 60;
        const inicioISO = sessionDate.toISOString();
        const fimISO = new Date(sessionDate.getTime() + duracaoSeg * 1000).toISOString();

        let volumeSession = 0;
        const exercicios = sTemplate.exercicios.map((exTpl, exIdx) => {
          const step = exTpl.equip === 'barra' || exTpl.equip === 'maquina' || exTpl.equip === 'polia' ? 2.5 : 1;
          const carga = exTpl.porTempo
            ? 0
            : Math.round((exTpl.baseCarga + progressBonus) / step) * step;
          const series = [1, 2, 3, 4].slice(0, exIdx === 2 ? 3 : 4).map((n) => {
            if (!exTpl.porTempo) {
              volumeSession += carga * exTpl.baseReps;
            }
            return {
              n,
              alvoReps: exTpl.baseReps,
              alvoCarga: carga,
              reps: exTpl.baseReps,
              carga,
              esforco: n === 4 ? 'dificil' : 'medio',
              duracaoSeg: exTpl.porTempo ? exTpl.baseReps : 34,
              feita: true,
              pulada: false
            };
          });
          return {
            exercicioId: exTpl.exercicioId,
            nome: exTpl.nome,
            grupo: exTpl.grupo,
            equip: exTpl.equip,
            porTempo: Boolean(exTpl.porTempo),
            indice: exIdx,
            series
          };
        });

        sessoes.push({
          id: `ses_demo_${weeksAgo}_${j}`,
          isDemo: true,
          data: fimISO,
          inicio: inicioISO,
          fim: fimISO,
          inicioISO,
          fimISO,
          treinoId: `demo_${sTemplate.grupoPrincipal.toLowerCase()}`,
          diaSemana: sessionDate.getDay(),
          semanaOffset: weeksAgo,
          grupoPrincipal: sTemplate.grupoPrincipal,
          grupoSecundario: sTemplate.grupoSecundario,
          nome: sTemplate.nome,
          tipo: 'forca',
          status: 'concluida',
          duracaoMin,
          duracaoSeg,
          pausas: [],
          aquecimento: { feito: true },
          alongamento: { feito: true },
          humor: 4 + ((idx + j) % 2),
          sentimento: 4 + ((idx + j) % 2),
          incomodo: [],
          volumeKg: Math.round(volumeSession),
          volumeTotalKg: Math.round(volumeSession),
          todasSeriesCompletas: true,
          recordes: weeksAgo === 0 && j === 0 ? ['Supino reto com barra'] : [],
          exercicios
        });
      }
    });
  });

  return sessoes.sort((a, b) => new Date(b.data) - new Date(a.data));
}

/**
 * Constrói histórico de peso corporal para o modo demonstração (?demo=1).
 */
export function buildDemoPesos() {
  const now = Date.now();
  const base = [69.4, 69.2, 69.0, 68.9, 68.7, 68.6, 68.4, 68.3];
  return base.map((kg, idx) => ({
    dataISO: new Date(now - (base.length - 1 - idx) * 7 * 86400000).toISOString(),
    kg
  }));
}

/**
 * Recalcula todos os recordes (força + corrida) a partir da lista de sessões concluídas.
 */
export function recomputeAllRecordsFromSessions(sessoes = []) {
  const concluidas = (sessoes || [])
    .filter((s) => s && s.status === 'concluida')
    .sort((a, b) => new Date(a.data || a.inicio) - new Date(b.data || b.inicio));

  const strengthByExercise = new Map();
  const runBests = {
    corrida_1k: null,
    corrida_5k: null,
    corrida_10k: null,
    corrida_maior_distancia: null,
    corrida_mais_longa: null
  };

  for (const s of concluidas) {
    const sDate = s.fim || s.data || s.inicio || new Date().toISOString();
    if (s.tipo === 'corrida') {
      const distM = Number(s.distanciaM || 0);
      const movSeg = Number(s.movimentoSeg || s.duracaoSeg || 0);

      if (distM >= 100 && (!runBests.corrida_maior_distancia || distM > runBests.corrida_maior_distancia.valor)) {
        runBests.corrida_maior_distancia = {
          id: `rec_corrida_maior_distancia_${s.id}`,
          exercicioId: 'corrida_maior_distancia',
          categoria: 'corrida',
          tipo: 'corrida_maior_distancia',
          nome: 'Maior distância',
          valor: Math.round(distM),
          valorTexto: formatKmWithUnit(distM),
          detalhe: `Em ${formatRunClock(movSeg)} · Ritmo ${formatPaceSegKm(s.ritmoMedioSegKm || movSeg / (distM / 1000))} /km`,
          data: sDate,
          dataTexto: formatRelativeDateLabel(sDate),
          sessaoId: s.id,
          isDemo: Boolean(s.isDemo)
        };
      }

      if (movSeg >= 60 && (!runBests.corrida_mais_longa || movSeg > runBests.corrida_mais_longa.valor)) {
        runBests.corrida_mais_longa = {
          id: `rec_corrida_mais_longa_${s.id}`,
          exercicioId: 'corrida_mais_longa',
          categoria: 'corrida',
          tipo: 'corrida_mais_longa',
          nome: 'Mais longa em tempo',
          valor: Math.round(movSeg),
          valorTexto: formatRunClock(movSeg),
          detalhe: distM > 0 ? `Percurso de ${formatKmWithUnit(distM)}` : 'Sessão contínua',
          data: sDate,
          dataTexto: formatRelativeDateLabel(sDate),
          sessaoId: s.id,
          isDemo: Boolean(s.isDemo)
        };
      }

      // Janela deslizante sobre os pontos da rota ou parciais
      let bestWindows = { best1kSeg: null, best5kSeg: null, best10kSeg: null };
      if (s.rota && s.rota.polyline && distM >= 1000) {
        const pts = decodeRouteToTrack(s.rota.polyline, s.rota.temposB36 || '');
        if (pts.length >= 2) {
          bestWindows = computeSlidingWindowBestTimes(pts, s.parciais || [], s.ritmoMelhorSegKm);
        }
      }
      // Fallback proporcional/parciais quando não há pontos suficientes ou corrida sem GPS
      if (!bestWindows.best1kSeg && distM >= 1000 && movSeg > 0) {
        const bestSplit = Array.isArray(s.parciais)
          ? s.parciais.filter((p) => !p.parcialM && p.tempoSeg > 0).reduce((min, p) => Math.min(min, p.tempoSeg), Infinity)
          : Infinity;
        bestWindows.best1kSeg = Number.isFinite(bestSplit)
          ? bestSplit
          : Math.round((movSeg / distM) * 1000);
      }
      if (!bestWindows.best5kSeg && distM >= 5000 && movSeg > 0) {
        bestWindows.best5kSeg = Math.round((movSeg / distM) * 5000);
      }
      if (!bestWindows.best10kSeg && distM >= 10000 && movSeg > 0) {
        bestWindows.best10kSeg = Math.round((movSeg / distM) * 10000);
      }

      if (
        bestWindows.best1kSeg &&
        (!runBests.corrida_1k || bestWindows.best1kSeg < runBests.corrida_1k.valor)
      ) {
        runBests.corrida_1k = {
          id: `rec_corrida_1k_${s.id}`,
          exercicioId: 'corrida_1k',
          categoria: 'corrida',
          tipo: 'corrida_1k',
          nome: 'Melhor 1 km',
          valor: bestWindows.best1kSeg,
          valorTexto: formatRunClock(bestWindows.best1kSeg),
          detalhe: `Ritmo ${formatPaceSegKm(bestWindows.best1kSeg)} /km`,
          data: sDate,
          dataTexto: formatRelativeDateLabel(sDate),
          sessaoId: s.id,
          isDemo: Boolean(s.isDemo)
        };
      }

      if (
        bestWindows.best5kSeg &&
        (!runBests.corrida_5k || bestWindows.best5kSeg < runBests.corrida_5k.valor)
      ) {
        const pace5k = Math.round(bestWindows.best5kSeg / 5);
        runBests.corrida_5k = {
          id: `rec_corrida_5k_${s.id}`,
          exercicioId: 'corrida_5k',
          categoria: 'corrida',
          tipo: 'corrida_5k',
          nome: 'Melhor 5 km',
          valor: bestWindows.best5kSeg,
          valorTexto: formatRunClock(bestWindows.best5kSeg),
          detalhe: `Ritmo médio ${formatPaceSegKm(pace5k)} /km`,
          data: sDate,
          dataTexto: formatRelativeDateLabel(sDate),
          sessaoId: s.id,
          isDemo: Boolean(s.isDemo)
        };
      }

      if (
        bestWindows.best10kSeg &&
        (!runBests.corrida_10k || bestWindows.best10kSeg < runBests.corrida_10k.valor)
      ) {
        const pace10k = Math.round(bestWindows.best10kSeg / 10);
        runBests.corrida_10k = {
          id: `rec_corrida_10k_${s.id}`,
          exercicioId: 'corrida_10k',
          categoria: 'corrida',
          tipo: 'corrida_10k',
          nome: 'Melhor 10 km',
          valor: bestWindows.best10kSeg,
          valorTexto: formatRunClock(bestWindows.best10kSeg),
          detalhe: `Ritmo médio ${formatPaceSegKm(pace10k)} /km`,
          data: sDate,
          dataTexto: formatRelativeDateLabel(sDate),
          sessaoId: s.id,
          isDemo: Boolean(s.isDemo)
        };
      }
    } else {
      // Sessão de força
      (s.exercicios || []).forEach((ex) => {
        const feitas = (ex.series || []).filter((sr) => sr.feita && !sr.pulada);
        if (feitas.length === 0) return;

        const maxCarga = Math.max(...feitas.map((sr) => Number(sr.carga || 0)));
        const maxReps = Math.max(...feitas.map((sr) => Number(sr.reps || 0)));
        const melhorSerie = feitas.reduce(
          (best, cur) => (Number(cur.carga || 0) >= Number(best.carga || 0) ? cur : best),
          feitas[0]
        );
        const epley = calcularEpley1RM(melhorSerie.carga, melhorSerie.reps);
        const prev = strengthByExercise.get(ex.exercicioId);

        if (maxCarga > 0) {
          if (!prev || maxCarga > prev.valor || (maxCarga === prev.valor && epley > (prev.epley1RM || 0))) {
            strengthByExercise.set(ex.exercicioId, {
              id: `rec_${ex.exercicioId}_${s.id}`,
              exercicioId: ex.exercicioId,
              categoria: 'forca',
              nome: ex.nome,
              grupo: ex.grupo || s.grupoPrincipal || 'Força',
              tipo: 'carga',
              valor: maxCarga,
              reps: Number(melhorSerie.reps || 8),
              epley1RM: epley,
              valorTexto: `${fmtKgStore(maxCarga)} kg`,
              detalhe: `${feitas.length} × ${melhorSerie.reps} repetições${epley > 0 ? ` · 1RM est. ${fmtKgStore(epley)} kg` : ''}`,
              data: sDate,
              dataTexto: formatRelativeDateLabel(sDate),
              sessaoId: s.id,
              isDemo: Boolean(s.isDemo)
            });
          }
        } else if (!ex.porTempo && maxReps > 0) {
          if (!prev || maxReps > prev.valor) {
            strengthByExercise.set(ex.exercicioId, {
              id: `rec_${ex.exercicioId}_${s.id}`,
              exercicioId: ex.exercicioId,
              categoria: 'forca',
              nome: ex.nome,
              grupo: ex.grupo || s.grupoPrincipal || 'Força',
              tipo: 'reps',
              valor: maxReps,
              reps: maxReps,
              epley1RM: 0,
              valorTexto: `${maxReps} reps`,
              detalhe: `${feitas.length} ${feitas.length === 1 ? 'série completa' : 'séries completas'}`,
              data: sDate,
              dataTexto: formatRelativeDateLabel(sDate),
              sessaoId: s.id,
              isDemo: Boolean(s.isDemo)
            });
          }
        }
      });
    }
  }

  const runRecordsList = Object.values(runBests).filter(Boolean);
  const strengthRecordsList = Array.from(strengthByExercise.values()).sort(
    (a, b) => new Date(b.data) - new Date(a.data)
  );

  return [...runRecordsList, ...strengthRecordsList];
}

export function formatRelativeDateLabel(isoStr) {
  if (!isoStr) return 'Recente';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return 'Recente';
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays <= 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

export class LocalStorageAdapter {
  constructor(storageKey = STORAGE_KEY) {
    this.storageKey = storageKey;
    this.memoryFallback = createInitialState();
    this.warnedError = false;
  }

  load() {
    try {
      let raw = safeStorage.getItem(this.storageKey);
      if (!raw) {
        // B1: Lê clay_fit_store_v4 (ou anterior) sem apagá-la para mantê-la como backup
        for (const legacyKey of LEGACY_KEYS) {
          const legacyRaw = safeStorage.getItem(legacyKey);
          if (legacyRaw) {
            raw = legacyRaw;
            break;
          }
        }
      }
      if (!raw) {
        const initial = createInitialState();
        this.save(initial);
        return initial;
      }
      const parsed = JSON.parse(raw);
      const migrated = this.migrateIfNeeded(parsed);
      this.save(migrated);
      return migrated;
    } catch (e) {
      return { ...this.memoryFallback };
    }
  }

  save(state) {
    const nextState = {
      ...state,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString()
    };
    this.memoryFallback = nextState;
    try {
      safeStorage.setItem(this.storageKey, JSON.stringify(nextState));
    } catch (e) {
      // C7: Se exceder a cota do localStorage, simplifica rotas antigas com tolerância maior e tenta de novo
      try {
        const compacted = this.compactRoutesForQuota(nextState);
        safeStorage.setItem(this.storageKey, JSON.stringify(compacted));
        return compacted;
      } catch (_) {
        if (!this.warnedError && typeof document !== 'undefined') {
          this.warnedError = true;
          try {
            showToast({ message: 'Espaço curto no aparelho. Salvamos a versão compacta.' });
          } catch (_err) {}
        }
      }
    }
    return nextState;
  }

  compactRoutesForQuota(state) {
    if (!Array.isArray(state.sessoes)) return state;
    const sessoesCompactas = state.sessoes.map((s, idx) => {
      if (idx > 15 && s.rota && s.rota.polyline && !s.rota.compactadaQuota) {
        const pts = decodeRouteToTrack(s.rota.polyline, s.rota.temposB36 || '');
        if (pts.length > 150) {
          const { points } = capToMaxPoints(pts, 10, 800);
          const novaRota = encodeTrackToRoute(points, true, s.rota.pontosOriginais || pts.length);
          return { ...s, rota: { ...novaRota, compactadaQuota: true } };
        }
      }
      return s;
    });
    return { ...state, sessoes: sessoesCompactas };
  }

  clear() {
    const fresh = createInitialState();
    try {
      safeStorage.removeItem(RUN_BUFFER_KEY);
    } catch (_) {}
    this.save(fresh);
    return fresh;
  }

  migrateIfNeeded(savedState) {
    const base = createInitialState();
    if (!savedState || typeof savedState !== 'object') {
      return base;
    }

    const mergedPerfil = {
      ...base.perfil,
      ...(savedState.perfil || {}),
      incomodosRecentes: Array.isArray(savedState.perfil?.incomodosRecentes)
        ? savedState.perfil.incomodosRecentes
        : []
    };
    if (mergedPerfil.onboardingConcluido && mergedPerfil.etapaOnboarding !== 'concluido') {
      mergedPerfil.etapaOnboarding = 'concluido';
    }
    if (!['escuro', 'claro', 'automatico'].includes(mergedPerfil.tema)) {
      mergedPerfil.tema = 'escuro';
    }
    delete mergedPerfil.onboardingOitoPassos;
    if (
      !mergedPerfil.onboardingConcluido &&
      !savedState.perfil?.introVersao &&
      Number(savedState.perfil?.onboardingPassoAtual) === 7
    ) {
      mergedPerfil.onboardingPassoAtual = 8;
    }
    if (typeof mergedPerfil.vozEmCorrida !== 'boolean') mergedPerfil.vozEmCorrida = true;
    if (typeof mergedPerfil.pausaAutomaticaCorrida !== 'boolean') mergedPerfil.pausaAutomaticaCorrida = true;
    if (typeof mergedPerfil.mostrarRuasNoMapa !== 'boolean') mergedPerfil.mostrarRuasNoMapa = false;
    if (![0, 3, 5].includes(Number(mergedPerfil.contagemInicialCorrida))) {
      mergedPerfil.contagemInicialCorrida = 3;
    }

    const migratedSessoes = Array.isArray(savedState.sessoes)
      ? savedState.sessoes.map((s) => {
          const isCorrida = s.tipo === 'corrida' || s.grupoPrincipal === 'Corrida';
          const durSeg = Number(s.duracaoSeg || (s.duracaoMin ? s.duracaoMin * 60 : 0));
          const inicioISO = s.inicioISO || s.inicio || s.data || new Date().toISOString();
          const fimISO = s.fimISO || s.fim || s.data || null;
          const baseSessao = {
            status: 'concluida',
            tipo: isCorrida ? 'corrida' : 'forca',
            pausas: [],
            aquecimento: { feito: true },
            alongamento: { feito: false },
            exercicios: [],
            incomodo: [],
            recordes: [],
            volumeKg: Number(s.volumeKg ?? s.volumeTotalKg ?? 0),
            inicioISO,
            fimISO,
            sentimento: Number(s.sentimento ?? s.humor ?? 4),
            ...s
          };

          if (isCorrida) {
            const movSeg = Number(s.movimentoSeg || durSeg || 0);
            const distM = Number(s.distanciaM || (movSeg > 0 ? Math.round((movSeg / 330) * 1000) : 0));
            return {
              modo: s.modo || 'livre',
              meta: s.meta || { tipo: null, valor: null },
              ritmoAlvoSegKm: s.ritmoAlvoSegKm ?? null,
              intervalos: s.intervalos ?? null,
              movimentoSeg: movSeg,
              pausadoSeg: Number(s.pausadoSeg || 0),
              distanciaM: distM,
              ritmoMedioSegKm:
                s.ritmoMedioSegKm ?? (distM >= 50 && movSeg > 0 ? Math.round(movSeg / (distM / 1000)) : null),
              ritmoMelhorSegKm: s.ritmoMelhorSegKm ?? null,
              ganhoElevM: s.ganhoElevM ?? null,
              perdaElevM: s.perdaElevM ?? null,
              calorias: Number(s.calorias || estimateRunCalories(distM, mergedPerfil.pesoKg || 70)),
              parciais: Array.isArray(s.parciais) ? s.parciais : [],
              rota: s.rota || null,
              origem: s.origem || 'sem_gps',
              ...baseSessao,
              tipo: 'corrida'
            };
          }

          return baseSessao;
        })
      : [];

    const migratedRecordes = Array.isArray(savedState.recordes)
      ? savedState.recordes.map((r) => {
          const valNum = Number(r.valor);
          let vTexto =
            r.valorTexto ||
            (typeof r.valor === 'string'
              ? r.valor
              : Number.isFinite(valNum)
              ? `${fmtKgStore(valNum)} kg`
              : '');
          vTexto = String(vTexto).replace(/(\d+)\.(\d+)/g, '$1,$2');
          const det = String(r.detalhe || '').replace(/(\d+)\.(\d+)/g, '$1,$2');
          const isRunRec =
            r.categoria === 'corrida' ||
            String(r.tipo || '').startsWith('corrida_') ||
            String(r.exercicioId || '').startsWith('corrida');
          return {
            ...r,
            categoria: isRunRec ? 'corrida' : 'forca',
            tipo: r.tipo || 'carga',
            valorTexto: vTexto,
            detalhe: det
          };
        })
      : base.recordes;

    const migratedPesos = Array.isArray(savedState.pesos) ? savedState.pesos : [];

    return {
      ...base,
      ...savedState,
      perfil: mergedPerfil,
      hojeEstado: { ...base.hojeEstado, ...(savedState.hojeEstado || {}) },
      sessoes: migratedSessoes,
      recordes: migratedRecordes,
      pesos: migratedPesos,
      schemaVersion: SCHEMA_VERSION
    };
  }
}

export class SupabaseAdapterStub {
  constructor(config = {}) {
    this.config = config;
    this.localMirror = new LocalStorageAdapter();
  }
  load() {
    return this.localMirror.load();
  }
  save(state) {
    return this.localMirror.save(state);
  }
  clear() {
    return this.localMirror.clear();
  }
}

class ClayStore {
  constructor(adapter = new LocalStorageAdapter()) {
    this.adapter = adapter;
    this.state = this.adapter.load();
    this.listeners = new Set();
    this.checkDemoQueryParam();
  }

  checkDemoQueryParam() {
    try {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search || '');
      if (params.get('demo') === '1') {
        this.seedDemoData();
      }
      if (params.get('onboarding') === '1') {
        this.restartOnboarding();
      }
    } catch (e) {
      // Silencioso
    }
  }

  seedDemoData() {
    const demoSessoes = buildDemoSessions();
    const demoPesos = buildDemoPesos();
    const demoRecordes = recomputeAllRecordsFromSessions(demoSessoes);
    const hoje = new Date().toISOString().slice(0, 10);

    this.state = this.adapter.save({
      ...this.state,
      perfil: {
        ...this.state.perfil,
        nome:
          this.state.perfil.nome && this.state.perfil.nome !== 'Atleta'
            ? this.state.perfil.nome
            : 'Marina',
        objetivo: this.state.perfil.objetivo || 'Os dois: ferro e asfalto',
        nivel: this.state.perfil.nivel || 'Treino há alguns meses',
        diasSemana: [1, 2, 4, 6],
        tempoTreinoMin: 45,
        etapaOnboarding: 'concluido',
        onboardingConcluido: true,
        acompanharPeso: true,
        pesoKg: 68.3
      },
      checkins: [{ id: 'chk_demo', data: hoje, energia: 4, createdAt: new Date().toISOString() }],
      sessoes: demoSessoes,
      pesos: demoPesos,
      recordes: demoRecordes
    });
    this.notify('demo:seeded', this.state);
    return this.state;
  }

  useAdapter(newAdapter) {
    this.adapter = newAdapter;
    this.state = this.adapter.load();
    this.notify('adapter:changed');
  }

  getState() {
    return this.state;
  }

  getEntity(entityName) {
    return this.state[entityName];
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(action = 'state:updated', payload = null) {
    for (const listener of this.listeners) {
      try {
        listener(this.state, action, payload);
      } catch (err) {
        console.error('[ClayStore]', err);
      }
    }
  }

  updatePerfil(patch) {
    const nextPerfil = {
      ...this.state.perfil,
      ...patch
    };
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'introVersao') && !patch.introVersao) {
      delete nextPerfil.introVersao;
    }
    if (
      !nextPerfil.onboardingConcluido &&
      !nextPerfil.introVersao &&
      Number(nextPerfil.onboardingPassoAtual) === 7
    ) {
      nextPerfil.onboardingPassoAtual = 8;
    }
    this.state = this.adapter.save({
      ...this.state,
      perfil: nextPerfil
    });
    this.notify('perfil:updated', this.state.perfil);
    return this.state.perfil;
  }

  updateHojeEstado(patch) {
    this.state = this.adapter.save({
      ...this.state,
      hojeEstado: {
        ...this.state.hojeEstado,
        ...patch
      }
    });
    this.notify('hoje:updated', this.state.hojeEstado);
    return this.state.hojeEstado;
  }

  saveCheckin(checkinData) {
    const hoje = new Date().toISOString().slice(0, 10);
    const entry = {
      id: checkinData.id || `chk_${Date.now()}`,
      data: checkinData.data || hoje,
      energia: Number(checkinData.energia ?? 4),
      createdAt: new Date().toISOString()
    };

    const outros = this.state.checkins.filter((c) => c.data !== entry.data);
    this.state = this.adapter.save({
      ...this.state,
      checkins: [entry, ...outros],
      hojeEstado: {
        ...this.state.hojeEstado,
        hipoteseEscolhidaId: null,
        checkinExpandido: false
      }
    });
    this.notify('checkins:saved', entry);
    return entry;
  }

  getTodayCheckin() {
    const hoje = new Date().toISOString().slice(0, 10);
    return this.state.checkins.find((c) => c.data === hoje) || null;
  }

  addExtraExerciseToday(exercicioId) {
    const atuais = this.state.hojeEstado.exerciciosExtrasIds || [];
    if (atuais.includes(exercicioId)) return atuais;
    const next = [...atuais, exercicioId];
    this.updateHojeEstado({ exerciciosExtrasIds: next });
    return next;
  }

  /* ------------------------------------------------------------------------
   * B3 — BUFFER DE SEGURANÇA DA CORRIDA (`clay_fit_run_buffer`)
   * ------------------------------------------------------------------------ */

  salvarBufferCorrida(bufferData) {
    if (typeof window === 'undefined') return null;
    try {
      const payload = {
        ...bufferData,
        updatedAtMs: Date.now(),
        updatedAtISO: new Date().toISOString()
      };
      safeStorage.setItem(RUN_BUFFER_KEY, JSON.stringify(payload));
      return payload;
    } catch (_) {
      return null;
    }
  }

  lerBufferCorrida() {
    if (typeof window === 'undefined') return null;
    try {
      const raw = safeStorage.getItem(RUN_BUFFER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const ageMs = Date.now() - Number(parsed.updatedAtMs || 0);
      // B3: Somente válido se tiver menos de 12 horas
      if (ageMs > 12 * 3600 * 1000) {
        safeStorage.removeItem(RUN_BUFFER_KEY);
        return null;
      }
      return parsed;
    } catch (_) {
      return null;
    }
  }

  limparBufferCorrida() {
    if (typeof window === 'undefined') return;
    try {
      safeStorage.removeItem(RUN_BUFFER_KEY);
    } catch (_) {}
  }

  /* ------------------------------------------------------------------------
   * B2 & B3 — FUNÇÕES DE SESSÃO AO VIVO (FORÇA E CORRIDA)
   * ------------------------------------------------------------------------ */

  criarSessao(dados = {}) {
    const nowIso = new Date().toISOString();
    const isCorrida = dados.tipo === 'corrida' || dados.grupoPrincipal === 'Corrida';

    const novaSessao = {
      id: dados.id || `ses_${Date.now()}`,
      data: dados.data || nowIso,
      treinoId: dados.treinoId || (isCorrida ? 'corrida_livre' : 'hip_a'),
      nome: dados.nome || (isCorrida ? 'Corrida ao vivo' : 'Treino do dia'),
      grupoPrincipal: isCorrida ? 'Corrida' : dados.grupoPrincipal || 'Peito',
      grupoSecundario: dados.grupoSecundario || null,
      tipo: isCorrida ? 'corrida' : 'forca',
      status: 'andamento',
      inicio: dados.inicio || nowIso,
      fim: null,
      inicioISO: dados.inicioISO || dados.inicio || nowIso,
      fimISO: null,
      duracaoSeg: Number(dados.duracaoSeg || 0),
      movimentoSeg: Number(dados.movimentoSeg || 0),
      pausadoSeg: Number(dados.pausadoSeg || 0),
      distanciaM: Number(dados.distanciaM || 0),
      ritmoMedioSegKm: dados.ritmoMedioSegKm ?? null,
      ritmoMelhorSegKm: dados.ritmoMelhorSegKm ?? null,
      ganhoElevM: dados.ganhoElevM ?? null,
      perdaElevM: dados.perdaElevM ?? null,
      calorias: Number(dados.calorias || 0),
      modo: dados.modo || 'livre',
      meta: dados.meta || { tipo: null, valor: null },
      ritmoAlvoSegKm: dados.ritmoAlvoSegKm ?? null,
      intervalos: dados.intervalos ?? null,
      parciais: Array.isArray(dados.parciais) ? dados.parciais : [],
      rota: dados.rota || null,
      origem: dados.origem || 'gps',
      pausas: Array.isArray(dados.pausas) ? dados.pausas : [],
      aquecimento: dados.aquecimento || {
        feito: false,
        indiceMovimento: 0,
        duracaoPorMovSeg: Number(dados.aquecimentoDuracaoPorMovSeg || 30),
        movimentos: dados.aquecimentoMovimentos || []
      },
      alongamento: dados.alongamento || {
        feito: false,
        indiceMovimento: 0,
        movimentos: dados.alongamentoMovimentos || []
      },
      exercicios: Array.isArray(dados.exercicios) ? dados.exercicios : [],
      humor: Number(dados.humor || 4),
      sentimento: dados.sentimento ?? null,
      incomodo: Array.isArray(dados.incomodo) ? dados.incomodo : [],
      volumeKg: Number(dados.volumeKg || 0),
      recordes: [],
      maquinaEstado: dados.maquinaEstado || {
        fase: isCorrida ? 'preparando' : 'PRE',
        faseAnteriorPausa: null,
        exercicioIdx: 0,
        serieIdx: 0,
        descansoFimMs: null,
        descansoTotalSeg: 60,
        ultimoTimestampAtivo: Date.now()
      }
    };

    const sessoesExistentes = (this.state.sessoes || []).map((s) =>
      s.status === 'andamento' || s.status === 'pausada'
        ? { ...s, status: 'descartada' }
        : s
    );

    this.state = this.adapter.save({
      ...this.state,
      sessoes: [novaSessao, ...sessoesExistentes]
    });
    this.notify('sessao:criada', novaSessao);
    return novaSessao;
  }

  atualizarSessao(sessaoIdOrPatch, maybePatch = null) {
    let targetId = sessaoIdOrPatch;
    let patch = maybePatch;

    if (typeof sessaoIdOrPatch === 'object' && sessaoIdOrPatch !== null) {
      const aberta = this.sessaoEmAndamento();
      targetId = sessaoIdOrPatch.id || aberta?.id;
      patch = sessaoIdOrPatch;
    }

    if (!targetId || !patch) return null;

    let updatedSession = null;
    const novasSessoes = (this.state.sessoes || []).map((s) => {
      if (s.id !== targetId) return s;
      updatedSession = {
        ...s,
        ...patch,
        maquinaEstado: patch.maquinaEstado
          ? { ...(s.maquinaEstado || {}), ...patch.maquinaEstado }
          : s.maquinaEstado,
        aquecimento: patch.aquecimento
          ? { ...(s.aquecimento || {}), ...patch.aquecimento }
          : s.aquecimento,
        alongamento: patch.alongamento
          ? { ...(s.alongamento || {}), ...patch.alongamento }
          : s.alongamento
      };
      return updatedSession;
    });

    if (updatedSession) {
      this.state = this.adapter.save({
        ...this.state,
        sessoes: novasSessoes
      });
      this.notify('sessao:atualizada', updatedSession);
    }
    return updatedSession;
  }

  finalizarSessao(sessaoId, extras = {}) {
    const sessoes = this.state.sessoes || [];
    const target =
      sessoes.find((s) => s.id === sessaoId) ||
      this.sessaoEmAndamento() ||
      sessoes[0];
    if (!target) return null;

    const nowIso = new Date().toISOString();
    const isCorrida = (extras.tipo || target.tipo) === 'corrida';
    const exercicios = extras.exercicios || target.exercicios || [];

    let volumeTotal = 0;
    let totalSeriesFeitas = 0;
    exercicios.forEach((ex) => {
      (ex.series || []).forEach((s) => {
        if (s.feita && !s.pulada) {
          totalSeriesFeitas += 1;
          const c = Number(s.carga || 0);
          const r = Number(s.reps || 0);
          if (c > 0 && r > 0 && !ex.porTempo) {
            volumeTotal += c * r;
          }
        }
      });
    });

    const inicioMs = new Date(target.inicioISO || target.inicio || nowIso).getTime();
    const fimMs = Date.now();
    const pausas = extras.pausas || target.pausas || [];
    const totalPausaMs = pausas.reduce((acc, p) => {
      const de = new Date(p.de || fimMs).getTime();
      const ate = new Date(p.ate || fimMs).getTime();
      return acc + Math.max(0, ate - de);
    }, 0);

    const duracaoAtivaCalculada = Math.max(
      1,
      Math.round((fimMs - inicioMs - totalPausaMs) / 1000)
    );
    const duracaoSegFinal = Number(
      extras.duracaoSeg ?? target.duracaoSeg ?? duracaoAtivaCalculada
    );
    const movimentoSegFinal = Number(
      extras.movimentoSeg ?? target.movimentoSeg ?? duracaoSegFinal
    );
    const pausadoSegFinal = Number(
      extras.pausadoSeg ?? target.pausadoSeg ?? Math.round(totalPausaMs / 1000)
    );
    const duracaoMinFinal = Math.max(1, Math.round(movimentoSegFinal / 60));

    const distanciaMFinal = Number(extras.distanciaM ?? target.distanciaM ?? 0);
    const ritmoMedioFinal =
      extras.ritmoMedioSegKm !== undefined
        ? extras.ritmoMedioSegKm
        : distanciaMFinal >= 50 && movimentoSegFinal > 0
        ? Math.round(movimentoSegFinal / (distanciaMFinal / 1000))
        : target.ritmoMedioSegKm ?? null;

    const caloriasFinal = isCorrida
      ? Number(
          extras.calorias ||
            target.calorias ||
            estimateRunCalories(distanciaMFinal, this.state.perfil?.pesoKg || 70)
        )
      : Number(extras.calorias || target.calorias || 0);

    const humorFinal = Number(extras.sentimento ?? extras.humor ?? target.sentimento ?? target.humor ?? 4);
    const incomodoFinal = Array.isArray(extras.incomodo)
      ? extras.incomodo
      : Array.isArray(target.incomodo)
      ? target.incomodo
      : [];

    // Avalia recordes comparando contra sessões anteriores não-demo (e demo se em modo demo)
    const sessoesConcluidasAnteriores = sessoes.filter(
      (s) => s.id !== target.id && s.status === 'concluida'
    );
    const recordesAntes = recomputeAllRecordsFromSessions(sessoesConcluidasAnteriores);

    const sessaoProvisoria = {
      ...target,
      ...extras,
      isDemo: false,
      status: 'concluida',
      fim: nowIso,
      fimISO: nowIso,
      data: nowIso,
      diaSemana: new Date().getDay(),
      duracaoSeg: duracaoSegFinal,
      movimentoSeg: movimentoSegFinal,
      pausadoSeg: pausadoSegFinal,
      duracaoMin: duracaoMinFinal,
      distanciaM: distanciaMFinal,
      ritmoMedioSegKm: ritmoMedioFinal,
      calorias: caloriasFinal,
      volumeKg: volumeTotal,
      volumeTotalKg: volumeTotal,
      totalSeriesFeitas,
      humor: humorFinal,
      sentimento: humorFinal,
      incomodo: incomodoFinal,
      todasSeriesCompletas: exercicios.every((ex) =>
        (ex.series || []).every((s) => s.feita && !s.pulada)
      )
    };

    const outrasSessoes = sessoes.filter((s) => s.id !== target.id);
    const todasConcluidasAgora = [sessaoProvisoria, ...outrasSessoes];
    const recordesDepois = recomputeAllRecordsFromSessions(todasConcluidasAgora);

    // Identifica quais recordes pertencem a esta sessão recém-finalizada
    const novosRecordes = recordesDepois.filter((r) => r.sessaoId === target.id);

    // Preserva incômodos recentes por 7 dias no perfil
    const incomodosValidos = incomodoFinal.filter((i) => i && i !== 'Nenhum');
    let incomodosRecentes = Array.isArray(this.state.perfil.incomodosRecentes)
      ? [...this.state.perfil.incomodosRecentes]
      : [];
    if (incomodosValidos.length > 0) {
      const ateIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      incomodosValidos.forEach((regiao) => {
        incomodosRecentes = incomodosRecentes.filter((r) => r.regiao !== regiao);
        incomodosRecentes.push({
          regiao,
          data: nowIso,
          ate: ateIso
        });
      });
    }

    const sessaoFinalizada = {
      ...sessaoProvisoria,
      recordes: novosRecordes.length > 0 ? novosRecordes : extras.recordes || []
    };

    if (isCorrida) {
      this.limparBufferCorrida();
    }

    this.state = this.adapter.save({
      ...this.state,
      perfil: {
        ...this.state.perfil,
        incomodosRecentes
      },
      hojeEstado: {
        ...this.state.hojeEstado,
        animarCheckHoje: true
      },
      sessoes: [sessaoFinalizada, ...outrasSessoes.filter((s) => !String(s.id || '').startsWith('ses_seed_'))],
      recordes: recordesDepois.length > 0 ? recordesDepois : recordesAntes
    });

    this.notify('sessao:finalizada', sessaoFinalizada);
    return sessaoFinalizada;
  }

  isDemoModeActive() {
    try {
      if (typeof window === 'undefined') return false;
      return new URLSearchParams(window.location.search || '').get('demo') === '1';
    } catch (_) {
      return false;
    }
  }

  descartarSessao(sessaoId) {
    const targetId = sessaoId || this.sessaoEmAndamento()?.id;
    if (!targetId) return null;

    const target = (this.state.sessoes || []).find((s) => s.id === targetId);
    if (target?.tipo === 'corrida') {
      this.limparBufferCorrida();
    }

    const novasSessoes = (this.state.sessoes || []).filter((s) => s.id !== targetId);
    this.state = this.adapter.save({
      ...this.state,
      sessoes: novasSessoes
    });
    this.notify('sessao:descartada', { id: targetId });
    return true;
  }

  /**
   * D4.2 & B4 — Exclui qualquer sessão concluída ou em andamento, recalculando
   * recordes e agregados imediatamente.
   */
  excluirSessao(sessaoId) {
    if (!sessaoId) return false;
    const novasSessoes = (this.state.sessoes || []).filter((s) => s.id !== sessaoId);
    const novosRecordes = recomputeAllRecordsFromSessions(novasSessoes);

    this.state = this.adapter.save({
      ...this.state,
      sessoes: novasSessoes,
      recordes: novosRecordes
    });
    this.notify('sessao:excluida', { id: sessaoId });
    return true;
  }

  sessaoEmAndamento() {
    const sessoes = this.state.sessoes || [];
    return (
      sessoes.find(
        (s) => !s.isDemo && (s.status === 'andamento' || s.status === 'pausada')
      ) || null
    );
  }

  ultimaCargaDoExercicio(exercicioId) {
    if (!exercicioId) return null;
    const concluidas = (this.state.sessoes || []).filter(
      (s) => s.status === 'concluida' && Array.isArray(s.exercicios)
    );
    for (const s of concluidas) {
      const ex = s.exercicios.find(
        (e) => e.exercicioId === exercicioId || e.id === exercicioId
      );
      if (ex && Array.isArray(ex.series)) {
        const feitas = ex.series.filter((sr) => sr.feita && !sr.pulada);
        if (feitas.length > 0) {
          const melhor = feitas.reduce(
            (best, cur) => (Number(cur.carga || 0) >= Number(best.carga || 0) ? cur : best),
            feitas[0]
          );
          return {
            carga: Number(melhor.carga || 0),
            reps: Number(melhor.reps || 10),
            data: s.fim || s.data
          };
        }
      }
    }
    return null;
  }

  listarRecordes() {
    return this.state.recordes || [];
  }

  /* ------------------------------------------------------------------------
   * B4 & D1.5 — PESO CORPORAL OPCIONAL
   * ------------------------------------------------------------------------ */

  registrarPeso(kg) {
    const num = Math.round(Number(kg || 0) * 10) / 10;
    if (!Number.isFinite(num) || num < 25 || num > 260) return null;
    const hojeDia = new Date().toISOString().slice(0, 10);
    const entry = {
      dataISO: new Date().toISOString(),
      kg: num
    };
    const existentes = Array.isArray(this.state.pesos) ? this.state.pesos : [];
    const semHoje = existentes.filter((p) => String(p.dataISO || '').slice(0, 10) !== hojeDia);
    const novosPesos = [...semHoje, entry].sort(
      (a, b) => new Date(a.dataISO) - new Date(b.dataISO)
    );

    this.state = this.adapter.save({
      ...this.state,
      perfil: {
        ...this.state.perfil,
        pesoKg: num,
        acompanharPeso: true
      },
      pesos: novosPesos
    });
    this.notify('peso:registrado', entry);
    return entry;
  }

  listarPesos() {
    return Array.isArray(this.state.pesos) ? this.state.pesos : [];
  }

  /* ------------------------------------------------------------------------
   * B4 — FUNÇÕES AGREGADORAS PARA A EVOLUÇÃO
   * ------------------------------------------------------------------------ */

  /**
   * Devolve o início (Segunda-feira 00:00) e fim (Domingo 23:59:59) da semana ISO
   * correspondente a `semanaOffset` (0 = semana atual, -1 ou 1 = semana anterior).
   */
  _getWeekBounds(semanaOffset = 0) {
    const backWeeks = Math.abs(Number(semanaOffset || 0));
    const now = new Date();
    const day = now.getDay(); // 0=Dom, 1=Seg...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() + diffToMonday - backWeeks * 7);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }

  /**
   * B4: `store.agregadosSemana(semanaOffset = 0)`
   * → `{ sessoes, forcaCount, corridaCount, minutos, volumeKg, distanciaM, diasAtivos: [bool×7] }`
   * Nota: `diasAtivos` mapeia Seg..Dom (índices 0..6).
   */
  agregadosSemana(semanaOffset = 0) {
    const { start, end } = this._getWeekBounds(semanaOffset);
    const concluidas = (this.state.sessoes || []).filter((s) => {
      if (s.status !== 'concluida') return false;
      const t = new Date(s.fim || s.data || s.inicio).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });

    let forcaCount = 0;
    let corridaCount = 0;
    let minutos = 0;
    let volumeKg = 0;
    let distanciaM = 0;
    const diasAtivos = [false, false, false, false, false, false, false]; // Seg..Dom

    concluidas.forEach((s) => {
      if (s.tipo === 'corrida') {
        corridaCount += 1;
        distanciaM += Number(s.distanciaM || 0);
      } else {
        forcaCount += 1;
        volumeKg += Number(s.volumeKg ?? s.volumeTotalKg ?? 0);
      }
      const seg = Number(s.movimentoSeg || s.duracaoSeg || (s.duracaoMin ? s.duracaoMin * 60 : 0));
      minutos += Math.max(1, Math.round(seg / 60));

      const d = new Date(s.fim || s.data || s.inicio);
      const jsDay = d.getDay(); // 0=Dom..6=Sab
      const monIdx = jsDay === 0 ? 6 : jsDay - 1;
      diasAtivos[monIdx] = true;
    });

    return {
      inicioISO: start.toISOString(),
      fimISO: end.toISOString(),
      sessoes: concluidas.length,
      listaSessoes: concluidas,
      forcaCount,
      corridaCount,
      minutos: Math.round(minutos),
      volumeKg: Math.round(volumeKg),
      distanciaM: Math.round(distanciaM),
      diasAtivos
    };
  }

  /**
   * B4: `store.agregadosMes(mesOffset = 0)`
   * → `{ sessoes, minutos, volumeKg, distanciaM, recordesCount }`
   */
  agregadosMes(mesOffset = 0) {
    const backMonths = Math.abs(Number(mesOffset || 0));
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - backMonths, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() - backMonths + 1, 0, 23, 59, 59, 999);

    const concluidas = (this.state.sessoes || []).filter((s) => {
      if (s.status !== 'concluida') return false;
      const t = new Date(s.fim || s.data || s.inicio).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });

    let minutos = 0;
    let volumeKg = 0;
    let distanciaM = 0;

    concluidas.forEach((s) => {
      const seg = Number(s.movimentoSeg || s.duracaoSeg || (s.duracaoMin ? s.duracaoMin * 60 : 0));
      minutos += Math.max(1, Math.round(seg / 60));
      volumeKg += Number(s.volumeKg ?? s.volumeTotalKg ?? 0);
      distanciaM += Number(s.distanciaM || 0);
    });

    const recordesCount = (this.state.recordes || []).filter((r) => {
      const t = new Date(r.data || 0).getTime();
      return t >= start.getTime() && t <= end.getTime();
    }).length;

    return {
      sessoes: concluidas.length,
      minutos: Math.round(minutos),
      volumeKg: Math.round(volumeKg),
      distanciaM: Math.round(distanciaM),
      recordesCount
    };
  }

  /**
   * B4: `store.serieSemanal(tipo, nSemanas = 12)`
   * com `tipo` em `'sessoes' | 'volume' | 'distancia' | 'tempo'`.
   * Retorna da mais antiga para a semana atual.
   */
  serieSemanal(tipo = 'sessoes', nSemanas = 12) {
    const count = Math.max(1, Number(nSemanas || 12));
    const serie = [];

    for (let i = count - 1; i >= 0; i--) {
      const agg = this.agregadosSemana(i);
      const startDate = new Date(agg.inicioISO);
      const dia = String(startDate.getDate()).padStart(2, '0');
      const mes = String(startDate.getMonth() + 1).padStart(2, '0');

      let valor = 0;
      if (tipo === 'volume') {
        valor = agg.volumeKg;
      } else if (tipo === 'distancia') {
        valor = Math.round((agg.distanciaM / 1000) * 100) / 100; // km
      } else if (tipo === 'tempo') {
        valor = agg.minutos;
      } else {
        valor = agg.sessoes;
      }

      serie.push({
        semanaOffset: i,
        semanaLabel: i === 0 ? 'Agora' : `${dia}/${mes}`,
        inicioISO: agg.inicioISO,
        fimISO: agg.fimISO,
        valor,
        sessoesCount: agg.sessoes,
        forcaCount: agg.forcaCount,
        corridaCount: agg.corridaCount,
        minutos: agg.minutos,
        volumeKg: agg.volumeKg,
        distanciaM: agg.distanciaM,
        isAtual: i === 0
      });
    }

    return serie;
  }

  restartOnboarding() {
    this.updatePerfil({
      onboardingConcluido: false,
      etapaOnboarding: 'questionario',
      onboardingPassoAtual: 1,
      introVersao: 2
    });
  }

  resetAll() {
    this.state = this.adapter.clear();
    this.notify('store:reset');
    return this.state;
  }
}

export const store = new ClayStore();
if (typeof window !== 'undefined') {
  window.clayStore = store;
}
export default store;
