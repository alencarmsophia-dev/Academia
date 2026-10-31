/**
 * ============================================================================
 * CLAY FIT — MOTOR DE PROGRESSÃO DE CARGA E SUGESTÃO INTELIGENTE
 * /js/engine/progression.js
 *
 * Especificação B4 (Prompt 3):
 * Implementa `suggestLoad(exercicio, historico, perfil)` com 4 regras comentadas:
 * 1) Sem histórico: carga conservadora por equipamento e nível
 *    (iniciante / intermediário / avançado) em tabela no catalog.js;
 *    peso do corpo = sem carga (0 kg).
 * 2) Última sessão: todas as séries atingiram o alvo e o esforço máximo foi
 *    "leve" ou "medio" -> sugerir +2,5% arredondado ao passo do equipamento
 *    (halteres 1 kg, barra 2,5 kg, polia/máquina 2,5 kg).
 * 3) Esforço "pesado" em alguma série ou reps abaixo do alvo -> manter a carga.
 * 4) Duas sessões seguidas abaixo do alvo, ou mais de 14 dias sem fazer -> -5%.
 * Retorna `{ carga, motivo, cargaSugeridaKg, ultimaVezTexto }`.
 * ============================================================================
 */

import { LOAD_TABLE_BY_EQUIP } from './catalog.js';

function normalizeNivelKey(nivelStr = '') {
  const s = String(nivelStr || '').toLowerCase();
  if (s.includes('anos') || s.includes('avan')) return 'avancado';
  if (s.includes('meses') || s.includes('inter')) return 'intermediario';
  return 'iniciante';
}

function roundToStep(value, step = 1) {
  const s = Number(step) > 0 ? Number(step) : 1;
  return Math.max(0, Math.round(value / s) * s);
}

/**
 * Extrai o histórico de execuções anteriores de um exercício específico
 * a partir da lista de sessões concluídas (ou registros diretos).
 */
export function extractExerciseHistory(exercicioId, historico = []) {
  if (!Array.isArray(historico) || !exercicioId) return [];

  const entries = [];
  for (const item of historico) {
    if (!item) continue;
    if (item.status && item.status !== 'concluida') continue;

    // Caso a sessão tenha array `exercicios` (formato completo B3)
    if (Array.isArray(item.exercicios)) {
      const found = item.exercicios.find((e) => e.exercicioId === exercicioId || e.id === exercicioId);
      if (found && Array.isArray(found.series)) {
        const seriesFeitas = found.series.filter((s) => s.feita && !s.pulada);
        if (seriesFeitas.length > 0) {
          const maxCarga = Math.max(...seriesFeitas.map((s) => Number(s.carga ?? s.alvoCarga ?? 0)));
          const avgReps = Math.round(
            seriesFeitas.reduce((acc, s) => acc + Number(s.reps ?? s.alvoReps ?? 10), 0) /
              seriesFeitas.length
          );
          const atingiuAlvo =
            seriesFeitas.length >= found.series.length &&
            seriesFeitas.every((s) => Number(s.reps ?? 0) >= Number(s.alvoReps ?? 1));
          const tevePesado = seriesFeitas.some((s) => s.esforco === 'pesado');
          entries.push({
            data: item.fim || item.data || new Date().toISOString(),
            carga: maxCarga,
            reps: avgReps,
            atingiuAlvo,
            tevePesado
          });
        }
      }
    } else if (item.exercicioId === exercicioId) {
      // Compatibilidade com registro simplificado
      entries.push({
        data: item.data || new Date().toISOString(),
        carga: Number(item.carga ?? item.cargaKg ?? 0),
        reps: Number(item.reps ?? 10),
        atingiuAlvo: item.todasSeriesCompletas !== false,
        tevePesado: item.esforco === 'pesado'
      });
    }
  }

  return entries.sort((a, b) => new Date(b.data) - new Date(a.data));
}

/**
 * Calcula a carga sugerida para um exercício segundo as 4 regras do Prompt 3 (B4).
 *
 * @param {Object} exercicio - Objeto do exercício do catalog.js
 * @param {Array} historico - Lista de sessões do store
 * @param {Object} perfil - Perfil do usuário
 * @returns {{ carga: number, motivo: string, cargaSugeridaKg: number, ultimaCarga: number|null, ultimaReps: number|null, passo: number, isPesoCorpo: boolean }}
 */
export function suggestLoad(exercicio = {}, historico = [], perfil = {}) {
  const equipKey = exercicio.equip || 'halteres';
  const tableEntry = LOAD_TABLE_BY_EQUIP[equipKey] || LOAD_TABLE_BY_EQUIP.halteres;
  const passo = Number(exercicio.passoCargaKg || tableEntry.passo || 1);
  const isPesoCorpo =
    Number(exercicio.cargaBaseKg ?? 0) <= 0 &&
    (tableEntry.iniciante === 0 || equipKey === 'corpo' || exercicio.porTempo);

  // Regra 1 (parte A): Peso do corpo = sem carga
  if (isPesoCorpo) {
    return {
      carga: 0,
      cargaSugeridaKg: 0,
      motivo: 'Primeira vez: comece leve',
      ultimaCarga: null,
      ultimaReps: null,
      passo: 1,
      isPesoCorpo: true
    };
  }

  const execucoes = extractExerciseHistory(exercicio.id || exercicio.exercicioId, historico);

  // Regra 1: Sem histórico -> carga conservadora por equipamento e nível em tabela no catalog.js
  if (execucoes.length === 0) {
    const nivelKey = normalizeNivelKey(perfil?.nivel || exercicio.nivel || '');
    const baseTabela = tableEntry[nivelKey] ?? Number(exercicio.cargaBaseKg || 12);
    const cargaInicial = roundToStep(baseTabela, passo);
    return {
      carga: cargaInicial,
      cargaSugeridaKg: cargaInicial,
      motivo: 'Primeira vez: comece leve',
      ultimaCarga: null,
      ultimaReps: null,
      passo,
      isPesoCorpo: false
    };
  }

  const ultima = execucoes[0];
  const penultima = execucoes[1] || null;
  const ultimaCarga = Number(ultima.carga || exercicio.cargaBaseKg || 12);
  const ultimaReps = Number(ultima.reps || 10);

  const diasDesdeUltima = ultima.data
    ? (Date.now() - new Date(ultima.data).getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  const duasAbaixoDoAlvo =
    !ultima.atingiuAlvo && penultima !== null && !penultima.atingiuAlvo;

  // Regra 4: Duas sessões seguidas abaixo do alvo, ou mais de 14 dias sem fazer -> -5%
  if (duasAbaixoDoAlvo || diasDesdeUltima > 14) {
    const reduzida = Math.max(passo, roundToStep(ultimaCarga * 0.95, passo));
    return {
      carga: reduzida,
      cargaSugeridaKg: reduzida,
      motivo: 'Voltando com calma',
      ultimaCarga,
      ultimaReps,
      passo,
      isPesoCorpo: false
    };
  }

  // Regra 3: Esforço "pesado" em alguma série ou reps abaixo do alvo -> manter a carga
  if (ultima.tevePesado || !ultima.atingiuAlvo) {
    return {
      carga: roundToStep(ultimaCarga, passo),
      cargaSugeridaKg: roundToStep(ultimaCarga, passo),
      motivo: 'Mantive a carga para consolidar',
      ultimaCarga,
      ultimaReps,
      passo,
      isPesoCorpo: false
    };
  }

  // Regra 2: Última sessão atingiu o alvo em todas as séries e esforço máximo foi "leve" ou "medio"
  // -> sugerir +2,5% arredondado ao passo do equipamento (garantindo ao menos +1 passo quando aplicável)
  const bruta = ultimaCarga * 1.025;
  let sugerida = roundToStep(bruta, passo);
  if (sugerida <= ultimaCarga) {
    sugerida = roundToStep(ultimaCarga + passo, passo);
  }

  return {
    carga: sugerida,
    cargaSugeridaKg: sugerida,
    motivo: 'Você completou tudo na última vez',
    ultimaCarga,
    ultimaReps,
    passo,
    isPesoCorpo: false
  };
}

export default suggestLoad;
