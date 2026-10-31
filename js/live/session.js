/**
 * ============================================================================
 * CLAY FIT — PERSISTÊNCIA, RETOMADA E GERENCIAMENTO DE SESSÃO AO VIVO
 * /js/live/session.js
 *
 * Especificações Prompt 3 (B2, B3, B5, B13):
 * - Cria ou retoma uma sessão em andamento.
 * - Persiste no store a cada mudança de estado e a cada série concluída.
 * - Detecta sessões abertas há mais de 6 horas para exibir a folha:
 *   "Esse treino ficou aberto. Quer salvar o que você fez?" com "Salvar" e "Descartar".
 * - Calcula tempo ativo descontando pausas e permite desfazer a última série.
 * ============================================================================
 */

import { store } from '../store.js';
import { buildSession } from '../engine/planner.js';
import { ALL_LIBRARY_ITEMS } from '../engine/catalog.js';
import { nowMs } from './timer.js';

const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;

/**
 * Cria uma nova sessão de treino a partir do treino escolhido (ou corrida / rápido 15 min)
 * e persiste imediatamente no store.
 */
export function startNewLiveSession(treinoConfig = {}) {
  const perfil = store.getEntity('perfil') || {};
  const checkin = store.getTodayCheckin();
  const historico = store.getEntity('sessoes') || [];

  const blueprint = buildSession(treinoConfig, perfil, checkin, historico);

  return store.criarSessao({
    id: treinoConfig.sessaoId || `ses_${Date.now()}`,
    treinoId: blueprint.treinoId,
    nome: blueprint.nome,
    grupoPrincipal: blueprint.grupoPrincipal,
    grupoSecundario: blueprint.grupoSecundario,
    tipo: blueprint.tipo,
    duracaoEstimadaMin: blueprint.duracaoEstimadaMin,
    aquecimentoDuracaoPorMovSeg: blueprint.aquecimentoDuracaoPorMovSeg,
    aquecimentoMovimentos: blueprint.aquecimentoMovimentos,
    alongamentoMovimentos: blueprint.alongamentoMovimentos,
    exercicios: blueprint.exercicios
  });
}

/**
 * Busca uma sessão pelo ID ou devolve a sessão atualmente em andamento.
 */
export function getOrRestoreSession(sessaoId = null) {
  const sessoes = store.getEntity('sessoes') || [];
  if (sessaoId) {
    const byId = sessoes.find((s) => s.id === sessaoId);
    if (byId && (byId.status === 'andamento' || byId.status === 'pausada')) {
      return byId;
    }
  }
  return store.sessaoEmAndamento();
}

/**
 * Verifica se a sessão em andamento tem mais de 6 horas (B2).
 */
export function isSessionOlderThanSixHours(sessao) {
  if (!sessao || !sessao.inicio) return false;
  const ageMs = nowMs() - new Date(sessao.inicio).getTime();
  return ageMs > SEIS_HORAS_MS;
}

/**
 * Conta quantas séries já foram concluídas na sessão (para saber se pode salvar ao encerrar — B13).
 */
export function countCompletedSets(sessao) {
  if (!sessao || !Array.isArray(sessao.exercicios)) return 0;
  let count = 0;
  sessao.exercicios.forEach((ex) => {
    (ex.series || []).forEach((s) => {
      if (s.feita && !s.pulada) count += 1;
    });
  });
  return count;
}

/**
 * Calcula o tempo ativo em segundos da sessão até o momento, descontando pausas.
 */
export function computeActiveSeconds(sessao) {
  if (!sessao || !sessao.inicio) return 0;
  const startMs = new Date(sessao.inicio).getTime();
  const currentMs = sessao.fim ? new Date(sessao.fim).getTime() : nowMs();
  const pausas = Array.isArray(sessao.pausas) ? sessao.pausas : [];

  let pausedMs = 0;
  pausas.forEach((p) => {
    if (!p || !p.de) return;
    const deMs = new Date(p.de).getTime();
    const ateMs = p.ate ? new Date(p.ate).getTime() : currentMs;
    pausedMs += Math.max(0, ateMs - deMs);
  });

  return Math.max(0, Math.floor((currentMs - startMs - pausedMs) / 1000));
}

/**
 * Substitui o exercício atual por outro do mesmo grupo que ainda não esteja na sessão ("Trocar exercício" — B8).
 */
export function swapCurrentExercise(sessao, exercicioIdx) {
  if (!sessao || !Array.isArray(sessao.exercicios)) return sessao;
  const atual = sessao.exercicios[exercicioIdx];
  if (!atual) return sessao;

  const idsNaSessao = new Set(sessao.exercicios.map((e) => e.exercicioId));
  const candidatos = ALL_LIBRARY_ITEMS.filter(
    (item) => item.grupo === atual.grupo && !idsNaSessao.has(item.id)
  );
  const substituto =
    candidatos[0] ||
    ALL_LIBRARY_ITEMS.find((item) => item.grupo === atual.grupo && item.id !== atual.exercicioId);

  if (!substituto) return sessao;

  const novasSeries = (atual.series || []).map((s, idx) => ({
    ...s,
    n: idx + 1,
    alvoCarga: Number(substituto.cargaBaseKg ?? atual.cargaSugerida ?? 12),
    carga: Number(substituto.cargaBaseKg ?? atual.cargaSugerida ?? 12),
    feita: false,
    pulada: false
  }));

  const novosExercicios = sessao.exercicios.map((ex, idx) => {
    if (idx !== exercicioIdx) return ex;
    return {
      ...ex,
      exercicioId: substituto.id,
      nome: substituto.nome,
      grupo: substituto.grupo,
      equip: substituto.equip || 'halteres',
      equipamento: substituto.equipamento || 'Academia completa',
      porTempo: Boolean(substituto.porTempo),
      duracaoSerieSeg: Number(substituto.duracaoSerieSeg || 35),
      passoCargaKg: Number(substituto.passoCargaKg || 1),
      cargaSugerida: Number(substituto.cargaBaseKg || 12),
      comoFazer: substituto.comoFazer || [],
      erroComum: substituto.erroComum || (substituto.errosComuns && substituto.errosComuns[0]) || '',
      series: novasSeries
    };
  });

  return store.atualizarSessao(sessao.id, {
    exercicios: novosExercicios,
    maquinaEstado: {
      ...(sessao.maquinaEstado || {}),
      exercicioIdx,
      serieIdx: 0
    }
  });
}
