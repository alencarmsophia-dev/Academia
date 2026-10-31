/**
 * ============================================================================
 * CLAY FIT — NORMALIZAÇÃO E TABELA BIDIRECIONAL DE SINÔNIMOS DE BUSCA (v0.8.0)
 * /js/data/exercicios/sinonimos.js
 * ============================================================================
 */

export function normalizarTexto(texto = '') {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_/(),.:;°ºª]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Todos os 3 lotes (200 exercícios) estão ativos no catálogo.
 */
export const PALAVRAS_LOTES_FUTUROS = new Set([]);

/**
 * Grupos de equivalência bidirecional sem contaminação cruzada entre palavras soltas.
 */
export const GRUPOS_SINONIMOS = [
  ['supino', 'bench press', 'chest press'],
  ['puxada', 'pulldown', 'puxador', 'pulley', 'lat pulldown'],
  ['remada', 'row'],
  ['desenvolvimento', 'militar', 'press de ombro', 'shoulder press', 'overhead press', 'military press'],
  ['crucifixo', 'voador', 'fly', 'peck deck', 'pec deck'],
  ['crossover', 'cruzamento de polia', 'cruzamento no cabo'],
  ['barra fixa', 'pull up', 'pullup', 'chin up', 'chinup', 'graviton', 'gravitron'],
  ['terra', 'deadlift', 'levantamento terra'],
  ['terra romeno', 'rdl', 'romanian deadlift'],
  ['terra sumo', 'sumo deadlift'],
  ['elevacao lateral', 'lateral raise', 'abducao de ombros'],
  ['elevacao frontal', 'front raise'],
  ['face pull', 'facepull', 'puxada de rosto', 'puxada para a face'],
  ['encolhimento', 'shrug', 'encolhimento de ombros'],
  ['flexao', 'push up', 'pushup', 'flexao de braco', 'flexao de bracos'],
  ['polia', 'cabo', 'cable'],
  ['halteres', 'halter', 'dumbbell', 'dumbbells'],
  ['maquina', 'aparelho', 'machine'],
  ['sem equipamento', 'sem aparelho', 'peso do corpo', 'calistenia'],
  ['mergulho', 'paralelas', 'dips', 'dip'],
  ['serrote', 'remada unilateral', 'one arm row'],
  ['arnold', 'desenvolvimento arnold', 'arnold press', 'desenvolvimento rotacional'],
  ['extensao lombar', 'banco romano', 'hiperextensao'],
  ['rotacao externa', 'manguito', 'manguito rotador'],
  ['remada alta', 'upright row'],
  ['remada cavalinho', 't bar row', 'barra t'],
  ['pullover', 'pull over'],
  // Lote 2 — Braços e Pernas
  ['agachamento', 'agachamentos', 'squat', 'back squat'],
  ['agachamento goblet', 'agachamento calice', 'goblet squat', 'goblet'],
  ['agachamento hack', 'hack squat', 'hack', 'hack machine'],
  ['agachamento bulgaro', 'bulgarian split squat', 'bulgaro', 'afundo bulgaro'],
  ['leg press', 'leg press 45', 'prensa 45', 'leg 45'],
  ['extensora', 'cadeira extensora', 'leg extension'],
  ['flexora', 'mesa flexora', 'cadeira flexora', 'leg curl'],
  ['afundo', 'split squat'],
  ['passada', 'avanco', 'lunge', 'walking lunges'],
  ['subida no banco', 'step up', 'subida na caixa'],
  ['stiff', 'stiff leg deadlift'],
  ['good morning', 'bom dia com barra'],
  ['flexao nordica', 'nordic curl', 'nordic hamstring curl'],
  ['elevacao pelvica', 'hip thrust', 'pelvica', 'elevacao de quadril'],
  ['ponte de gluteos', 'glute bridge'],
  ['abdutora', 'cadeira abdutora', 'hip abduction'],
  ['adutora', 'cadeira adutora', 'hip adduction'],
  ['panturrilha', 'panturrilhas', 'gemeos', 'calf raise', 'soleo'],
  ['rosca', 'roscas', 'curl', 'biceps curl'],
  ['scott', 'rosca scott', 'preacher curl', 'banco scott'],
  ['martelo', 'rosca martelo', 'hammer curl'],
  ['triceps testa', 'skull crusher', 'lying triceps extension'],
  ['triceps frances', 'overhead triceps extension', 'frances'],
  ['triceps coice', 'kickback'],
  ['pushdown', 'triceps na polia', 'triceps pulley'],
  ['supino fechado', 'close grip bench press'],
  // Lote 3 — Core, Cardio, Mobilidade e Funcional (C2)
  ['abdominal', 'abdominais', 'crunch', 'sit up', 'situp'],
  ['prancha', 'plank', 'prancha abdominal'],
  ['roda abdominal', 'ab wheel', 'ab roller', 'rodinha abdominal'],
  ['escalador', 'mountain climber', 'alpinista'],
  ['rotacao russa', 'russian twist', 'giro russo'],
  ['lenhador', 'lenhador na polia', 'woodchopper', 'cable woodchopper'],
  ['esteira', 'treadmill', 'corrida na esteira'],
  ['bicicleta', 'bike', 'bicicleta ergometrica'],
  ['spinning', 'bicicleta spinning', 'indoor cycle'],
  ['eliptico', 'transport'],
  ['remo ergometrico', 'air rower', 'concept2', 'ergometro de remo'],
  ['simulador de escada', 'escada', 'stairmaster', 'climbmill'],
  ['pular corda', 'jump rope', 'corda de pular'],
  ['polichinelo', 'jumping jack', 'jumping jacks'],
  ['burpee', 'burpees'],
  ['kettlebell swing', 'swing', 'russian swing'],
  ['levantamento turco', 'turkish get up', 'tgu'],
  ['wall ball', 'bola na parede'],
  ['thruster', 'agachamento com desenvolvimento'],
  ['corda naval', 'battle rope', 'battle ropes'],
  ['prancha com remada', 'renegade row'],
  ['caminhada do fazendeiro', 'farmer walk', 'farmers walk', 'fazendeiro'],
  ['salto na caixa', 'box jump', 'pliometria na caixa'],
  ['empurrar treno', 'treno', 'sled push', 'prowler'],
  ['gato vaca', 'cat cow', 'gato camelo', 'alongamento de dorsal'],
  ['postura da crianca', 'child pose', 'balasana'],
  ['cobra', 'extensao de coluna', 'bhujangasana'],
  ['figura 4', 'piriforme', 'alongamento de gluteo'],
  ['90 90', 'mobilidade de quadril 90 90']
];

const MAPA_EQUIVALENCIAS = new Map();

GRUPOS_SINONIMOS.forEach((grupo) => {
  const normGrupo = grupo.map((termo) => normalizarTexto(termo)).filter(Boolean);
  normGrupo.forEach((termo) => {
    const set = MAPA_EQUIVALENCIAS.get(termo) || new Set();
    normGrupo.forEach((eq) => set.add(eq));
    MAPA_EQUIVALENCIAS.set(termo, set);
  });
});

/**
 * Expande uma consulta normalizada com seus equivalentes bidirecionais exatos.
 */
export function expandirSinonimosConsulta(consultaNormalizada = '') {
  const q = normalizarTexto(consultaNormalizada);
  if (!q) return [];
  const equivalentes = new Set([q]);
  if (MAPA_EQUIVALENCIAS.has(q)) {
    for (const eq of MAPA_EQUIVALENCIAS.get(q)) {
      equivalentes.add(eq);
    }
  }
  return Array.from(equivalentes);
}

/**
 * Expande um termo em seus equivalentes diretos (sem quebrar frases em palavras soltas).
 */
export function expandirTokenSinonimo(token = '') {
  const t = normalizarTexto(token);
  if (!t) return [];
  const res = new Set([t]);
  if (MAPA_EQUIVALENCIAS.has(t)) {
    for (const eq of MAPA_EQUIVALENCIAS.get(t)) {
      res.add(eq);
    }
  }
  return Array.from(res);
}
