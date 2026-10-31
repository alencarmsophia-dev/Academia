/**
 * ============================================================================
 * CLAY FIT — MOTOR DE BUSCA OFFLINE E TOLERÂNCIA A ERRO (v0.8.0 — PROMPT 8)
 * /js/data/exercicios/busca.js
 *
 * Especificações Prompt 6.1 + Prompt 7 + Prompt 8 (Parte A2 e Parte C2):
 * a) Busca com várias palavras exige que TODAS as palavras apareçam (E lógico)
 *    em nome, sinônimos, músculo principal, equipamento, subgrupo ou grupo. Palavras
 *    só presentes em descrição, passos, erros ou aviso NÃO contam.
 * b) Parte A2 (Prompt 8): Ao buscar o nome de um músculo (ex.: "panturrilha",
 *    "bíceps", "abdômen", "glúteo", "oblíquo", "trapézio"), ordena os resultados em
 *    3 camadas estritas:
 *      1º exercícios cujo NOME contém o termo;
 *      2º exercícios em que esse músculo é o PRINCIPAL;
 *      3º exercícios em que ele é apenas SECUNDÁRIO.
 * c) Em empate de pontuação dentro da mesma camada, exercícios que estão em
 *    populares.js vêm primeiro; depois ordem alfabética.
 * d) Termos de equipamento: "sem equipamento", "sem aparelho", "peso do corpo"
 *    e "calistenia" equivalem a equipamentoTipo = "Peso do corpo".
 * e) Suporte completo aos termos dos Lotes 1, 2 e 3 ("abdominal", "oblíquo",
 *    "prancha", "plank", "roda abdominal", "mountain climber", "esteira",
 *    "spinning", "elíptico", "pular corda", "burpee", "kettlebell", "wall ball",
 *    "thruster", "fazendeiro", "trenó", "cobra", "gato vaca", "figura 4", "90/90").
 * ============================================================================
 */

import {
  normalizarTexto,
  PALAVRAS_LOTES_FUTUROS,
  expandirTokenSinonimo
} from './sinonimos.js';
import { POPULARES_SET } from './populares.js';
import { ROTINAS_BIBLIOTECA } from './taxonomia.js';

let cachedSourceRef = null;
let cachedLength = -1;
let precomputedIndex = [];
let vocabularyWords = [];

const NOMES_MUSCULOS_BUSCA = new Set([
  'peitoral',
  'peito',
  'dorsais',
  'dorsal',
  'trapezio',
  'romboides',
  'lombar',
  'deltoide',
  'manguito',
  'biceps',
  'braquial',
  'braquiorradial',
  'triceps',
  'antebraco',
  'abdomen',
  'abdominal',
  'abdominais',
  'obliquo',
  'obliquos',
  'transverso',
  'quadriceps',
  'posterior',
  'isquiotibiais',
  'gluteo',
  'gluteos',
  'adutores',
  'abdutores',
  'panturrilha',
  'panturrilhas',
  'gastrocnemio',
  'soleo'
]);

export function distanciaLevenshtein(a = '', b = '') {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  if (Math.abs(la - lb) > 2) return 99;

  const dp = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;

  for (let i = 1; i <= la; i++) {
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const cb = b.charCodeAt(j - 1);
      const cost = ca === cb ? 0 : 1;
      let val = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (
        i > 1 &&
        j > 1 &&
        ca === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === cb
      ) {
        val = Math.min(val, dp[i - 2][j - 2] + 1);
      }
      dp[i][j] = val;
    }
  }
  return dp[la][lb];
}

function buildEntryForExercise(ex) {
  const nomeNorm = normalizarTexto(ex.nome);
  const nomeWords = nomeNorm.split(' ').filter(Boolean);
  const muscPrinNorm = normalizarTexto(ex.musculoPrincipal || '');
  const muscPrinWords = muscPrinNorm.split(' ').filter(Boolean);
  const muscSecNorms = (ex.musculosSecundarios || []).map((m) => normalizarTexto(m));
  const muscSecJoined = muscSecNorms.join(' ');
  const muscSecWords = new Set(muscSecJoined.split(' ').filter(Boolean));
  const equipTipoNorm = normalizarTexto(ex.equipamentoTipo || '');
  const equipTipoWords = equipTipoNorm.split(' ').filter(Boolean);
  const nivelNorm = normalizarTexto(ex.nivel || '');
  const grupoNorm = normalizarTexto(ex.grupo || '');
  const subgrupoNorm = normalizarTexto(ex.subgrupo || '');
  const subgrupoWords = subgrupoNorm.split(' ').filter(Boolean);

  const rawSyns = Array.isArray(ex.sinonimos)
    ? ex.sinonimos.map((s) => normalizarTexto(s)).filter(Boolean)
    : [];
  const synSet = new Set(rawSyns);
  if (nivelNorm) synSet.add(nivelNorm);
  if (subgrupoNorm) synSet.add(subgrupoNorm);

  const sinonimosList = Array.from(synSet);
  const sinonimosJoined = sinonimosList.join(' ');
  const sinonimosWords = new Set(sinonimosJoined.split(' ').filter(Boolean));

  return {
    ex,
    id: ex.id,
    popular: POPULARES_SET.has(ex.id),
    nomeNorm,
    nomeWords,
    sinonimosList,
    sinonimosJoined,
    sinonimosWords,
    muscPrinNorm,
    muscPrinWords,
    muscSecNorms,
    muscSecJoined,
    muscSecWords,
    equipTipoNorm,
    equipTipoWords,
    nivelNorm,
    grupoNorm,
    subgrupoNorm,
    subgrupoWords
  };
}

export function garantirIndiceBusca(exercicios = []) {
  const visiveis = (exercicios || []).filter((e) => e && !e.oculto);
  if (cachedSourceRef === exercicios && cachedLength === visiveis.length && precomputedIndex.length > 0) {
    return precomputedIndex;
  }

  cachedSourceRef = exercicios;
  cachedLength = visiveis.length;
  precomputedIndex = visiveis.map(buildEntryForExercise);

  const vocabSet = new Set();
  precomputedIndex.forEach((entry) => {
    entry.nomeWords.forEach((w) => {
      if (w.length >= 4) vocabSet.add(w);
    });
    entry.muscPrinWords.forEach((w) => {
      if (w.length >= 4) vocabSet.add(w);
    });
    entry.equipTipoWords.forEach((w) => {
      if (w.length >= 4) vocabSet.add(w);
    });
    entry.subgrupoWords.forEach((w) => {
      if (w.length >= 4) vocabSet.add(w);
    });
    if (entry.nivelNorm.length >= 4) vocabSet.add(entry.nivelNorm);
    if (entry.grupoNorm.length >= 4) vocabSet.add(entry.grupoNorm);
  });
  vocabularyWords = Array.from(vocabSet);

  return precomputedIndex;
}

/**
 * Converte frases multi-palavra e termos especiais de equipamento/músculo/movimento
 * em tokens canônicos para avaliação exata (Regras a, b, d, e + Lotes 1, 2 e 3).
 */
function canonicalizarConsulta(qNorm) {
  let q = ` ${qNorm} `;

  // Regra d: "sem equipamento", "sem aparelho", "peso do corpo" e "calistenia" => equipamentoTipo = "Peso do corpo"
  q = q.replace(/\b(sem equipamento|sem aparelho|peso do corpo|calistenia)\b/g, ' __equip_peso_do_corpo__ ');

  // Sinônimos compostos canônicos do Lote 3 (Core, Cardio, Mobilidade, Funcional)
  q = q.replace(/\b(roda abdominal|ab wheel|ab roller|rodinha abdominal)\b/g, ' __mov_roda_abdominal__ ');
  q = q.replace(/\b(mountain climber|mountain climbers|escalador|alpinista)\b/g, ' __mov_mountain_climber__ ');
  q = q.replace(/\b(russian twist|rotacao russa|giro russo)\b/g, ' __mov_rotacao_russa__ ');
  q = q.replace(/\b(cable woodchopper|woodchopper|lenhador na polia|lenhador)\b/g, ' __mov_lenhador__ ');
  q = q.replace(/\b(prancha com remada|renegade row)\b/g, ' __mov_prancha_remada__ ');
  q = q.replace(/\b(prancha abdominal|plank|prancha)\b/g, ' __mov_prancha__ ');
  q = q.replace(/\b(dead bug)\b/g, ' __mov_dead_bug__ ');
  q = q.replace(/\b(bird dog|perdigueiro)\b/g, ' __mov_bird_dog__ ');
  q = q.replace(/\b(crunch|sit up|situp|abdominais|abdominal)\b/g, ' __musc_abdomen__ ');
  q = q.replace(/\b(abdomen|reto abdominal)\b/g, ' __musc_abdomen__ ');
  q = q.replace(/\b(obliquos|obliquo)\b/g, ' __musc_obliquos__ ');

  q = q.replace(/\b(treadmill|corrida na esteira|esteira)\b/g, ' __mov_esteira__ ');
  q = q.replace(/\b(bicicleta spinning|indoor cycle|spinning)\b/g, ' __mov_spinning__ ');
  q = q.replace(/\b(eliptico|transport)\b/g, ' __mov_eliptico__ ');
  q = q.replace(/\b(remo ergometrico|air rower|concept2|ergometro de remo)\b/g, ' __mov_remo_ergometrico__ ');
  q = q.replace(/\b(simulador de escada|stairmaster|climbmill|escada)\b/g, ' __mov_escada__ ');
  q = q.replace(/\b(pular corda|jump rope|corda de pular)\b/g, ' __mov_pular_corda__ ');
  q = q.replace(/\b(polichinelo|jumping jack|jumping jacks)\b/g, ' __mov_polichinelo__ ');
  q = q.replace(/\b(burpees|burpee)\b/g, ' __mov_burpee__ ');

  q = q.replace(/\b(kettlebell swing|russian swing|swing)\b/g, ' __mov_kettlebell_swing__ ');
  q = q.replace(/\b(levantamento turco|turkish get up|tgu)\b/g, ' __mov_levantamento_turco__ ');
  q = q.replace(/\b(wall ball|bola na parede)\b/g, ' __mov_wall_ball__ ');
  q = q.replace(/\b(thruster|agachamento com desenvolvimento)\b/g, ' __mov_thruster__ ');
  q = q.replace(/\b(corda naval|battle rope|battle ropes)\b/g, ' __mov_corda_naval__ ');
  q = q.replace(/\b(caminhada do fazendeiro|farmers walk|farmer walk|fazendeiro)\b/g, ' __mov_fazendeiro__ ');
  q = q.replace(/\b(salto na caixa|box jump|pliometria na caixa)\b/g, ' __mov_salto_caixa__ ');
  q = q.replace(/\b(empurrar treno|sled push|prowler|treno)\b/g, ' __mov_treno__ ');

  q = q.replace(/\b(gato vaca|cat cow|gato camelo)\b/g, ' __mov_gato_vaca__ ');
  q = q.replace(/\b(postura da crianca|child pose|balasana)\b/g, ' __mov_postura_crianca__ ');
  q = q.replace(/\b(extensao de coluna|bhujangasana|cobra)\b/g, ' __mov_cobra__ ');
  q = q.replace(/\b(figura 4|piriforme)\b/g, ' __mov_figura_4__ ');
  q = q.replace(/\b(mobilidade de quadril 90 90|90 90)\b/g, ' __mov_90_90__ ');

  // Sinônimos compostos canônicos do Lote 2 (avaliados antes de termos genéricos como "terra" ou "supino")
  q = q.replace(/\b(terra romeno|romanian deadlift|levantamento terra romeno|rdl)\b/g, ' __mov_terra_romeno__ ');
  q = q.replace(/\b(terra sumo|sumo deadlift|levantamento terra sumo)\b/g, ' __mov_terra_sumo__ ');
  q = q.replace(/\b(hip thrust|elevacao pelvica|elevacao de quadril|pelvica)\b/g, ' __mov_elevacao_pelvica__ ');
  q = q.replace(/\b(glute bridge|ponte de gluteos|ponte de quadril)\b/g, ' __mov_ponte_gluteos__ ');
  q = q.replace(/\b(skull crusher|triceps testa|lying triceps extension)\b/g, ' __mov_triceps_testa__ ');
  q = q.replace(/\b(triceps frances|overhead triceps extension|overhead dumbbell extension)\b/g, ' __mov_triceps_frances__ ');
  q = q.replace(/\b(close grip bench press|supino fechado|supino pegada fechada)\b/g, ' __mov_supino_fechado__ ');
  q = q.replace(/\b(rope pushdown|cable pushdown|v bar pushdown|pushdown)\b/g, ' __mov_pushdown__ ');
  q = q.replace(/\b(preacher curl|rosca scott|banco scott|scott)\b/g, ' __mov_rosca_scott__ ');
  q = q.replace(/\b(hammer curl|rosca martelo|martelo)\b/g, ' __mov_rosca_martelo__ ');
  q = q.replace(/\b(goblet squat|agachamento calice|agachamento goblet|goblet)\b/g, ' __mov_goblet__ ');
  q = q.replace(/\b(hack squat|hack machine|agachamento hack|hack)\b/g, ' __mov_hack__ ');
  q = q.replace(/\b(bulgarian split squat|agachamento bulgaro|afundo bulgaro|bulgaro)\b/g, ' __mov_bulgaro__ ');
  q = q.replace(/\b(leg press|prensa 45|leg 45)\b/g, ' __mov_leg_press__ ');
  q = q.replace(/\b(leg extension|cadeira extensora|extensora)\b/g, ' __mov_extensora__ ');
  q = q.replace(/\b(seated leg curl|lying leg curl|standing leg curl|cable leg curl|mesa flexora|cadeira flexora|flexora)\b/g, ' __mov_flexora__ ');
  q = q.replace(/\b(nordic hamstring curl|nordic curl|flexao nordica)\b/g, ' __mov_flexao_nordica__ ');
  q = q.replace(/\b(step up|subida no banco|subida na caixa)\b/g, ' __mov_subida_banco__ ');
  q = q.replace(/\b(good morning|bom dia com barra)\b/g, ' __mov_good_morning__ ');
  q = q.replace(/\b(hip abduction|cadeira abdutora|abdutora)\b/g, ' __mov_abdutora__ ');
  q = q.replace(/\b(hip adduction|cadeira adutora|adutora)\b/g, ' __mov_adutora__ ');
  q = q.replace(/\b(standing calf raise|seated calf raise|calf raise|elevacao de panturrilhas|panturrilhas|panturrilha|gemeos)\b/g, ' __mov_panturrilha__ ');

  // Sinônimos compostos canônicos do Lote 1
  q = q.replace(/\b(bench press|chest press)\b/g, ' supino ');
  q = q.replace(/\b(barra fixa|pull up|pullup|chin up|chinup|graviton|gravitron)\b/g, ' __mov_barra_fixa__ ');
  q = q.replace(/\b(face pull|facepull|puxada de rosto|puxada para a face)\b/g, ' __mov_face_pull__ ');
  q = q.replace(/\b(levantamento terra|deadlift|terra)\b/g, ' __mov_terra__ ');
  q = q.replace(/\b(lat pulldown|puxador|pulldown|pulley)\b/g, ' __mov_puxador_pulldown__ ');
  q = q.replace(/\b(barbell shrug|dumbbell shrug|encolhimento de ombros|encolhimento|shrug)\b/g, ' __mov_encolhimento__ ');
  q = q.replace(/\b(push up|pushup|flexao de bracos|flexao de braco|flexao)\b/g, ' __mov_flexao__ ');
  q = q.replace(/\b(overhead press|shoulder press|military press|desenvolvimento militar|press de ombro)\b/g, ' desenvolvimento ');
  q = q.replace(/\b(arnold press|desenvolvimento rotacional|desenvolvimento arnold)\b/g, ' desenvolvimento arnold ');
  q = q.replace(/\b(lateral raise|abducao de ombros|abducao de ombro)\b/g, ' elevacao lateral ');
  q = q.replace(/\b(front raise)\b/g, ' elevacao frontal ');
  q = q.replace(/\b(rear delt fly|reverse pec deck|peck deck invertido)\b/g, ' crucifixo inverso ');
  q = q.replace(/\b(upright row)\b/g, ' remada alta ');
  q = q.replace(/\b(t bar row|barra t)\b/g, ' remada cavalinho ');
  q = q.replace(/\b(one arm dumbbell row|one arm row)\b/g, ' serrote ');
  q = q.replace(/\b(banco romano|hiperextensao)\b/g, ' extensao lombar ');
  q = q.replace(/\b(manguito rotador)\b/g, ' manguito ');
  q = q.replace(/\b(peck deck|pec deck|voador|fly)\b/g, ' crucifixo ');
  q = q.replace(/\b(cruzamento de polia|cruzamento no cabo)\b/g, ' crossover ');
  q = q.replace(/\b(pull over)\b/g, ' pullover ');
  q = q.replace(/\b(dips|dip)\b/g, ' mergulho ');

  // Regra e + A2: ombro posterior vs ombro/ombros, costas, trapezio, gluteo, biceps, triceps
  q = q.replace(/\b(ombro posterior|posterior de ombro|deltoide posterior)\b/g, ' __musc_deltoide_posterior__ ');
  q = q.replace(/\b(posterior de coxa|isquiotibiais)\b/g, ' __musc_posterior_coxa__ ');
  q = q.replace(/\b(ombros|ombro)\b/g, ' __grupo_ombros__ ');
  q = q.replace(/\b(costas)\b/g, ' __grupo_costas__ ');
  q = q.replace(/\b(pernas|perna)\b/g, ' __grupo_pernas__ ');
  q = q.replace(/\b(bracos|braco)\b/g, ' __grupo_bracos__ ');
  q = q.replace(/\b(trapezio)\b/g, ' __musc_trapezio__ ');
  q = q.replace(/\b(gluteos|gluteo)\b/g, ' __musc_gluteos__ ');
  q = q.replace(/\b(biceps)\b/g, ' __musc_biceps__ ');
  q = q.replace(/\b(triceps)\b/g, ' __musc_triceps__ ');

  // Equipamentos equivalentes
  q = q.replace(/\b(cabo|cable)\b/g, ' polia ');
  q = q.replace(/\b(halter|dumbbell|dumbbells)\b/g, ' halteres ');
  q = q.replace(/\b(aparelho|machine)\b/g, ' maquina ');

  return q.trim().replace(/\s+/g, ' ');
}

/**
 * Avalia um único token contra uma entrada do índice.
 * Retorna `{ score, tier }`, onde:
 *   tier = 1: nome do exercício (ou movimento específico direto) contém o termo
 *   tier = 2: músculo principal / grupo / equipamento é o termo (sem estar no nome)
 *   tier = 3: músculo aparece apenas como secundário
 *   score = 0: não casou
 */
function scoreSingleToken(entry, token, isSingleMuscleQuery) {
  if (token === '__equip_peso_do_corpo__') {
    return entry.ex.equipamentoTipo === 'Peso do corpo'
      ? { score: 15, tier: 2 }
      : { score: 0, tier: 2 };
  }

  // Tokens canônicos Lote 3 (Core, Cardio, Mobilidade, Funcional)
  if (token === '__mov_roda_abdominal__') {
    return entry.id === 'core-roda-abdominal'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_mountain_climber__') {
    return entry.id === 'core-escalador'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_rotacao_russa__') {
    return entry.id === 'core-rotacao-russa'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_lenhador__') {
    return entry.id === 'core-lenhador-polia'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_prancha_remada__') {
    return entry.id === 'funcional-prancha-remada'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_prancha__') {
    const inName = entry.nomeWords.includes('prancha');
    if (inName) {
      return {
        score: entry.id === 'core-prancha-firme' ? 35 : 30,
        tier: 1
      };
    }
    return { score: 0, tier: 1 };
  }

  if (token === '__mov_dead_bug__') {
    return entry.id === 'core-estabilizacao-alternada'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_bird_dog__') {
    return entry.id === 'core-bird-dog'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__musc_abdomen__') {
    const inName = entry.nomeWords.includes('abdominal') || entry.nomeWords.includes('abdomen');
    const isPri =
      entry.muscPrinNorm === 'abdomen' ||
      entry.muscPrinNorm === 'reto abdominal' ||
      entry.muscPrinNorm === 'transverso';
    if (inName) {
      return {
        score: entry.id === 'core-abdominal-supra' ? 36 : isPri ? 32 : 28,
        tier: 1
      };
    }
    if (isPri) {
      return { score: 24, tier: 2 };
    }
    if (
      entry.muscSecNorms.includes('abdomen') ||
      entry.muscSecNorms.includes('reto abdominal') ||
      entry.muscSecNorms.includes('transverso')
    ) {
      return { score: 6, tier: 3 };
    }
    return { score: 0, tier: 3 };
  }

  if (token === '__musc_obliquos__') {
    const inName = entry.nomeNorm.includes('obliquo');
    if (inName) return { score: 34, tier: 1 };
    if (entry.muscPrinNorm === 'obliquos') {
      return { score: 30, tier: 2 };
    }
    if (entry.muscSecNorms.includes('obliquos')) {
      return { score: 6, tier: 3 };
    }
    return { score: 0, tier: 3 };
  }

  if (token === '__mov_esteira__') {
    if (entry.nomeWords.includes('esteira')) {
      return {
        score: entry.id === 'cardio-corrida-esteira' ? 35 : 30,
        tier: 1
      };
    }
    if (entry.id === 'cardio-caminhada-inclinada') {
      return { score: 26, tier: 2 };
    }
    return { score: 0, tier: 2 };
  }

  if (token === '__mov_spinning__') {
    return entry.id === 'cardio-bicicleta-spinning'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_eliptico__') {
    return entry.id === 'cardio-eliptico'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_remo_ergometrico__') {
    return entry.id === 'cardio-remo-ergometrico'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_escada__') {
    return entry.id === 'cardio-simulador-escada'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_pular_corda__') {
    return entry.id === 'cardio-pular-corda'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_polichinelo__') {
    return entry.id === 'cardio-polichinelo'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_burpee__') {
    return entry.id === 'cardio-burpee'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_kettlebell_swing__') {
    return entry.id === 'funcional-kettlebell-swing'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_levantamento_turco__') {
    return entry.id === 'funcional-levantamento-turco'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_wall_ball__') {
    return entry.id === 'funcional-wall-ball'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_thruster__') {
    return entry.id === 'funcional-thruster'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_corda_naval__') {
    return entry.id === 'funcional-corda-naval'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_fazendeiro__') {
    return entry.id === 'funcional-caminhada-fazendeiro'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_salto_caixa__') {
    return entry.id === 'funcional-salto-caixa'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_treno__') {
    return entry.id === 'funcional-empurrar-treno'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_gato_vaca__') {
    return entry.id === 'mobilidade-gato-camelo'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_postura_crianca__') {
    return entry.id === 'mobilidade-postura-crianca'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_cobra__') {
    return entry.id === 'mobilidade-extensao-coluna-cobra'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_figura_4__') {
    return entry.id === 'mobilidade-alongamento-gluteo-figura-4'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_90_90__') {
    return entry.id === 'mobilidade-abertura-quadril-90'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  // Tokens canônicos Lote 2
  if (token === '__mov_terra_romeno__') {
    if (entry.id === 'pernas-terra-romeno') return { score: 35, tier: 1 };
    if (entry.id === 'pernas-stiff-romeno-halteres' || entry.id === 'pernas-stiff-unilateral') {
      return { score: 25, tier: 2 };
    }
    return { score: 0, tier: 2 };
  }

  if (token === '__mov_terra_sumo__') {
    return entry.id === 'pernas-terra-sumo'
      ? { score: 35, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_elevacao_pelvica__') {
    const isPelvica = entry.nomeNorm.startsWith('elevacao pelvica') || entry.id === 'pernas-ponte-gluteos';
    return isPelvica
      ? {
          score: entry.id === 'pernas-elevacao-pelvica' ? 32 : 26,
          tier: entry.nomeNorm.startsWith('elevacao pelvica') ? 1 : 2
        }
      : { score: 0, tier: 2 };
  }

  if (token === '__mov_ponte_gluteos__') {
    return entry.id === 'pernas-ponte-gluteos' || entry.nomeNorm.startsWith('elevacao pelvica')
      ? {
          score: entry.id === 'pernas-ponte-gluteos' ? 32 : 22,
          tier: entry.id === 'pernas-ponte-gluteos' ? 1 : 2
        }
      : { score: 0, tier: 2 };
  }

  if (token === '__mov_triceps_testa__') {
    const isTesta = entry.nomeNorm.startsWith('triceps testa');
    return isTesta
      ? { score: 30, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_triceps_frances__') {
    const isFrances = entry.nomeNorm.startsWith('triceps frances');
    return isFrances
      ? { score: 30, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_supino_fechado__') {
    return entry.id === 'bracos-supino-fechado'
      ? { score: 32, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_pushdown__') {
    const isPushdown =
      entry.id === 'bracos-triceps-polia-corda' ||
      entry.id === 'bracos-triceps-polia-barra-reta' ||
      entry.id === 'bracos-triceps-polia-barra-v' ||
      entry.id === 'bracos-triceps-unilateral-polia';
    return isPushdown
      ? { score: 28, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_rosca_scott__') {
    const isScott = entry.nomeWords.includes('scott');
    return isScott
      ? { score: 30, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_rosca_martelo__') {
    const isMartelo = entry.nomeWords.includes('martelo');
    return isMartelo
      ? { score: 30, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_goblet__') {
    return entry.id === 'pernas-agachamento-calice'
      ? { score: 32, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_hack__') {
    return entry.id === 'pernas-agachamento-hack'
      ? { score: 32, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_bulgaro__') {
    return entry.id === 'pernas-agachamento-bulgaro'
      ? { score: 32, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_leg_press__') {
    const isLegPress = entry.nomeNorm.includes('leg press');
    return isLegPress
      ? { score: entry.nomeNorm.startsWith('leg press') ? 32 : 22, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_extensora__') {
    const isExtensora = entry.nomeWords.includes('extensora');
    return isExtensora
      ? { score: 30, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_flexora__') {
    const inName = entry.nomeWords.includes('flexora');
    if (inName) return { score: 30, tier: 1 };
    if (entry.id === 'pernas-flexao-nordica') return { score: 22, tier: 2 };
    return { score: 0, tier: 2 };
  }

  if (token === '__mov_flexao_nordica__') {
    return entry.id === 'pernas-flexao-nordica'
      ? { score: 32, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_subida_banco__') {
    return entry.id === 'pernas-subida-banco'
      ? { score: 32, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_good_morning__') {
    return entry.id === 'pernas-good-morning'
      ? { score: 32, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_abdutora__') {
    if (entry.id === 'pernas-cadeira-abdutora') return { score: 32, tier: 1 };
    if (entry.nomeWords.includes('abducao')) return { score: 24, tier: 2 };
    return { score: 0, tier: 2 };
  }

  if (token === '__mov_adutora__') {
    if (entry.id === 'pernas-cadeira-adutora') return { score: 32, tier: 1 };
    if (entry.muscPrinNorm === 'adutores') return { score: 22, tier: 2 };
    return { score: 0, tier: 2 };
  }

  // A2: Busca por "panturrilha" (1º nome contém termo -> 2º músculo principal -> 3º músculo secundário)
  if (token === '__mov_panturrilha__') {
    const inName = entry.nomeWords.includes('panturrilha') || entry.nomeWords.includes('panturrilhas');
    const isPri = entry.muscPrinNorm === 'panturrilhas';
    if (inName) {
      return { score: entry.ex.grupo === 'Pernas' ? 32 : 28, tier: 1 };
    }
    if (isPri) {
      return { score: 26, tier: 2 };
    }
    if (isSingleMuscleQuery && entry.muscSecNorms.includes('panturrilhas')) {
      return { score: 6, tier: 3 };
    }
    return { score: 0, tier: 3 };
  }

  // Tokens canônicos Lote 1
  if (token === '__mov_barra_fixa__') {
    const isBarraFixa = entry.nomeNorm.startsWith('barra fixa');
    return isBarraFixa
      ? { score: 22, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_face_pull__') {
    const isFacePull = entry.id === 'ombros-puxada-face-corda' || entry.nomeNorm === 'face pull';
    return isFacePull
      ? { score: 25, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_terra__') {
    const isTerra = entry.id === 'costas-levantamento-terra' || entry.nomeWords.includes('terra');
    return isTerra
      ? { score: entry.id === 'costas-levantamento-terra' ? 30 : 25, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_puxador_pulldown__') {
    const isPuxadaCostas =
      entry.ex.grupo === 'Costas' &&
      (entry.nomeNorm.startsWith('puxada') || entry.nomeNorm.startsWith('pulldown'));
    return isPuxadaCostas
      ? { score: 22, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_encolhimento__') {
    const isEncolhimento = entry.nomeWords.includes('encolhimento');
    return isEncolhimento
      ? { score: 22, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__mov_flexao__') {
    const isFlexao = entry.nomeWords.includes('flexao');
    return isFlexao
      ? { score: 22, tier: 1 }
      : { score: 0, tier: 1 };
  }

  if (token === '__grupo_ombros__') {
    const isGrupoOmbros = entry.ex.grupo === 'Ombros';
    return isGrupoOmbros
      ? { score: 15, tier: 2 }
      : { score: 0, tier: 2 };
  }

  if (token === '__grupo_costas__') {
    return entry.ex.grupo === 'Costas'
      ? { score: 15, tier: 2 }
      : { score: 0, tier: 2 };
  }

  if (token === '__grupo_pernas__') {
    return entry.ex.grupo === 'Pernas'
      ? { score: 15, tier: 2 }
      : { score: 0, tier: 2 };
  }

  if (token === '__grupo_bracos__') {
    return entry.ex.grupo === 'Braços'
      ? { score: 15, tier: 2 }
      : { score: 0, tier: 2 };
  }

  // A2: Buscas por músculos canônicos (1º nome -> 2º principal -> 3º secundário)
  if (token === '__musc_trapezio__') {
    if (entry.nomeNorm.includes('trapezio')) return { score: 34, tier: 1 };
    if (entry.muscPrinNorm === 'trapezio') return { score: 30, tier: 2 };
    if (entry.muscSecNorms.includes('trapezio')) return { score: 6, tier: 3 };
    return { score: 0, tier: 3 };
  }

  if (token === '__musc_deltoide_posterior__') {
    if (entry.nomeNorm.includes('posterior') && entry.ex.grupo === 'Ombros') {
      return { score: 34, tier: 1 };
    }
    if (entry.muscPrinNorm === 'deltoide posterior') return { score: 30, tier: 2 };
    if (entry.muscSecNorms.includes('deltoide posterior')) return { score: 6, tier: 3 };
    return { score: 0, tier: 3 };
  }

  if (token === '__musc_posterior_coxa__') {
    if (entry.nomeWords.includes('posterior')) return { score: 34, tier: 1 };
    if (entry.muscPrinNorm === 'posterior de coxa') return { score: 30, tier: 2 };
    if (entry.muscSecNorms.includes('posterior de coxa')) return { score: 6, tier: 3 };
    return { score: 0, tier: 3 };
  }

  if (token === '__musc_gluteos__') {
    const inName = entry.nomeWords.includes('gluteo') || entry.nomeWords.includes('gluteos');
    const isPri = entry.muscPrinNorm === 'gluteos' || entry.muscPrinNorm === 'gluteo medio';
    if (inName) {
      return { score: 34, tier: 1 };
    }
    if (isPri) {
      return { score: entry.muscPrinNorm === 'gluteos' ? 30 : 28, tier: 2 };
    }
    if (entry.muscSecNorms.includes('gluteos') || entry.muscSecNorms.includes('gluteo medio')) {
      return { score: 6, tier: 3 };
    }
    return { score: 0, tier: 3 };
  }

  if (token === '__musc_biceps__') {
    if (entry.nomeWords.includes('biceps')) return { score: 34, tier: 1 };
    if (entry.muscPrinNorm === 'biceps') return { score: 30, tier: 2 };
    if (entry.muscSecNorms.includes('biceps')) return { score: 6, tier: 3 };
    return { score: 0, tier: 3 };
  }

  if (token === '__musc_triceps__') {
    const inName = entry.nomeWords.includes('triceps');
    if (inName) return { score: 34, tier: 1 };
    if (entry.muscPrinNorm === 'triceps') return { score: 28, tier: 2 };
    if (entry.muscSecNorms.includes('triceps')) return { score: 6, tier: 3 };
    return { score: 0, tier: 3 };
  }

  // 2. Avaliação padrão (Regra a + A2: 1º nome -> 2º principal/equipamento/grupo -> 3º secundário)
  let primaryScore = 0;
  let matchedInName = false;

  if (entry.nomeWords.includes(token)) {
    matchedInName = true;
    primaryScore += 10 + 4 + 2;
    if (entry.nomeWords[0] === token || entry.nomeNorm.startsWith(token)) {
      primaryScore += 6;
    }
  } else if (token.length >= 4 && entry.nomeNorm.includes(token)) {
    matchedInName = true;
    primaryScore += 10 + 2;
    if (entry.nomeNorm.startsWith(token)) {
      primaryScore += 6;
    }
  } else {
    const eqs = expandirTokenSinonimo(token);
    const matchesNameViaSyn = eqs.some(
      (eq) => eq !== token && (entry.nomeWords.includes(eq) || entry.nomeNorm.includes(eq))
    );
    if (matchesNameViaSyn) {
      matchedInName = true;
      primaryScore += 10 + 3;
    }
  }

  if (
    entry.sinonimosWords.has(token) ||
    (token.length >= 4 && entry.sinonimosList.some((s) => s.includes(token)))
  ) {
    primaryScore += 7 + 3;
  }

  if (
    entry.muscPrinWords.includes(token) ||
    (token.length >= 4 && entry.muscPrinNorm.includes(token))
  ) {
    primaryScore += 5 + (entry.muscPrinWords.includes(token) ? 3 : 0);
  }

  if (
    entry.equipTipoWords.includes(token) ||
    entry.equipTipoNorm === token ||
    entry.nivelNorm === token
  ) {
    primaryScore += 3;
  }

  if (entry.grupoNorm === token || entry.subgrupoNorm === token) {
    primaryScore += 2;
  }

  if (primaryScore > 0) {
    return { score: primaryScore, tier: matchedInName ? 1 : 2 };
  }

  // 3º Camada: Músculos secundários (quando a busca é um nome de músculo)
  if (
    isSingleMuscleQuery &&
    (entry.muscSecWords.has(token) ||
      (token.length >= 4 && entry.muscSecJoined.includes(token)))
  ) {
    return { score: 3, tier: 3 };
  }

  return { score: 0, tier: 3 };
}

function evaluateTokensAgainstIndex(indexEntries, rawQueryNorm) {
  const canonicalQuery = canonicalizarConsulta(rawQueryNorm);
  const tokens = canonicalQuery.split(' ').filter(Boolean);
  if (tokens.length === 0) return [];

  const isSingleMuscleQuery =
    tokens.length === 1 &&
    (NOMES_MUSCULOS_BUSCA.has(tokens[0]) ||
      tokens[0] === '__musc_abdomen__' ||
      tokens[0] === '__musc_obliquos__' ||
      tokens[0] === '__musc_trapezio__' ||
      tokens[0] === '__musc_deltoide_posterior__' ||
      tokens[0] === '__musc_posterior_coxa__' ||
      tokens[0] === '__musc_gluteos__' ||
      tokens[0] === '__musc_biceps__' ||
      tokens[0] === '__musc_triceps__' ||
      tokens[0] === '__mov_panturrilha__');

  const matched = [];

  for (let i = 0; i < indexEntries.length; i++) {
    const entry = indexEntries[i];
    let totalScore = 0;
    let allTokensMatched = true;
    let worstTier = 1;

    for (let t = 0; t < tokens.length; t++) {
      const tok = tokens[t];
      const { score, tier } = scoreSingleToken(
        entry,
        tok,
        isSingleMuscleQuery
      );
      if (score <= 0) {
        allTokensMatched = false;
        break;
      }
      totalScore += score;
      if (tier > worstTier) worstTier = tier;
    }

    if (!allTokensMatched || totalScore <= 0) continue;

    // Ajustes finos de ranking de domínio:
    if (canonicalQuery === 'supino' && entry.id === 'peito-supino-reto') {
      totalScore += 5;
    }
    if (canonicalQuery === 'supino' && entry.id === 'bracos-supino-fechado') {
      totalScore -= 4;
    }
    if (canonicalQuery === 'agachamento' && entry.id === 'pernas-agachamento-livre') {
      totalScore += 5;
    }
    if (canonicalQuery === 'remada') {
      if (entry.ex.grupo === 'Costas') {
        totalScore += 8;
        if (entry.id === 'costas-remada-curvada-barra') {
          totalScore += 2;
        }
      } else if (entry.nomeNorm.startsWith('remada alta') || entry.ex.grupo !== 'Costas') {
        totalScore -= 8;
      }
    }

    matched.push({
      ex: entry.ex,
      score: totalScore,
      tier: worstTier,
      popular: entry.popular
    });
  }

  matched.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (b.score !== a.score) return b.score - a.score;
    if (a.popular !== b.popular) return a.popular ? -1 : 1;
    return a.ex.nome.localeCompare(b.ex.nome, 'pt-BR');
  });

  return matched.map((m) => m.ex);
}

function aplicarFiltrosCombinados(entryList, filtros = {}) {
  const {
    equipamentos = [],
    musculos = [],
    niveis = [],
    grupo = null,
    rotinaId = null
  } = filtros || {};

  const eqSet = Array.isArray(equipamentos) && equipamentos.length > 0 ? new Set(equipamentos) : null;
  const muSet = Array.isArray(musculos) && musculos.length > 0 ? new Set(musculos) : null;
  const nvSet = Array.isArray(niveis) && niveis.length > 0 ? new Set(niveis) : null;
  const grpAtivo = grupo && grupo !== 'Todos' ? grupo : null;
  const rotinaObj = rotinaId ? ROTINAS_BIBLIOTECA.find((r) => r.id === rotinaId) : null;

  return entryList.filter(({ ex }) => {
    if (grpAtivo && ex.grupo !== grpAtivo) return false;
    if (rotinaObj && !rotinaObj.filtrar(ex)) return false;
    if (eqSet && !eqSet.has(ex.equipamentoTipo)) return false;
    if (
      muSet &&
      !muSet.has(ex.musculoPrincipal) &&
      !(ex.musculosSecundarios || []).some((ms) => muSet.has(ms))
    ) {
      return false;
    }
    if (nvSet && !nvSet.has(ex.nivel)) return false;
    return true;
  });
}

/**
 * Executa a busca offline com filtros combináveis e tolerância a erro de digitação.
 * Retorna `{ itens, total, resultadosParecidos, termoSugerido, tempoMs }`.
 */
export function buscarExercicios(exercicios = [], consulta = '', filtros = {}) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const baseIndex = garantirIndiceBusca(exercicios);
  const filteredEntries = aplicarFiltrosCombinados(baseIndex, filtros);

  const qNorm = normalizarTexto(consulta);
  if (!qNorm) {
    const sorted = filteredEntries
      .map((e) => e.ex)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      itens: sorted,
      total: sorted.length,
      resultadosParecidos: false,
      termoSugerido: null,
      tempoMs: Math.round((t1 - t0) * 100) / 100
    };
  }

  let resultados = evaluateTokensAgainstIndex(filteredEntries, qNorm);
  let resultadosParecidos = false;
  let termoSugerido = null;

  // Tolerância a erro de digitação (Damerau-Levenshtein <= 1 para >= 5 letras, <= 2 para >= 8 letras)
  if (resultados.length === 0) {
    const rawTokens = qNorm.split(' ').filter(Boolean);
    const hasFutureBatchWord = rawTokens.some((tok) => PALAVRAS_LOTES_FUTUROS.has(tok));

    if (!hasFutureBatchWord) {
      let substituiuAlgum = false;
      const correctedTokens = rawTokens.map((tok) => {
        const len = tok.length;
        if (len < 5) return tok;
        const maxDist = len >= 8 ? 2 : 1;

        let bestWord = tok;
        let bestDist = maxDist + 1;

        for (let i = 0; i < vocabularyWords.length; i++) {
          const cand = vocabularyWords[i];
          const d = distanciaLevenshtein(tok, cand);
          if (d > 0 && d <= maxDist && d < bestDist) {
            bestDist = d;
            bestWord = cand;
            if (d === 1) break;
          }
        }

        if (bestWord !== tok) {
          substituiuAlgum = true;
        }
        return bestWord;
      });

      if (substituiuAlgum) {
        const correctedQuery = correctedTokens.join(' ');
        const fuzzyHits = evaluateTokensAgainstIndex(filteredEntries, correctedQuery);
        if (fuzzyHits.length > 0) {
          resultados = fuzzyHits;
          resultadosParecidos = true;
          termoSugerido = correctedQuery;
        }
      }
    }
  }

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    itens: resultados,
    total: resultados.length,
    resultadosParecidos,
    termoSugerido,
    tempoMs: Math.round((t1 - t0) * 100) / 100
  };
}
