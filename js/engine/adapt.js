/**
 * ============================================================================
 * CLAY FIT — MOTOR DE ADAPTAÇÃO DE PLANO, HUMOR E INCÔMODO ARTICULAR
 * /js/engine/adapt.js
 *
 * Especificação B4 (Prompt 3) + A3 (Prompt 7):
 * - Se o humor/energia do check-in de hoje for 1 ou 2, reduz 1 série de cada
 *   exercício composto e sobe o descanso em 15s.
 * - Se o resumo pós-treino registrar incômodo ('Joelho', 'Ombro', 'Lombar'),
 *   marca exercícios do grupo/região para evitar nos próximos 7 dias.
 * - Trata 'Nenhum' como neutro e equivalência entre 'Lombar' e 'Coluna lombar'.
 * ============================================================================
 */

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

function addDiscomfortWithAliases(set, regiao) {
  if (!regiao || regiao === 'Nenhum') return;
  set.add(regiao);
  if (regiao === 'Lombar') set.add('Coluna lombar');
  if (regiao === 'Coluna lombar') set.add('Lombar');
}

/**
 * Retorna a lista de regiões/grupos com incômodo registrado nos últimos 7 dias
 * a partir das sessões salvas ou da lista `incomodosRecentes` do perfil.
 */
export function getActiveDiscomforts(perfil = {}, sessoes = []) {
  const now = Date.now();
  const ativos = new Set();

  if (Array.isArray(perfil?.cuidados)) {
    perfil.cuidados.forEach((c) => {
      addDiscomfortWithAliases(ativos, c);
    });
  }

  if (Array.isArray(perfil?.incomodosRecentes)) {
    perfil.incomodosRecentes.forEach((entry) => {
      if (!entry || !entry.regiao || entry.regiao === 'Nenhum') return;
      const ts = entry.ate ? new Date(entry.ate).getTime() : new Date(entry.data || 0).getTime() + SETE_DIAS_MS;
      if (ts > now) {
        addDiscomfortWithAliases(ativos, entry.regiao);
      }
    });
  }

  if (Array.isArray(sessoes)) {
    sessoes.forEach((s) => {
      if (!s || !Array.isArray(s.incomodo) || s.incomodo.length === 0) return;
      const dataMs = new Date(s.fim || s.data || 0).getTime();
      if (now - dataMs <= SETE_DIAS_MS) {
        s.incomodo.forEach((inc) => {
          addDiscomfortWithAliases(ativos, inc);
        });
      }
    });
  }

  return Array.from(ativos);
}

/**
 * Aplica adaptação de humor (check-in 1 ou 2) sobre uma lista de exercícios planejados:
 * - Reduz 1 série de cada exercício composto (mínimo de 2 séries);
 * - Sobe o descanso em +15 segundos.
 */
export function applyCheckinAdaptation(exercicios = [], checkin = null) {
  const energia = Number(checkin?.energia ?? 4);
  const humorBaixo = energia === 1 || energia === 2;
  if (!humorBaixo) return exercicios;

  return exercicios.map((ex) => {
    const isComposto = Boolean(ex.composto);
    const seriesCountAtual = Array.isArray(ex.series)
      ? ex.series.length
      : Number(ex.numSeries || 3);
    const novaQtdSeries = isComposto ? Math.max(2, seriesCountAtual - 1) : seriesCountAtual;
    const novoDescanso = Number(ex.descansoSeg || 60) + 15;

    let novasSeries = ex.series;
    if (Array.isArray(ex.series) && ex.series.length > novaQtdSeries) {
      novasSeries = ex.series.slice(0, novaQtdSeries).map((s, idx) => ({
        ...s,
        n: idx + 1
      }));
    }

    return {
      ...ex,
      numSeries: novaQtdSeries,
      descansoSeg: novoDescanso,
      series: novasSeries,
      seriesTexto: ex.seriesTexto
        ? ex.seriesTexto
            .replace(/^\d+/, String(novaQtdSeries))
            .replace(/(\d+)s de descanso/, `${novoDescanso}s de descanso`)
        : `${novaQtdSeries} × ${ex.alvoReps || 10} · ${novoDescanso}s de descanso`
    };
  });
}

export function adaptPlan(plano = {}, faltas = 0, fadiga = 2) {
  const faltasNum = Number(faltas || 0);
  const fadigaNum = Number(fadiga || 2);

  let multiplicadorCarga = 1.0;
  let multiplicadorVolume = 1.0;
  let status = 'mantido';
  let nota = 'Ritmo em dia. Seguimos com a progressão planejada.';

  if (faltasNum >= 2) {
    multiplicadorCarga = 0.95;
    multiplicadorVolume = 0.9;
    status = 'retomada_suave';
    nota = 'Reduzimos levemente a carga para uma retomada segura.';
  } else if (fadigaNum <= 2) {
    multiplicadorVolume = 0.85;
    status = 'recuperacao_ativa';
    nota = 'Menos 1 série nos compostos e +15 s de descanso para respeitar seu dia.';
  }

  return {
    ...plano,
    statusAdaptacao: status,
    multiplicadorCarga,
    multiplicadorVolume,
    notaAdaptacao: nota
  };
}
