/**
 * ============================================================================
 * CLAY FIT — CATÁLOGO DE EXERCÍCIOS, TABELA DE CARGAS E DICAS
 * /js/engine/catalog.js
 *
 * Exports obrigatórios:
 * - STRENGTH_EXERCISES (45 exercícios cobrindo Peito, Costas, Pernas, Ombros,
 *   Braços, Core e Mobilidade)
 * - RUN_WORKOUTS (8 treinos de corrida com subtipos únicos)
 * - ALL_LIBRARY_ITEMS (união dos dois, com o mesmo formato)
 * - LOAD_TABLE_BY_EQUIP (tabela de carga conservadora por equipamento e nível)
 * - REST_TIPS (12 dicas curtas para o descanso automático)
 * - getTipOfTheDay() (14 dicas em português que rotacionam por dia)
 * ============================================================================
 */

export const DAILY_TIPS = [
  'Beba água entre as séries.',
  'Dormir bem rende mais que treinar mais.',
  'Aqueça 5 minutos antes de começar.',
  'Controle a descida do peso em cada repetição.',
  'Respire fundo antes das séries mais exigentes.',
  'Constância vence intensidade isolada.',
  'Solte os ombros e mantenha o pescoço relaxado ao correr.',
  'Deixe pelo menos uma repetição limpa na reserva.',
  'Anote como se sentiu para o treino se ajustar a você.',
  'Caminhar 10 minutos após o treino acelera a recuperação.',
  'Priorize amplitude completa antes de subir a carga.',
  'Apoie os pés inteiros no chão para ganhar estabilidade.',
  'Dias mais leves também constroem um corpo forte.',
  'Alongue quadris e peitoral ao encerrar o dia.'
];

export const REST_TIPS = [
  'Respire fundo e solte devagar.',
  'Hidrate-se agora.',
  'Relaxe os ombros.',
  'Solte a mandíbula e desacelere o fôlego.',
  'Prepare a postura antes de pegar o peso.',
  'Mantenha os pés firmes na próxima série.',
  'Priorize o controle na descida do movimento.',
  'Sinta o músculo alvo trabalhar sem pressa.',
  'Balançar os braços de leve ajuda a recuperar.',
  'Concentre-se na próxima série, uma de cada vez.',
  'Deixe o peito aberto para respirar melhor.',
  'Qualidade do movimento vale mais que pressa.'
];

/**
 * Tabela conservadora de cargas iniciais por tipo de equipamento e nível (B4).
 * Peso do corpo = 0 kg.
 */
export const LOAD_TABLE_BY_EQUIP = {
  barra: { iniciante: 20, intermediario: 35, avancado: 50, passo: 2.5 },
  halteres: { iniciante: 8, intermediario: 14, avancado: 20, passo: 1 },
  'halteres-alto': { iniciante: 8, intermediario: 12, avancado: 18, passo: 1 },
  'halteres-duplo': { iniciante: 10, intermediario: 16, avancado: 24, passo: 1 },
  'banco-arco': { iniciante: 6, intermediario: 10, avancado: 14, passo: 1 },
  inclinado: { iniciante: 4, intermediario: 6, avancado: 10, passo: 1 },
  rotacao: { iniciante: 6, intermediario: 10, avancado: 14, passo: 1 },
  frontal: { iniciante: 5, intermediario: 8, avancado: 12, passo: 1 },
  martelo: { iniciante: 8, intermediario: 12, avancado: 16, passo: 1 },
  'banco-testa': { iniciante: 6, intermediario: 10, avancado: 14, passo: 1 },
  'banco-apoio': { iniciante: 6, intermediario: 10, avancado: 16, passo: 1 },
  'ponte-quadril': { iniciante: 20, intermediario: 35, avancado: 50, passo: 2.5 },
  polia: { iniciante: 12.5, intermediario: 20, avancado: 27.5, passo: 2.5 },
  'polia-reta': { iniciante: 15, intermediario: 22.5, avancado: 30, passo: 2.5 },
  'cabo-baixo': { iniciante: 25, intermediario: 40, avancado: 55, passo: 2.5 },
  'cabo-antirotacao': { iniciante: 10, intermediario: 15, avancado: 20, passo: 2.5 },
  maquina: { iniciante: 25, intermediario: 45, avancado: 65, passo: 2.5 },
  corpo: { iniciante: 0, intermediario: 0, avancado: 0, passo: 1 },
  paralelas: { iniciante: 0, intermediario: 0, avancado: 0, passo: 1 },
  'barra-fixa': { iniciante: 0, intermediario: 0, avancado: 0, passo: 1 },
  degrau: { iniciante: 0, intermediario: 0, avancado: 0, passo: 1 },
  'solo-pernas': { iniciante: 0, intermediario: 0, avancado: 0, passo: 1 },
  'solo-cruzado': { iniciante: 0, intermediario: 0, avancado: 0, passo: 1 },
  lateral: { iniciante: 0, intermediario: 0, avancado: 0, passo: 1 }
};

export const STRENGTH_EXERCISES = [
  // ================= PEITO (7) =================
  {
    id: 'peito-supino-reto',
    nome: 'Supino reto com barra',
    grupo: 'Peito',
    equipamento: 'Academia completa',
    equip: 'barra',
    composto: true,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Intermediário',
    cuidado: 'Ombro',
    seriesPadrao: '4 × 8',
    descansoSeg: 90,
    cargaBaseKg: 40,
    descricao: 'Movimento base de força para o peitoral com barra olímpica.',
    comoFazer: [
      'Deite no banco com os pés firmes no chão e escápulas unidas.',
      'Desça a barra devagar até tocar suavemente o meio do peito.',
      'Empurre a barra para cima mantendo os cotovelos a 45 graus.'
    ],
    erroComum: 'Abrir demais os cotovelos na linha dos ombros ou tirar o quadril do banco.',
    errosComuns: [
      'Abrir os cotovelos alinhados à linha dos ombros.',
      'Tirar o quadril do banco ao empurrar a carga.'
    ],
    dicas: [
      'Aperte a barra com firmeza para estabilizar os punhos.',
      'Inspire na descida e solte o ar ao subir.'
    ]
  },
  {
    id: 'peito-supino-inclinado-halteres',
    nome: 'Supino inclinado com halteres',
    grupo: 'Peito',
    equipamento: 'Em casa com halteres',
    equip: 'halteres',
    composto: true,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: 'Ombro',
    seriesPadrao: '4 × 10',
    descansoSeg: 75,
    cargaBaseKg: 14,
    descricao: 'Desenvolve a porção superior do peitoral com liberdade articular.',
    comoFazer: [
      'Ajuste o encosto a 30 graus e apoie bem as costas.',
      'Desça os halteres controlando ao lado da parte alta do peito.',
      'Suba unindo a trajetória sem bater os pesos no topo.'
    ],
    erroComum: 'Inclinar demais o banco ou descer rápido sem controlar o alongamento.',
    errosComuns: [
      'Inclinar demais o banco e transformar o movimento em desenvolvimento.',
      'Descer rápido demais sem controlar o alongamento.'
    ],
    dicas: [
      'Mantenha os antebraços sempre verticais embaixo dos halteres.',
      'Deixe o peito alto durante toda a série.'
    ]
  },
  {
    id: 'peito-crucifixo-reto-halteres',
    nome: 'Crucifixo reto com halteres',
    grupo: 'Peito',
    equipamento: 'Em casa com halteres',
    equip: 'banco-arco',
    composto: false,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: 'Ombro',
    seriesPadrao: '3 × 12',
    descansoSeg: 60,
    cargaBaseKg: 10,
    descricao: 'Isolamento com foco no alongamento controlado das fibras do peitoral.',
    comoFazer: [
      'Segure os halteres acima do peito com as palmas frente a frente.',
      'Abra os braços em arco mantendo leve flexão nos cotovelos.',
      'Retorne abraçando o ar até alinhar os pesos aos ombros.'
    ],
    erroComum: 'Esticar totalmente os cotovelos e descer além da linha segura do ombro.',
    errosComuns: [
      'Esticar totalmente os cotovelos sobrecarregando a articulação.',
      'Descer além da linha confortável do ombro.'
    ],
    dicas: [
      'Imagine que está abraçando o tronco de uma árvore larga.',
      'Use cargas moderadas para priorizar o controle.'
    ]
  },
  {
    id: 'peito-flexao-classica',
    nome: 'Flexão de braços clássica',
    grupo: 'Peito',
    equipamento: 'Em casa só com o corpo',
    equip: 'corpo',
    composto: true,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '4 × 12',
    descansoSeg: 60,
    cargaBaseKg: 0,
    descricao: 'Empurrão fundamental com o peso do corpo e ativação integrada do core.',
    comoFazer: [
      'Apoie as mãos no chão pouco além da largura dos ombros.',
      'Mantenha o corpo em linha reta da cabeça aos calcanhares.',
      'Desça o peito próximo ao solo e empurre o chão com firmeza.'
    ],
    erroComum: 'Deixar o quadril cair antes do peito chegar perto do chão.',
    errosComuns: [
      'Deixar o quadril cair antes do peito chegar ao chão.',
      'Encolher o pescoço em direção às orelhas.'
    ],
    dicas: [
      'Espalhe bem os dedos no chão para proteger os punhos.',
      'Contraia os glúteos para manter o tronco estável.'
    ]
  },
  {
    id: 'peito-crucifixo-polia-alta',
    nome: 'Crucifixo na polia alta',
    grupo: 'Peito',
    equipamento: 'Academia completa',
    equip: 'polia',
    composto: false,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Intermediário',
    cuidado: null,
    seriesPadrao: '3 × 12',
    descansoSeg: 60,
    cargaBaseKg: 15,
    descricao: 'Tensão contínua dos cabos do início ao fim de cada repetição.',
    comoFazer: [
      'Dê um passo à frente das polias com o tronco firme.',
      'Traga as alças em arco até se encontrarem à frente do quadril.',
      'Segure um segundo na contração e retorne devagar.'
    ],
    erroComum: 'Dobrar e esticar os cotovelos como num supino ou balançar o tronco.',
    errosComuns: [
      'Dobrar e esticar os cotovelos como num supino.',
      'Balançar o tronco para mover mais peso.'
    ],
    dicas: [
      'Mantenha um pé à frente do outro para ganhar base.',
      'Concentre-se em aproximar os cotovelos, não apenas as mãos.'
    ]
  },
  {
    id: 'peito-supino-maquina',
    nome: 'Supino articulado na máquina',
    grupo: 'Peito',
    equipamento: 'Academia completa',
    equip: 'maquina',
    composto: true,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '3 × 10',
    descansoSeg: 60,
    cargaBaseKg: 30,
    descricao: 'Estabilidade guiada ideal para focar na força do peitoral com segurança.',
    comoFazer: [
      'Ajuste o assento para alinhar as pegadas ao meio do peito.',
      'Empurre as alças mantendo os ombros baixos e colados ao encosto.',
      'Volte controlando o peso sem deixar as placas baterem.'
    ],
    erroComum: 'Descolar as costas do apoio no final do empurrão.',
    errosComuns: [
      'Descolar as costas do apoio no final do empurrão.',
      'Posicionar o banco alto demais.'
    ],
    dicas: [
      'Pressione a cabeça e as costas contra o estofado.',
      'Pare um centímetro antes de as placas encostarem na descida.'
    ]
  },
  {
    id: 'peito-mergulho-paralelas',
    nome: 'Mergulho nas paralelas',
    grupo: 'Peito',
    equipamento: 'Ao ar livre',
    equip: 'paralelas',
    composto: true,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Avançado',
    cuidado: 'Ombro',
    seriesPadrao: '3 × 10',
    descansoSeg: 75,
    cargaBaseKg: 0,
    descricao: 'Força calistênica intensa para a porção inferior do peito e tríceps.',
    comoFazer: [
      'Apoie-se nas barras e incline suavemente o tronco à frente.',
      'Flexione os cotovelos até alinharem com a altura dos ombros.',
      'Suba estendendo os braços com controle e sem balanço.'
    ],
    erroComum: 'Descer além do limite articular do ombro ou balançar as pernas.',
    errosComuns: [
      'Descer além do limite articular do ombro.',
      'Balançar as pernas para ganhar impulso.'
    ],
    dicas: [
      'Incline o peito levemente para a frente para recrutar mais o peitoral.',
      'Mantenha os ombros longe das orelhas no topo.'
    ]
  },

  // ================= COSTAS (7) =================
  {
    id: 'costas-puxada-alta',
    nome: 'Puxada alta na polia',
    grupo: 'Costas',
    equipamento: 'Academia completa',
    equip: 'polia',
    composto: true,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '4 × 10',
    descansoSeg: 75,
    cargaBaseKg: 35,
    descricao: 'Constrói largura dorsal com trajetória vertical controlada.',
    comoFazer: [
      'Segure a barra além da largura dos ombros e prenda as coxas.',
      'Puxe a barra até o topo do peito abrindo o tórax.',
      'Suba os braços devagar sentindo as costas alongarem.'
    ],
    erroComum: 'Jogar o corpo para trás usando a lombar ou puxar atrás da nuca.',
    errosComuns: [
      'Jogar o corpo para trás usando a lombar.',
      'Puxar a barra atrás do pescoço.'
    ],
    dicas: [
      'Pense em puxar com os cotovelos em direção aos bolsos.',
      'Inicie cada repetição abaixando as escápulas.'
    ]
  },
  {
    id: 'costas-remada-curvada-barra',
    nome: 'Remada curvada com barra',
    grupo: 'Costas',
    equipamento: 'Academia completa',
    equip: 'barra',
    composto: true,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Intermediário',
    cuidado: 'Lombar',
    seriesPadrao: '4 × 8',
    descansoSeg: 90,
    cargaBaseKg: 35,
    descricao: 'Espessura e densidade para toda a cadeia posterior do tronco.',
    comoFazer: [
      'Incline o tronco a 45 graus mantendo a coluna neutra.',
      'Puxe a barra na direção do umbigo aproximando as escápulas.',
      'Desça a barra de forma controlada sem arredondar as costas.'
    ],
    erroComum: 'Arredondar a lombar ou levantar o tronco para dar impulso.',
    errosComuns: [
      'Arredondar a lombar durante a série.',
      'Subir o tronco a cada repetição para roubar.'
    ],
    dicas: [
      'Mantenha o olhar voltado para o chão cerca de dois metros à frente.',
      'Flexione levemente os joelhos para aliviar os posteriores.'
    ]
  },
  {
    id: 'costas-remada-unilateral-halter',
    nome: 'Remada unilateral com halter',
    grupo: 'Costas',
    equipamento: 'Em casa com halteres',
    equip: 'halteres',
    composto: true,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '3 × 10',
    descansoSeg: 60,
    cargaBaseKg: 14,
    descricao: 'Corrige assimetrias com apoio estável para a coluna.',
    comoFazer: [
      'Apoie uma mão no banco e deixe o tronco paralelo ao chão.',
      'Traga o halter ao quadril mantendo o cotovelo rente ao corpo.',
      'Alongue bem embaixo antes da próxima repetição.'
    ],
    erroComum: 'Girar o tronco ao puxar ou levar o peso em direção ao ombro.',
    errosComuns: [
      'Girar o tronco para puxar o peso.',
      'Puxar o halter em direção ao ombro usando só o bíceps.'
    ],
    dicas: [
      'Puxe o peso desenhando uma linha curva até o bolso da calça.',
      'Mantenha o braço de apoio firme empurrando o banco.'
    ]
  },
  {
    id: 'costas-remada-baixa-cabo',
    nome: 'Remada baixa no cabo',
    grupo: 'Costas',
    equipamento: 'Academia completa',
    equip: 'cabo-baixo',
    composto: true,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '4 × 10',
    descansoSeg: 75,
    cargaBaseKg: 35,
    descricao: 'Fortalece o meio das costas e melhora a postura torácica.',
    comoFazer: [
      'Sente-se com os joelhos semiflexionados e o peito aberto.',
      'Puxe o triângulo até o abdômen apertando o meio das costas.',
      'Retorne devagar mantendo a postura firme.'
    ],
    erroComum: 'Balançar o tronco para frente e para trás ou subir os ombros.',
    errosComuns: [
      'Balançar o tronco para frente e para trás.',
      'Elevar os ombros junto às orelhas.'
    ],
    dicas: [
      'Segure meio segundo quando o puxador encostar no abdômen.',
      'Mantenha o peito orgulhoso durante toda a volta.'
    ]
  },
  {
    id: 'costas-barra-fixa-pronada',
    nome: 'Barra fixa pronada',
    grupo: 'Costas',
    equipamento: 'Ao ar livre',
    equip: 'barra-fixa',
    composto: true,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Avançado',
    cuidado: 'Ombro',
    seriesPadrao: '4 × 8',
    descansoSeg: 90,
    cargaBaseKg: 0,
    descricao: 'Clássico absoluto de força relativa para dorsais e core.',
    comoFazer: [
      'Segure a barra com as mãos além da linha dos ombros.',
      'Ative as escápulas e puxe o corpo até o queixo passar a barra.',
      'Desça controlando o movimento até estender os braços.'
    ],
    erroComum: 'Chutar o ar para subir ou fazer meias repetições sem estender os braços.',
    errosComuns: [
      'Chutar o ar para subir.',
      'Fazer meias repetições sem descer por completo.'
    ],
    dicas: [
      'Cruze ou estenda as pernas à frente para evitar balanço.',
      'Pense em levar o peito ao encontro da barra.'
    ]
  },
  {
    id: 'costas-pulldown-polia',
    nome: 'Pulldown com braços estendidos',
    grupo: 'Costas',
    equipamento: 'Academia completa',
    equip: 'polia-reta',
    composto: false,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '3 × 12',
    descansoSeg: 60,
    cargaBaseKg: 17.5,
    descricao: 'Isola as dorsais sem exigir fadiga dos bíceps.',
    comoFazer: [
      'Fique em pé diante da polia alta e incline levemente o tronco.',
      'Com os braços quase retos, desça a barra até tocar as coxas.',
      'Volte devagar mantendo a tensão nas dorsais.'
    ],
    erroComum: 'Dobrar demais os cotovelos transformando o exercício em tríceps.',
    errosComuns: [
      'Dobrar demais os cotovelos virando tríceps.',
      'Perder o alinhamento da coluna.'
    ],
    dicas: [
      'Imagine que está fechando uma porta pesada com os braços.',
      'Solte o ar enquanto aproxima a barra das coxas.'
    ]
  },
  {
    id: 'costas-remada-invertida',
    nome: 'Remada invertida no apoio',
    grupo: 'Costas',
    equipamento: 'Em casa só com o corpo',
    equip: 'corpo',
    composto: true,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '3 × 12',
    descansoSeg: 60,
    cargaBaseKg: 0,
    descricao: 'Excelente puxada horizontal usando apenas o peso corporal.',
    comoFazer: [
      'Posicione-se sob uma barra baixa com o corpo alinhado.',
      'Puxe o peito em direção à barra mantendo o abdômen firme.',
      'Desça devagar sem deixar o quadril cair.'
    ],
    erroComum: 'Dobrar o quadril e perder a linha reta do corpo.',
    errosComuns: [
      'Dobrar o quadril e perder a linha reta do corpo.',
      'Puxar apenas com o pescoço.'
    ],
    dicas: [
      'Quanto mais paralelos ao chão os pés estiverem, mais intenso fica.',
      'Dobre os joelhos se precisar deixar o movimento mais leve.'
    ]
  },

  // ================= PERNAS (7) =================
  {
    id: 'pernas-agachamento-livre',
    nome: 'Agachamento livre com barra',
    grupo: 'Pernas',
    equipamento: 'Academia completa',
    equip: 'barra',
    composto: true,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Intermediário',
    cuidado: 'Joelho',
    seriesPadrao: '4 × 8',
    descansoSeg: 90,
    cargaBaseKg: 45,
    descricao: 'Construtor global de força para quadríceps, glúteos e estabilidade central.',
    comoFazer: [
      'Apoie a barra no trapézio e afaste os pés na largura dos ombros.',
      'Desça flexionando quadris e joelhos como se fosse sentar.',
      'Empurre o chão com os pés inteiros para voltar ao topo.'
    ],
    erroComum: 'Deixar os joelhos caírem para dentro na subida ou levantar os calcanhares.',
    errosComuns: [
      'Deixar os joelhos caírem para dentro na subida.',
      'Tirar os calcanhares do chão.'
    ],
    dicas: [
      'Aponte os joelhos na mesma direção da ponta dos pés.',
      'Encha o abdômen de ar antes de iniciar cada descida.'
    ]
  },
  {
    id: 'pernas-agachamento-calice',
    nome: 'Agachamento cálice com halter',
    grupo: 'Pernas',
    equipamento: 'Em casa com halteres',
    equip: 'halteres',
    composto: true,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '4 × 10',
    descansoSeg: 75,
    cargaBaseKg: 14,
    descricao: 'Ensina o padrão perfeito de agachar mantendo o tronco ereto.',
    comoFazer: [
      'Segure um halter encostado ao peito com os dois braços.',
      'Agache mantendo o tronco alto e cotovelos entre os joelhos.',
      'Suba empurrando o chão e mantendo o abdômen firme.'
    ],
    erroComum: 'Afastar o halter do peito forçando a lombar.',
    errosComuns: [
      'Afastar o halter do peito forçando a lombar.',
      'Descer rápido sem controle no fundo.'
    ],
    dicas: [
      'Mantenha o peso colado ao osso esterno o tempo inteiro.',
      'Pause meio segundo na posição mais baixa.'
    ]
  },
  {
    id: 'pernas-leg-press-45',
    nome: 'Leg press 45 graus',
    grupo: 'Pernas',
    equipamento: 'Academia completa',
    equip: 'maquina',
    composto: true,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Iniciante',
    cuidado: 'Joelho',
    seriesPadrao: '4 × 10',
    descansoSeg: 75,
    cargaBaseKg: 80,
    descricao: 'Alto estímulo para coxas e glúteos com a coluna totalmente apoiada.',
    comoFazer: [
      'Apoie a lombar e o quadril inteiramente no encosto.',
      'Desça a plataforma até os joelhos formarem 90 graus.',
      'Empurre pelos calcanhares sem travar os joelhos no topo.'
    ],
    erroComum: 'Esticar e travar os joelhos no final ou tirar o quadril do banco.',
    errosComuns: [
      'Esticar e travar os joelhos no topo.',
      'Descer tanto a ponto de o quadril sair do banco.'
    ],
    dicas: [
      'Use as alças laterais para puxar o quadril contra o assento.',
      'Empurre a plataforma principalmente pelos calcanhares.'
    ]
  },
  {
    id: 'pernas-stiff-romeno-halteres',
    nome: 'Stiff romeno com halteres',
    grupo: 'Pernas',
    equipamento: 'Em casa com halteres',
    equip: 'halteres-duplo',
    composto: true,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Intermediário',
    cuidado: 'Lombar',
    seriesPadrao: '4 × 10',
    descansoSeg: 75,
    cargaBaseKg: 16,
    descricao: 'Fortalece posteriores de coxa e glúteos pelo movimento de dobradiça do quadril.',
    comoFazer: [
      'Segure os halteres rente às coxas com joelhos destravados.',
      'Leve o quadril para trás alongando a parte posterior da coxa.',
      'Suba contraindo os glúteos e mantendo a coluna neutra.'
    ],
    erroComum: 'Afastar os pesos das pernas ou curvar a lombar tentando tocar o chão.',
    errosComuns: [
      'Afastar os pesos das pernas durante a descida.',
      'Curvar a lombar tentando tocar o chão.'
    ],
    dicas: [
      'Imagine que quer fechar uma gaveta atrás de você com o quadril.',
      'Desça apenas até onde sua coluna permanece perfeitamente reta.'
    ]
  },
  {
    id: 'pernas-agachamento-bulgaro',
    nome: 'Agachamento búlgaro',
    grupo: 'Pernas',
    equipamento: 'Em casa só com o corpo',
    equip: 'banco-apoio',
    composto: true,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Intermediário',
    cuidado: 'Joelho',
    seriesPadrao: '3 × 10',
    descansoSeg: 75,
    cargaBaseKg: 10,
    descricao: 'Força unilateral poderosa para equilíbrio, glúteos e quadríceps.',
    comoFazer: [
      'Apoie o dorso de um pé no banco atrás de você.',
      'Desça verticalmente flexionando a perna da frente com controle.',
      'Empurre o chão com o calcanhar da frente para subir.'
    ],
    erroComum: 'Alinhar os pés como numa corda bamba e empurrar com a perna de trás.',
    errosComuns: [
      'Ficar em linha estreita como numa corda bamba e perder o equilíbrio.',
      'Empurrar com a perna de trás em vez da perna da frente.'
    ],
    dicas: [
      'Incline levemente o tronco à frente para ativar mais o glúteo.',
      'Deixe cerca de 85% do peso na perna da frente.'
    ]
  },
  {
    id: 'pernas-elevacao-pelvica',
    nome: 'Elevação pélvica',
    grupo: 'Pernas',
    equipamento: 'Em casa só com o corpo',
    equip: 'ponte-quadril',
    composto: true,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '4 × 12',
    descansoSeg: 60,
    cargaBaseKg: 30,
    descricao: 'Ativação direta de glúteos sem compressão axial na coluna.',
    comoFazer: [
      'Apoie o alto das costas no banco ou deite no solo.',
      'Eleve o quadril até alinhar joelhos, quadril e ombros.',
      'Segure um segundo no topo e desça devagar.'
    ],
    erroComum: 'Arquear demais a lombar no topo ou afastar os pés dos glúteos.',
    errosComuns: [
      'Arqueamento excessivo da lombar no topo.',
      'Deixar os pés muito longe dos glúteos.'
    ],
    dicas: [
      'Mantenha o queixo levemente recolhido olhando para a frente.',
      'Canelas devem ficar verticais no ponto alto do movimento.'
    ]
  },
  {
    id: 'pernas-panturrilha-em-pe',
    nome: 'Elevação de panturrilhas em pé',
    grupo: 'Pernas',
    equipamento: 'Em casa só com o corpo',
    equip: 'degrau',
    composto: false,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '4 × 15',
    descansoSeg: 45,
    cargaBaseKg: 0,
    descricao: 'Essencial para estabilidade do tornozelo e impulsão na corrida.',
    comoFazer: [
      'Apoie a ponta dos pés num degrau com calcanhares livres.',
      'Suba o máximo na ponta dos pés e pause um segundo.',
      'Desça alongando os calcanhares abaixo da linha do degrau.'
    ],
    erroComum: 'Fazer repetições curtas quicando ou dobrar os joelhos na subida.',
    errosComuns: [
      'Fazer repetições curtas e rápidas quicando.',
      'Dobrar os joelhos durante a subida.'
    ],
    dicas: [
      'Faça uma pausa real de um segundo no topo e um segundo no fundo.',
      'Pressione o chão principalmente pelo dedão do pé.'
    ]
  },

  // ================= OMBROS (6) =================
  {
    id: 'ombros-desenvolvimento-halteres',
    nome: 'Desenvolvimento com halteres',
    grupo: 'Ombros',
    equipamento: 'Em casa com halteres',
    equip: 'halteres-alto',
    composto: true,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: 'Ombro',
    seriesPadrao: '4 × 10',
    descansoSeg: 75,
    cargaBaseKg: 12,
    descricao: 'Força vertical para deltoides com trajetória natural da escápula.',
    comoFazer: [
      'Sente-se com as costas apoiadas e halteres na linha do queixo.',
      'Empurre os pesos acima da cabeça em trajetória firme.',
      'Desça controlando até os cotovelos alinharem aos ombros.'
    ],
    erroComum: 'Arquear excessivamente a lombar ou bater os halteres no topo.',
    errosComuns: [
      'Arquear excessivamente a lombar.',
      'Bater um halter no outro no topo.'
    ],
    dicas: [
      'Mantenha os cotovelos levemente apontados para a frente.',
      'Contraia o abdômen para proteger a coluna.'
    ]
  },
  {
    id: 'ombros-elevacao-lateral',
    nome: 'Elevação lateral com halteres',
    grupo: 'Ombros',
    equipamento: 'Em casa com halteres',
    equip: 'halteres',
    composto: false,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '4 × 12',
    descansoSeg: 60,
    cargaBaseKg: 8,
    descricao: 'Destaca a porção lateral dos ombros com controle fino.',
    comoFazer: [
      'Em pé, segure os halteres ao lado com leve flexão nos cotovelos.',
      'Eleve os braços lateralmente até a altura dos ombros.',
      'Desça resistindo ao peso sem balançar o tronco.'
    ],
    erroComum: 'Usar impulso do quadril ou encolher os trapézios junto às orelhas.',
    errosComuns: [
      'Usar impulso do quadril para levantar cargas altas.',
      'Subir os trapézios junto às orelhas.'
    ],
    dicas: [
      'Pense em empurrar os pesos para longe das paredes laterais.',
      'Suba com os cotovelos liderando o movimento.'
    ]
  },
  {
    id: 'ombros-crucifixo-inverso',
    nome: 'Crucifixo inverso para posterior',
    grupo: 'Ombros',
    equipamento: 'Em casa com halteres',
    equip: 'inclinado',
    composto: false,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '3 × 12',
    descansoSeg: 60,
    cargaBaseKg: 6,
    descricao: 'Equilibra a saúde dos ombros fortalecendo a parte posterior.',
    comoFazer: [
      'Incline o tronco à frente mantendo a coluna reta.',
      'Abra os braços lateralmente focando na parte de trás dos ombros.',
      'Retorne devagar sem juntar os pesos com impulso.'
    ],
    erroComum: 'Erguer o tronco durante a série ou puxar só com as escápulas.',
    errosComuns: [
      'Juntar as escápulas usando apenas o meio das costas.',
      'Erguer o tronco durante a série.'
    ],
    dicas: [
      'Apoie a testa na ponta de um banco inclinado se quiser mais estabilidade.',
      'Use pesos leves para sentir exatamente a parte de trás do ombro.'
    ]
  },
  {
    id: 'ombros-puxada-face-corda',
    nome: 'Puxada alta para a face na corda',
    grupo: 'Ombros',
    equipamento: 'Academia completa',
    equip: 'polia',
    composto: false,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '3 × 15',
    descansoSeg: 60,
    cargaBaseKg: 15,
    descricao: 'Blindagem articular para manguito rotador e postura.',
    comoFazer: [
      'Ajuste a polia na altura do rosto com a corda.',
      'Puxe as pontas da corda em direção às orelhas abrindo os cotovelos.',
      'Segure um segundo na contração e retorne com controle.'
    ],
    erroComum: 'Colocar carga excessiva perdendo a rotação externa ou projetar o pescoço.',
    errosComuns: [
      'Colocar carga excessiva e perder a rotação externa.',
      'Projetar o pescoço à frente.'
    ],
    dicas: [
      'Aponte os polegares para trás no final da puxada.',
      'Mantenha os cotovelos altos na linha dos ombros.'
    ]
  },
  {
    id: 'ombros-desenvolvimento-rotacional',
    nome: 'Desenvolvimento rotacional',
    grupo: 'Ombros',
    equipamento: 'Em casa com halteres',
    equip: 'rotacao',
    composto: true,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Intermediário',
    cuidado: 'Ombro',
    seriesPadrao: '3 × 10',
    descansoSeg: 75,
    cargaBaseKg: 10,
    descricao: 'Trabalha as três porções do ombro em uma transição fluida.',
    comoFazer: [
      'Segure os halteres à frente dos ombros com palmas para você.',
      'Gire os punhos enquanto empurra os pesos acima da cabeça.',
      'Inverta o giro suavemente durante a descida.'
    ],
    erroComum: 'Girar rápido demais perdendo estabilidade no tronco.',
    errosComuns: [
      'Girar rápido demais perdendo estabilidade.',
      'Deixar os cotovelos caírem demais à frente.'
    ],
    dicas: [
      'Faça o giro e o empurrão como um único movimento contínuo.',
      'Não trave totalmente os cotovelos no topo.'
    ]
  },
  {
    id: 'ombros-elevacao-frontal',
    nome: 'Elevação frontal controlada',
    grupo: 'Ombros',
    equipamento: 'Em casa com halteres',
    equip: 'frontal',
    composto: false,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '3 × 12',
    descansoSeg: 60,
    cargaBaseKg: 8,
    descricao: 'Foco direto na porção anterior dos deltoides.',
    comoFazer: [
      'Segure os halteres à frente das coxas com postura firme.',
      'Eleve os braços à frente até a linha dos olhos.',
      'Desça de forma pausada sem jogar o quadril.'
    ],
    erroComum: 'Subir além da linha dos olhos ou balançar o tronco para trás.',
    errosComuns: [
      'Ultrapassar a linha dos ombros sem necessidade.',
      'Balançar o tronco para trás.'
    ],
    dicas: [
      'Prefira pegada neutra para maior conforto no ombro.',
      'Conte dois segundos inteiros na descida.'
    ]
  },

  // ================= BRAÇOS (6) =================
  {
    id: 'bracos-rosca-direta-barra',
    nome: 'Rosca direta com barra',
    grupo: 'Braços',
    equipamento: 'Academia completa',
    equip: 'barra',
    composto: false,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '3 × 10',
    descansoSeg: 60,
    cargaBaseKg: 20,
    descricao: 'Construção clássica de força e volume para os bíceps.',
    comoFazer: [
      'Segure a barra na largura dos ombros com cotovelos junto ao tronco.',
      'Suba a barra contraindo os bíceps sem mover os ombros.',
      'Desça devagar até estender completamente os braços.'
    ],
    erroComum: 'Jogar as costas para trás ou avançar os cotovelos para subir a barra.',
    errosComuns: [
      'Jogar as costas para trás para subir a barra.',
      'Levar os cotovelos para a frente no topo.'
    ],
    dicas: [
      'Contraia os glúteos para travar o quadril no lugar.',
      'Aperte forte os bíceps no ponto alto por um segundo.'
    ]
  },
  {
    id: 'bracos-rosca-alternada-halteres',
    nome: 'Rosca alternada com halteres',
    grupo: 'Braços',
    equipamento: 'Em casa com halteres',
    equip: 'halteres',
    composto: false,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '3 × 12',
    descansoSeg: 60,
    cargaBaseKg: 10,
    descricao: 'Permite supinação completa do antebraço a cada repetição.',
    comoFazer: [
      'Em pé ou sentado, mantenha os halteres ao lado das coxas.',
      'Suba um braço de cada vez girando a palma para cima.',
      'Controle toda a descida antes de iniciar o outro lado.'
    ],
    erroComum: 'Subir um braço enquanto o outro despenca sem controle.',
    errosComuns: [
      'Começar a subir um braço enquanto o outro despenca.',
      'Girar o tronco para ajudar.'
    ],
    dicas: [
      'Tente girar o dedo mínimo levemente para fora no topo.',
      'Mantenha os ombros relaxados e baixos.'
    ]
  },
  {
    id: 'bracos-rosca-martelo',
    nome: 'Rosca martelo neutra',
    grupo: 'Braços',
    equipamento: 'Em casa com halteres',
    equip: 'martelo',
    composto: false,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '3 × 12',
    descansoSeg: 60,
    cargaBaseKg: 10,
    descricao: 'Fortalece braquial e antebraços com pegada neutra.',
    comoFazer: [
      'Segure os halteres com as palmas voltadas uma para a outra.',
      'Flexione os cotovelos mantendo a pegada neutra o tempo todo.',
      'Desça pausadamente fortalecendo antebraços e braquial.'
    ],
    erroComum: 'Afastar os cotovelos das costelas ou encurtar a descida.',
    errosComuns: [
      'Afastar os cotovelos das costelas.',
      'Encurtar o movimento na metade.'
    ],
    dicas: [
      'Aperte bem o cabo do halter para recrutar os extensores do punho.',
      'Evite balançar os joelhos.'
    ]
  },
  {
    id: 'bracos-triceps-polia-corda',
    nome: 'Tríceps na polia com corda',
    grupo: 'Braços',
    equipamento: 'Academia completa',
    equip: 'polia',
    composto: false,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '4 × 12',
    descansoSeg: 60,
    cargaBaseKg: 17.5,
    descricao: 'Isolamento eficiente para as três cabeças do tríceps.',
    comoFazer: [
      'Fixe os cotovelos ao lado das costelas diante da polia alta.',
      'Estenda os antebraços para baixo abrindo a corda no final.',
      'Suba controlando até os antebraços passarem de 90 graus.'
    ],
    erroComum: 'Deixar os cotovelos subirem junto com a corda ou curvar os ombros.',
    errosComuns: [
      'Deixar os cotovelos subirem junto com a corda.',
      'Curvar os ombros sobre a barra.'
    ],
    dicas: [
      'Imagine que seus cotovelos estão presos por um pino fixo.',
      'Abra as pontas da corda apenas no terço final da descida.'
    ]
  },
  {
    id: 'bracos-triceps-testa-halteres',
    nome: 'Tríceps testa com halteres',
    grupo: 'Braços',
    equipamento: 'Em casa com halteres',
    equip: 'banco-testa',
    composto: false,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Intermediário',
    cuidado: null,
    seriesPadrao: '3 × 10',
    descansoSeg: 60,
    cargaBaseKg: 10,
    descricao: 'Alongamento profundo da cabeça longa do tríceps com pegada neutra.',
    comoFazer: [
      'Deite no banco segurando os halteres acima dos ombros.',
      'Flexione apenas os cotovelos descendo os pesos ao lado da têmpora.',
      'Estenda os braços mantendo os cotovelos apontados para o teto.'
    ],
    erroComum: 'Abrir os cotovelos para os lados ou mover os ombros na subida.',
    errosComuns: [
      'Abrir os cotovelos para os lados.',
      'Mover os ombros como num pull-over.'
    ],
    dicas: [
      'Incline os braços 10 graus para trás para manter tensão no topo.',
      'Desça de forma bem lenta para proteger os cotovelos.'
    ]
  },
  {
    id: 'bracos-mergulho-apoio',
    nome: 'Mergulho para tríceps no apoio',
    grupo: 'Braços',
    equipamento: 'Em casa só com o corpo',
    equip: 'corpo',
    composto: false,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: 'Ombro',
    seriesPadrao: '3 × 12',
    descansoSeg: 60,
    cargaBaseKg: 0,
    descricao: 'Força prática para tríceps usando banco ou cadeira firme.',
    comoFazer: [
      'Apoie as mãos na borda de um banco firme com quadril próximo.',
      'Desça dobrando os cotovelos para trás até 90 graus.',
      'Empurre de volta mantendo o peito aberto.'
    ],
    erroComum: 'Afastar o quadril para longe do banco sobrecarregando a frente do ombro.',
    errosComuns: [
      'Afastar o quadril para longe do banco sobrecarregando o ombro.',
      'Encolher o pescoço na descida.'
    ],
    dicas: [
      'Mantenha as costas raspando de leve na borda do banco.',
      'Aponte os cotovelos diretamente para trás.'
    ]
  },

  // ================= CORE (6) =================
  {
    id: 'core-prancha-firme',
    nome: 'Prancha abdominal firme',
    grupo: 'Core',
    equipamento: 'Em casa só com o corpo',
    equip: 'corpo',
    composto: false,
    porTempo: true,
    duracaoSerieSeg: 45,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '3 × 45s',
    descansoSeg: 20,
    cargaBaseKg: 0,
    descricao: 'Estabilidade antiextensão para proteger a coluna em todos os treinos.',
    comoFazer: [
      'Apoie os antebraços no chão alinhados abaixo dos ombros.',
      'Contraia abdômen e glúteos formando uma prancha reta.',
      'Respire de maneira calma mantendo a posição firme.'
    ],
    erroComum: 'Deixar o quadril afundar forçando a lombar ou prender a respiração.',
    errosComuns: [
      'Deixar o quadril afundar forçando a lombar.',
      'Prender a respiração.'
    ],
    dicas: [
      'Puxe imaginariamente os cotovelos na direção da ponta dos pés.',
      'Mantenha o pescoço longo olhando entre as mãos.'
    ]
  },
  {
    id: 'core-elevacao-pernas-solo',
    nome: 'Elevação de pernas no solo',
    grupo: 'Core',
    equipamento: 'Em casa só com o corpo',
    equip: 'solo-pernas',
    composto: false,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: 'Lombar',
    seriesPadrao: '3 × 12',
    descansoSeg: 20,
    cargaBaseKg: 0,
    descricao: 'Foco na porção inferior do abdômen e controle pélvico.',
    comoFazer: [
      'Deite de barriga para cima e cole a lombar no chão.',
      'Eleve as pernas unidas até formarem 90 graus com o tronco.',
      'Desça devagar até onde a lombar continuar firme no solo.'
    ],
    erroComum: 'Deixar a lombar descolar do chão durante a descida das pernas.',
    errosComuns: [
      'Deixar a lombar descolar do chão na descida.',
      'Dar impulso com os pés.'
    ],
    dicas: [
      'Dobre levemente os joelhos se sentir tensão na lombar.',
      'Solte o ar enquanto controla a descida das pernas.'
    ]
  },
  {
    id: 'core-estabilizacao-alternada',
    nome: 'Estabilização alternada no solo',
    grupo: 'Core',
    equipamento: 'Em casa só com o corpo',
    equip: 'solo-cruzado',
    composto: false,
    porTempo: false,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '3 × 12',
    descansoSeg: 20,
    cargaBaseKg: 0,
    descricao: 'Coordenação profunda do centro do corpo sem pressão na coluna.',
    comoFazer: [
      'Deitado, eleve braços para o teto e joelhos a 90 graus.',
      'Estenda devagar um braço para trás e a perna oposta à frente.',
      'Volte ao centro com a lombar no chão e troque o lado.'
    ],
    erroComum: 'Apressar o movimento perdendo a coordenação ou subir as costelas.',
    errosComuns: [
      'Apressar o movimento perdendo a coordenação.',
      'Permitir que as costelas subam.'
    ],
    dicas: [
      'Imagine que está esmagando uma folha de papel sob a lombar.',
      'Mova braço e perna exatamente na mesma velocidade.'
    ]
  },
  {
    id: 'core-prancha-lateral',
    nome: 'Prancha lateral por lado',
    grupo: 'Core',
    equipamento: 'Em casa só com o corpo',
    equip: 'lateral',
    composto: false,
    porTempo: true,
    duracaoSerieSeg: 30,
    passoCargaKg: 1,
    nivel: 'Intermediário',
    cuidado: null,
    seriesPadrao: '3 × 30s',
    descansoSeg: 20,
    cargaBaseKg: 0,
    descricao: 'Fortalece oblíquos e estabilizadores laterais do quadril.',
    comoFazer: [
      'Apoie um antebraço no chão e alinhe pés, quadril e ombro.',
      'Eleve o quadril mantendo a cintura lateral firme.',
      'Troque de lado após concluir o tempo da série.'
    ],
    erroComum: 'Deixar o tronco girar para a frente ou afundar o ombro de apoio.',
    errosComuns: [
      'Deixar o tronco girar para frente.',
      'Afundar o ombro de apoio.'
    ],
    dicas: [
      'Empurre o chão para longe com o antebraço apoiado.',
      'Coloque um pé à frente do outro se quiser mais equilíbrio.'
    ]
  },
  {
    id: 'core-abdominal-polia',
    nome: 'Abdominal supra na polia',
    grupo: 'Core',
    equipamento: 'Academia completa',
    equip: 'polia',
    composto: false,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Intermediário',
    cuidado: null,
    seriesPadrao: '3 × 15',
    descansoSeg: 30,
    cargaBaseKg: 22.5,
    descricao: 'Permite progressão de carga direta para a parede abdominal.',
    comoFazer: [
      'Ajoelhe-se diante da polia alta segurando a corda junto à têmpora.',
      'Enrole o tronco para baixo aproximando as costelas do quadril.',
      'Suba controlando o peso sem sentar nos calcanhares.'
    ],
    erroComum: 'Inclinar o quadril com o tronco reto ou puxar usando os braços.',
    errosComuns: [
      'Inclinar o quadril com o tronco reto sem dobrar o abdômen.',
      'Puxar a corda com a força dos braços.'
    ],
    dicas: [
      'Mantenha o quadril parado no espaço e mova apenas a coluna.',
      'Solte todo o ar no ponto de maior contração.'
    ]
  },
  {
    id: 'core-prensa-antirotacao',
    nome: 'Prensa antirotação no cabo',
    grupo: 'Core',
    equipamento: 'Academia completa',
    equip: 'cabo-antirotacao',
    composto: false,
    porTempo: false,
    passoCargaKg: 2.5,
    nivel: 'Intermediário',
    cuidado: null,
    seriesPadrao: '3 × 12',
    descansoSeg: 30,
    cargaBaseKg: 12.5,
    descricao: 'Estabilidade rotacional essencial para corrida e levantamentos.',
    comoFazer: [
      'Fique de lado para a polia segurando a alça no peito.',
      'Estenda os braços à frente resistindo à puxada lateral do cabo.',
      'Segure dois segundos e recolha devagar ao peito.'
    ],
    erroComum: 'Deixar os ombros girarem na direção do aparelho ou juntar demais os pés.',
    errosComuns: [
      'Deixar os ombros girarem em direção ao aparelho.',
      'Juntar demais os pés perdendo a base.'
    ],
    dicas: [
      'Mantenha joelhos destravados e pés na largura dos ombros.',
      'Respire normalmente enquanto segura os braços à frente.'
    ]
  },

  // ================= MOBILIDADE (6 — A4: 6 regiões distintas) =================
  {
    id: 'mobilidade-gato-camelo',
    nome: 'Mobilidade de coluna em quatro apoios',
    grupo: 'Mobilidade',
    equipamento: 'Em casa só com o corpo',
    equip: 'coluna',
    regiao: 'coluna',
    movimentoWarmup: 'coluna',
    instrucaoWarmup: 'Arredonde e abra a coluna devagar, sincronizando com a respiração.',
    composto: false,
    porTempo: true,
    duracaoSerieSeg: 35,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '2 × 35s',
    descansoSeg: 20,
    cargaBaseKg: 0,
    descricao: 'Solta vértebra por vértebra e prepara a coluna para o dia.',
    comoFazer: [
      'Posicione mãos sob os ombros e joelhos sob os quadris.',
      'Arredonde suavemente as costas empurrando o chão e soltando o ar.',
      'Inverta abrindo o peito e olhando à frente enquanto inspira.'
    ],
    erroComum: 'Fazer o movimento rápido demais sem respirar ou dobrar os cotovelos.',
    errosComuns: [
      'Fazer o movimento rápido demais sem respirar.',
      'Dobrar os cotovelos durante a transição.'
    ],
    dicas: [
      'Inicie cada onda pelo movimento do quadril.',
      'Sincronize cada fase com uma respiração longa.'
    ]
  },
  {
    id: 'mobilidade-rotacao-toracica',
    nome: 'Rotação torácica e ombros',
    grupo: 'Mobilidade',
    equipamento: 'Em casa só com o corpo',
    equip: 'toracica',
    regiao: 'toracica',
    movimentoWarmup: 'ombro',
    instrucaoWarmup: 'Gire os ombros e o tórax com amplitude, devagar, 10 vezes.',
    composto: false,
    porTempo: true,
    duracaoSerieSeg: 35,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '2 × 35s',
    descansoSeg: 20,
    cargaBaseKg: 0,
    descricao: 'Abre o tórax e melhora a mecânica dos ombros.',
    comoFazer: [
      'Em quatro apoios, apoie uma mão leve atrás da nuca.',
      'Leve o cotovelo na direção do braço apoiado no chão.',
      'Gire abrindo o peito e apontando o cotovelo para o teto.'
    ],
    erroComum: 'Puxar o pescoço com a mão ou deslocar o quadril para o lado.',
    errosComuns: [
      'Puxar o pescoço com a mão.',
      'Deslocar o quadril para o lado ao girar.'
    ],
    dicas: [
      'Acompanhe o cotovelo com o olhar durante a subida.',
      'Empurre o chão firme com a mão de baixo.'
    ]
  },
  {
    id: 'mobilidade-abertura-quadril-90',
    nome: 'Transição de quadril 90-90',
    grupo: 'Mobilidade',
    equipamento: 'Em casa só com o corpo',
    equip: 'quadril',
    regiao: 'quadril',
    movimentoWarmup: 'quadril',
    instrucaoWarmup: 'Alterne os joelhos de um lado para o outro mantendo o tronco alto.',
    composto: false,
    porTempo: true,
    duracaoSerieSeg: 40,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '2 × 40s',
    descansoSeg: 20,
    cargaBaseKg: 0,
    descricao: 'Libera a rotação interna e externa dos quadris para agachar e correr.',
    comoFazer: [
      'Sente-se no chão com as duas pernas dobradas a 90 graus.',
      'Gire os dois joelhos para o outro lado com o tronco alto.',
      'Alterne os lados de forma lenta e controlada.'
    ],
    erroComum: 'Deixar as costas desabarem para trás ou tirar os calcanhares do lugar.',
    errosComuns: [
      'Deixar as costas desabarem para trás.',
      'Tirar os calcanhares do lugar durante o giro.'
    ],
    dicas: [
      'Apoie as mãos atrás do corpo no começo se precisar de suporte.',
      'Pause dois segundos em cada lado.'
    ]
  },
  {
    id: 'mobilidade-alongamento-mundo',
    nome: 'Alongamento ativo de posteriores',
    grupo: 'Mobilidade',
    equipamento: 'Ao ar livre',
    equip: 'isquiotibiais',
    regiao: 'isquiotibiais',
    movimentoWarmup: 'agachamento',
    instrucaoWarmup: 'Desça em agachamento leve sem peso e alongue a cadeia posterior.',
    composto: false,
    porTempo: true,
    duracaoSerieSeg: 35,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '2 × 35s',
    descansoSeg: 20,
    cargaBaseKg: 0,
    descricao: 'Alongamento dinâmico para isquiotibiais, cadeia posterior e quadris.',
    comoFazer: [
      'Sente-se com uma perna estendida à frente e coluna longa.',
      'Incline o tronco a partir do quadril alcançando a direção do pé.',
      'Respire fundo soltando a tensão posterior da coxa.'
    ],
    erroComum: 'Dobrar as costas com força tentando puxar a ponta do pé.',
    errosComuns: [
      'Dobrar demais o joelho perdendo o alongamento posterior.',
      'Prender o ar durante a inclinação.'
    ],
    dicas: [
      'Mantenha o tornozelo ativo apontando os dedos para cima.',
      'Avance alguns milímetros a cada expiração.'
    ]
  },
  {
    id: 'mobilidade-dislocamento-escapular',
    nome: 'Soltura cervical e escapular',
    grupo: 'Mobilidade',
    equipamento: 'Em casa só com o corpo',
    equip: 'pescoco',
    regiao: 'pescoco',
    movimentoWarmup: 'ombro',
    instrucaoWarmup: 'Incline a cabeça suavemente de um lado ao outro relaxando os ombros.',
    composto: false,
    porTempo: true,
    duracaoSerieSeg: 30,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '2 × 30s',
    descansoSeg: 20,
    cargaBaseKg: 0,
    descricao: 'Alivia a tensão do pescoço e prepara a cintura escapular.',
    comoFazer: [
      'Em pé com os ombros baixos, incline suavemente a cabeça para o lado.',
      'Sinta alongar a lateral do pescoço sem elevar o ombro oposto.',
      'Retorne ao centro inspirando e repita para o outro lado.'
    ],
    erroComum: 'Forçar a cabeça com a mão ou levantar os ombros.',
    errosComuns: [
      'Arquear a lombar ou tensionar a mandíbula.',
      'Fazer giros bruscos com o pescoço.'
    ],
    dicas: [
      'Deixe os braços pesados ao lado do corpo.',
      'Respeite o seu limite confortável de inclinação.'
    ]
  },
  {
    id: 'mobilidade-tornozelo-parede',
    nome: 'Mobilidade de tornozelo em apoio',
    grupo: 'Mobilidade',
    equipamento: 'Em casa só com o corpo',
    equip: 'tornozelo',
    regiao: 'tornozelo',
    movimentoWarmup: 'joelhos',
    instrucaoWarmup: 'Avance o joelho à frente mantendo o calcanhar colado ao chão.',
    composto: false,
    porTempo: true,
    duracaoSerieSeg: 35,
    passoCargaKg: 1,
    nivel: 'Iniciante',
    cuidado: null,
    seriesPadrao: '2 × 35s',
    descansoSeg: 20,
    cargaBaseKg: 0,
    descricao: 'Aumenta a dorsiflexão para agachamentos profundos e passadas macias.',
    comoFazer: [
      'Posicione um pé a um palmo da parede em base firme.',
      'Avance o joelho até tocar a parede sem tirar o calcanhar.',
      'Retorne devagar e repita antes de trocar o lado.'
    ],
    erroComum: 'Levantar o calcanhar do chão ou deixar o joelho cair para dentro.',
    errosComuns: [
      'Levantar o calcanhar para conseguir tocar a parede.',
      'Deixar o joelho cair para dentro.'
    ],
    dicas: [
      'Alinhe o centro da patela com o segundo dedo do pé.',
      'Afaste o pé mais um centímetro conforme ganhar amplitude.'
    ]
  }
];

export const RUN_WORKOUTS = [
  {
    id: 'corrida-leve-20',
    nome: 'Corrida leve de 20 min',
    grupo: 'Corrida',
    equipamento: 'Ao ar livre',
    equip: 'corrida-leve',
    subtipo: 'corrida-leve',
    composto: true,
    porTempo: true,
    duracaoSerieSeg: 60,
    nivel: 'Iniciante',
    cuidado: null,
    duracaoMin: 20,
    descricao: 'Sessão curta em ritmo de conversa para criar constância aeróbica.',
    seriesPadrao: '20 min · Ritmo leve',
    descansoSeg: 0,
    comoFazer: [
      'Caminhe 3 minutos em passo firme para soltar os tornozelos.',
      'Corra 15 minutos num ritmo onde consiga conversar com calma.',
      'Desacelere nos últimos 2 minutos caminhando e respirando fundo.'
    ],
    erroComum: 'Sair rápido demais nos primeiros 3 minutos e perder o fôlego.',
    errosComuns: [
      'Sair rápido demais nos primeiros 3 minutos.',
      'Dar passadas longas batendo forte o calcanhar.'
    ],
    dicas: [
      'Mantenha os ombros baixos e o olhar no horizonte.',
      'Aterrisse com o pé logo abaixo do centro do corpo.'
    ]
  },
  {
    id: 'corrida-leve-30',
    nome: 'Rodagem leve de 30 min',
    grupo: 'Corrida',
    equipamento: 'Ao ar livre',
    equip: 'rodagem-parque',
    subtipo: 'rodagem-parque',
    composto: true,
    porTempo: true,
    duracaoSerieSeg: 60,
    nivel: 'Iniciante',
    cuidado: null,
    duracaoMin: 30,
    descricao: 'Rodagem equilibrada para desenvolver fôlego sem acumular fadiga.',
    seriesPadrao: '30 min · Cadência fluida',
    descansoSeg: 0,
    comoFazer: [
      'Comece os primeiros 5 minutos num trote bem suave.',
      'Mantenha 22 minutos de ritmo estável com braços a 90 graus.',
      'Finalize com 3 minutos de trote regenerativo.'
    ],
    erroComum: 'Tensionar ombros e punhos ao longo do percurso.',
    errosComuns: [
      'Tensionar ombros e punhos ao longo do percurso.',
      'Aumentar demais o ritmo em subidas.'
    ],
    dicas: [
      'Imagine que segura uma folha leve em cada mão sem amassá-la.',
      'Mantenha o ritmo pelo esforço percebido.'
    ]
  },
  {
    id: 'corrida-leve-40',
    nome: 'Base aeróbica de 40 min',
    grupo: 'Corrida',
    equipamento: 'Ao ar livre',
    equip: 'base-aerobica',
    subtipo: 'base-aerobica',
    composto: true,
    porTempo: true,
    duracaoSerieSeg: 60,
    nivel: 'Intermediário',
    cuidado: null,
    duracaoMin: 40,
    descricao: 'Volume contínuo para fortalecer coração, tendões e resistência mental.',
    seriesPadrao: '40 min · Ritmo constante',
    descansoSeg: 0,
    comoFazer: [
      'Aqueça 5 minutos com trote leve e mobilidade dinâmica.',
      'Sustente 30 minutos em ritmo constante e respiração ritmada.',
      'Feche com 5 minutos desacelerando gradualmente.'
    ],
    erroComum: 'Oscilar demais o ritmo a cada quilômetro.',
    errosComuns: [
      'Oscilar muito o ritmo a cada quilômetro.',
      'Ignorar sinais de sede em dias quentes.'
    ],
    dicas: [
      'Faça os primeiros 10 minutos ligeiramente mais lentos que a média.',
      'Solte os braços brevemente a cada 10 minutos para relaxar o tronco.'
    ]
  },
  {
    id: 'corrida-intervalado-400m',
    nome: 'Intervalado 6 × 400m',
    grupo: 'Corrida',
    equipamento: 'Ao ar livre',
    equip: 'intervalado',
    subtipo: 'intervalado',
    composto: true,
    porTempo: true,
    duracaoSerieSeg: 60,
    nivel: 'Intermediário',
    cuidado: 'Joelho',
    duracaoMin: 35,
    descricao: 'Estímulos controlados de velocidade para melhorar seu ritmo por quilômetro.',
    seriesPadrao: '6 × 400m · 90s trote',
    descansoSeg: 90,
    comoFazer: [
      'Aqueça 8 minutos de trote leve seguidos de duas acelerações.',
      'Corra 6 tiros de 400m firmes com 90s de trote entre eles.',
      'Desaqueça por 5 minutos caminhando devagar.'
    ],
    erroComum: 'Dar 100% no primeiro tiro e quebrar a partir do quarto.',
    errosComuns: [
      'Dar 100% no primeiro tiro e quebrar a partir do quarto.',
      'Parar totalmente de andar na pausa.'
    ],
    dicas: [
      'Tente fazer o sexto tiro no mesmo tempo do primeiro.',
      'Mantenha a postura alta mesmo quando a respiração acelerar.'
    ]
  },
  {
    id: 'corrida-tiros-curtos',
    nome: 'Tiros curtos de velocidade',
    grupo: 'Corrida',
    equipamento: 'Ao ar livre',
    equip: 'tiros',
    subtipo: 'tiros',
    composto: true,
    porTempo: true,
    duracaoSerieSeg: 60,
    nivel: 'Intermediário',
    cuidado: 'Joelho',
    duracaoMin: 30,
    descricao: 'Alternância dinâmica de 1 minuto forte por 1 minuto leve.',
    seriesPadrao: '8 × 1 min forte · 1 min leve',
    descansoSeg: 60,
    comoFazer: [
      'Aqueça 7 minutos em trote progressivo.',
      'Alterne 1 minuto de corrida viva com 1 minuto de trote suave.',
      'Solte as pernas por 7 minutos ao final.'
    ],
    erroComum: 'Inclinara cabeça para trás nos tiros ou pular o aquecimento.',
    errosComuns: [
      'Perder a postura inclinando a cabeça para trás nos tiros.',
      'Pular o aquecimento antes dos estímulos rápidos.'
    ],
    dicas: [
      'Aumente a cadência dos passos em vez de esticar demais a perna.',
      'Use o minuto leve para recuperar o ritmo respiratório.'
    ]
  },
  {
    id: 'corrida-longao-progressivo',
    nome: 'Longão no horizonte',
    grupo: 'Corrida',
    equipamento: 'Ao ar livre',
    equip: 'longao',
    subtipo: 'longao',
    composto: true,
    porTempo: true,
    duracaoSerieSeg: 60,
    nivel: 'Avançado',
    cuidado: null,
    duracaoMin: 55,
    descricao: 'Percurso longo que começa tranquilo e ganha firmeza no terço final.',
    seriesPadrao: '55 min · Terço final firme',
    descansoSeg: 0,
    comoFazer: [
      'Corra os primeiros 35 minutos em ritmo tranquilo e econômico.',
      'Aumente suavemente a cadência nos 15 minutos seguintes.',
      'Use os últimos 5 minutos para desacelerar e recuperar o fôlego.'
    ],
    erroComum: 'Começar o longão já no ritmo forte do terço final.',
    errosComuns: [
      'Começar já no ritmo do terço final.',
      'Esquecer de hidratar antes de sair.'
    ],
    dicas: [
      'Escolha um percurso plano para controlar bem a progressão.',
      'Termine o treino sentindo que ainda teria fôlego para mais 5 minutos.'
    ]
  },
  {
    id: 'corrida-recuperacao',
    nome: 'Trote regenerativo',
    grupo: 'Corrida',
    equipamento: 'Ao ar livre',
    equip: 'recuperacao',
    subtipo: 'recuperacao',
    composto: false,
    porTempo: true,
    duracaoSerieSeg: 60,
    nivel: 'Iniciante',
    cuidado: null,
    duracaoMin: 25,
    descricao: 'Circulação ativa para soltar a musculatura após dias intensos.',
    seriesPadrao: '25 min · Soltura ativa',
    descansoSeg: 0,
    comoFazer: [
      'Mantenha um trote mais fácil do que o seu ritmo habitual.',
      'Concentre-se em passos curtos, silenciosos e cadenciados.',
      'Encerre sentindo o corpo mais solto do que quando começou.'
    ],
    erroComum: 'Transformar o dia regenerativo em disputa de velocidade.',
    errosComuns: [
      'Transformar o dia regenerativo em disputa de ritmo.',
      'Alongar de forma brusca logo ao parar.'
    ],
    dicas: [
      'Se a respiração ofegar, intercale 1 minuto de caminhada.',
      'Deixe os braços balançarem livres ao lado do tronco.'
    ]
  },
  {
    id: 'corrida-fartlek-30',
    nome: 'Progressivo em 3 ritmos',
    grupo: 'Corrida',
    equipamento: 'Ao ar livre',
    equip: 'progressivo',
    subtipo: 'progressivo',
    composto: true,
    porTempo: true,
    duracaoSerieSeg: 60,
    nivel: 'Intermediário',
    cuidado: null,
    duracaoMin: 30,
    descricao: 'Três blocos de velocidade crescente para ganhar ritmo com controle.',
    seriesPadrao: '30 min · Ritmo crescente',
    descansoSeg: 45,
    comoFazer: [
      'Faça 10 minutos iniciais em trote leve e confortável.',
      'Suba para 12 minutos em ritmo moderado e cadência firme.',
      'Feche com 5 minutos fortes e 3 minutos de caminhada.'
    ],
    erroComum: 'Acelerar como num sprint logo na primeira troca de ritmo.',
    errosComuns: [
      'Acelerar como se fosse um sprint de 100 metros.',
      'Deixar a respiração descompassar nas transições.'
    ],
    dicas: [
      'Sinta cada bloco encaixar naturalmente na respiração.',
      'Mantenha a transição entre os blocos sem parar de correr.'
    ]
  }
];

export const ALL_LIBRARY_ITEMS = [
  ...STRENGTH_EXERCISES,
  ...RUN_WORKOUTS
];

/**
 * Devolve a dica do dia rotacionando entre as 14 dicas em português.
 */
export function getTipOfTheDay(dateObj = new Date()) {
  const start = new Date(dateObj.getFullYear(), 0, 0);
  const diff = dateObj - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.max(0, Math.floor(diff / oneDay));
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
}

/**
 * C9.2 — 6 Cartas da seção "Tipos de corrida" na Biblioteca (filtro "Corrida")
 */
export const RUN_TYPES_CARDS = [
  {
    id: 'tipo-corrida-leve-20',
    sceneKey: 'leve-20',
    nome: 'Corrida leve 20 min',
    resumo: 'Meta de 20 min · Ritmo de conversa',
    modo: 'meta_tempo',
    meta: { tipo: 'tempo', valor: 1200 },
    ritmoAlvoSegKm: null,
    intervalos: null,
    descricao: 'Vinte minutos contínuos em ritmo confortável para soltar as pernas e construir base aeróbica sem pressão.',
    beneficios: [
      'Ativa a circulação e reduz o estresse sem gerar fadiga muscular alta.',
      'Ideal para começar a semana ou encaixar em dias de agenda cheia.'
    ],
    dicas: [
      'Corra num ritmo em que consiga falar frases completas sem ofegar.',
      'Mantenha os ombros baixos e a passada curta.'
    ]
  },
  {
    id: 'tipo-rodagem-5k',
    sceneKey: 'rodagem-5k',
    nome: 'Rodagem 5 km',
    resumo: 'Meta de 5,0 km · Percurso clássico',
    modo: 'meta_distancia',
    meta: { tipo: 'distancia', valor: 5000 },
    ritmoAlvoSegKm: null,
    intervalos: null,
    descricao: 'A distância clássica de 5 quilômetros para encontrar cadência constante e acompanhar sua evolução semana a semana.',
    beneficios: [
      'Excelente referência para medir progresso aeróbico e economia de corrida.',
      'Equilibra volume moderado e recuperação rápida.'
    ],
    dicas: [
      'Segure o ímpeto no primeiro quilômetro para fechar o quinto mais forte.',
      'Observe os avisos a cada quilômetro para manter o ritmo parelho.'
    ]
  },
  {
    id: 'tipo-ritmo-controlado-30',
    sceneKey: 'ritmo-30',
    nome: 'Ritmo controlado 30 min',
    resumo: 'Ritmo alvo 5:30 /km · Cadência estável',
    modo: 'ritmo',
    meta: { tipo: 'tempo', valor: 1800 },
    ritmoAlvoSegKm: 330,
    intervalos: null,
    descricao: 'Sessão guiada por faixa de ritmo a 5:30 /km para treinar percepção de velocidade e disciplina de passada.',
    beneficios: [
      'Ensina o corpo a sustentar um ritmo constante sem oscilações bruscas.',
      'Melhora o limiar aeróbico com orientação visual em tempo real.'
    ],
    dicas: [
      'Mantenha o marcador na faixa central "No ritmo" (±15 s/km).',
      'Respire em compasso 3 passos inspirando por 3 passos expirando.'
    ]
  },
  {
    id: 'tipo-tiros-6x400',
    sceneKey: 'tiros-6x400',
    nome: 'Tiros 6 × 400 m',
    resumo: '6 rodadas · 400 m forte / 90 s trote',
    modo: 'intervalos',
    meta: { tipo: null, valor: null },
    ritmoAlvoSegKm: null,
    intervalos: {
      aquecimentoSeg: 180,
      tiroSeg: null,
      tiroM: 400,
      troteSeg: 90,
      rodadas: 6,
      voltaCalmaSeg: 180
    },
    descricao: 'Seis repetições de 400 metros em ritmo vivo intercaladas com 90 segundos de trote regenerativo.',
    beneficios: [
      'Aumenta o consumo máximo de oxigênio (VO2) e a potência da passada.',
      'Deixa o ritmo das rodagens contínuas naturalmente mais fácil.'
    ],
    dicas: [
      'Corra o primeiro tiro controlado para entregar a mesma velocidade no sexto.',
      'Continue trotando leve nos 90 segundos em vez de parar totalmente.'
    ]
  },
  {
    id: 'tipo-intervalado-8x1min',
    sceneKey: 'intervalado-8x1',
    nome: 'Intervalado 8 × 1 min',
    resumo: '8 rodadas · 1 min forte / 1 min trote',
    modo: 'intervalos',
    meta: { tipo: null, valor: null },
    ritmoAlvoSegKm: null,
    intervalos: {
      aquecimentoSeg: 180,
      tiroSeg: 60,
      tiroM: null,
      troteSeg: 60,
      rodadas: 8,
      voltaCalmaSeg: 180
    },
    descricao: 'Oito estímulos dinâmicos de 1 minuto forte por 1 minuto de trote leve, guiados pelo cronômetro sem depender de pista.',
    beneficios: [
      'Desenvolve velocidade e recuperação cardíaca rápida entre estímulos.',
      'Perfeito para fazer em qualquer rua, praça ou parque.'
    ],
    dicas: [
      'No minuto forte, aumente a cadência dos passos sem tensionar o pescoço.',
      'Aproveite os 3 minutos finais de volta à calma para baixar os batimentos.'
    ]
  },
  {
    id: 'tipo-longao-8k',
    sceneKey: 'longao-8k',
    nome: 'Longão de fim de semana',
    resumo: 'Meta de 8,0 km · Resistência contínua',
    modo: 'meta_distancia',
    meta: { tipo: 'distancia', valor: 8000 },
    ritmoAlvoSegKm: null,
    intervalos: null,
    descricao: 'Percurso longo de 8 quilômetros em ritmo tranquilo para construir resistência muscular, mental e cardiovascular.',
    beneficios: [
      'Fortalece tendões, articulações e capilarização muscular.',
      'Prepara o corpo com segurança para distâncias de 10 km.'
    ],
    dicas: [
      'Hidrate-se bem antes de sair e comece os primeiros 2 km bem solto.',
      'Priorize constância e conforto acima de velocidade.'
    ]
  }
];

export { getExercicioPorId, listarExercicios } from '../data/exercicios/index.js';
