/**
 * ============================================================================
 * CLAY FIT — PLANEJADOR DIÁRIO DE TREINO, SESSÃO AO VIVO E MOTIVO GRAMATICAL
 * /js/engine/planner.js
 *
 * Correções e Especificações Prompt 3 (A3 e B4):
 * - A3: `WORKOUT_TEMPLATES` usa `grupoPrincipal` exato ('Peito', 'Costas',
 *   'Ombros', 'Braços', 'Pernas', 'Core', 'Corrida', 'Mobilidade') e `grupoSecundario`
 *   para o selo de treinos mistos (ex.: "Peito e tríceps" -> selo "Tríceps").
 * - B4: `buildSession(treino, perfil, checkin, historico)` monta a lista de
 *   exercícios com séries, repetições, cargas sugeridas e descanso:
 *   • Força/ganho de massa: compostos 4 × 6–8 (8), descanso 90s; isoladores 3 × 10–12 (10), descanso 60s.
 *   • Iniciante (qualquer objetivo): 3 × 10, descanso 75s, máx. 5 exercícios em 30 min.
 *   • Perder gordura: 3 × 12–15 (12), descanso 45s.
 *   • Core e mobilidade: 2 a 3 séries por tempo (30–45s), descanso 20s.
 *   • Quantidade de exercícios pelo tempo: 20 min -> 4, 30 min -> 5, 45 min -> 6, 60 min -> 8.
 *   • Respeita cuidados do perfil e incômodos dos últimos 7 dias.
 * ============================================================================
 */

import { STRENGTH_EXERCISES, RUN_WORKOUTS } from './catalog.js';
const PLANNER_STRENGTH_EXERCISES = STRENGTH_EXERCISES.filter((ex) => !ex.noPlano);
import { adaptPlan as adaptPlanImpl, getActiveDiscomforts } from './adapt.js';
import { suggestLoad as suggestLoadImpl } from './progression.js';

const GRUPO_GRAMATICA = {
  Ombros: { possessivo: 'seus ombros', plural: true },
  Peito: { possessivo: 'seu peito', plural: false },
  Costas: { possessivo: 'suas costas', plural: true },
  Pernas: { possessivo: 'suas pernas', plural: true },
  Braços: { possessivo: 'seus braços', plural: true },
  Core: { possessivo: 'seu core', plural: false },
  Corrida: { possessivo: 'suas pernas', plural: true },
  Mobilidade: { possessivo: 'seu corpo', plural: false }
};

const CUIDADO_GRAMATICA = {
  Joelho: 'seu joelho',
  Ombro: 'seu ombro',
  Lombar: 'sua lombar',
  'Coluna lombar': 'sua lombar'
};

/**
 * 1.4 Função pura que constrói a frase gramaticalmente perfeita do motivo do treino.
 */
export function motivoDoTreino(grupo = 'Peito', diasDescanso = 2, cuidados = [], jaTreinou = true) {
  if (!jaTreinou) {
    return 'Escolhi este treino para começar com calma e conhecer o seu ritmo.';
  }

  const info = GRUPO_GRAMATICA[grupo] || GRUPO_GRAMATICA.Peito;
  const verbo = info.plural ? 'descansaram' : 'descansou';
  const n = Math.max(0, Math.round(Number(diasDescanso ?? 2)));
  const diasTexto = n === 1 ? '1 dia' : `${n} dias`;

  const listaCuidados = Array.isArray(cuidados)
    ? cuidados.filter((c) => c && c !== 'Nenhum' && CUIDADO_GRAMATICA[c])
    : typeof cuidados === 'string' && CUIDADO_GRAMATICA[cuidados]
    ? [cuidados]
    : [];

  const sufixoCuidado =
    listaCuidados.length > 0
      ? ` e protegemos ${listaCuidados.map((c) => CUIDADO_GRAMATICA[c]).join(' e ')}`
      : '';

  return `Escolhi este treino porque ${info.possessivo} ${verbo} ${diasTexto}${sufixoCuidado}.`;
}

export const WORKOUT_TEMPLATES = {
  peito: {
    chave: 'peito',
    nome: 'Peito e tríceps',
    nomeCurto: 'Peito',
    grupoPrincipal: 'Peito',
    grupoSecundario: 'Tríceps',
    gruposIncluidos: ['Peito', 'Braços'],
    tipoIlustracao: 'Peito',
    paletaShader: 'TERRACOTA'
  },
  costas: {
    chave: 'costas',
    nome: 'Costas e bíceps',
    nomeCurto: 'Costas',
    grupoPrincipal: 'Costas',
    grupoSecundario: 'Bíceps',
    gruposIncluidos: ['Costas', 'Braços'],
    tipoIlustracao: 'Costas',
    paletaShader: 'SALVIA'
  },
  pernas: {
    chave: 'pernas',
    nome: 'Pernas e core',
    nomeCurto: 'Pernas',
    grupoPrincipal: 'Pernas',
    grupoSecundario: 'Core',
    gruposIncluidos: ['Pernas', 'Core'],
    tipoIlustracao: 'Pernas',
    paletaShader: 'CLARA'
  },
  ombros: {
    chave: 'ombros',
    nome: 'Ombros e estabilidade',
    nomeCurto: 'Ombros',
    grupoPrincipal: 'Ombros',
    grupoSecundario: 'Core',
    gruposIncluidos: ['Ombros', 'Core'],
    tipoIlustracao: 'Ombros',
    paletaShader: 'TERRACOTA'
  },
  bracos: {
    chave: 'bracos',
    nome: 'Braços e ombros',
    nomeCurto: 'Braços',
    grupoPrincipal: 'Braços',
    grupoSecundario: 'Ombros',
    gruposIncluidos: ['Braços', 'Ombros'],
    tipoIlustracao: 'Braços',
    paletaShader: 'TERRACOTA'
  },
  core: {
    chave: 'core',
    nome: 'Core e estabilidade',
    nomeCurto: 'Core',
    grupoPrincipal: 'Core',
    grupoSecundario: 'Mobilidade',
    gruposIncluidos: ['Core', 'Mobilidade'],
    tipoIlustracao: 'Core',
    paletaShader: 'SALVIA'
  },
  corrida: {
    chave: 'corrida',
    nome: 'Corrida ritmada',
    nomeCurto: 'Corrida',
    grupoPrincipal: 'Corrida',
    grupoSecundario: null,
    gruposIncluidos: ['Corrida', 'Core'],
    tipoIlustracao: 'Corrida',
    paletaShader: 'SALVIA'
  },
  descanso: {
    chave: 'descanso',
    nome: 'Recuperação e mobilidade',
    nomeCurto: 'Mobilidade',
    grupoPrincipal: 'Mobilidade',
    grupoSecundario: null,
    gruposIncluidos: ['Mobilidade', 'Core'],
    tipoIlustracao: 'Mobilidade',
    paletaShader: 'SALVIA'
  }
};

/**
 * Quantidade de exercícios pelo tempo escolhido (B4):
 * 20 min -> 4, 30 min -> 5, 45 min -> 6, 60 min -> 8
 */
export function getExerciseCountForDuration(tempoMin = 45, isIniciante = false) {
  const t = Number(tempoMin || 45);
  if (t <= 20) return 4;
  if (t <= 30) return 5;
  if (t <= 45) return 6;
  return isIniciante ? 6 : 8;
}

/**
 * Calcula séries, repetições/tempo e descanso para um exercício segundo o perfil e o humor (B4).
 */
export function getPrescriptionForExercise(ex, perfil = {}, checkin = null, reduceVolume = false) {
  const nivelStr = String(perfil?.nivel || '').toLowerCase();
  const objStr = String(perfil?.objetivo || '').toLowerCase();
  const isIniciante = nivelStr.includes('começando') || nivelStr.includes('iniciante');
  const isPerderGordura = objStr.includes('gordura');
  const energia = Number(checkin?.energia ?? 4);
  const humorBaixo = energia === 1 || energia === 2 || reduceVolume;

  const isCoreOrMob = ex.grupo === 'Core' || ex.grupo === 'Mobilidade';
  const isComposto = Boolean(ex.composto);

  let numSeries = 3;
  let alvoReps = 10;
  let descansoSeg = 60;
  let porTempo = Boolean(ex.porTempo);
  let duracaoSerieSeg = Number(ex.duracaoSerieSeg || 35);

  if (isCoreOrMob) {
    numSeries = humorBaixo ? 2 : 3;
    porTempo = Boolean(ex.porTempo);
    alvoReps = porTempo ? duracaoSerieSeg : 12;
    descansoSeg = Number(ex.descansoSeg ?? 20);
  } else if (porTempo) {
    const isCardioContinuo = duracaoSerieSeg >= 600 || Number(ex.descansoSeg) === 0;
    numSeries = isCardioContinuo ? 1 : humorBaixo ? 2 : 3;
    alvoReps = duracaoSerieSeg;
    descansoSeg = Number(ex.descansoSeg ?? 40);
  } else if (isIniciante) {
    numSeries = 3;
    alvoReps = 10;
    descansoSeg = 75;
  } else if (isPerderGordura) {
    numSeries = 3;
    alvoReps = 12;
    descansoSeg = 45;
  } else {
    // Força / ganho de massa / ferro e asfalto
    if (isComposto) {
      numSeries = 4;
      alvoReps = 8;
      descansoSeg = 90;
    } else {
      numSeries = 3;
      alvoReps = 10;
      descansoSeg = 60;
    }
  }

  // Adaptação B4 / adapt.js: se humor for 1 ou 2 (ou versão leve), reduz 1 série de cada composto e sobe descanso em 15s
  if (humorBaixo) {
    if (isComposto) {
      numSeries = Math.max(2, numSeries - 1);
    }
    descansoSeg += 15;
  }

  const seriesTexto = porTempo
    ? duracaoSerieSeg >= 600 && ex.seriesPadrao
      ? ex.seriesPadrao
      : descansoSeg > 0
      ? `${numSeries} × ${duracaoSerieSeg} s · descanso ${descansoSeg} s`
      : `${numSeries} × ${duracaoSerieSeg} s`
    : `${numSeries} × ${alvoReps} · descanso ${descansoSeg} s`;

  return {
    numSeries,
    alvoReps,
    porTempo,
    duracaoSerieSeg,
    descansoSeg,
    seriesTexto
  };
}

export function buildWeeklySchedule(perfil = {}) {
  const diasAtivos =
    Array.isArray(perfil.diasSemana) && perfil.diasSemana.length >= 2
      ? perfil.diasSemana
      : [1, 2, 4, 5];

  const obj = perfil.objetivo || 'Os dois: ferro e asfalto';
  let rotacao = ['peito', 'pernas', 'costas', 'corrida', 'ombros', 'corrida'];

  if (obj === 'Mais força e músculo') {
    rotacao = ['peito', 'pernas', 'costas', 'ombros', 'peito', 'pernas'];
  } else if (obj === 'Correr mais e melhor') {
    rotacao = ['corrida', 'pernas', 'corrida', 'costas', 'corrida', 'corrida'];
  } else if (obj === 'Perder gordura com saúde') {
    rotacao = ['pernas', 'corrida', 'peito', 'corrida', 'costas', 'corrida'];
  }

  const labelsDias = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const nomesDias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  let idxTreino = 0;

  return labelsDias.map((letra, diaIndex) => {
    const ativo = diasAtivos.includes(diaIndex);
    if (!ativo) {
      return {
        diaIndex,
        letra,
        nomeDia: nomesDias[diaIndex],
        ativo: false,
        templateChave: 'descanso',
        nomeCurto: 'Livre',
        nomeTreino: 'Dia de recuperação'
      };
    }
    const chave = rotacao[idxTreino % rotacao.length];
    idxTreino += 1;
    const tpl = WORKOUT_TEMPLATES[chave] || WORKOUT_TEMPLATES.peito;
    return {
      diaIndex,
      letra,
      nomeDia: nomesDias[diaIndex],
      ativo: true,
      templateChave: tpl.chave,
      nomeCurto: tpl.nomeCurto,
      nomeTreino: tpl.nome
    };
  });
}

function selectExercisesForTemplate(
  template,
  perfil,
  targetCount = 6,
  reduceVolume = false,
  checkin = null,
  historico = []
) {
  const cuidadosAtivos = getActiveDiscomforts(perfil, historico);
  const locais =
    Array.isArray(perfil?.locais) && perfil.locais.length > 0
      ? perfil.locais
      : ['Academia completa'];

  if (template.chave === 'corrida') {
    const runs = RUN_WORKOUTS.filter((r) => !r.cuidado || !cuidadosAtivos.includes(r.cuidado));
    const mainRun = runs[0] || RUN_WORKOUTS[0];
    const coreComplement = PLANNER_STRENGTH_EXERCISES.filter((e) => e.grupo === 'Core').slice(
      0,
      reduceVolume ? 2 : 3
    );
    return [mainRun, ...coreComplement].map((ex, i) => {
      const presc = getPrescriptionForExercise(ex, perfil, checkin, reduceVolume);
      return {
        ...ex,
        ordem: i + 1,
        ...presc,
        seriesTexto:
          ex.grupo === 'Corrida'
            ? `${ex.duracaoMin || 30} min · Ritmo contínuo`
            : presc.seriesTexto
      };
    });
  }

  let pool = PLANNER_STRENGTH_EXERCISES.filter((ex) =>
    template.gruposIncluidos.includes(ex.grupo)
  );
  pool = pool.filter((ex) => !ex.cuidado || !cuidadosAtivos.includes(ex.cuidado));

  // Se o filtro de cuidados deixou poucos itens, complementa com exercícios seguros de Core/Mobilidade/Costas
  if (pool.length < targetCount) {
    const safeExtra = PLANNER_STRENGTH_EXERCISES.filter(
      (ex) =>
        !pool.some((p) => p.id === ex.id) &&
        (!ex.cuidado || ex.cuidado === 'Nenhum' || !cuidadosAtivos.includes(ex.cuidado)) &&
        ex.grupo !== 'Mobilidade'
    );
    pool = [...pool, ...safeExtra];
  }

  const localMatches = pool.filter(
    (ex) => locais.includes(ex.equipamento) || ex.equipamento === 'Em casa só com o corpo'
  );
  const chosenPool = localMatches.length >= targetCount ? localMatches : pool;

  const count = reduceVolume ? Math.max(4, targetCount - 1) : targetCount;
  const selected = chosenPool.slice(0, count);

  return selected.map((ex, index) => {
    const presc = getPrescriptionForExercise(ex, perfil, checkin, reduceVolume);
    return {
      ...ex,
      ordem: index + 1,
      ...presc
    };
  });
}

/**
 * B4 — Monta o objeto de sessão completo a partir de um treino planejado e do perfil.
 * Retorna os exercícios com `series[]` populadas, cargas sugeridas pelo `progression.js`,
 * aquecimento de 4 movimentos de Mobilidade e alongamento de 3 movimentos.
 */
export function buildSession(treino = {}, perfil = {}, checkin = null, historico = []) {
  const nivelStr = String(perfil?.nivel || '').toLowerCase();
  const isIniciante = nivelStr.includes('começando') || nivelStr.includes('iniciante');
  const tempoMin = Number(treino.duracaoMin || perfil?.tempoTreinoMin || 45);
  const targetCount = getExerciseCountForDuration(tempoMin, isIniciante);

  let rawExercises = Array.isArray(treino.exercicios) && treino.exercicios.length > 0
    ? treino.exercicios
    : selectExercisesForTemplate(
        WORKOUT_TEMPLATES[treino.chave || 'peito'] || WORKOUT_TEMPLATES.peito,
        perfil,
        targetCount,
        false,
        checkin,
        historico
      );

  const isRunSession =
    treino.tipo === 'corrida' ||
    treino.grupoPrincipal === 'Corrida' ||
    (rawExercises[0] && rawExercises[0].grupo === 'Corrida');

  const exerciciosSessao = rawExercises.map((ex, idx) => {
    const presc = getPrescriptionForExercise(ex, perfil, checkin, false);
    const numSeries = Number(ex.numSeries || presc.numSeries || 3);
    const alvoReps = Number(ex.alvoReps || presc.alvoReps || 10);
    const descansoSeg = Number(ex.descansoSeg ?? presc.descansoSeg ?? 60);
    const porTempo = Boolean(ex.porTempo ?? presc.porTempo);
    const duracaoSerieSeg = Number(ex.duracaoSerieSeg || presc.duracaoSerieSeg || 35);

    const loadSuggestion = suggestLoadImpl(ex, historico, perfil);
    const cargaInicial = Number(loadSuggestion.carga ?? 0);

    const series = Array.from({ length: numSeries }, (_, sIdx) => ({
      n: sIdx + 1,
      alvoReps: porTempo ? duracaoSerieSeg : alvoReps,
      alvoCarga: cargaInicial,
      reps: porTempo ? duracaoSerieSeg : alvoReps,
      carga: cargaInicial,
      esforco: 'medio', // 'leve' | 'medio' | 'pesado'
      duracaoSeg: porTempo ? duracaoSerieSeg : 0,
      feita: false,
      pulada: false
    }));

    return {
      exercicioId: ex.id || ex.exercicioId || `ex_${idx + 1}`,
      nome: ex.nome,
      grupo: ex.grupo || treino.grupoPrincipal || 'Peito',
      equip: ex.equip || 'halteres',
      equipamento: ex.equipamento || 'Academia completa',
      composto: Boolean(ex.composto),
      porTempo,
      duracaoSerieSeg,
      passoCargaKg: Number(loadSuggestion.passo || ex.passoCargaKg || 1),
      isPesoCorpo: Boolean(loadSuggestion.isPesoCorpo),
      cargaSugerida: cargaInicial,
      motivoCarga: loadSuggestion.motivo,
      ultimaCarga: loadSuggestion.ultimaCarga,
      ultimaReps: loadSuggestion.ultimaReps,
      descansoSeg,
      comoFazer: ex.comoFazer || [],
      erroComum: ex.erroComum || (ex.errosComuns && ex.errosComuns[0]) || '',
      indice: idx,
      series
    };
  });

  // Seleciona os 4 movimentos de aquecimento do catálogo de Mobilidade conforme o grupo do dia (B7)
  const todosMob = PLANNER_STRENGTH_EXERCISES.filter((e) => e.grupo === 'Mobilidade');
  const grupoDia = treino.grupoPrincipal || 'Peito';
  let ordemRegioes = ['toracica', 'pescoco', 'coluna', 'quadril'];
  if (grupoDia === 'Pernas' || grupoDia === 'Corrida') {
    ordemRegioes = ['quadril', 'tornozelo', 'isquiotibiais', 'coluna'];
  } else if (grupoDia === 'Costas' || grupoDia === 'Core') {
    ordemRegioes = ['coluna', 'toracica', 'quadril', 'pescoco'];
  }
  const warmupMovements = ordemRegioes
    .map((reg) => todosMob.find((m) => m.regiao === reg))
    .filter(Boolean);
  while (warmupMovements.length < 4 && todosMob.length > 0) {
    warmupMovements.push(todosMob[warmupMovements.length % todosMob.length]);
  }

  const cooldownMovements = [
    todosMob.find((m) => m.regiao === 'coluna') || todosMob[0],
    todosMob.find((m) => m.regiao === 'quadril') || todosMob[2],
    todosMob.find((m) => m.regiao === 'isquiotibiais') || todosMob[3]
  ].filter(Boolean);

  return {
    treinoId: treino.id || 'hip_a',
    nome: treino.nome || 'Treino do dia',
    grupoPrincipal: treino.grupoPrincipal || 'Peito',
    grupoSecundario: treino.grupoSecundario || null,
    tipo: isRunSession ? 'corrida' : 'forca',
    duracaoEstimadaMin: tempoMin,
    aquecimentoDuracaoPorMovSeg: isIniciante ? 45 : 30,
    aquecimentoMovimentos: warmupMovements.slice(0, 4),
    alongamentoMovimentos: cooldownMovements.slice(0, 3),
    exercicios: exerciciosSessao
  };
}

function computeHoursSinceLastGroup(grupo, historico = []) {
  if (!Array.isArray(historico) || historico.length === 0) return 48;
  const match = historico.find((h) => h.grupoPrincipal === grupo || h.nome?.includes(grupo));
  if (!match || !match.data) return 48;
  const diffMs = Date.now() - new Date(match.data).getTime();
  const hours = Math.max(12, Math.min(48, diffMs / (1000 * 60 * 60)));
  return hours;
}

export function generateDailyWorkout(perfil = {}, checkin = null, historico = []) {
  const schedule = buildWeeklySchedule(perfil);
  const todayIdx = new Date().getDay();
  const todaySlot = schedule[todayIdx] || schedule[1];
  const plannedKey = todaySlot.ativo ? todaySlot.templateChave : 'peito';
  const tplA = WORKOUT_TEMPLATES[plannedKey] || WORKOUT_TEMPLATES.peito;

  const altKey =
    plannedKey === 'peito'
      ? 'pernas'
      : plannedKey === 'pernas'
      ? 'costas'
      : 'peito';
  const tplC = WORKOUT_TEMPLATES[altKey];

  const baseDuration = Number(perfil?.tempoTreinoMin || 45);
  const nivelStr = String(perfil?.nivel || '').toLowerCase();
  const isIniciante = nivelStr.includes('começando') || nivelStr.includes('iniciante');
  const baseExCount = getExerciseCountForDuration(baseDuration, isIniciante);
  const energia = Number(checkin?.energia ?? 4);
  const cuidados = getActiveDiscomforts(perfil, historico);

  const jaTreinou = Array.isArray(historico) && historico.length > 0;

  const prontidaoAlta = Math.min(1, Math.max(0.2, energia / 5));
  const prontidaoBaixa = energia <= 2 ? 1.0 : energia === 3 ? 0.65 : 0.35;

  const recHoursA = computeHoursSinceLastGroup(tplA.grupoPrincipal, historico);
  const recHoursC = computeHoursSinceLastGroup(tplC.grupoPrincipal, historico);
  const recNormA = Math.min(1, recHoursA / 48);
  const recNormC = Math.min(1, recHoursC / 48);

  const constanciaNorm = jaTreinou ? 0.85 : 0.5;
  const penalidadeCuidadoA =
    (cuidados.includes('Ombro') && (tplA.chave === 'peito' || tplA.chave === 'ombros')) ||
    (cuidados.includes('Joelho') && tplA.chave === 'pernas')
      ? 0.08
      : 0;

  const scoreA = Number(
    (
      0.35 * 1.0 +
      0.30 * prontidaoAlta +
      0.25 * recNormA +
      0.10 * constanciaNorm -
      penalidadeCuidadoA
    ).toFixed(3)
  );

  const scoreB = Number(
    (
      0.35 * (energia <= 2 ? 0.95 : 0.62) +
      0.30 * prontidaoBaixa +
      0.25 * recNormA +
      0.10 * constanciaNorm
    ).toFixed(3)
  );

  const scoreC = Number(
    (
      0.35 * 0.68 +
      0.30 * prontidaoAlta +
      0.25 * recNormC +
      0.10 * constanciaNorm
    ).toFixed(3)
  );

  const diasDescansoA = Math.max(1, Math.round(recHoursA / 24));
  const diasDescansoC = Math.max(1, Math.round(recHoursC / 24));

  const motivoA = motivoDoTreino(tplA.grupoPrincipal, diasDescansoA, cuidados, jaTreinou);
  const motivoC = motivoDoTreino(tplC.grupoPrincipal, diasDescansoC, cuidados, true);

  const duracaoB = Math.max(20, Math.round((baseDuration * 0.7) / 5) * 5);

  const hipoteses = [
    {
      id: 'hip_a',
      codigo: 'A',
      chave: tplA.chave,
      rotulo: 'Planejado',
      nome: tplA.nome,
      grupoPrincipal: tplA.grupoPrincipal,
      grupoSecundario: tplA.grupoSecundario,
      tipoIlustracao: tplA.grupoPrincipal,
      paletaShader: tplA.paletaShader,
      duracaoMin: baseDuration,
      intensidadeTexto: energia >= 4 ? 'Intensidade firme' : 'Intensidade moderada',
      exercicios: selectExercisesForTemplate(tplA, perfil, baseExCount, false, checkin, historico),
      score: scoreA,
      motivo: motivoA
    },
    {
      id: 'hip_b',
      codigo: 'B',
      chave: tplA.chave,
      rotulo: 'Mais leve',
      nome: `${tplA.nome} · Leve`,
      grupoPrincipal: tplA.grupoPrincipal,
      grupoSecundario: tplA.grupoSecundario,
      tipoIlustracao: tplA.grupoPrincipal,
      paletaShader: 'SALVIA',
      duracaoMin: duracaoB,
      intensidadeTexto: 'Intensidade suave',
      exercicios: selectExercisesForTemplate(tplA, perfil, baseExCount, true, checkin, historico),
      score: scoreB,
      motivo:
        energia <= 2
          ? 'Fiz uma versão mais leve porque sua energia está baixa hoje.'
          : 'Menos séries e esforço reduzido para quando o tempo ou o fôlego estão curtos.'
    },
    {
      id: 'hip_c',
      codigo: 'C',
      chave: tplC.chave,
      rotulo: 'Outro foco',
      nome: tplC.nome,
      grupoPrincipal: tplC.grupoPrincipal,
      grupoSecundario: tplC.grupoSecundario,
      tipoIlustracao: tplC.grupoPrincipal,
      paletaShader: tplC.paletaShader,
      duracaoMin: baseDuration,
      intensidadeTexto: 'Intensidade moderada',
      exercicios: selectExercisesForTemplate(tplC, perfil, baseExCount, false, checkin, historico),
      score: scoreC,
      motivo: motivoC
    }
  ];

  const ordenadas = [...hipoteses].sort((x, y) => y.score - x.score);
  const recomendado = ordenadas[0];

  return {
    recomendado,
    hipoteses,
    semana: schedule
  };
}

export function adaptPlan(plano, faltas, fadiga) {
  return adaptPlanImpl(plano, faltas, fadiga);
}

export function suggestLoad(exercicio, historico, perfil) {
  return suggestLoadImpl(exercicio, historico, perfil);
}
