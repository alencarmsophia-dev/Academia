/**
 * ============================================================================
 * CLAY FIT — TAXONOMIA DE MÚSCULOS, EQUIPAMENTOS, GRUPOS E ROTINAS (v0.8.0)
 * /js/data/exercicios/taxonomia.js
 * ============================================================================
 */

export const GRUPOS_BIBLIOTECA = [
  'Todos',
  'Peito',
  'Costas',
  'Ombros',
  'Braços',
  'Pernas',
  'Core',
  'Cardio',
  'Funcional',
  'Mobilidade'
];

export const SUBGRUPOS_POR_GRUPO = {
  Peito: ['Peitoral médio', 'Peitoral superior', 'Peitoral inferior'],
  Costas: ['Dorsais', 'Meio das costas', 'Trapézio e lombar'],
  Ombros: ['Deltoide anterior', 'Deltoide lateral', 'Deltoide posterior e manguito'],
  Braços: ['Bíceps', 'Tríceps'],
  Pernas: ['Quadríceps', 'Posterior de coxa', 'Glúteos e adutores', 'Panturrilhas'],
  Core: ['Reto abdominal', 'Oblíquos e rotação', 'Estabilidade e prancha'],
  Cardio: ['Corrida e caminhada', 'Ergômetros', 'Calistenia cardiovascular'],
  Mobilidade: ['Membros inferiores e quadril', 'Coluna e tronco', 'Membros superiores'],
  Funcional: ['Potência e agilidade', 'Força integrada']
};

export const NIVEIS_EXERCICIO = ['Iniciante', 'Intermediário', 'Avançado'];

export const TIPOS_EQUIPAMENTO = [
  'Barra',
  'Halteres',
  'Máquina',
  'Polia',
  'Smith',
  'Peso do corpo',
  'Elástico',
  'Kettlebell',
  'Banco',
  'Cardio',
  'Outros'
];

export const LOCAIS_EQUIPAMENTO = [
  'Academia completa',
  'Em casa com halteres',
  'Em casa só com o corpo',
  'Ao ar livre'
];

export const TIPOS_MOVIMENTO = [
  'empurrar',
  'puxar',
  'isolado',
  'dobradiça',
  'agachar',
  'core',
  'cardio',
  'mobilidade'
];

/**
 * Músculos oficiais da taxonomia (rótulos pt-BR exatos),
 * com região anatômica no mapa muscular, vista principal ('frente' | 'costas') e grupo.
 */
export const TAXONOMIA_MUSCULOS = {
  Peitoral: {
    nome: 'Peitoral',
    regiao: 'peitoral',
    vistaPrincipal: 'frente',
    grupo: 'Peito',
    zoomViewBox: '50 38 100 100'
  },
  'Peitoral superior': {
    nome: 'Peitoral superior',
    regiao: 'peitoral_superior',
    vistaPrincipal: 'frente',
    grupo: 'Peito',
    zoomViewBox: '50 32 100 96'
  },
  Dorsais: {
    nome: 'Dorsais',
    regiao: 'dorsais',
    vistaPrincipal: 'costas',
    grupo: 'Costas',
    zoomViewBox: '46 42 108 108'
  },
  Trapézio: {
    nome: 'Trapézio',
    regiao: 'trapezio',
    vistaPrincipal: 'costas',
    grupo: 'Costas',
    zoomViewBox: '50 28 100 96'
  },
  Lombar: {
    nome: 'Lombar',
    regiao: 'lombar',
    vistaPrincipal: 'costas',
    grupo: 'Costas',
    zoomViewBox: '52 68 96 96'
  },
  'Deltoide anterior': {
    nome: 'Deltoide anterior',
    regiao: 'deltoide_anterior',
    vistaPrincipal: 'frente',
    grupo: 'Ombros',
    zoomViewBox: '44 30 112 100'
  },
  'Deltoide lateral': {
    nome: 'Deltoide lateral',
    regiao: 'deltoide_lateral',
    vistaPrincipal: 'frente',
    grupo: 'Ombros',
    zoomViewBox: '40 28 120 104'
  },
  'Deltoide posterior': {
    nome: 'Deltoide posterior',
    regiao: 'deltoide_posterior',
    vistaPrincipal: 'costas',
    grupo: 'Ombros',
    zoomViewBox: '44 30 112 100'
  },
  'Manguito rotador': {
    nome: 'Manguito rotador',
    regiao: 'manguito_rotador',
    vistaPrincipal: 'costas',
    grupo: 'Ombros',
    zoomViewBox: '46 32 108 98'
  },
  Bíceps: {
    nome: 'Bíceps',
    regiao: 'biceps',
    vistaPrincipal: 'frente',
    grupo: 'Braços',
    zoomViewBox: '42 44 116 104'
  },
  Braquial: {
    nome: 'Braquial',
    regiao: 'braquial',
    vistaPrincipal: 'frente',
    grupo: 'Braços',
    zoomViewBox: '40 48 120 104'
  },
  Braquiorradial: {
    nome: 'Braquiorradial',
    regiao: 'braquiorradial',
    vistaPrincipal: 'frente',
    grupo: 'Braços',
    zoomViewBox: '38 60 124 108'
  },
  Tríceps: {
    nome: 'Tríceps',
    regiao: 'triceps',
    vistaPrincipal: 'costas',
    grupo: 'Braços',
    zoomViewBox: '42 44 116 104'
  },
  Antebraço: {
    nome: 'Antebraço',
    regiao: 'antebraco',
    vistaPrincipal: 'frente',
    grupo: 'Braços',
    zoomViewBox: '38 66 124 108'
  },
  Abdômen: {
    nome: 'Abdômen',
    regiao: 'abdomen',
    vistaPrincipal: 'frente',
    grupo: 'Core',
    zoomViewBox: '52 56 96 100'
  },
  'Reto abdominal': {
    nome: 'Reto abdominal',
    regiao: 'reto_abdominal',
    vistaPrincipal: 'frente',
    grupo: 'Core',
    zoomViewBox: '52 56 96 100'
  },
  Oblíquos: {
    nome: 'Oblíquos',
    regiao: 'obliquos',
    vistaPrincipal: 'frente',
    grupo: 'Core',
    zoomViewBox: '50 58 100 100'
  },
  Transverso: {
    nome: 'Transverso',
    regiao: 'transverso',
    vistaPrincipal: 'frente',
    grupo: 'Core',
    zoomViewBox: '50 58 100 100'
  },
  'Flexores do quadril': {
    nome: 'Flexores do quadril',
    regiao: 'flexores_quadril',
    vistaPrincipal: 'frente',
    grupo: 'Mobilidade',
    zoomViewBox: '50 102 100 104'
  },
  Quadríceps: {
    nome: 'Quadríceps',
    regiao: 'quadriceps',
    vistaPrincipal: 'frente',
    grupo: 'Pernas',
    zoomViewBox: '48 112 104 116'
  },
  'Posterior de coxa': {
    nome: 'Posterior de coxa',
    regiao: 'posterior_coxa',
    vistaPrincipal: 'costas',
    grupo: 'Pernas',
    zoomViewBox: '48 116 104 116'
  },
  Glúteos: {
    nome: 'Glúteos',
    regiao: 'gluteos',
    vistaPrincipal: 'costas',
    grupo: 'Pernas',
    zoomViewBox: '50 92 100 104'
  },
  'Glúteo médio': {
    nome: 'Glúteo médio',
    regiao: 'gluteo_medio',
    vistaPrincipal: 'costas',
    grupo: 'Pernas',
    zoomViewBox: '46 94 108 106'
  },
  Adutores: {
    nome: 'Adutores',
    regiao: 'adutores',
    vistaPrincipal: 'frente',
    grupo: 'Pernas',
    zoomViewBox: '52 114 96 110'
  },
  Abdutores: {
    nome: 'Abdutores',
    regiao: 'abdutores',
    vistaPrincipal: 'costas',
    grupo: 'Pernas',
    zoomViewBox: '46 98 108 110'
  },
  Panturrilhas: {
    nome: 'Panturrilhas',
    regiao: 'panturrilhas',
    vistaPrincipal: 'costas',
    grupo: 'Pernas',
    zoomViewBox: '50 156 100 112'
  },
  Gastrocnêmio: {
    nome: 'Gastrocnêmio',
    regiao: 'gastrocnemio',
    vistaPrincipal: 'costas',
    grupo: 'Pernas',
    zoomViewBox: '50 154 100 112'
  },
  Sóleo: {
    nome: 'Sóleo',
    regiao: 'soleo',
    vistaPrincipal: 'costas',
    grupo: 'Pernas',
    zoomViewBox: '50 162 100 110'
  },
  'Corpo todo': {
    nome: 'Corpo todo',
    regiao: 'corpo_todo',
    vistaPrincipal: 'frente',
    grupo: 'Funcional',
    zoomViewBox: '36 16 128 248'
  },
  Cardiovascular: {
    nome: 'Cardiovascular',
    regiao: 'cardiovascular',
    vistaPrincipal: 'frente',
    grupo: 'Cardio',
    zoomViewBox: '36 16 128 248'
  },
  'Corpo inteiro': {
    nome: 'Corpo inteiro',
    regiao: 'corpo_inteiro',
    vistaPrincipal: 'frente',
    grupo: 'Funcional',
    zoomViewBox: '36 16 128 248'
  }
};

export const LISTA_MUSCULOS = Object.keys(TAXONOMIA_MUSCULOS);

/**
 * C1.4 & C5 (Prompt 8) — As 8 Rotinas da Biblioteca (filtros salvos).
 */
export const ROTINAS_BIBLIOTECA = [
  {
    id: 'em-casa',
    nome: 'Em casa',
    cena: 'em-casa',
    filtrar: (ex) =>
      ex.equipamento === 'Em casa com halteres' ||
      ex.equipamento === 'Em casa só com o corpo'
  },
  {
    id: 'em-viagem',
    nome: 'Em viagem',
    cena: 'em-viagem',
    filtrar: (ex) =>
      ex.equipamentoTipo === 'Peso do corpo' || ex.equipamentoTipo === 'Elástico'
  },
  {
    id: 'apenas-halteres',
    nome: 'Apenas halteres',
    cena: 'apenas-halteres',
    filtrar: (ex) => ex.equipamentoTipo === 'Halteres'
  },
  {
    id: 'elastico',
    nome: 'Elástico',
    cena: 'elastico',
    filtrar: (ex) => ex.equipamentoTipo === 'Elástico'
  },
  {
    id: 'cardio-hiit',
    nome: 'Cardio e HIIT',
    cena: 'cardio-hiit',
    filtrar: (ex) =>
      ex.grupo === 'Cardio' ||
      ex.subgrupo === 'Potência e agilidade' ||
      ex.id === 'core-escalador' ||
      ex.id === 'funcional-thruster'
  },
  {
    id: 'academia',
    nome: 'Academia',
    cena: 'academia',
    filtrar: (ex) => ex.equipamento === 'Academia completa'
  },
  {
    id: 'peso-corporal',
    nome: 'Peso corporal',
    cena: 'peso-corporal',
    filtrar: (ex) => ex.equipamentoTipo === 'Peso do corpo'
  },
  {
    id: 'fita-suspensao',
    nome: 'Fita de suspensão',
    cena: 'fita-suspensao',
    filtrar: (ex) =>
      Array.isArray(ex.sinonimos) && ex.sinonimos.includes('fita de suspensao')
  }
];
