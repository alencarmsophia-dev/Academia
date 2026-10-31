/* ============================================================================
 * PLANO DE ARQUITETURA — NOVA BIBLIOTECA CLAY FIT (v0.8.0 — LOTES 1, 2 E 3: 200 EXERCÍCIOS)
 * 1. Isolamento do Planejador: `STRENGTH_EXERCISES` mantém os 45 exercícios
 *    originais (`noPlano: false`); novos exercícios de `lote-1.js`, `lote-2.js` e `lote-3.js`
 *    nascem com `noPlano: true` e o `planner.js` filtra `!ex.noPlano`, preservando
 *    100% dos IDs e treinos gerados para `?demo=1` e usuários existentes.
 * 2. Carregamento por Lotes e Offline: `carregarLote1()`, `carregarLote2()` e `carregarLote3()`
 *    carregam todos os 200 exercícios da Biblioteca; `sw.js` (v8) pré-cacheia todos os módulos.
 * 3. Busca e Mapas Musculares: `busca.js` pré-computa índice normalizado de 200
 *    exercícios em <30ms com ordenação em 3 camadas (nome -> principal -> secundário).
 * 4. Virtualização e Estado: `#/biblioteca/buscar` mantém <=30 linhas de 80px
 *    no DOM e preserva consulta, filtros e scroll ao navegar para `#/exercicio/:id`.
 * ============================================================================ */

import { STRENGTH_EXERCISES, RUN_WORKOUTS, LOAD_TABLE_BY_EQUIP } from '../../engine/catalog.js';
import {
  GRUPOS_BIBLIOTECA,
  SUBGRUPOS_POR_GRUPO,
  NIVEIS_EXERCICIO,
  TIPOS_EQUIPAMENTO,
  LOCAIS_EQUIPAMENTO,
  TIPOS_MOVIMENTO,
  TAXONOMIA_MUSCULOS,
  LISTA_MUSCULOS,
  ROTINAS_BIBLIOTECA
} from './taxonomia.js';
import { POPULARES_IDS, POPULARES_SET } from './populares.js';
import { buscarExercicios, garantirIndiceBusca } from './busca.js';
import { LOTE_1_EXERCICIOS } from './lote-1.js';
import { LOTE_2_EXERCICIOS } from './lote-2.js';
import { LOTE_3_EXERCICIOS } from './lote-3.js';

const mapById = new Map();
let lote1Carregado = false;
let lote2Carregado = false;
let lote3Carregado = false;
let lote1Promise = null;
let lote2Promise = null;
let lote3Promise = null;
let listaVisivelCache = [];
const listeners = new Set();

function inferFallbackFields(ex) {
  const grp = ex.grupo || 'Peito';
  const defaultMuscleByGroup = {
    Peito: 'Peitoral',
    Costas: 'Dorsais',
    Ombros: 'Deltoide anterior',
    Braços: 'Bíceps',
    Pernas: 'Quadríceps',
    Core: 'Abdômen',
    Cardio: 'Cardiovascular',
    Funcional: 'Corpo todo',
    Mobilidade: 'Corpo todo',
    Corrida: 'Quadríceps'
  };
  const equipMap = {
    barra: 'Barra',
    halteres: 'Halteres',
    'halteres-alto': 'Halteres',
    'halteres-duplo': 'Halteres',
    'banco-arco': 'Halteres',
    inclinado: 'Halteres',
    rotacao: 'Halteres',
    frontal: 'Halteres',
    martelo: 'Halteres',
    'banco-testa': 'Halteres',
    'banco-apoio': 'Halteres',
    'ponte-quadril': 'Barra',
    polia: 'Polia',
    'polia-reta': 'Polia',
    'cabo-baixo': 'Polia',
    'cabo-antirotacao': 'Polia',
    maquina: 'Máquina',
    corpo: 'Peso do corpo',
    paralelas: 'Peso do corpo',
    'barra-fixa': 'Peso do corpo',
    degrau: 'Peso do corpo',
    'solo-pernas': 'Peso do corpo',
    'solo-cruzado': 'Peso do corpo',
    lateral: 'Peso do corpo'
  };

  return {
    ...ex,
    musculoPrincipal: ex.musculoPrincipal || defaultMuscleByGroup[grp] || 'Peitoral',
    musculosSecundarios: Array.isArray(ex.musculosSecundarios) ? ex.musculosSecundarios : [],
    equipamentoTipo: ex.equipamentoTipo || equipMap[ex.equip] || 'Outros',
    sinonimos: Array.isArray(ex.sinonimos) ? ex.sinonimos : [],
    avisoSeguranca:
      ex.avisoSeguranca ||
      'Mantenha o controle em toda a amplitude; em caso de dor articular, interrompa.',
    respiracao:
      ex.respiracao ||
      'Inspire na fase de retorno controlado e solte o ar na fase de maior esforço.',
    tipoMovimento: ex.tipoMovimento || (ex.composto ? 'empurrar' : 'isolado'),
    cuidado: ex.cuidado || 'Nenhum',
    imagem: ex.imagem || { mini: null, grande: null },
    noPlano: Boolean(ex.noPlano),
    // Exercícios base de STRENGTH_EXERCISES começam ocultos até serem mesclados pelos Lotes 1, 2 e 3
    // (os 3 itens exclusivos de aquecimento/plano que não fazem parte dos 200 continuam acessíveis por getExercicioPorId).
    oculto: ex.oculto !== undefined ? Boolean(ex.oculto) : true
  };
}

function mergeBatchListIntoMap(listaLote = []) {
  if (!Array.isArray(listaLote)) return;
  listaLote.forEach((item) => {
    if (!item || !item.id) return;
    const existente = mapById.get(item.id);
    if (existente) {
      mapById.set(item.id, {
        ...existente,
        ...item,
        noPlano: Boolean(existente.noPlano && item.noPlano),
        oculto: false
      });
    } else {
      mapById.set(item.id, {
        ...inferFallbackFields({ ...item, oculto: false }),
        ...item,
        oculto: Boolean(item.oculto)
      });
    }
  });
}

function inicializarBaseCompleta() {
  mapById.clear();
  STRENGTH_EXERCISES.forEach((ex) => {
    mapById.set(ex.id, inferFallbackFields(ex));
  });
  RUN_WORKOUTS.forEach((rw) => {
    mapById.set(rw.id, {
      ...rw,
      musculoPrincipal: 'Quadríceps',
      musculosSecundarios: ['Panturrilhas', 'Glúteos'],
      equipamentoTipo: 'Cardio',
      sinonimos: ['corrida', 'run'],
      avisoSeguranca: 'Hidrate-se e respeite seu ritmo respiratório.',
      respiracao: 'Mantenha respiração cadenciada e confortável.',
      tipoMovimento: 'cardio',
      cuidado: rw.cuidado || 'Nenhum',
      imagem: { mini: null, grande: null },
      noPlano: false,
      oculto: true
    });
  });

  if (Array.isArray(LOTE_1_EXERCICIOS) && LOTE_1_EXERCICIOS.length > 0) {
    mergeBatchListIntoMap(LOTE_1_EXERCICIOS);
    lote1Carregado = true;
  }
  if (Array.isArray(LOTE_2_EXERCICIOS) && LOTE_2_EXERCICIOS.length > 0) {
    mergeBatchListIntoMap(LOTE_2_EXERCICIOS);
    lote2Carregado = true;
  }
  if (Array.isArray(LOTE_3_EXERCICIOS) && LOTE_3_EXERCICIOS.length > 0) {
    mergeBatchListIntoMap(LOTE_3_EXERCICIOS);
    lote3Carregado = true;
  }

  rebuildVisibleCache();
}

function rebuildVisibleCache() {
  listaVisivelCache = Array.from(mapById.values()).filter((ex) => !ex.oculto);
  garantirIndiceBusca(listaVisivelCache);
}

export function integrarLoteExercicios(listaLote = [], numLote = 1) {
  if (mapById.size === 0) inicializarBaseCompleta();
  mergeBatchListIntoMap(listaLote);
  if (numLote === 3) {
    lote3Carregado = true;
  } else if (numLote === 2) {
    lote2Carregado = true;
  } else {
    lote1Carregado = true;
  }
  rebuildVisibleCache();
  listeners.forEach((cb) => {
    try {
      cb(listaVisivelCache);
    } catch (_) {}
  });
}

export async function carregarLote1() {
  if (mapById.size === 0) inicializarBaseCompleta();
  if (lote1Carregado && lote2Carregado && lote3Carregado) return listaVisivelCache;
  if (lote1Promise) return lote1Promise;

  lote1Promise = Promise.all([
    import('./lote-1.js'),
    import('./lote-2.js'),
    import('./lote-3.js')
  ])
    .then(([mod1, mod2, mod3]) => {
      const dados1 = mod1.LOTE_1_EXERCICIOS || mod1.default || [];
      const dados2 = mod2.LOTE_2_EXERCICIOS || mod2.default || [];
      const dados3 = mod3.LOTE_3_EXERCICIOS || mod3.default || [];
      integrarLoteExercicios(dados1, 1);
      integrarLoteExercicios(dados2, 2);
      integrarLoteExercicios(dados3, 3);
      return listaVisivelCache;
    })
    .catch(() => {
      lote1Promise = null;
      return listaVisivelCache;
    });

  return lote1Promise;
}

export async function carregarLote2() {
  if (mapById.size === 0) inicializarBaseCompleta();
  if (lote2Carregado) return listaVisivelCache;
  if (lote2Promise) return lote2Promise;

  lote2Promise = import('./lote-2.js')
    .then((mod) => {
      const dados = mod.LOTE_2_EXERCICIOS || mod.default || [];
      integrarLoteExercicios(dados, 2);
      return listaVisivelCache;
    })
    .catch(() => {
      lote2Promise = null;
      return listaVisivelCache;
    });

  return lote2Promise;
}

export async function carregarLote3() {
  if (mapById.size === 0) inicializarBaseCompleta();
  if (lote3Carregado) return listaVisivelCache;
  if (lote3Promise) return lote3Promise;

  lote3Promise = import('./lote-3.js')
    .then((mod) => {
      const dados = mod.LOTE_3_EXERCICIOS || mod.default || [];
      integrarLoteExercicios(dados, 3);
      return listaVisivelCache;
    })
    .catch(() => {
      lote3Promise = null;
      return listaVisivelCache;
    });

  return lote3Promise;
}

export function agendarPreCarregamentoOcioso() {
  if (typeof window === 'undefined' || (lote1Carregado && lote2Carregado && lote3Carregado)) return;
  setTimeout(() => {
    if (lote1Carregado && lote2Carregado && lote3Carregado) return;
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => {
        carregarLote1();
        carregarLote2();
        carregarLote3();
      });
    } else {
      carregarLote1();
      carregarLote2();
      carregarLote3();
    }
  }, 3000);
}

export function isLote1Carregado() {
  return lote1Carregado;
}

export function isLote2Carregado() {
  return lote2Carregado;
}

export function isLote3Carregado() {
  return lote3Carregado;
}

export function ouvirAtualizacaoCatalogo(callback) {
  if (typeof callback !== 'function') return () => {};
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Resolve qualquer exercício pelo ID no catálogo completo (200 visíveis + itens internos do planejador/corrida).
 */
export function getExercicioPorId(id) {
  if (!id) return null;
  if (mapById.size === 0) inicializarBaseCompleta();
  return mapById.get(id) || null;
}

/**
 * Lista todos os exercícios visíveis na Biblioteca (ou filtrados por consulta/filtros).
 */
export function listarExercicios(filtros = {}) {
  if (mapById.size === 0) inicializarBaseCompleta();
  const { consulta = '', ...restoFiltros } = filtros || {};
  const temFiltroOuConsulta =
    Boolean(consulta && String(consulta).trim()) ||
    Boolean(restoFiltros.grupo && restoFiltros.grupo !== 'Todos') ||
    Boolean(restoFiltros.rotinaId) ||
    (Array.isArray(restoFiltros.equipamentos) && restoFiltros.equipamentos.length > 0) ||
    (Array.isArray(restoFiltros.musculos) && restoFiltros.musculos.length > 0) ||
    (Array.isArray(restoFiltros.niveis) && restoFiltros.niveis.length > 0);

  if (!temFiltroOuConsulta) {
    return [...listaVisivelCache].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  return buscarExercicios(listaVisivelCache, consulta, restoFiltros).itens;
}

export function pesquisarCatalogo(consulta = '', filtros = {}) {
  if (mapById.size === 0) inicializarBaseCompleta();
  return buscarExercicios(listaVisivelCache, consulta, filtros);
}

export function listarExerciciosPopulares() {
  if (mapById.size === 0) inicializarBaseCompleta();
  return POPULARES_IDS.map((id) => mapById.get(id)).filter((ex) => ex && !ex.oculto);
}

export function contarPorGrupo() {
  if (mapById.size === 0) inicializarBaseCompleta();
  const contagens = {};
  GRUPOS_BIBLIOTECA.forEach((g) => {
    contagens[g] = 0;
  });
  contagens.Todos = listaVisivelCache.length;
  listaVisivelCache.forEach((ex) => {
    if (contagens[ex.grupo] !== undefined) {
      contagens[ex.grupo] += 1;
    }
  });
  return contagens;
}

export function listarRotinasComContagem() {
  if (mapById.size === 0) inicializarBaseCompleta();
  return ROTINAS_BIBLIOTECA.map((rot) => {
    const itens = listaVisivelCache.filter((ex) => rot.filtrar(ex));
    const count = itens.length;
    // C5 (Prompt 8): "Elástico" e "Fita de suspensão" só saem de "Em breve" se tiverem pelo menos 6 exercícios
    const minParaAtivar = rot.id === 'elastico' || rot.id === 'fita-suspensao' ? 6 : 3;
    return {
      ...rot,
      contagem: count,
      emBreve: count < minParaAtivar
    };
  });
}

export {
  GRUPOS_BIBLIOTECA,
  SUBGRUPOS_POR_GRUPO,
  NIVEIS_EXERCICIO,
  TIPOS_EQUIPAMENTO,
  LOCAIS_EQUIPAMENTO,
  TIPOS_MOVIMENTO,
  TAXONOMIA_MUSCULOS,
  LISTA_MUSCULOS,
  ROTINAS_BIBLIOTECA,
  POPULARES_IDS,
  POPULARES_SET,
  LOAD_TABLE_BY_EQUIP
};
