/* ============================================================================
 * PLANO DE ARQUITETURA — CLAY FIT v0.7.1 (PROMPT 7.1: CORREÇÃO DO MAPA MUSCULAR)
 * ----------------------------------------------------------------------------
 * 1. Catálogo Modular (`js/data/exercicios/`):
 *    - `lote-1.js` (68 exercícios: Peito 22, Costas 26, Ombros 20, < 120 KB) carregado sob
 *      demanda via `import('./lote-1.js')` e em ocioso após 3s (`requestIdleCallback`).
 *    - `planner.js` filtra `!ex.noPlano`, mantendo os 45 originais intactos (zero regressão).
 * 2. Busca Offline, Mapas Musculares e Telas C1–C5 (`js/ui/biblioteca.js`):
 *    - `busca.js`: normalização NFD, sinônimos bidirecionais e Levenshtein (< 30ms).
 *    - `mapa-muscular.js`: silhuetas anatômicas SVG frente/costas 100% em tokens `--ill-*`.
 *    - `#/biblioteca`, `#/biblioteca/buscar` (virtualizada <= 30 linhas) e `#/exercicio/:id`.
 * ============================================================================ */

import {
  lerTema,
  aplicarTema,
  corToken,
  initThemeSystem
} from './ui/theme.js';
import { store } from './store.js';
import { HashRouter } from './router.js';
import {
  spring,
  vibrate,
  initMonochromeGrain,
  initGlobalTouchFeedback,
  initEdgeBackSwipe,
  prefersReducedMotion,
  initScrollListener,
  scrollToTopSmooth
} from './motion.js';
import { clayFlow } from './gl/clayflow.js';
import { ALL_LIBRARY_ITEMS, RUN_TYPES_CARDS, getTipOfTheDay, getExercicioPorId } from './engine/catalog.js';
import { agendarPreCarregamentoOcioso, carregarLote1 } from './data/exercicios/index.js';
import {
  renderScreenBibliotecaNova,
  bindScreenBibliotecaNovaEvents,
  renderScreenBibliotecaBuscar,
  bindScreenBibliotecaBuscarEvents,
  renderScreenExercicioDetalhe,
  bindScreenExercicioDetalheEvents
} from './ui/biblioteca.js';
import { renderRunTypeCardScene } from './ui/illustrations-run.js';
import { renderEvolutionScreen, renderSessionDetailScreen } from './ui/evolucao.js';
import { formatKmWithUnit, formatRunClock, formatPaceSegKm } from './run/geo.js';
import { encodeTrackToRoute } from './run/polyline.js';
import { capToMaxPoints } from './run/simplify.js';
import './engine/selftest.js';
import { generateDailyWorkout, buildWeeklySchedule, WORKOUT_TEMPLATES } from './engine/planner.js';
import {
  getBrandMarkSvg,
  getIconSvg,
  renderSceneA,
  bindSceneAInteraction,
  renderSceneB,
  animateSceneBSelection,
  renderSceneC,
  renderSceneD,
  renderSceneE,
  renderSceneF,
  renderSceneG,
  renderSceneH,
  renderSceneI,
  renderSceneJ,
  renderCheckinFaceSvg,
  renderSceneL,
  renderLibraryGroupScene,
  auditarCenas
} from './ui/illustrations.js';
import { renderNavigation } from './ui/nav.js';
import { renderChip, bindChips } from './ui/chip.js';
import { renderChoiceCard, bindChoiceCards } from './ui/choice-card.js';
import { renderProgressRing } from './ui/progress-ring.js';
import { renderToggle, bindToggles } from './ui/toggle.js';
import {
  renderBottomSheet,
  openBottomSheet,
  closeBottomSheet,
  closeAllSheets,
  bindBottomSheets,
  isAnySheetOpen
} from './ui/bottom-sheet.js';
import { showToast } from './ui/toast.js';
import { mountLiveWorkout, unmountLiveWorkout } from './live/live.js';
import {
  startNewLiveSession,
  isSessionOlderThanSixHours,
  computeActiveSeconds
} from './live/session.js';
import { formatKg } from './live/timer.js';
import { openStaleSessionSheet } from './live/screens/exit-sheet.js';

let router = null;
let aberturaTimer = null;
let montandoInterval = null;
let libraryFilterGroup = 'Todos';
let libraryVisibleCount = 20;
let libraryObserver = null;
let libraryCardAnimObserver = null;
let pulseWorkoutFieldsNextRender = false;
let staleSessionPromptShown = false;

const ROUTES_WITH_BOTTOM_NAV = ['hoje', 'biblioteca', 'evolucao', 'perfil', 'previa', 'sessao'];

/* --------------------------------------------------------------------------
   G1 (b) & (d) — NAVEGAÇÃO SEGURA A PARTIR DE FOLHAS E GUARDA DE 600MS
   -------------------------------------------------------------------------- */
function navigateSafelyWithGuard(targetHash, { mode = 'push', fromSheet = false } = {}) {
  const cleanTarget = targetHash.startsWith('#/')
    ? targetHash
    : `#/${targetHash.replace(/^#?\/?/, '')}`;

  if (fromSheet) {
    closeBottomSheet('clay-sheet', { silent: true });
  }

  requestAnimationFrame(() => {
    if (!router) return;
    router.navigate(cleanTarget, { mode });

    // G1 (d): Guarda de segurança após 600ms para garantir que #/treino/... aplicou
    if (cleanTarget.startsWith('#/treino/')) {
      setTimeout(() => {
        if (!router) return;
        const currentRaw = router.getRawHash();
        if (!currentRaw.startsWith('#/treino/') && store.sessaoEmAndamento()) {
          router.navigate(cleanTarget, { mode: 'replace' });
        }
      }, 600);
    }
  });
}

/* --------------------------------------------------------------------------
   UTILITÁRIOS DE DATA, SAUDAÇÃO, CONCORDÂNCIA E MÉTRICAS REAIS DA CONTA
   -------------------------------------------------------------------------- */
function getGreetingByHour(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h <= 11) return 'Bom dia';
  if (h >= 12 && h <= 17) return 'Boa tarde';
  return 'Boa noite';
}

function formatDatePtBr(date = new Date()) {
  try {
    const str = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(date);
    return str.charAt(0).toUpperCase() + str.slice(1);
  } catch (e) {
    return 'Sexta-feira, 30 de outubro';
  }
}

function formatTreinosCount(n) {
  const num = Number(n || 0);
  return num === 1 ? '1 treino' : `${num} treinos`;
}

function formatDiasCount(n) {
  const num = Number(n || 0);
  return num === 1 ? '1 dia por semana' : `${num} dias por semana`;
}

function formatExerciciosCount(n) {
  const num = Number(n || 0);
  return num === 1 ? '1 exercício' : `${num} exercícios`;
}

function getGroupBgColor(grupo) {
  const map = {
    Peito: 'var(--ill-palco-cor)',
    Costas: 'var(--ill-palco-cor)',
    Pernas: 'var(--ill-palco-cor)',
    Ombros: 'var(--ill-palco-cor)',
    Braços: 'var(--ill-palco-cor)',
    Core: 'var(--ill-palco-cor)',
    Mobilidade: 'var(--ill-palco-cor)',
    Corrida: 'var(--ill-palco-cor)'
  };
  return map[grupo] || 'var(--ill-palco-cor)';
}

/**
   1.5 & B14 Calcula estatísticas reais da semana atual a partir das sessões concluídas.
 */
function computeAccountProgress(perfil, schedule) {
  const todasSessoes = store.getEntity('sessoes') || [];
  const sessoesConcluidas = todasSessoes.filter(
    (s) => !s.status || s.status === 'concluida'
  );
  const totalMetaSemana = schedule.filter((d) => d.ativo).length || 4;

  if (sessoesConcluidas.length === 0) {
    return {
      hasHistory: false,
      feitosSemana: 0,
      totalMetaSemana,
      ringProgress: 0,
      ringLabel: `0/${totalMetaSemana}`,
      completedDayIndices: new Set(),
      completedTodaySession: null,
      line1: 'Sua sequência começa hoje',
      line2: 'Sua semana começa agora'
    };
  }

  const now = new Date();
  const todayIsoDate = now.toISOString().slice(0, 10);
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const sessoesSemana = sessoesConcluidas.filter(
    (s) => new Date(s.data || s.fim || now) >= startOfWeek
  );
  const completedDayIndices = new Set(
    sessoesSemana.map((s) =>
      typeof s.diaSemana === 'number' ? s.diaSemana : new Date(s.data).getDay()
    )
  );

  // Verifica se já houve uma sessão real concluída hoje (B5)
  const completedTodaySession =
    sessoesConcluidas.find(
      (s) => !s.isDemo && String(s.fim || s.data || '').slice(0, 10) === todayIsoDate
    ) || null;

  const feitosSemana = Math.min(
    totalMetaSemana,
    completedDayIndices.size || sessoesSemana.length
  );
  const totalMinSemana = sessoesSemana.reduce(
    (acc, s) => acc + Number(s.duracaoMin || 45),
    0
  );
  const horas = Math.floor(totalMinSemana / 60);
  const mins = totalMinSemana % 60;
  const tempoAtivoTexto =
    horas > 0
      ? `${horas}h${mins > 0 ? String(mins).padStart(2, '0') : '00'} ativos esta semana`
      : `${mins} min ativos esta semana`;

  const hasDemoSessions = sessoesConcluidas.some((s) => s.isDemo);
  const streakDays = hasDemoSessions
    ? Math.min(14, Math.max(1, feitosSemana + 2))
    : Math.max(1, feitosSemana);

  return {
    hasHistory: true,
    feitosSemana,
    totalMetaSemana,
    ringProgress: Math.min(100, Math.round((feitosSemana / totalMetaSemana) * 100)),
    ringLabel: `${feitosSemana}/${totalMetaSemana}`,
    completedDayIndices,
    completedTodaySession,
    line1: `Sequência de ${streakDays} ${streakDays === 1 ? 'dia' : 'dias'}`,
    line2: tempoAtivoTexto
  };
}

function getActiveWorkoutPlan() {
  const perfil = store.getEntity('perfil');
  const checkin = store.getTodayCheckin();
  const sessoes = store.getEntity('sessoes');
  const hojeEstado = store.getEntity('hojeEstado');

  const planResult = generateDailyWorkout(perfil, checkin, sessoes);
  let active = planResult.recomendado;

  if (hojeEstado?.hipoteseEscolhidaId) {
    const manual = planResult.hipoteses.find(
      (h) => h.id === hojeEstado.hipoteseEscolhidaId
    );
    if (manual) active = manual;
  }

  const extrasIds = hojeEstado?.exerciciosExtrasIds || [];
  if (extrasIds.length > 0) {
    const extras = extrasIds
      .map((id) => getExercicioPorId(id) || ALL_LIBRARY_ITEMS.find((item) => item.id === id))
      .filter(Boolean)
      .map((ex, idx) => ({
        ...ex,
        ordem: active.exercicios.length + idx + 1,
        seriesTexto:
          ex.descansoSeg && ex.descansoSeg > 0
            ? `${ex.seriesPadrao} · ${ex.descansoSeg} s de descanso`
            : `${ex.seriesPadrao}`
      }));
    active = {
      ...active,
      exercicios: [...active.exercicios, ...extras]
    };
  }

  return {
    ...planResult,
    ativo: active
  };
}

/* --------------------------------------------------------------------------
   SEÇÃO 6 & 2.1–2.5 — TELAS DA JORNADA DE ENTRADA (F0 a F10)
   -------------------------------------------------------------------------- */

function renderF0Abertura() {
  return `
    <div class="onboarding-shell" id="f0-abertura-screen">
      <div id="shader-host-fullscreen" class="onboarding-shader-bg"></div>
      <div style="position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; text-align:center;">
        <div style="width:96px; height:96px; flex:0 0 96px;">
          ${getBrandMarkSvg(96, true)}
        </div>
        <h1
          class="t-h2"
          style="
            margin-top: 24px;
            color: var(--tinta);
            opacity: 0;
            animation: clayHeroRise 400ms var(--ease-out) 500ms forwards;
          "
        >
          Treino que se adapta a você.
        </h1>
      </div>
    </div>
  `;
}

function renderF1BoasVindas() {
  return `
    <div class="onboarding-shell">
      <div id="shader-host-fullscreen" class="onboarding-shader-bg"></div>
      <div class="onboarding-card-panel" style="align-items:center; text-align:center;">
        <div style="height:12px;"></div>

        <div
          class="stagger-item"
          style="--stagger-index: 0; display:flex; align-items:center; justify-content:center; flex:1; min-height:0;"
        >
          ${renderSceneA()}
        </div>

        <div style="display:flex; flex-direction:column; align-items:center; width:100%; gap:12px;">
          <h1 class="t-display stagger-item" style="--stagger-index: 2;">
            Treine sem digitar nada.
          </h1>
          <p
            class="t-body stagger-item"
            style="--stagger-index: 3; color: var(--tinta-2); max-width: 300px; margin: 0 auto 12px;"
          >
            Responda 7 toques. O Clay Fit monta e ajusta o seu treino todos os dias.
          </p>
          <div class="stagger-item" style="--stagger-index: 4; width:100%; max-width:400px; margin:0 auto;">
            <button
              type="button"
              id="btn-welcome-start"
              class="c-btn c-btn--primary c-btn--full"
            >
              <span class="c-btn__label">Vamos começar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

const QUESTIONNAIRE_STEPS = {
  1: {
    step: 1,
    title: 'O que você quer conquistar?',
    subtitle: '',
    type: 'single',
    optional: false,
    blobColor: 'radial-gradient(circle, var(--terracota-suave) 0%, transparent 70%)',
    options: [
      {
        title: 'Mais força e músculo',
        subtitle: 'Treino de academia com carga progressiva',
        icon: 'haltere',
        value: 'Mais força e músculo'
      },
      {
        title: 'Correr mais e melhor',
        subtitle: 'Ritmo, resistência e constância',
        icon: 'corrida',
        value: 'Correr mais e melhor'
      },
      {
        title: 'Perder gordura com saúde',
        subtitle: 'Treino e cardio na medida certa',
        icon: 'fogo',
        value: 'Perder gordura com saúde'
      },
      {
        title: 'Os dois: ferro e asfalto',
        subtitle: 'Força e corrida na mesma semana',
        icon: 'brilho',
        value: 'Os dois: ferro e asfalto'
      }
    ]
  },
  2: {
    step: 2,
    title: 'Como é o seu treino hoje?',
    subtitle: '',
    type: 'single',
    optional: false,
    blobColor: 'radial-gradient(circle, var(--salvia-suave) 0%, transparent 70%)',
    options: [
      {
        title: 'Estou começando',
        subtitle: 'Quero criar o hábito',
        icon: 'hoje',
        value: 'Estou começando'
      },
      {
        title: 'Treino há alguns meses',
        subtitle: 'Já conheço o básico',
        icon: 'haltere',
        value: 'Treino há alguns meses'
      },
      {
        title: 'Treino há anos',
        subtitle: 'Busco evoluir de verdade',
        icon: 'fogo',
        value: 'Treino há anos'
      }
    ]
  },
  3: {
    step: 3,
    title: 'Onde você vai treinar?',
    subtitle: 'Pode escolher mais de uma.',
    type: 'multi',
    optional: false,
    blobColor: 'radial-gradient(circle, var(--areia-suave) 0%, transparent 70%)',
    options: [
      {
        title: 'Academia completa',
        subtitle: 'Máquinas, barras e polias',
        icon: 'haltere',
        value: 'Academia completa'
      },
      {
        title: 'Em casa com halteres',
        subtitle: 'Par de halteres ou kettlebell',
        icon: 'casa',
        value: 'Em casa com halteres'
      },
      {
        title: 'Em casa só com o corpo',
        subtitle: 'Sem nenhum equipamento',
        icon: 'perfil',
        value: 'Em casa só com o corpo'
      },
      {
        title: 'Ao ar livre',
        subtitle: 'Praças, parques e rua',
        icon: 'arvore',
        value: 'Ao ar livre'
      }
    ]
  },
  4: {
    step: 4,
    title: 'Em quais dias você pode?',
    subtitle: 'Escolha os dias da sua semana.',
    type: 'days',
    optional: false,
    blobColor: 'radial-gradient(circle, var(--terracota-suave) 0%, transparent 70%)'
  },
  5: {
    step: 5,
    title: 'Quanto tempo por treino?',
    subtitle: '',
    type: 'time',
    optional: false,
    blobColor: 'radial-gradient(circle, var(--areia-suave) 0%, transparent 70%)',
    chips: [
      { min: 20, label: '20 min', desc: 'Rápido e direto' },
      { min: 30, label: '30 min', desc: 'Equilíbrio' },
      { min: 45, label: '45 min', desc: 'Completo' },
      { min: 60, label: '60 min', desc: 'Sem pressa' }
    ]
  },
  6: {
    step: 6,
    title: 'Algo pede cuidado?',
    subtitle: 'Evitamos exercícios que incomodem. Isso não substitui orientação profissional.',
    type: 'care',
    optional: false,
    blobColor: 'radial-gradient(circle, var(--salvia-suave) 0%, transparent 70%)',
    options: [
      { title: 'Joelho', subtitle: 'Menos impacto e flexão profunda', icon: 'escudo', value: 'Joelho' },
      { title: 'Ombro', subtitle: 'Ângulos seguros de empurrar e puxar', icon: 'escudo', value: 'Ombro' },
      { title: 'Lombar', subtitle: 'Mais apoio para a coluna', icon: 'escudo', value: 'Lombar' },
      { title: 'Nenhum', subtitle: 'Articulações livres para todos os movimentos', icon: 'check', value: 'Nenhum' }
    ]
  },
  7: {
    step: 7,
    title: 'Qual é o seu peso?',
    subtitle: 'Usamos para estimar calorias e acompanhar sua evolução.',
    type: 'weight',
    optional: true,
    blobColor: 'radial-gradient(circle, var(--terracota-suave) 0%, transparent 70%)'
  },
  8: {
    step: 8,
    title: 'Como podemos te chamar?',
    subtitle: 'Aparece na sua saudação todos os dias.',
    type: 'name',
    optional: true,
    blobColor: 'radial-gradient(circle, var(--areia-suave) 0%, transparent 70%)'
  }
};

function renderQuestionnaireScene(stepNum, perfil) {
  if (stepNum === 1) return renderSceneB(perfil.objetivo);
  if (stepNum === 2) return renderSceneC(perfil.nivel);
  if (stepNum === 3) return renderSceneD(perfil.locais);
  if (stepNum === 4) return renderSceneE(perfil.diasSemana);
  if (stepNum === 5) return renderSceneF(perfil.tempoTreinoMin);
  if (stepNum === 6) return renderSceneG(perfil.cuidados);
  if (stepNum === 7) return '';
  return renderSceneH(perfil.nome === 'Atleta' ? '' : perfil.nome);
}

function formatWeightOneDecimal(kg = 70) {
  const clamped = Math.max(30, Math.min(250, Math.round(Number(kg || 70) * 10) / 10));
  return clamped.toFixed(1).replace('.', ',');
}

function renderQuestionnaireStep(stepNum = 1) {
  const perfil = store.getEntity('perfil') || {};
  let safeStep = Math.max(1, Math.min(8, Number(stepNum || 1)));
  if (!perfil.onboardingConcluido && !perfil.introVersao && safeStep === 7) {
    safeStep = 8;
  }
  const cfg = QUESTIONNAIRE_STEPS[safeStep] || QUESTIONNAIRE_STEPS[1];

  const segmentsHtml = [1, 2, 3, 4, 5, 6, 7, 8]
    .map((n) => {
      const cls = n < safeStep ? 'is-done' : n === safeStep ? 'is-current' : '';
      return `<div class="q-segment ${cls}"><div class="q-segment__fill"></div></div>`;
    })
    .join('');

  let interactiveBody = '';
  let isContinueDisabled = false;

  if (cfg.type === 'single') {
    const currentVal = safeStep === 1 ? perfil.objetivo : perfil.nivel;
    isContinueDisabled = !Boolean(currentVal && String(currentVal).trim());
    interactiveBody = `
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;" role="radiogroup" aria-label="${cfg.title}">
        ${cfg.options
          .map((opt, idx) =>
            `<div class="stagger-item" style="--stagger-index: ${idx + 1};">
              ${renderChoiceCard({
                title: opt.title,
                subtitle: opt.subtitle,
                icon: opt.icon,
                value: opt.value,
                group: `q-step-${safeStep}`,
                multiple: false,
                selected: Boolean(currentVal && currentVal === opt.value)
              })}
            </div>`
          )
          .join('')}
      </div>
    `;
  } else if (cfg.type === 'multi') {
    const selectedLocais = Array.isArray(perfil.locais) ? perfil.locais : ['Academia completa'];
    isContinueDisabled = selectedLocais.length === 0;
    interactiveBody = `
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;" role="group" aria-label="${cfg.title}">
        ${cfg.options
          .map((opt, idx) =>
            `<div class="stagger-item" style="--stagger-index: ${idx + 1};">
              ${renderChoiceCard({
                title: opt.title,
                subtitle: opt.subtitle,
                icon: opt.icon,
                value: opt.value,
                group: 'q-step-3',
                multiple: true,
                selected: selectedLocais.includes(opt.value)
              })}
            </div>`
          )
          .join('')}
      </div>
    `;
  } else if (cfg.type === 'days') {
    const days = Array.isArray(perfil.diasSemana) ? perfil.diasSemana : [1, 2, 4, 5];
    const letters = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    const names = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    isContinueDisabled = days.length < 2;

    interactiveBody = `
      <div class="q-days-row" role="group" aria-label="Dias da semana">
        ${letters
          .map((l, idx) => {
            const pressed = days.includes(idx);
            return `
              <button
                type="button"
                class="day-circle-btn"
                data-day-index="${idx}"
                aria-pressed="${pressed ? 'true' : 'false'}"
                aria-label="${names[idx]}"
              >
                ${l}
              </button>
            `;
          })
          .join('')}
      </div>
      <div style="text-align:center; margin-top:14px;">
        <div
          id="q-days-counter-label"
          style="font-family: var(--font-display); font-size:20px; font-weight:600; transition: transform 240ms var(--ease-out);"
        >
          ${formatDiasCount(days.length)}
        </div>
        <div
          id="q-days-warning"
          class="t-small"
          style="color: var(--alerta); font-weight:600; margin-top:6px; min-height:20px; opacity: ${isContinueDisabled ? '1' : '0'};"
        >
          Escolha pelo menos 2 dias.
        </div>
      </div>
    `;
  } else if (cfg.type === 'time') {
    const currentMin = Number(perfil.tempoTreinoMin || 45);
    isContinueDisabled = !Boolean(currentMin);
    interactiveBody = `
      <div class="q-time-grid" role="radiogroup" aria-label="${cfg.title}">
        ${cfg.chips
          .map((ch) => {
            const checked = currentMin === ch.min;
            return `
              <button
                type="button"
                role="radio"
                aria-checked="${checked ? 'true' : 'false'}"
                class="q-time-chip"
                data-time-min="${ch.min}"
              >
                <span style="font-family:var(--font-display); font-size:22px; font-weight:600; color:var(--tinta);">
                  ${ch.label}
                </span>
                <span style="font-size:13px; line-height:18px; color:var(--tinta-2); margin-top:2px;">
                  ${ch.desc}
                </span>
              </button>
            `;
          })
          .join('')}
      </div>
    `;
  } else if (cfg.type === 'care') {
    const cuidados = Array.isArray(perfil.cuidados) ? perfil.cuidados : ['Nenhum'];
    isContinueDisabled = cuidados.length === 0;
    interactiveBody = `
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;" role="group" aria-label="${cfg.title}">
        ${cfg.options
          .map((opt, idx) =>
            `<div class="stagger-item" style="--stagger-index: ${idx + 1};">
              ${renderChoiceCard({
                title: opt.title,
                subtitle: opt.subtitle,
                icon: opt.icon,
                value: opt.value,
                group: 'q-step-6',
                multiple: true,
                selected: cuidados.includes(opt.value)
              })}
            </div>`
          )
          .join('')}
      </div>
    `;
  } else if (cfg.type === 'weight') {
    const initKg = Math.max(30, Math.min(250, Math.round(Number(perfil.pesoKg || 70) * 10) / 10));
    const initText = formatWeightOneDecimal(initKg);
    isContinueDisabled = false;
    interactiveBody = `
      <div class="q-weight-stage">
        <div class="q-weight-hero-row">
          <button
            type="button"
            id="btn-weight-minus"
            class="q-ruler-step-btn"
            aria-label="Diminuir 0,1 quilograma"
          >
            ${getIconSvg('menos', 22)}
          </button>

          <div class="q-weight-readout" aria-live="polite">
            <span id="q-weight-display-num" class="q-weight-value">${initText}</span>
            <span class="q-weight-unit">kg</span>
          </div>

          <button
            type="button"
            id="btn-weight-plus"
            class="q-ruler-step-btn"
            aria-label="Aumentar 0,1 quilograma"
          >
            ${getIconSvg('mais', 22)}
          </button>
        </div>

        <div
          id="q-weight-ruler"
          class="q-weight-ruler"
          role="slider"
          tabindex="0"
          aria-label="Qual é o seu peso?"
          aria-valuemin="30"
          aria-valuemax="250"
          aria-valuenow="${initKg.toFixed(1)}"
          aria-valuetext="${initText} quilogramas"
          data-weight-kg="${initKg.toFixed(1)}"
        >
          <canvas id="q-weight-ruler-canvas" class="q-weight-ruler__canvas"></canvas>
          <div class="q-weight-ruler__indicator" aria-hidden="true"></div>
        </div>
      </div>
    `;
  } else if (cfg.type === 'name') {
    const valNome = perfil.nome === 'Atleta' ? '' : perfil.nome || '';
    isContinueDisabled = false;
    interactiveBody = `
      <div>
        <label for="q-input-nome" class="sr-only">Seu nome</label>
        <input
          id="q-input-nome"
          type="text"
          class="q-name-input"
          placeholder="Seu nome"
          maxlength="20"
          value="${valNome}"
          autocapitalize="words"
          enterkeyhint="done"
          autocomplete="given-name"
        />
      </div>
    `;
  }

  const sceneHtml = renderQuestionnaireScene(safeStep, perfil);
  const showPrivacy = safeStep === 7 || safeStep === 8;

  const bottomFooter = `
    <footer class="q-panel-footer">
      ${
        showPrivacy
          ? `<div class="q-privacy-note" id="q-privacy-note">
               ${getIconSvg('cadeado', 14)}
               <span>Seus dados ficam só no seu celular.</span>
             </div>`
          : ''
      }
      <button
        type="button"
        id="btn-q-continue"
        class="c-btn c-btn--primary c-btn--full"
        data-q-next="${safeStep + 1}"
        aria-disabled="${isContinueDisabled ? 'true' : 'false'}"
        ${isContinueDisabled ? 'disabled' : ''}
      >
        <span>Continuar</span>
      </button>
    </footer>
  `;

  return `
    <div class="onboarding-shell">
      <div
        class="onboarding-blob-bg q-ambient-blob"
        style="background: ${cfg.blobColor};"
        aria-hidden="true"
      ></div>

      <div class="q-panel-layout">
        <header class="q-topbar">
          <button
            type="button"
            class="c-topbar__icon-btn"
            data-q-back="${safeStep - 1}"
            aria-label="${safeStep === 1 ? 'Voltar para boas-vindas' : 'Voltar ao passo anterior'}"
          >
            ${getIconSvg('voltar', 24)}
          </button>

          <div
            class="q-progress-segments"
            role="progressbar"
            aria-valuenow="${safeStep}"
            aria-valuemin="1"
            aria-valuemax="8"
            aria-label="Passo ${safeStep} de 8"
          >
            ${segmentsHtml}
          </div>

          ${
            cfg.optional
              ? `<button
                   type="button"
                   id="btn-q-skip"
                   class="q-skip-btn"
                   data-q-skip="${safeStep}"
                   aria-label="Pular pergunta opcional"
                 >
                   <span>Pular</span>
                 </button>`
              : `<span class="q-skip-spacer" aria-hidden="true"></span>`
          }
        </header>

        <div id="q-step-stage" class="q-panel-scroll">
          ${
            sceneHtml
              ? `<div id="q-scene-slot" class="q-scene-zone">${sceneHtml}</div>`
              : ''
          }

          <h1 class="q-title" tabindex="-1">${cfg.title}</h1>
          ${
            cfg.subtitle
              ? `<p class="q-subtitle">${cfg.subtitle}</p>`
              : ''
          }

          ${interactiveBody}
        </div>

        ${bottomFooter}
      </div>
    </div>
  `;
}

function renderF9Montando() {
  const perfil = store.getEntity('perfil');
  const localTexto =
    Array.isArray(perfil.locais) && perfil.locais.length > 0
      ? perfil.locais[0].toLowerCase()
      : 'academia completa';
  const nDias = Array.isArray(perfil.diasSemana) ? perfil.diasSemana.length : 4;
  const tempoStr = `${perfil.tempoTreinoMin || 45} min`;
  const cuidados = Array.isArray(perfil.cuidados) ? perfil.cuidados : ['Nenhum'];
  const linha3Texto =
    cuidados.includes('Nenhum') || cuidados.length === 0
      ? 'Ajustando ao seu nível'
      : `Adaptando para ${cuidados.join(' e ').toLowerCase()}`;

  return `
    <div class="onboarding-shell">
      <div id="shader-host-fullscreen" class="onboarding-shader-bg"></div>
      <div class="onboarding-card-panel" style="align-items:center; justify-content:center; text-align:center; gap:20px;">
        <div id="f9-scene-slot" style="height:200px; display:flex; align-items:center; justify-content:center;">
          ${renderSceneI(0)}
        </div>

        <div id="f9-ring-slot">
          ${renderProgressRing({
            size: 120,
            stroke: 10,
            progress: 0,
            label: '0%',
            sublabel: ''
          })}
        </div>

        <h1 style="font-family:var(--font-display); font-size:28px; line-height:34px; font-weight:600;">
          Montando o seu plano
        </h1>

        <div style="display:flex; flex-direction:column; gap:12px; text-align:left; width:100%; max-width:340px;">
          <div class="f9-check-line" id="f9-line-1" style="display:flex; align-items:center; gap:12px; font-size:15px; line-height:22px; opacity:0.45;">
            <span class="c-choice-card__check" style="width:24px;height:24px;">${getIconSvg('check', 14)}</span>
            <span>Escolhendo exercícios para ${localTexto}</span>
          </div>
          <div class="f9-check-line" id="f9-line-2" style="display:flex; align-items:center; gap:12px; font-size:15px; line-height:22px; opacity:0.45;">
            <span class="c-choice-card__check" style="width:24px;height:24px;">${getIconSvg('check', 14)}</span>
            <span>Distribuindo em ${nDias} dias de ${tempoStr} cada</span>
          </div>
          <div class="f9-check-line" id="f9-line-3" style="display:flex; align-items:center; gap:12px; font-size:15px; line-height:22px; opacity:0.45;">
            <span class="c-choice-card__check" style="width:24px;height:24px;">${getIconSvg('check', 14)}</span>
            <span>${linha3Texto}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 1.1 & A4 F10 — PLANO PRONTO (Rótulo ajustado para 12/16 600 ou 11/14 se > 6 letras)
function renderF10PlanoPronto() {
  const perfil = store.getEntity('perfil');
  const nome = perfil.nome || 'Atleta';
  const schedule = buildWeeklySchedule(perfil);

  return `
    <div class="onboarding-shell" id="f10-plano-pronto-screen">
      <div id="shader-host-fullscreen" class="onboarding-shader-bg"></div>
      <div class="onboarding-card-panel" style="justify-content:space-between;">
        <div></div>

        <div style="text-align:center;">
          <div class="t-caption" style="color:var(--terracota-texto); margin-bottom:8px;">SEU PLANO</div>
          <h1 class="t-h1">Seu plano está pronto, ${nome}!</h1>
          <p class="t-body" style="color:var(--tinta-2); margin-top:8px;">
            ${formatDiasCount(perfil.diasSemana?.length || 4)} · sessões de ${perfil.tempoTreinoMin || 45} min
          </p>

          <div class="plan-ready-week-grid">
            ${schedule
              .map((d, i) => {
                const isLong = String(d.nomeCurto || '').length > 6;
                return `
                  <div
                    class="plan-day-pill ${d.ativo ? 'is-active' : ''} stagger-item"
                    style="--stagger-index: ${i};"
                  >
                    <span class="t-caption" style="color:var(--tinta-3);">${d.letra}</span>
                    <span
                      style="
                        width:8px;
                        height:8px;
                        border-radius:50%;
                        background-color: ${d.ativo ? 'var(--terracota)' : 'var(--linha)'};
                      "
                    ></span>
                    <span
                      class="plan-day-pill__label ${isLong ? 'is-long' : ''}"
                      style="color:${d.ativo ? 'var(--tinta)' : 'var(--tinta-3)'};"
                    >
                      ${d.nomeCurto}
                    </span>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <div style="width:100%;">
          <button
            type="button"
            id="btn-plan-ready-go"
            class="c-btn c-btn--primary c-btn--full"
          >
            <span class="c-btn__label">Ver meu treino de hoje</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   SEÇÃO 7.1, A3, B2, B5, B14, M6 & M8 — TELA HOJE
   -------------------------------------------------------------------------- */
function renderScreenHoje() {
  const perfil = store.getEntity('perfil');
  const hojeEstado = store.getEntity('hojeEstado');
  const todayCheckin = store.getTodayCheckin();
  const planData = getActiveWorkoutPlan();
  const workout = planData.ativo;
  const schedule = planData.semana;
  const accountStats = computeAccountProgress(perfil, schedule);
  const ongoingSession = store.sessaoEmAndamento();

  const nome = perfil.nome || 'Atleta';
  const inicial = nome.charAt(0).toUpperCase();
  const greeting = getGreetingByHour();
  const todayIdx = new Date().getDay();

  // B3 & C8 — Faixa no topo para Corrida interrompida (buffer < 12h) ou Sessão em andamento
  const runBuffer = store.lerBufferCorrida();
  let ongoingBannerHtml = '';
  if (runBuffer) {
    const bufDist = formatKmWithUnit(runBuffer.distanciaM || 0);
    const bufClock = formatRunClock(runBuffer.movimentoSeg || runBuffer.duracaoSeg || 0);
    ongoingBannerHtml = `
      <section class="hoje-ongoing-banner hoje-run-buffer-card" id="hoje-run-buffer-banner" aria-label="Corrida interrompida">
        <div style="min-width:0; flex:1;">
          <div class="hoje-ongoing-banner__title">Corrida interrompida · ${bufDist} · ${bufClock}</div>
          <div class="hoje-ongoing-banner__sub">${runBuffer.nome || 'Corrida ao vivo'} salva automaticamente</div>
          <div class="hoje-run-buffer-actions">
            <button type="button" class="hoje-ongoing-banner__btn" data-buffer-action="retomar">
              <span>Retomar</span>
            </button>
            <button type="button" class="hoje-buffer-sec-btn" data-buffer-action="salvar">
              <span>Salvar o que deu</span>
            </button>
            <button type="button" class="hoje-buffer-link-btn" data-buffer-action="descartar">
              <span>Descartar</span>
            </button>
          </div>
        </div>
      </section>
    `;
  } else if (ongoingSession) {
    const isRunOngoing = ongoingSession.tipo === 'corrida';
    const exIdx = Math.max(0, Number(ongoingSession.maquinaEstado?.exercicioIdx || 0)) + 1;
    const totalEx = (ongoingSession.exercicios || []).length || 6;
    const bannerTitle = isRunOngoing
      ? `Corrida em andamento · ${formatKmWithUnit(ongoingSession.distanciaM || 0)} · ${formatRunClock(ongoingSession.movimentoSeg || ongoingSession.duracaoSeg || 0)}`
      : 'Treino em andamento';
    const subStr = isRunOngoing
      ? `${ongoingSession.nome || 'Corrida ao vivo'}`
      : `${ongoingSession.nome} · exercício ${exIdx} de ${totalEx}`;

    ongoingBannerHtml = `
      <section class="hoje-ongoing-banner" id="hoje-ongoing-banner" aria-label="${bannerTitle}">
        <div style="min-width:0;">
          <div class="hoje-ongoing-banner__title">${bannerTitle}</div>
          <div class="hoje-ongoing-banner__sub">${subStr}</div>
        </div>
        <button
          type="button"
          id="btn-resume-ongoing-session"
          class="hoje-ongoing-banner__btn"
          data-resume-session-id="${ongoingSession.id}"
        >
          <span>${isRunOngoing ? 'Retomar' : 'Continuar'}</span>
        </button>
      </section>
    `;
  }

  // (2) Faixa de check-in: expandida (88px com 5 rostos) ou colapsada (chip 56px)
  const isCheckinCollapsed = Boolean(todayCheckin && !hojeEstado.checkinExpandido);
  let checkinBlockHtml = '';

  if (isCheckinCollapsed) {
    const energia = Number(todayCheckin.energia || 4);
    const chipType =
      energia >= 4
        ? {
            cls: 'c-checkin-chip-bar--boa',
            text: 'Energia boa · seguimos com o plano'
          }
        : energia === 3
        ? {
            cls: 'c-checkin-chip-bar--media',
            text: 'Energia média · treino mantido'
          }
        : {
            cls: 'c-checkin-chip-bar--baixa',
            text: 'Energia baixa · treino mais leve'
          };

    checkinBlockHtml = `
      <button
        type="button"
        id="btn-reopen-checkin"
        class="c-checkin-chip-bar ${chipType.cls}"
        aria-label="${chipType.text}. Toque para atualizar como você está hoje."
      >
        <span style="display:inline-flex; align-items:center; gap:12px;">
          ${renderCheckinFaceSvg(energia, 34)}
          <span>${chipType.text}</span>
        </span>
        <span class="t-small" style="color:var(--tinta-2); font-weight:500;">Trocar</span>
      </button>
    `;
  } else {
    const labels = {
      1: 'Muito cansado',
      2: 'Cansado',
      3: 'Estável',
      4: 'Bem disposto',
      5: 'Com muita energia'
    };
    checkinBlockHtml = `
      <section class="c-checkin-strip" id="hoje-checkin-strip" aria-label="Como você está hoje?">
        <div class="c-checkin-strip__title">Como você está hoje?</div>
        <div class="c-checkin-strip__faces" role="radiogroup" aria-label="Nível de energia de 1 a 5">
          ${[1, 2, 3, 4, 5]
            .map(
              (lvl) => `
                <button
                  type="button"
                  role="radio"
                  aria-checked="${todayCheckin?.energia === lvl ? 'true' : 'false'}"
                  class="checkin-face-btn"
                  data-checkin-face="${lvl}"
                  aria-label="${labels[lvl]}"
                >
                  ${renderCheckinFaceSvg(lvl, 44)}
                </button>
              `
            )
            .join('')}
        </div>
      </section>
    `;
  }

  // (4) Semana com animação de 360ms no check de hoje quando acabou de concluir o treino (B14)
  const animarCheckHoje = Boolean(hojeEstado?.animarCheckHoje);
  if (animarCheckHoje) {
    store.updateHojeEstado({ animarCheckHoje: false });
  }

  const weekColsHtml = schedule
    .map((d) => {
      const isToday = d.diaIndex === todayIdx;
      const isDone = accountStats.hasHistory && accountStats.completedDayIndices.has(d.diaIndex);

      let circleCls = 'week-circle';
      let innerHtml = '';
      if (isDone) {
        circleCls += ' week-circle--done';
        if (isToday && animarCheckHoje) {
          circleCls += ' week-circle--done-animate';
        }
        innerHtml = getIconSvg('check', 18);
      } else if (isToday) {
        circleCls += ' week-circle--today';
        innerHtml = `<span class="today-dot-pulse" style="width:10px;height:10px;border-radius:50%;background-color:var(--terracota);"></span>`;
      } else if (!d.ativo) {
        circleCls += ' week-circle--rest';
      }

      return `
        <button
          type="button"
          class="week-col-btn"
          data-open-day-preview="${d.diaIndex}"
          aria-label="${d.nomeDia}: ${d.nomeTreino}"
        >
          <span class="t-caption" style="color:var(--tinta-3);">${d.letra}</span>
          <span class="${circleCls}">${innerHtml}</span>
        </button>
      `;
    })
    .join('');

  // (6) Próximos treinos
  const upcomingDays = [1, 2, 3, 4]
    .map((offset) => schedule[(todayIdx + offset) % 7])
    .filter(Boolean);

  const upcomingHtml = upcomingDays
    .map((u) => {
      const tpl = WORKOUT_TEMPLATES[u.templateChave] || WORKOUT_TEMPLATES.peito;
      const dur = u.ativo ? `${perfil.tempoTreinoMin || 45} min` : '20 min';
      return `
        <button
          type="button"
          class="upcoming-card"
          data-open-day-preview="${u.diaIndex}"
        >
          <div style="display:flex; flex-direction:column; justify-content:space-between; height:100%;">
            <span class="t-caption" style="color:var(--tinta-3);">${u.nomeDia}</span>
            <div>
              <div style="font-family:var(--font-display); font-size:18px; line-height:22px; font-weight:600; color:var(--tinta);">
                ${u.nomeTreino}
              </div>
              <div class="t-small" style="color:var(--tinta-3); margin-top:4px;">${dur}</div>
            </div>
          </div>
          <div style="width:68px; height:68px; flex-shrink:0;">
            ${renderSceneJ(tpl.grupoPrincipal, 68)}
          </div>
        </button>
      `;
    })
    .join('');

  const pulseClass = pulseWorkoutFieldsNextRender ? 'recalc-pulse-ring' : '';
  const sceneCrossfadeClass = pulseWorkoutFieldsNextRender ? 'scene-j-crossfade' : '';
  pulseWorkoutFieldsNextRender = false;

  // B5 & M8: Se já houver treino concluído hoje (e não houver outro em andamento),
  // esconde a linha de motivo, esconde os chips de meta e esconde "Ver outras opções",
  // mantendo cena, legenda do grupo, título do treino, bloco verde "Treino de hoje concluído"
  // com resumo em 1 linha e botão secundário "Fazer um treino leve extra".
  const doneToday = !ongoingSession ? accountStats.completedTodaySession : null;
  let heroActionsHtml = '';
  if (ongoingSession) {
    heroActionsHtml = `
      <button
        type="button"
        class="c-btn c-btn--primary c-btn--full"
        data-resume-session-id="${ongoingSession.id}"
      >
        <span>Continuar treino</span>
      </button>
      <button
        type="button"
        class="c-btn c-btn--ghost"
        data-open-alternatives-sheet
        style="font-size:15px; line-height:20px; font-weight:600; color:var(--terracota-texto);"
      >
        <span>Ver outras opções</span>
      </button>
    `;
  } else if (doneToday) {
    const volStr = doneToday.volumeKg > 0 ? ` · ${formatKg(doneToday.volumeKg)} kg` : '';
    const durMinVal = Number(doneToday.duracaoMin || 42);
    const resumo1Linha =
      doneToday.tipo === 'corrida'
        ? `${doneToday.nome} · ${formatKmWithUnit(doneToday.distanciaM || 0)} · ${formatRunClock(doneToday.movimentoSeg || doneToday.duracaoSeg || 0)} · ${formatPaceSegKm(doneToday.ritmoMedioSegKm)} /km`
        : `${doneToday.nome} · ${durMinVal} min ${durMinVal === 1 ? 'ativo' : 'ativos'}${volStr}`;
    heroActionsHtml = `
      <div
        id="hoje-done-summary-box"
        style="
          width:100%;
          padding: 12px 16px;
          border-radius: 18px;
          background-color: var(--salvia-suave);
          border: 1px solid var(--salvia);
          text-align: center;
          margin-bottom: 6px;
        "
      >
        <div style="font-weight:700; color:var(--tinta); font-size:15px;">Treino de hoje concluído</div>
        <div style="font-size:13px; color:var(--tinta-2); margin-top:2px;">${resumo1Linha}</div>
      </div>
      <button
        type="button"
        class="c-btn c-btn--secondary c-btn--full"
        data-start-extra-light
      >
        <span>Fazer um treino leve extra</span>
      </button>
    `;
  } else {
    heroActionsHtml = `
      <button
        type="button"
        class="c-btn c-btn--primary c-btn--full"
        data-open-start-sheet-card
      >
        <span>Começar treino</span>
      </button>
      <button
        type="button"
        class="c-btn c-btn--ghost"
        data-open-alternatives-sheet
        style="font-size:15px; line-height:20px; font-weight:600; color:var(--terracota-texto);"
      >
        <span>Ver outras opções</span>
      </button>
    `;
  }

  const cardDisplayGroup = doneToday ? (doneToday.grupoPrincipal || workout.grupoPrincipal) : workout.grupoPrincipal;
  const cardDisplayTitle = doneToday ? (doneToday.nome || workout.nome) : workout.nome;

  return `
    <div class="reading-column">
      <!-- (1) Cabeçalho -->
      <header class="hoje-header">
        <div>
          <h1 class="t-h1" data-collapsible-heading>${greeting}, ${nome}</h1>
          <div class="t-small" style="color:var(--tinta-3); margin-top:2px;">
            ${formatDatePtBr()}
          </div>
        </div>
        <button
          type="button"
          class="avatar-circle-btn"
          data-route="perfil"
          aria-label="Ir para o Perfil de ${nome}"
        >
          ${inicial}
        </button>
      </header>

      <!-- B2: Cartão de retomada "Treino em andamento" no topo (acima do check-in) -->
      ${ongoingBannerHtml}

      <!-- (2) Faixa de Check-in -->
      ${checkinBlockHtml}

      <!-- (3) A3, 2.6 & M8 Cartão "Treino de hoje" em 3 zonas verticais sem sobreposição -->
      <article
        id="hoje-workout-card"
        class="workout-hero-card hero-enter hero-treino-shared ${pulseClass}"
        data-shader-palette="${workout.paletaShader}"
      >
        <div id="shader-host-card" class="workout-hero-card__shader"></div>

        <!-- (a) Zona de cena no topo: altura 168px, escolhida por grupoPrincipal -->
        <div class="workout-hero-card__scene-top ${sceneCrossfadeClass}" id="hoje-scene-j-slot">
          ${renderSceneJ(cardDisplayGroup, null, workout.grupoSecundario)}
        </div>

        <!-- (b) Bloco de texto com padding 20px 24px 0 -->
        <div class="workout-hero-card__body">
          <div class="t-caption" style="color:var(--terracota-texto);">
            ${cardDisplayGroup.toUpperCase()}
          </div>

          <h2
            style="
              font-family: var(--font-display);
              font-size: 28px;
              line-height: 32px;
              font-weight: 600;
              color: var(--tinta);
              text-wrap: balance;
            "
          >
            ${cardDisplayTitle}
          </h2>

          ${
            !doneToday
              ? `
                <div class="workout-meta-chips ${pulseClass}">
                  <span class="workout-meta-pill">${workout.duracaoMin} min</span>
                  <span class="workout-meta-pill">${formatExerciciosCount(workout.exercicios.length)}</span>
                  <span class="workout-meta-pill">${workout.intensidadeTexto}</span>
                </div>

                <div style="display:flex; align-items:flex-start; gap:8px; font-size:14px; line-height:20px; color:var(--tinta-2);">
                  <span style="color:var(--terracota); margin-top:2px;">${getIconSvg('brilho', 16)}</span>
                  <span id="hoje-workout-motivo">${workout.motivo}</span>
                </div>
              `
              : ''
          }
        </div>

        <!-- (c) Botões -->
        <div class="workout-hero-card__actions">
          ${heroActionsHtml}
        </div>
      </article>

      <!-- (4) Semana -->
      <section class="c-card" aria-label="Sua semana">
        <div class="t-caption" style="color:var(--tinta-3); margin-bottom:12px;">SEMANA</div>
        <div class="week-strip-grid">
          ${weekColsHtml}
        </div>
        <div id="hoje-week-summary" class="t-small" style="color:var(--tinta-2);">
          ${accountStats.feitosSemana} de ${formatTreinosCount(accountStats.totalMetaSemana)} feitos
        </div>
      </section>

      <!-- (5) Constância -->
      <section class="c-card" style="display:flex; align-items:center; gap:20px;" aria-label="Constância">
        ${renderProgressRing({
          size: 112,
          stroke: 10,
          progress: accountStats.ringProgress,
          label: accountStats.ringLabel,
          sublabel: ''
        })}
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div class="t-h3" id="hoje-constancia-line1">${accountStats.line1}</div>
          <div class="t-small" id="hoje-constancia-line2" style="color:var(--tinta-2);">${accountStats.line2}</div>
        </div>
      </section>

      <!-- (6) Próximos treinos -->
      <section aria-label="Próximos treinos">
        <h2 class="t-h3" style="margin-bottom:12px;">Próximos treinos</h2>
        <div class="upcoming-carousel">
          ${upcomingHtml}
        </div>
      </section>

      <!-- (7) Dica do dia -->
      <section class="daily-tip-card" aria-label="Dica do dia">
        <span style="color:var(--terracota);">${getIconSvg('brilho', 18)}</span>
        <span>${getTipOfTheDay()}</span>
      </section>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   SEÇÃO 7.3 & 3.1 — PRÉVIA DO TREINO (#/previa/:id)
   -------------------------------------------------------------------------- */
function renderScreenPrevia(diaParam = 'hoje') {
  const planData = getActiveWorkoutPlan();
  const workout = planData.ativo;

  const listHtml = workout.exercicios
    .map(
      (ex, idx) => `
        <div class="preview-exercise-row stagger-item" style="--stagger-index: ${idx};">
          <span class="preview-num-circle">${idx + 1}</span>
          <span class="preview-thumb" style="background-color:${getGroupBgColor(ex.grupo)};">
            ${renderLibraryGroupScene(ex, { isThumb: true })}
          </span>
          <div style="flex:1; min-width:0;">
            <div style="font-size:16px; line-height:22px; font-weight:600; color:var(--tinta);">
              ${ex.nome}
            </div>
            <div style="font-size:14px; line-height:20px; color:var(--tinta-3); margin-top:2px;">
              ${ex.seriesTexto}
            </div>
          </div>
        </div>
      `
    )
    .join('');

  return `
    <div class="reading-column" style="padding-bottom: 132px;">
      <header id="clay-topbar" class="c-topbar">
        <button
          type="button"
          class="c-topbar__icon-btn"
          data-nav-back
          aria-label="Voltar para Hoje"
        >
          ${getIconSvg('fechar', 24)}
        </button>
        <div class="c-topbar__title">Treino de hoje</div>
        <div class="c-topbar__right">
          <button
            type="button"
            class="c-btn c-btn--ghost"
            data-open-alternatives-sheet
            style="font-size:15px; font-weight:600; color:var(--terracota-texto);"
          >
            <span>Trocar</span>
          </button>
        </div>
      </header>

      <section class="c-card c-card--featured hero-treino-shared" style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
        <div>
          <div class="t-caption" style="color:var(--terracota-texto);">${workout.grupoPrincipal}</div>
          <h1 class="t-h1" style="margin-top:4px;">${workout.nome}</h1>
          <p class="t-small" style="color:var(--tinta-2); margin-top:6px;">${workout.motivo}</p>
        </div>
        <div style="width:92px; height:92px; flex-shrink:0;">
          ${renderSceneJ(workout.grupoPrincipal, 92)}
        </div>
      </section>

      <section class="c-card" style="padding-block: 12px;">
        ${listHtml}
      </section>

      <div class="preview-bottom-bar">
        <div style="max-width:640px; margin:0 auto; display:flex; flex-direction:column; gap:10px;">
          <div style="font-size:13px; line-height:18px; color:var(--tinta-2); text-align:center; font-weight:500;">
            ${formatExerciciosCount(workout.exercicios.length)} · cerca de ${workout.duracaoMin} min
          </div>
          <button
            type="button"
            class="c-btn c-btn--primary c-btn--full"
            data-start-live-session="hoje"
          >
            <span>Iniciar treino</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   SEÇÃO 7.5 & A4 — TELA BIBLIOTECA
   -------------------------------------------------------------------------- */
const LIBRARY_GROUPS = [
  'Todos',
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Braços',
  'Core',
  'Mobilidade',
  'Corrida'
];

function getFilteredLibraryItems() {
  if (libraryFilterGroup === 'Todos') return ALL_LIBRARY_ITEMS;
  return ALL_LIBRARY_ITEMS.filter((item) => item.grupo === libraryFilterGroup);
}

function renderScreenBiblioteca() {
  const filtered = getFilteredLibraryItems();
  const visibleItems = filtered.slice(0, libraryVisibleCount);

  const filterChipsHtml = LIBRARY_GROUPS.map((grp) => {
    const selected = libraryFilterGroup === grp;
    return renderChip({
      label: grp,
      value: grp,
      selected,
      group: 'lib-group-filter'
    });
  }).join('');

  const cardsHtml =
    visibleItems.length > 0
      ? visibleItems
          .map(
            (item) => `
              <button
                type="button"
                class="lib-card"
                data-open-exercise-sheet="${item.id}"
                data-group="${item.grupo}"
                data-equip="${item.equip || 'barra'}"
              >
                <div class="lib-card__art" style="background-color: ${getGroupBgColor(item.grupo)};">
                  ${renderLibraryGroupScene(item, { isThumb: false })}
                </div>
                <div class="lib-card__info">
                  <div style="font-size:15px; line-height:20px; font-weight:600; color:var(--tinta);">
                    ${item.nome}
                  </div>
                  <div style="font-size:13px; line-height:18px; color:var(--tinta-3); margin-top:4px;">
                    ${item.equipamento}
                  </div>
                </div>
              </button>
            `
          )
          .join('')
      : `
        <div style="grid-column: 1 / -1; text-align:center; padding: 40px 20px;">
          <div style="display:flex; justify-content:center; margin-bottom:16px;">
            ${renderSceneL()}
          </div>
          <p class="t-body" style="color:var(--tinta-2);">Nada por aqui. Tente outro grupo.</p>
        </div>
      `;

  return `
    <div>
      <div class="top-ambient-gradient" aria-hidden="true"></div>

      <header id="clay-topbar" class="c-topbar">
        <span></span>
        <div class="c-topbar__title" style="opacity:0;">Biblioteca</div>
        <div class="c-topbar__right"></div>
      </header>

      <h1 class="t-h1" data-collapsible-heading style="margin-bottom: 12px;">Biblioteca</h1>

      <div class="lib-sticky-filter" role="region" aria-label="Filtrar por grupo muscular">
        ${filterChipsHtml}
      </div>

      ${
        libraryFilterGroup === 'Corrida' || libraryFilterGroup === 'Todos'
          ? `
            <section class="lib-run-types-section" aria-label="Tipos de corrida">
              <div class="lib-section-head">
                <h2 class="t-h3">Tipos de corrida</h2>
                <span class="t-small" style="color:var(--tinta-3);">Toque para configurar e correr</span>
              </div>
              <div class="lib-run-types-grid">
                ${RUN_TYPES_CARDS.map(
                  (tc) => `
                    <button
                      type="button"
                      class="lib-card lib-run-type-card"
                      data-open-run-type-sheet="${tc.id}"
                    >
                      <div class="lib-card__art" style="background:var(--ill-palco); background-color:var(--ill-palco-cor);">
                        ${renderRunTypeCardScene(tc.sceneKey)}
                      </div>
                      <div class="lib-card__info">
                        <div style="font-size:15px; line-height:20px; font-weight:600; color:var(--tinta);">
                          ${tc.nome}
                        </div>
                        <div style="font-size:13px; line-height:18px; color:var(--tinta-3); margin-top:4px;">
                          ${tc.resumo}
                        </div>
                      </div>
                    </button>
                  `
                ).join('')}
              </div>
            </section>
          `
          : ''
      }

      <div id="lib-cards-grid" class="lib-grid">
        ${cardsHtml}
      </div>

      ${
        filtered.length > visibleItems.length
          ? `<div id="lib-scroll-sentinel" style="height:32px; width:100%;"></div>`
          : ''
      }
    </div>
  `;
}

/* --------------------------------------------------------------------------
   SEÇÃO 7.6, A1, A2, B14, M5 & M6 — TELA EVOLUÇÃO
   - A1: Selo "Exemplo · seus números reais aparecem após o 1º treino" sem corte.
   - A2 & M5: Altura de cada barra = (valor / máximoDaEscala) × 120px, mín. 8px para 0,
     máximoDaEscala = max(4, maior valor, meta semanal de treinos do perfil).
     Rótulo "meta" à ESQUERDA acima da linha tracejada (`z-index: 1`) e número de cada
     barra SEMPRE 6px acima do topo da sua própria barra (`z-index: 2`), com 28px de
     espaço livre acima da altura máxima das barras.
   - M6: Recordes formatados com `formatKg(n)` (vírgula decimal em pt-BR).
   -------------------------------------------------------------------------- */
function renderScreenEvolucao() {
  return `
    <div class="reading-column">
      <div class="top-ambient-gradient" aria-hidden="true"></div>
      <header id="clay-topbar" class="c-topbar">
        <span></span>
        <div class="c-topbar__title" style="opacity:0;">Evolução</div>
        <div class="c-topbar__right"></div>
      </header>
      <h1 class="t-h1" data-collapsible-heading>Evolução</h1>
      <div id="evolucao-module-mount"></div>
    </div>
  `;
}
function _legacyRenderScreenEvolucaoUnused() {
  const perfil = store.getEntity('perfil') || {};
  const todasSessoes = store.getEntity('sessoes') || [];
  const sessoesConcluidas = todasSessoes.filter(
    (s) => !s.status || s.status === 'concluida'
  );
  const sessoesReais = sessoesConcluidas.filter((s) => !s.isDemo);
  const hasRealCompletedSession = sessoesReais.length > 0;
  const recordes = store.listarRecordes();

  const metaSemanal =
    Array.isArray(perfil.diasSemana) && perfil.diasSemana.length >= 2
      ? perfil.diasSemana.length
      : 4;

  // Calcula os valores das últimas 7 semanas
  let weekCounts = [3, 4, 3, 4, 4, 3, 3];
  if (hasRealCompletedSession) {
    const now = new Date();
    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setHours(0, 0, 0, 0);
    startOfCurrentWeek.setDate(now.getDate() - now.getDay());

    weekCounts = [6, 5, 4, 3, 2, 1, 0].map((weeksAgo) => {
      const wStart = new Date(startOfCurrentWeek);
      wStart.setDate(startOfCurrentWeek.getDate() - weeksAgo * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 7);
      return sessoesReais.filter((s) => {
        const d = new Date(s.data || s.fim || now);
        return d >= wStart && d < wEnd;
      }).length;
    });
  }

  const labels = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'Atual'];
  const maiorValor = Math.max(...weekCounts, 0);
  const maximoDaEscala = Math.max(4, maiorValor, metaSemanal);
  const metaGuideBottomPx = Math.round((metaSemanal / maximoDaEscala) * 120) + 22;

  const feitosAtual = weekCounts[6];
  const ringPct = Math.min(100, Math.round((feitosAtual / metaSemanal) * 100));

  return `
    <div class="reading-column">
      <div class="top-ambient-gradient" aria-hidden="true"></div>

      <header id="clay-topbar" class="c-topbar">
        <span></span>
        <div class="c-topbar__title" style="opacity:0;">Evolução</div>
        <div class="c-topbar__right"></div>
      </header>

      <h1 class="t-h1" data-collapsible-heading>Evolução</h1>

      ${
        !hasRealCompletedSession
          ? `<div>
               <span class="evo-sample-badge" id="evo-sample-badge">
                 Exemplo · seus números reais aparecem após o 1º treino
               </span>
             </div>`
          : ''
      }

      <!-- 3.3 Primeiro cartão com legenda CONSTÂNCIA -->
      <section class="c-card" style="display:flex; align-items:center; gap:20px;">
        ${renderProgressRing({
          size: 112,
          stroke: 10,
          progress: ringPct,
          label: `${feitosAtual}/${metaSemanal}`,
          sublabel: ''
        })}
        <div>
          <div class="t-caption" style="color:var(--tinta-3);">CONSTÂNCIA</div>
          <div class="t-h2" style="margin-top:4px;">${feitosAtual} de ${metaSemanal} treinos concluídos</div>
          <div class="t-small" style="color:var(--tinta-2); margin-top:4px;">
            ${hasRealCompletedSession ? 'Seus números reais desta semana' : 'Ritmo constante nas últimas 7 semanas'}
          </div>
        </div>
      </section>

      <!-- A2 & M5 Gráfico de barras com altura proporcional (valor / máximoDaEscala) * 120px + linha da meta à esquerda -->
      <section class="c-card" aria-label="Volume das últimas 7 semanas">
        <div class="t-caption" style="color:var(--tinta-3);">SEMANA</div>
        <h2 class="t-h3" style="margin-top:4px;">Últimas 7 semanas</h2>

        <div class="evo-chart-stage">
          <!-- M5: Linha-guia tracejada com rótulo "meta" à ESQUERDA acima da linha (z-index: 1) -->
          <div class="evo-meta-guide" style="bottom: ${metaGuideBottomPx}px;">
            <span class="evo-meta-guide__label">meta</span>
          </div>

          <div class="evo-bars-wrap">
            ${weekCounts
              .map((val, idx) => {
                const isCurrent = idx === 6;
                const barHeightPx =
                  val <= 0 ? 8 : Math.max(8, Math.round((val / maximoDaEscala) * 120));
                return `
                  <div class="evo-bar-col">
                    <div class="evo-bar-track">
                      <span class="evo-bar-val">${val}</span>
                      <div
                        class="evo-bar-fill ${isCurrent ? 'is-current' : ''}"
                        data-bar-value="${val}"
                        data-bar-height="${barHeightPx}"
                        style="height: ${barHeightPx}px; animation-delay: ${idx * 60}ms;"
                      ></div>
                    </div>
                    <span style="font-size:12px; line-height:16px; font-weight:600; color:${isCurrent ? 'var(--tinta)' : 'var(--tinta-3)'};">
                      ${labels[idx]}
                    </span>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      </section>

      <!-- Lista de recordes (linhas de 64px) — M6: vírgula decimal em pt-BR -->
      <section class="c-card" style="padding-block: 12px;" aria-label="Recordes">
        <div class="t-caption" style="color:var(--tinta-3); padding-top:8px; margin-bottom:4px;">RECORDES</div>
        ${recordes
          .slice(0, 4)
          .map((r) => {
            const formattedVal =
              typeof r.valor === 'number' && (!r.valorTexto || String(r.valorTexto).includes('kg'))
                ? `${formatKg(r.valor)} kg`
                : String(r.valorTexto || r.valor || '').replace(/(\d+)\.(\d+)/g, '$1,$2');
            return `
              <div class="record-row">
                <div>
                  <div style="font-weight:600; color:var(--tinta);">${r.nome}</div>
                  <div class="t-small" style="color:var(--tinta-3);">${r.detalhe || ''} · ${r.dataTexto || 'Hoje'}</div>
                </div>
                <div style="font-family:var(--font-display); font-size:22px; font-weight:600; color:var(--terracota-texto);">
                  ${formattedVal}
                </div>
              </div>
            `;
          })
          .join('')}
      </section>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   SEÇÃO 7.7 — TELA PERFIL
   -------------------------------------------------------------------------- */
function renderScreenPerfil() {
  const perfil = store.getEntity('perfil') || {};
  const nome = perfil.nome || 'Atleta';
  const inicial = nome.charAt(0).toUpperCase();
  const nDias = Array.isArray(perfil.diasSemana) ? perfil.diasSemana.length : 4;
  const objVal = perfil.objetivo || 'Os dois: ferro e asfalto';
  const nivVal = perfil.nivel || 'Treino há alguns meses';
  const locaisStr =
    Array.isArray(perfil.locais) && perfil.locais.length > 0
      ? perfil.locais.join(', ')
      : 'Academia completa';
  const cuidadosStr =
    Array.isArray(perfil.cuidados) && perfil.cuidados.length > 0
      ? perfil.cuidados.join(', ')
      : 'Nenhum';
  const pesoStr = `${formatWeightOneDecimal(perfil.pesoKg || 70)} kg`;
  const temaEscolhido = lerTema();

  const profileRows = [
    { key: 'objetivo', label: 'Objetivo', value: objVal, step: 1 },
    { key: 'nivel', label: 'Nível', value: nivVal, step: 2 },
    { key: 'locais', label: 'Onde treino', value: locaisStr, step: 3 },
    { key: 'dias', label: 'Dias', value: formatDiasCount(nDias), step: 4 },
    { key: 'tempo', label: 'Tempo', value: `${perfil.tempoTreinoMin || 45} min`, step: 5 },
    { key: 'cuidados', label: 'Cuidados', value: cuidadosStr, step: 6 },
    { key: 'peso', label: 'Peso', value: pesoStr, step: 7 }
  ];

  return `
    <div class="reading-column">
      <div class="top-ambient-gradient" aria-hidden="true"></div>

      <header id="clay-topbar" class="c-topbar">
        <span></span>
        <div class="c-topbar__title" style="opacity:0;">Perfil</div>
        <div class="c-topbar__right"></div>
      </header>

      <section style="display:flex; align-items:center; gap:18px;">
        <div
          style="
            width:72px;
            height:72px;
            border-radius:50%;
            background-color:var(--salvia-suave);
            border:2px solid var(--salvia);
            display:flex;
            align-items:center;
            justify-content:center;
            font-family:var(--font-display);
            font-size:28px;
            font-weight:600;
            color:var(--tinta);
            flex-shrink:0;
          "
        >
          ${inicial}
        </div>
        <div>
          <h1
            data-collapsible-heading
            style="font-family:var(--font-display); font-size:28px; line-height:34px; font-weight:600;"
          >
            ${nome}
          </h1>
          <div style="font-size:14px; line-height:20px; color:var(--tinta-2); margin-top:4px;">
            ${objVal} · ${formatDiasCount(nDias)}
          </div>
        </div>
      </section>

      <!-- A7: Seção Aparência no topo do Perfil -->
      <section class="profile-appearance-card" aria-label="Aparência">
        <div class="profile-appearance-title">Aparência</div>
        <div class="theme-segmented-control" role="radiogroup" aria-label="Escolher tema">
          <button
            type="button"
            role="radio"
            aria-checked="${temaEscolhido === 'escuro' ? 'true' : 'false'}"
            class="theme-seg-btn ${temaEscolhido === 'escuro' ? 'is-selected' : ''}"
            data-theme-option="escuro"
          >
            ${getIconSvg('lua', 20)}
            <span>Escuro</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked="${temaEscolhido === 'claro' ? 'true' : 'false'}"
            class="theme-seg-btn ${temaEscolhido === 'claro' ? 'is-selected' : ''}"
            data-theme-option="claro"
          >
            ${getIconSvg('sol', 20)}
            <span>Claro</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked="${temaEscolhido === 'automatico' ? 'true' : 'false'}"
            class="theme-seg-btn ${temaEscolhido === 'automatico' ? 'is-selected' : ''}"
            data-theme-option="automatico"
          >
            ${getIconSvg('meio-circulo', 20)}
            <span>Automático</span>
          </button>
        </div>
        <div class="profile-appearance-help">Automático segue o tema do seu celular.</div>

        <!-- C3: Cartão de 120px em grade de 3 colunas (texto 1fr, ilustração 56px, botão auto) -->
        <div class="theme-preview-card" id="profile-theme-preview-card" aria-label="Pré-visualização da tela Hoje">
          <div class="theme-preview-card__left">
            <span class="theme-preview-card__kicker">HOJE</span>
            <div class="theme-preview-card__heading">Peito e tríceps</div>
            <div class="theme-preview-card__pills">
              <span class="theme-preview-card__pill">${perfil.tempoTreinoMin || 45} min</span>
              <span class="theme-preview-card__pill">6 exercícios</span>
            </div>
          </div>
          <div class="theme-preview-card__art" aria-hidden="true">
            ${renderSceneJ('Peito', 52)}
          </div>
          <span class="theme-preview-card__cta" aria-hidden="true">Começar</span>
        </div>
      </section>

      <section class="profile-group-card" aria-label="Seu plano">
        ${profileRows
          .map(
            (r) => `
              <button
                type="button"
                class="list-row-btn"
                data-edit-profile-step="${r.step}"
              >
                <span style="font-weight:500; color:var(--tinta);">${r.label}</span>
                <span style="display:inline-flex; align-items:center; gap:8px; color:var(--tinta-3); font-size:14px; max-width:58%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  <span style="overflow:hidden; text-overflow:ellipsis;">${r.value}</span>
                  ${getIconSvg('avancar', 18)}
                </span>
              </button>
            `
          )
          .join('')}
      </section>

      <section class="profile-group-card" style="padding: 12px 20px;" aria-label="Corrida">
        <div class="t-caption" style="color:var(--tinta-3); margin-bottom:4px;">CORRIDA</div>
        <div style="border-bottom:1px solid var(--linha);">
          ${renderToggle({
            id: 'toggle-voz-corrida',
            label: 'Avisos de voz na corrida',
            checked: perfil.vozEmCorrida !== false,
            settingKey: 'vozEmCorrida'
          })}
        </div>
        <div style="border-bottom:1px solid var(--linha);">
          ${renderToggle({
            id: 'toggle-pausa-auto-corrida',
            label: 'Pausa automática ao parar',
            checked: perfil.pausaAutomaticaCorrida !== false,
            settingKey: 'pausaAutomaticaCorrida'
          })}
        </div>
        <div style="border-bottom:1px solid var(--linha);">
          ${renderToggle({
            id: 'toggle-ruas-mapa',
            label: 'Mostrar ruas no mapa quando houver internet',
            checked: Boolean(perfil.mostrarRuasNoMapa),
            settingKey: 'mostrarRuasNoMapa'
          })}
        </div>
        <div style="padding: 12px 0 4px; display:flex; flex-direction:column; gap:8px;">
          <span style="font-weight:500; color:var(--tinta); font-size:15px;">Contagem inicial</span>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${[
              { label: '3 s', val: 3 },
              { label: '5 s', val: 5 },
              { label: 'Sem contagem', val: 0 }
            ]
              .map(
                (opt) => `
                  <button
                    type="button"
                    class="c-chip ${Number(perfil.contagemInicialCorrida ?? 3) === opt.val ? 'is-selected' : ''}"
                    data-run-countdown="${opt.val}"
                  >
                    <span>${opt.label}</span>
                  </button>
                `
              )
              .join('')}
          </div>
        </div>
      </section>

      <section class="profile-group-card" style="padding: 4px 20px;" aria-label="Preferências">
        <div style="border-bottom:1px solid var(--linha);">
          ${renderToggle({
            id: 'toggle-som-perfil',
            label: 'Sons do cronômetro',
            checked: perfil.somAtivo !== false,
            settingKey: 'somAtivo'
          })}
        </div>
        <div>
          ${renderToggle({
            id: 'toggle-vibracao-perfil',
            label: 'Vibração',
            checked: perfil.vibracaoAtiva !== false,
            settingKey: 'vibracaoAtiva'
          })}
        </div>
      </section>

      <section class="profile-group-card" aria-label="Dados">
        <button
          type="button"
          class="list-row-btn"
          data-profile-action="redo-onboarding"
        >
          <span style="font-weight:500; color:var(--tinta);">Refazer questionário</span>
          <span style="color:var(--tinta-3);">${getIconSvg('avancar', 18)}</span>
        </button>
        <button
          type="button"
          class="list-row-btn"
          data-profile-action="delete-data-confirm"
        >
          <span style="font-weight:600; color:var(--erro);">Apagar meus dados</span>
          <span style="color:var(--erro);">${getIconSvg('avancar', 18)}</span>
        </button>
      </section>

      <footer style="text-align:center; font-size:12px; line-height:16px; color:var(--tinta-3); padding-top:8px;">
        Clay Fit · versão 0.6.1
      </footer>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   FOLHAS INFERIORES ESPECÍFICAS
   -------------------------------------------------------------------------- */
function openAlternativesSheet() {
  const planData = getActiveWorkoutPlan();
  const altB = planData.hipoteses.find((h) => h.codigo === 'B');
  const altC = planData.hipoteses.find((h) => h.codigo === 'C');
  const currentId = planData.ativo.id;

  let selectedHypId = currentId === altC?.id ? altC.id : altB?.id;

  const renderAltOption = (hyp) => {
    const isSel = hyp.id === selectedHypId;
    return `
      <button
        type="button"
        role="radio"
        aria-checked="${isSel ? 'true' : 'false'}"
        class="c-choice-card ${isSel ? 'is-selected' : ''}"
        data-choice-group="sheet-alt-workout"
        data-choice-value="${hyp.id}"
        style="align-items:flex-start; padding: 16px;"
      >
        <div class="c-choice-card__content">
          <span class="c-chip is-selected" style="min-height:28px; padding:4px 10px; font-size:12px; margin-bottom:8px;">
            ${hyp.rotulo}
          </span>
          <div class="c-choice-card__title">${hyp.nome}</div>
          <div class="t-small" style="color:var(--tinta-2); margin-top:4px;">
            ${hyp.duracaoMin} min · ${formatExerciciosCount(hyp.exercicios.length)}
          </div>
          <div class="c-choice-card__subtitle" style="margin-top:6px;">
            ${hyp.motivo}
          </div>
        </div>
        <span class="c-choice-card__check" style="margin-top:4px;">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12.5 10 17l9-10"/>
          </svg>
        </span>
      </button>
    `;
  };

  openBottomSheet('clay-sheet', {
    title: 'Outras opções para hoje',
    contentHtml: `
      <div style="display:flex; flex-direction:column; gap:14px;" role="radiogroup" aria-label="Outras opções para hoje">
        ${altB ? renderAltOption(altB) : ''}
        ${altC ? renderAltOption(altC) : ''}
      </div>
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px;">
        <button type="button" id="btn-confirm-alt-workout" class="c-btn c-btn--primary c-btn--full">
          <span>Usar este treino</span>
        </button>
        <button type="button" id="btn-keep-planned-workout" class="c-btn c-btn--ghost c-btn--full">
          <span>Manter o treino planejado</span>
        </button>
      </div>
    `
  });

  const sheetEl = document.getElementById('clay-sheet');
  bindChoiceCards(sheetEl, ({ value }) => {
    selectedHypId = value;
  });

  document.getElementById('btn-confirm-alt-workout')?.addEventListener('click', () => {
    const prevId = store.getEntity('hojeEstado')?.hipoteseEscolhidaId || 'hip_a';
    pulseWorkoutFieldsNextRender = true;
    store.updateHojeEstado({
      hipoteseAnteriorId: prevId,
      hipoteseEscolhidaId: selectedHypId
    });
    vibrate('confirmacao');
    closeBottomSheet('clay-sheet', { silent: true });
    renderCurrentRoute();
    showToast({
      message: 'Treino trocado',
      actionLabel: 'Desfazer',
      onAction: () => {
        pulseWorkoutFieldsNextRender = true;
        store.updateHojeEstado({ hipoteseEscolhidaId: prevId });
        renderCurrentRoute();
      }
    });
  });

  document.getElementById('btn-keep-planned-workout')?.addEventListener('click', () => {
    pulseWorkoutFieldsNextRender = true;
    store.updateHojeEstado({ hipoteseEscolhidaId: 'hip_a' });
    closeBottomSheet('clay-sheet', { silent: true });
    renderCurrentRoute();
  });
}

/**
 * B5 & G1 — "Começar treino" (cartão de Hoje) e botão central da barra abrem a folha "O que vamos fazer?".
 * Escolhendo o treino de hoje: fecha a folha silenciosamente (`{ silent: true }`), cria a sessão
 * e navega no próximo tick (`requestAnimationFrame`) com guarda de 600ms.
 */
function openStartActionSheet() {
  const planData = getActiveWorkoutPlan();
  const workout = planData.ativo;

  openBottomSheet('clay-sheet', {
    title: 'O que vamos fazer?',
    contentHtml: `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <button
          type="button"
          class="c-choice-card"
          style="min-height:88px;"
          data-start-choice="hoje"
        >
          <span class="c-choice-card__icon" style="width:48px;height:48px;">${getIconSvg('haltere', 24)}</span>
          <span class="c-choice-card__content">
            <span class="c-choice-card__title" style="display:block;">Treino de hoje</span>
            <span class="c-choice-card__subtitle" style="display:block;">${workout.nome} · ${workout.duracaoMin} min</span>
          </span>
          <span style="color:var(--tinta-3);">${getIconSvg('avancar', 20)}</span>
        </button>

        <button
          type="button"
          class="c-choice-card"
          style="min-height:88px;"
          data-start-choice="corrida"
        >
          <span class="c-choice-card__icon" style="width:48px;height:48px;">${getIconSvg('corrida', 24)}</span>
          <span class="c-choice-card__content">
            <span class="c-choice-card__title" style="display:block;">Corrida livre</span>
            <span class="c-choice-card__subtitle" style="display:block;">GPS, ritmo e trajeto</span>
          </span>
          <span style="color:var(--tinta-3);">${getIconSvg('avancar', 20)}</span>
        </button>

        <button
          type="button"
          class="c-choice-card"
          style="min-height:88px;"
          data-start-choice="rapido15"
        >
          <span class="c-choice-card__icon" style="width:48px;height:48px;">${getIconSvg('relogio', 24)}</span>
          <span class="c-choice-card__content">
            <span class="c-choice-card__title" style="display:block;">Treino rápido de 15 min</span>
            <span class="c-choice-card__subtitle" style="display:block;">Quando o tempo está curto</span>
          </span>
          <span style="color:var(--tinta-3);">${getIconSvg('avancar', 20)}</span>
        </button>

        <button
          type="button"
          class="c-btn c-btn--ghost c-btn--full"
          id="btn-sheet-ver-previa"
          style="font-size:14px; color:var(--terracota-texto);"
        >
          <span>Ver lista de exercícios antes de começar</span>
        </button>
      </div>
    `
  });

  document.getElementById('btn-sheet-ver-previa')?.addEventListener('click', () => {
    vibrate('selecao');
    navigateSafelyWithGuard('#/previa/hoje', { mode: 'push', fromSheet: true });
  });

  document.querySelectorAll('[data-start-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const choice = btn.dataset.startChoice;
      vibrate('confirmacao');
      closeBottomSheet('clay-sheet', { silent: true });
      launchLiveWorkoutByChoice(choice);
    });
  });
}

function launchLiveWorkoutByChoice(choice = 'hoje') {
  const planData = getActiveWorkoutPlan();
  const workout = planData.ativo;

  let novaSessao = null;
  if (choice === 'corrida') {
    novaSessao = startNewLiveSession({
      sessaoId: `ses_corrida_${Date.now()}`,
      nome: 'Corrida livre',
      grupoPrincipal: 'Corrida',
      tipo: 'corrida',
      duracaoMin: 30
    });
  } else if (choice === 'rapido15') {
    const candidate = planData.hipoteses.find((h) => h.codigo === 'B') || workout;
    const hypLeve = candidate.grupoPrincipal === 'Corrida' ? WORKOUT_TEMPLATES.peito : candidate;
    novaSessao = startNewLiveSession({
      ...hypLeve,
      tipo: 'forca',
      sessaoId: `ses_rapido_${Date.now()}`,
      nome: `${hypLeve.nome} · Rápido`,
      duracaoMin: 20
    });
  } else if (workout.grupoPrincipal === 'Corrida') {
    store.updateHojeEstado({
      corridaPreConfig: {
        nome: workout.nome || 'Corrida do dia',
        modo: 'meta_tempo',
        meta: { tipo: 'tempo', valor: Number(workout.duracaoMin || 30) * 60 },
        ritmoAlvoSegKm: null,
        intervalos: null
      }
    });
    novaSessao = startNewLiveSession({
      sessaoId: `ses_corrida_${Date.now()}`,
      nome: workout.nome || 'Corrida do dia',
      grupoPrincipal: 'Corrida',
      tipo: 'corrida',
      duracaoMin: Number(workout.duracaoMin || 30)
    });
  } else {
    novaSessao = startNewLiveSession(workout);
  }

  navigateSafelyWithGuard(`#/treino/${novaSessao.id}`, { mode: 'push', fromSheet: false });
}

function openExerciseDetailSheet(exId) {
  const item = ALL_LIBRARY_ITEMS.find((x) => x.id === exId);
  if (!item) return;

  openBottomSheet('clay-sheet', {
    title: item.nome,
    contentHtml: `
      <div style="display:flex; flex-direction:column; gap:18px;">
        <div
          style="
            height:128px;
            border-radius:24px;
            background-color:${getGroupBgColor(item.grupo)};
            overflow:hidden;
            display:flex;
            align-items:center;
            justify-content:center;
          "
        >
          ${renderLibraryGroupScene(item, { isThumb: false })}
        </div>

        <div class="c-chip-group">
          <span class="c-chip is-selected">${item.grupo}</span>
          <span class="c-chip">${item.equipamento}</span>
          <span class="c-chip">${item.nivel}</span>
        </div>

        <div>
          <h3 class="t-h3" style="margin-bottom:8px;">Como fazer</h3>
          <ol style="padding-left:20px; display:flex; flex-direction:column; gap:6px; color:var(--tinta-2); font-size:15px; line-height:22px;">
            ${(item.comoFazer || []).map((step) => `<li>${step}</li>`).join('')}
          </ol>
        </div>

        <div>
          <h3 class="t-h3" style="margin-bottom:8px;">Erro comum</h3>
          <p style="color:var(--tinta-2); font-size:15px; line-height:22px; margin:0;">
            ${item.erroComum || (item.errosComuns && item.errosComuns[0]) || ''}
          </p>
        </div>

        <button
          type="button"
          id="btn-add-ex-today"
          class="c-btn c-btn--primary c-btn--full"
        >
          <span>Adicionar ao treino de hoje</span>
        </button>
      </div>
    `
  });

  document.getElementById('btn-add-ex-today')?.addEventListener('click', () => {
    store.addExtraExerciseToday(item.id);
    vibrate('sucesso');
    closeBottomSheet('clay-sheet', { silent: true });
    showToast({ message: 'Adicionado' });
  });
}

function openRunTypeDetailSheet(typeId) {
  const tc = RUN_TYPES_CARDS.find((x) => x.id === typeId);
  if (!tc) return;

  openBottomSheet('clay-sheet', {
    title: tc.nome,
    contentHtml: `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="height:128px; border-radius:22px; background:var(--ill-palco); background-color:var(--ill-palco-cor); overflow:hidden; display:flex; align-items:center; justify-content:center;">
          ${renderRunTypeCardScene(tc.sceneKey)}
        </div>
        <p class="t-body" style="color:var(--tinta-2); margin:0;">${tc.descricao}</p>
        <div>
          <h3 class="t-h3" style="margin-bottom:6px;">Benefícios</h3>
          <ul style="padding-left:20px; margin:0; display:flex; flex-direction:column; gap:4px; color:var(--tinta-2); font-size:14px;">
            ${(tc.beneficios || []).map((b) => `<li>${b}</li>`).join('')}
          </ul>
        </div>
        <div>
          <h3 class="t-h3" style="margin-bottom:6px;">Dicas</h3>
          <ul style="padding-left:20px; margin:0; display:flex; flex-direction:column; gap:4px; color:var(--tinta-2); font-size:14px;">
            ${(tc.dicas || []).map((d) => `<li>${d}</li>`).join('')}
          </ul>
        </div>
        <button type="button" id="btn-use-in-run" class="c-btn c-btn--primary c-btn--full">
          <span>Usar na corrida</span>
        </button>
      </div>
    `
  });

  document.getElementById('btn-use-in-run')?.addEventListener('click', () => {
    vibrate('confirmacao');
    store.updateHojeEstado({
      corridaPreConfig: {
        nome: tc.nome,
        modo: tc.modo,
        meta: tc.meta,
        ritmoAlvoSegKm: tc.ritmoAlvoSegKm,
        intervalos: tc.intervalos
      }
    });
    const novaSessao = startNewLiveSession({
      sessaoId: `ses_corrida_${Date.now()}`,
      nome: tc.nome,
      grupoPrincipal: 'Corrida',
      tipo: 'corrida',
      duracaoMin: 30
    });
    navigateSafelyWithGuard(`#/treino/${novaSessao.id}`, { mode: 'push', fromSheet: true });
  });
}

function openDayScheduleSheet(diaIndex) {
  const perfil = store.getEntity('perfil');
  const schedule = buildWeeklySchedule(perfil);
  const slot = schedule[Number(diaIndex)] || schedule[1];
  const tpl = WORKOUT_TEMPLATES[slot.templateChave] || WORKOUT_TEMPLATES.peito;

  openBottomSheet('clay-sheet', {
    title: `${slot.nomeDia} · ${slot.nomeTreino}`,
    contentHtml: `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
          <div>
            <div class="t-caption" style="color:var(--terracota-texto);">${tpl.grupoPrincipal}</div>
            <div class="t-h3" style="margin-top:4px;">
              ${slot.ativo ? `Sessão de ${perfil.tempoTreinoMin || 45} min` : 'Recuperação ativa'}
            </div>
            <p class="t-small" style="color:var(--tinta-2); margin-top:4px;">
              ${
                slot.ativo
                  ? 'Treino programado na sua distribuição semanal.'
                  : 'Dia livre para caminhada leve, alongamento e descanso muscular.'
              }
            </p>
          </div>
          <div style="width:88px; height:88px; flex-shrink:0;">
            ${renderSceneJ(tpl.grupoPrincipal, 88)}
          </div>
        </div>
        ${
          slot.ativo
            ? `<button type="button" id="btn-sheet-open-preview" class="c-btn c-btn--primary c-btn--full">
                 <span>Ver exercícios deste treino</span>
               </button>`
            : ''
        }
      </div>
    `
  });

  document.getElementById('btn-sheet-open-preview')?.addEventListener('click', () => {
    navigateSafelyWithGuard(`#/previa/dia-${slot.diaIndex}`, { mode: 'push', fromSheet: true });
  });
}

function openProfileEditSheet(stepNum) {
  const cfg = QUESTIONNAIRE_STEPS[stepNum];
  if (!cfg) return;
  const perfil = store.getEntity('perfil');

  let contentHtml = '';
  if (cfg.type === 'single') {
    const curVal = stepNum === 1 ? perfil.objetivo : perfil.nivel;
    contentHtml = `
      <div style="display:flex; flex-direction:column; gap:10px;" role="radiogroup" aria-label="${cfg.title}">
        ${cfg.options
          .map((opt) =>
            renderChoiceCard({
              title: opt.title,
              subtitle: opt.subtitle,
              icon: opt.icon,
              value: opt.value,
              group: 'profile-edit-single',
              multiple: false,
              selected: curVal === opt.value
            })
          )
          .join('')}
      </div>
    `;
  } else if (cfg.type === 'multi' || cfg.type === 'care') {
    const curList = stepNum === 3 ? perfil.locais || [] : perfil.cuidados || ['Nenhum'];
    contentHtml = `
      <div style="display:flex; flex-direction:column; gap:10px;" role="group" aria-label="${cfg.title}">
        ${cfg.options
          .map((opt) =>
            renderChoiceCard({
              title: opt.title,
              subtitle: opt.subtitle,
              icon: opt.icon,
              value: opt.value,
              group: 'profile-edit-multi',
              multiple: true,
              selected: curList.includes(opt.value)
            })
          )
          .join('')}
      </div>
      <button type="button" id="btn-save-profile-multi" class="c-btn c-btn--primary c-btn--full" style="margin-top:16px;">
        <span>Salvar</span>
      </button>
    `;
  } else if (cfg.type === 'days') {
    const days = Array.isArray(perfil.diasSemana) ? [...perfil.diasSemana] : [1, 2, 4, 5];
    const letters = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    contentHtml = `
      <div class="q-days-row" style="margin-top:8px;">
        ${letters
          .map(
            (l, idx) => `
              <button
                type="button"
                class="day-circle-btn"
                data-sheet-day="${idx}"
                aria-pressed="${days.includes(idx) ? 'true' : 'false'}"
              >
                ${l}
              </button>
            `
          )
          .join('')}
      </div>
      <div id="sheet-days-msg" class="t-small" style="text-align:center; margin-top:12px; color:var(--tinta-2);">
        ${formatDiasCount(days.length)}
      </div>
      <button type="button" id="btn-save-profile-days" class="c-btn c-btn--primary c-btn--full" style="margin-top:16px;">
        <span>Salvar</span>
      </button>
    `;
  } else if (cfg.type === 'time') {
    const curMin = Number(perfil.tempoTreinoMin || 45);
    contentHtml = `
      <div class="q-time-grid" style="margin-top:8px;">
        ${cfg.chips
          .map(
            (ch) => `
              <button
                type="button"
                role="radio"
                aria-checked="${curMin === ch.min ? 'true' : 'false'}"
                class="q-time-chip"
                data-sheet-time="${ch.min}"
              >
                <span style="font-family:var(--font-display); font-size:22px; font-weight:600;">${ch.label}</span>
                <span style="font-size:13px; color:var(--tinta-2);">${ch.desc}</span>
              </button>
            `
          )
          .join('')}
      </div>
    `;
  }

  openBottomSheet('clay-sheet', {
    title: cfg.title,
    contentHtml
  });

  const sheetEl = document.getElementById('clay-sheet');

  if (cfg.type === 'single') {
    bindChoiceCards(sheetEl, ({ value }) => {
      if (stepNum === 1) store.updatePerfil({ objetivo: value });
      if (stepNum === 2) store.updatePerfil({ nivel: value });
      setTimeout(() => {
        closeBottomSheet('clay-sheet', { silent: true });
        renderCurrentRoute();
        showToast({ message: 'Preferência atualizada' });
      }, 240);
    });
  } else if (cfg.type === 'multi' || cfg.type === 'care') {
    let latestValues = stepNum === 3 ? [...(perfil.locais || [])] : [...(perfil.cuidados || ['Nenhum'])];
    bindChoiceCards(sheetEl, ({ values }) => {
      latestValues = values;
    });
    document.getElementById('btn-save-profile-multi')?.addEventListener('click', () => {
      if (latestValues.length === 0) return;
      if (stepNum === 3) store.updatePerfil({ locais: latestValues });
      if (stepNum === 6) store.updatePerfil({ cuidados: latestValues });
      closeBottomSheet('clay-sheet', { silent: true });
      renderCurrentRoute();
      showToast({ message: 'Preferência atualizada' });
    });
  } else if (cfg.type === 'days') {
    let tempDays = Array.isArray(perfil.diasSemana) ? [...perfil.diasSemana] : [1, 2, 4, 5];
    const saveBtn = document.getElementById('btn-save-profile-days');
    const msgEl = document.getElementById('sheet-days-msg');

    sheetEl.querySelectorAll('[data-sheet-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        vibrate('selecao');
        const d = Number(btn.dataset.sheetDay);
        if (tempDays.includes(d)) {
          tempDays = tempDays.filter((x) => x !== d);
        } else {
          tempDays = [...tempDays, d].sort();
        }
        btn.setAttribute('aria-pressed', String(tempDays.includes(d)));
        if (msgEl) {
          msgEl.textContent =
            tempDays.length < 2
              ? 'Escolha pelo menos 2 dias.'
              : formatDiasCount(tempDays.length);
          msgEl.style.color = tempDays.length < 2 ? 'var(--alerta)' : 'var(--tinta-2)';
        }
        if (saveBtn) saveBtn.disabled = tempDays.length < 2;
      });
    });

    saveBtn?.addEventListener('click', () => {
      if (tempDays.length < 2) return;
      store.updatePerfil({ diasSemana: tempDays });
      closeBottomSheet('clay-sheet', { silent: true });
      renderCurrentRoute();
      showToast({ message: 'Dias da semana atualizados' });
    });
  } else if (cfg.type === 'time') {
    sheetEl.querySelectorAll('[data-sheet-time]').forEach((btn) => {
      btn.addEventListener('click', () => {
        vibrate('selecao');
        const min = Number(btn.dataset.sheetTime);
        store.updatePerfil({ tempoTreinoMin: min });
        closeBottomSheet('clay-sheet', { silent: true });
        renderCurrentRoute();
        showToast({ message: `Duração ajustada para ${min} min` });
      });
    });
  } else if (cfg.type === 'weight') {
    let curKg = Math.max(30, Math.min(250, Math.round(Number(perfil.pesoKg || 70) * 10) / 10));
    sheetEl.querySelector('.c-sheet__body').innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px; align-items:center;">
        <div class="q-weight-hero-row">
          <button type="button" id="sheet-weight-minus" class="q-ruler-step-btn" aria-label="Diminuir 0,1 kg">${getIconSvg('menos', 22)}</button>
          <div class="q-weight-readout">
            <span id="sheet-weight-val" class="q-weight-value" style="font-size:48px; line-height:48px;">${formatWeightOneDecimal(curKg)}</span>
            <span class="q-weight-unit">kg</span>
          </div>
          <button type="button" id="sheet-weight-plus" class="q-ruler-step-btn" aria-label="Aumentar 0,1 kg">${getIconSvg('mais', 22)}</button>
        </div>
        <button type="button" id="btn-save-sheet-weight" class="c-btn c-btn--primary c-btn--full">
          <span>Salvar</span>
        </button>
      </div>
    `;
    const valSpan = document.getElementById('sheet-weight-val');
    document.getElementById('sheet-weight-minus')?.addEventListener('click', () => {
      curKg = Math.max(30, Math.round((curKg - 0.1) * 10) / 10);
      if (valSpan) valSpan.textContent = formatWeightOneDecimal(curKg);
    });
    document.getElementById('sheet-weight-plus')?.addEventListener('click', () => {
      curKg = Math.min(250, Math.round((curKg + 0.1) * 10) / 10);
      if (valSpan) valSpan.textContent = formatWeightOneDecimal(curKg);
    });
    document.getElementById('btn-save-sheet-weight')?.addEventListener('click', () => {
      store.registrarPeso(curKg);
      closeBottomSheet('clay-sheet', { silent: true });
      renderCurrentRoute();
      showToast({ message: `Peso atualizado: ${formatWeightOneDecimal(curKg)} kg` });
    });
  }
}

function openDeleteDataConfirmSheet() {
  openBottomSheet('clay-sheet', {
    title: 'Apagar seus dados?',
    contentHtml: `
      <p class="t-body" style="color:var(--tinta-2); margin-bottom:20px;">
        Isso remove seu plano, histórico e preferências deste aparelho e volta para o início.
      </p>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button type="button" id="btn-cancel-delete-data" class="c-btn c-btn--primary c-btn--full">
          <span>Manter meus dados</span>
        </button>
        <button type="button" id="btn-confirm-delete-data" class="c-btn c-btn--danger-ghost c-btn--full">
          <span>Apagar tudo</span>
        </button>
      </div>
    `
  });

  document.getElementById('btn-cancel-delete-data')?.addEventListener('click', () => {
    closeBottomSheet('clay-sheet', { silent: true });
  });

  document.getElementById('btn-confirm-delete-data')?.addEventListener('click', () => {
    vibrate('erro');
    store.resetAll();
    navigateSafelyWithGuard('#/abertura', { mode: 'replace', fromSheet: true });
  });
}

/* --------------------------------------------------------------------------
   ORQUESTRAÇÃO DE TELAS E EVENTOS GLOBAIS
   -------------------------------------------------------------------------- */
function renderCurrentRoute() {
  if (!router || !router.currentRouteObj) return;
  const routeObj = router.currentRouteObj;
  const routeName = routeObj.name;
  closeAllSheets({ silent: true, clearContent: true });

  if (aberturaTimer) {
    clearTimeout(aberturaTimer);
    aberturaTimer = null;
  }
  if (montandoInterval) {
    clearInterval(montandoInterval);
    montandoInterval = null;
  }
  if (routeName !== 'treino') {
    unmountLiveWorkout();
  }

  const navRoot = document.getElementById('app-nav-root');
  const mainRoot = document.getElementById('app-main-root');
  if (!mainRoot) return;

  const isBibliotecaBuscar = routeName === 'biblioteca' && routeObj.param === 'buscar';
  const showBottomNav = ROUTES_WITH_BOTTOM_NAV.includes(routeName) && !isBibliotecaBuscar;
  mainRoot.classList.toggle('app-main--fullscreen', !showBottomNav);

  if (navRoot) {
    const activeTabForNav = routeName === 'previa' ? 'hoje' : routeName === 'sessao' ? 'evolucao' : routeName;
    navRoot.innerHTML = renderNavigation(activeTabForNav, !showBottomNav);
  }

  // Rota de Treino ao Vivo (#/treino/:sessaoId) delega ao orquestrador `live.js`
  if (routeName === 'treino') {
    closeAllSheets({ silent: true, clearContent: true });
    mainRoot.innerHTML = `<div id="screen-stage"></div>`;
    const stageEl = document.getElementById('screen-stage');
    mountLiveWorkout(stageEl, routeObj.param || 'hoje', {
      getDefaultWorkout: () => getActiveWorkoutPlan().ativo,
      onNavigateHome: () => {
        navigateSafelyWithGuard('#/hoje', { mode: 'replace', fromSheet: false });
      }
    });
    return;
  }

  let screenHtml = '';
  if (routeName === 'abertura') {
    screenHtml = renderF0Abertura();
  } else if (routeName === 'boas-vindas') {
    screenHtml = renderF1BoasVindas();
  } else if (routeName === 'q') {
    screenHtml = renderQuestionnaireStep(Number(routeObj.param || 1));
  } else if (routeName === 'montando') {
    screenHtml = renderF9Montando();
  } else if (routeName === 'plano') {
    screenHtml = renderF10PlanoPronto();
  } else if (routeName === 'hoje') {
    screenHtml = renderScreenHoje();
  } else if (routeName === 'previa') {
    screenHtml = renderScreenPrevia(routeObj.param || 'hoje');
  } else if (routeName === 'biblioteca' && routeObj.param === 'buscar') {
    screenHtml = renderScreenBibliotecaBuscar();
  } else if (routeName === 'biblioteca') {
    screenHtml = renderScreenBibliotecaNova();
  } else if (routeName === 'exercicio') {
    screenHtml = renderScreenExercicioDetalhe(routeObj.param);
  } else if (routeName === 'evolucao') {
    screenHtml = renderScreenEvolucao();
  } else if (routeName === 'sessao') {
    screenHtml = `<div id="sessao-detail-mount" class="reading-column"></div>`;
  } else if (routeName === 'perfil') {
    screenHtml = renderScreenPerfil();
  } else {
    screenHtml = renderScreenHoje();
  }

  mainRoot.innerHTML = `<div id="screen-stage">${screenHtml}</div>`;

  mountShaderForRoute(routeName);
  bindRouteInteractions(routeObj);
}

function mountShaderForRoute(routeName) {
  clayFlow.unmount();

  if (routeName === 'abertura' || routeName === 'boas-vindas') {
    const host = document.getElementById('shader-host-fullscreen');
    if (host) clayFlow.mount(host, { palette: 'CLARA', intensity: 0.6 });
  } else if (routeName === 'montando') {
    const host = document.getElementById('shader-host-fullscreen');
    if (host) clayFlow.mount(host, { palette: 'TERRACOTA', intensity: 0.8 });
  } else if (routeName === 'plano') {
    const host = document.getElementById('shader-host-fullscreen');
    if (host) clayFlow.mount(host, { palette: 'SALVIA', intensity: 0.5 });
  } else if (routeName === 'hoje') {
    const cardHost = document.getElementById('shader-host-card');
    const cardEl = document.getElementById('hoje-workout-card');
    const palette = cardEl?.dataset.shaderPalette || 'TERRACOTA';
    if (cardHost) clayFlow.mount(cardHost, { palette, intensity: 0.55 });
  }
}

function bindRouteInteractions(routeObj) {
  const routeName = routeObj.name;
  const mainRoot = document.getElementById('app-main-root') || document;

  document.querySelectorAll('.app-nav__link[data-route]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.route;
      if (target === routeName) {
        scrollToTopSmooth();
      } else {
        vibrate('selecao');
        router.navigate(`#/${target}`, { mode: 'tab' });
      }
    });
  });

  document.querySelectorAll('[data-nav-action="open-start-sheet"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vibrate('selecao');
      openStartActionSheet();
    });
  });

  mainRoot.querySelectorAll('[data-route]').forEach((el) => {
    el.addEventListener('click', () => {
      vibrate('selecao');
      router.navigate(`#/${el.dataset.route}`, { mode: 'tab' });
    });
  });

  if (routeName === 'abertura') {
    const perfil = store.getEntity('perfil');
    const isDone = Boolean(perfil?.onboardingConcluido && perfil?.etapaOnboarding === 'concluido');
    const waitMs = isDone ? 700 : 1400;
    aberturaTimer = setTimeout(() => {
      const savedStep = Number(perfil?.onboardingPassoAtual || 1);
      const nextHash = isDone
        ? '#/hoje'
        : savedStep > 1 && savedStep <= 8
        ? `#/q/${savedStep}`
        : '#/boas-vindas';
      router.navigate(nextHash, { mode: 'replace' });
    }, waitMs);
  }

  if (routeName === 'boas-vindas') {
    bindSceneAInteraction(mainRoot);
    document.getElementById('btn-welcome-start')?.addEventListener('click', () => {
      vibrate('confirmacao');
      store.updatePerfil({ onboardingPassoAtual: 1, introVersao: 2, etapaOnboarding: 'questionario' });
      router.navigate('#/q/1', { mode: 'push' });
    });
  }

  if (routeName === 'q') {
    const curPerfil = store.getEntity('perfil') || {};
    let stepNum = Math.max(1, Math.min(8, Number(routeObj.param || 1)));
    if (!curPerfil.onboardingConcluido && !curPerfil.introVersao && stepNum === 7) {
      stepNum = 8;
    }
    store.updatePerfil({
      onboardingPassoAtual: stepNum,
      ...(stepNum === 1 ? { introVersao: 2 } : {}),
      etapaOnboarding: 'questionario'
    });
    bindQuestionnaireStepEvents(stepNum, mainRoot);
  }

  if (routeName === 'montando') {
    store.updatePerfil({ etapaOnboarding: 'montando' });
    let elapsed = 0;
    const totalMs = 4000;
    const stepMs = 80;
    const sceneSlot = document.getElementById('f9-scene-slot');
    const ringFill = document.querySelector('#f9-ring-slot .c-progress-ring__fill');
    const ringText = document.querySelector('#f9-ring-slot .t-h2');
    const line1 = document.getElementById('f9-line-1');
    const line2 = document.getElementById('f9-line-2');
    const line3 = document.getElementById('f9-line-3');

    const markLineDone = (el) => {
      if (!el || el.dataset.done === 'true') return;
      el.dataset.done = 'true';
      el.style.opacity = '1';
      const checkCircle = el.querySelector('.c-choice-card__check');
      if (checkCircle) {
        checkCircle.style.backgroundColor = 'var(--terracota)';
        checkCircle.style.borderColor = 'var(--terracota)';
        checkCircle.style.color = 'var(--creme-fixo)';
      }
      vibrate('selecao');
    };

    montandoInterval = setInterval(() => {
      elapsed += stepMs;
      const ratio = Math.min(1, elapsed / totalMs);
      const pct = Math.round(ratio * 100);

      if (sceneSlot) sceneSlot.innerHTML = renderSceneI(ratio);
      if (ringText) ringText.textContent = `${pct}%`;
      if (ringFill) {
        const circ = Number(ringFill.dataset.ringCircumference || 345);
        ringFill.style.strokeDashoffset = String((circ * (1 - ratio)).toFixed(2));
      }

      if (elapsed >= 1100) markLineDone(line1);
      if (elapsed >= 2300) markLineDone(line2);
      if (elapsed >= 3500) markLineDone(line3);

      if (elapsed >= totalMs) {
        clearInterval(montandoInterval);
        montandoInterval = null;
        store.updatePerfil({ etapaOnboarding: 'plano' });
        vibrate('sucesso');
        router.navigate('#/plano', { mode: 'replace' });
      }
    }, stepMs);
  }

  if (routeName === 'plano') {
    document.getElementById('btn-plan-ready-go')?.addEventListener('click', () => {
      vibrate('confirmacao');
      store.updatePerfil({
        onboardingConcluido: true,
        etapaOnboarding: 'concluido'
      });
      router.navigate('#/hoje', { mode: 'replace' });
    });
  }

  if (routeName === 'hoje') {
    bindHojeEvents(mainRoot);
  }

  if (routeName === 'previa') {
    mainRoot.querySelector('[data-nav-back]')?.addEventListener('click', () => {
      router.back();
    });
    mainRoot.querySelector('[data-open-alternatives-sheet]')?.addEventListener('click', () => {
      openAlternativesSheet();
    });
    mainRoot.querySelector('[data-start-live-session]')?.addEventListener('click', () => {
      vibrate('confirmacao');
      launchLiveWorkoutByChoice('hoje');
    });
  }

  if (routeName === 'biblioteca' && routeObj.param === 'buscar') {
    bindScreenBibliotecaBuscarEvents(mainRoot, { router });
  } else if (routeName === 'biblioteca') {
    try {
      const params = new URLSearchParams(window.location.search || '');
      if (params.get('demo') === '1') {
        auditarCenas(true);
      }
    } catch (_) {}

    bindScreenBibliotecaNovaEvents(mainRoot, {
      router,
      onOpenRunTypeSheet: openRunTypeDetailSheet,
      onRerender: () => renderCurrentRoute()
    });
  }

  if (routeName === 'exercicio') {
    bindScreenExercicioDetalheEvents(mainRoot, { router });
  }

  if (routeName === 'evolucao') {
    const evoMount = document.getElementById('evolucao-module-mount');
    if (evoMount) {
      renderEvolutionScreen(evoMount, {
        initialTab: routeObj.query?.tab || null,
        onOpenStartSheet: () => openStartActionSheet()
      });
    }
  }

  if (routeName === 'sessao') {
    const detailMount = document.getElementById('sessao-detail-mount');
    if (detailMount) {
      renderSessionDetailScreen(detailMount, routeObj.param);
    }
  }

  if (routeName === 'perfil') {
    mainRoot.querySelectorAll('[data-theme-option]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chosen = btn.dataset.themeOption;
        vibrate('selecao');
        aplicarTema(chosen, { persist: true, animate: true, announce: true });
        mainRoot.querySelectorAll('[data-theme-option]').forEach((peer) => {
          const active = peer.dataset.themeOption === chosen;
          peer.classList.toggle('is-selected', active);
          peer.setAttribute('aria-checked', String(active));
        });
      });
    });

    mainRoot.querySelectorAll('[data-run-countdown]').forEach((chip) => {
      chip.addEventListener('click', () => {
        vibrate('selecao');
        store.updatePerfil({ contagemInicialCorrida: Number(chip.dataset.runCountdown) });
        renderCurrentRoute();
      });
    });
    bindToggles(mainRoot, ({ key, checked }) => {
      if (key) {
        store.updatePerfil({ [key]: checked });
        if (key === 'vibracaoAtiva' && checked) vibrate('selecao');
      }
    });

    mainRoot.querySelectorAll('[data-edit-profile-step]').forEach((row) => {
      row.addEventListener('click', () => {
        vibrate('selecao');
        openProfileEditSheet(Number(row.dataset.editProfileStep));
      });
    });

    mainRoot.querySelector('[data-profile-action="redo-onboarding"]')?.addEventListener('click', () => {
      vibrate('selecao');
      store.restartOnboarding();
      router.navigate('#/q/1', { mode: 'push' });
    });

    mainRoot.querySelector('[data-profile-action="delete-data-confirm"]')?.addEventListener('click', () => {
      vibrate('selecao');
      openDeleteDataConfirmSheet();
    });
  }
}

function setContinueButtonEnabled(btn, enabled) {
  if (!btn) return;
  const wasDisabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
  btn.disabled = !enabled;
  btn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
  if (enabled && wasDisabled) {
    btn.classList.remove('is-enable-pulsing');
    void btn.offsetWidth;
    btn.classList.add('is-enable-pulsing');
    setTimeout(() => btn.classList.remove('is-enable-pulsing'), 380);
  }
}

let activeWeightRulerCleanup = null;

function mountWeightRuler(root, initialKg = 70, onChangeKg = () => {}) {
  if (activeWeightRulerCleanup) {
    activeWeightRulerCleanup();
    activeWeightRulerCleanup = null;
  }

  const rulerEl = root.querySelector('#q-weight-ruler');
  const canvas = root.querySelector('#q-weight-ruler-canvas');
  const displayEl = root.querySelector('#q-weight-display-num');
  const minusBtn = root.querySelector('#btn-weight-minus');
  const plusBtn = root.querySelector('#btn-weight-plus');
  if (!rulerEl || !canvas) return;

  const MIN_KG = 30.0;
  const MAX_KG = 250.0;
  const PX_PER_TENTH = 8; // 8px por 0,1 kg => 40px por 0,5 kg, 80px por 1,0 kg
  const PX_PER_KG = 80;

  let currentKg = Math.max(MIN_KG, Math.min(MAX_KG, Math.round(Number(initialKg || 70) * 10) / 10));
  let velocityKg = 0;
  let inertiaRaf = null;
  let lastVibrateMs = 0;

  const vibrateTick4ms = () => {
    const now = performance.now();
    if (now - lastVibrateMs < 40) return;
    lastVibrateMs = now;
    try {
      const perfil = store.getEntity('perfil');
      if (perfil && perfil.vibracaoAtiva === false) return;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(4);
      }
    } catch (_) {}
  };

  const drawRuler = () => {
    const rect = rulerEl.getBoundingClientRect();
    const w = Math.max(240, Math.round(rect.width || 320));
    const h = Math.max(140, Math.round(rect.height || 168));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const colMinor = corToken('--linha') || 'rgb(52, 48, 43)';
    const colMajor = corToken('--tinta-2') || 'rgb(207, 201, 189)';
    const colText = corToken('--tinta-3') || 'rgb(163, 157, 146)';

    const centerX = w / 2;
    const halfSpanKg = w / (2 * PX_PER_KG) + 1.5;
    const startTenth = Math.max(
      Math.round(MIN_KG * 10),
      Math.floor((currentKg - halfSpanKg) * 10)
    );
    const endTenth = Math.min(
      Math.round(MAX_KG * 10),
      Math.ceil((currentKg + halfSpanKg) * 10)
    );

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '600 12px "DM Sans", sans-serif';

    for (let t = startTenth; t <= endTenth; t++) {
      const kgVal = t / 10;
      const x = centerX + (kgVal - currentKg) * PX_PER_KG;
      if (x < -20 || x > w + 20) continue;

      const is5Kg = t % 50 === 0;
      const is1Kg = t % 10 === 0;
      const isHalfKg = t % 5 === 0;

      if (is5Kg) {
        // B2: a cada 5 kg -> grande: 2px × 48px + número em 12/16 --tinta-3 sob as grandes
        ctx.fillStyle = colMajor;
        ctx.fillRect(Math.round(x) - 1, 36, 2, 48);
        ctx.fillStyle = colText;
        ctx.fillText(String(Math.round(kgVal)), Math.round(x), 94);
      } else if (is1Kg) {
        // B2: a cada 1 kg -> média: 2px × 32px
        ctx.fillStyle = colMajor;
        ctx.fillRect(Math.round(x) - 1, 44, 2, 32);
      } else if (isHalfKg) {
        // B2: a cada 0,5 kg -> pequena: 1,5px × 20px
        ctx.fillStyle = colMinor;
        ctx.fillRect(x - 0.75, 50, 1.5, 20);
      } else {
        // Sub-marca sutil de 0,1 kg
        ctx.fillStyle = colMinor;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(x - 0.5, 56, 1, 8);
        ctx.globalAlpha = 1;
      }
    }
  };

  const syncUi = (nextVal, { snap = false } = {}) => {
    const clamped = Math.max(MIN_KG, Math.min(MAX_KG, nextVal));
    const finalVal = snap ? Math.round(clamped * 10) / 10 : clamped;
    const prevInt = Math.floor(currentKg);
    const nextInt = Math.floor(finalVal);
    currentKg = finalVal;

    if (prevInt !== nextInt) {
      vibrateTick4ms();
    }

    const snappedForDisplay = Math.round(currentKg * 10) / 10;
    const txt = formatWeightOneDecimal(snappedForDisplay);
    if (displayEl) {
      displayEl.textContent = txt;
    }
    rulerEl.setAttribute('aria-valuenow', snappedForDisplay.toFixed(1));
    rulerEl.setAttribute('aria-valuetext', `${txt} quilogramas`);
    rulerEl.dataset.weightKg = snappedForDisplay.toFixed(1);

    drawRuler();
    onChangeKg(snappedForDisplay);
  };

  const stopInertia = () => {
    if (inertiaRaf !== null) {
      cancelAnimationFrame(inertiaRaf);
      inertiaRaf = null;
    }
  };

  // Arraste com pointer events + inércia (decaimento 0,95 por quadro)
  let dragging = false;
  let lastX = 0;
  let lastMoveTime = 0;

  const onPointerDown = (e) => {
    stopInertia();
    dragging = true;
    lastX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    lastMoveTime = performance.now();
    velocityKg = 0;
    try {
      if (e.pointerId != null && rulerEl.setPointerCapture) {
        rulerEl.setPointerCapture(e.pointerId);
      }
    } catch (_) {}
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? lastX;
    const dx = clientX - lastX;
    const now = performance.now();
    const dt = Math.max(1, now - lastMoveTime);
    lastX = clientX;
    lastMoveTime = now;

    // Arrastar a régua para a esquerda aumenta o valor sob o indicador central
    const deltaKg = -dx / PX_PER_KG;
    velocityKg = deltaKg * (16.67 / dt);
    syncUi(currentKg + deltaKg, { snap: false });
  };

  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;

    if (prefersReducedMotion() || Math.abs(velocityKg) < 0.008) {
      syncUi(currentKg, { snap: true });
      return;
    }

    const stepInertia = () => {
      velocityKg *= 0.95; // Decaimento 0,95 por quadro (B2)
      if (Math.abs(velocityKg) < 0.004 || currentKg <= MIN_KG || currentKg >= MAX_KG) {
        inertiaRaf = null;
        syncUi(currentKg, { snap: true });
        return;
      }
      syncUi(currentKg + velocityKg, { snap: false });
      inertiaRaf = requestAnimationFrame(stepInertia);
    };
    inertiaRaf = requestAnimationFrame(stepInertia);
  };

  rulerEl.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerUp, { passive: true });

  // Botões - e + de 48×48 com toque longo (350ms e depois a cada 70ms)
  let holdTimer = null;
  let repeatInterval = null;
  const clearHold = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    if (repeatInterval) {
      clearInterval(repeatInterval);
      repeatInterval = null;
    }
  };

  const bindStepButton = (btn, delta) => {
    if (!btn) return;
    const stepOnce = () => {
      stopInertia();
      const target = Math.round((currentKg + delta) * 10) / 10;
      syncUi(target, { snap: true });
    };
    btn.addEventListener('click', (e) => {
      if (btn.dataset.longPressed === '1') {
        btn.dataset.longPressed = '0';
        e.preventDefault();
        return;
      }
      vibrate('selecao');
      stepOnce();
    });
    btn.addEventListener('pointerdown', () => {
      clearHold();
      btn.dataset.longPressed = '0';
      holdTimer = setTimeout(() => {
        btn.dataset.longPressed = '1';
        stepOnce();
        repeatInterval = setInterval(stepOnce, 70);
      }, 350);
    });
    btn.addEventListener('pointerup', clearHold);
    btn.addEventListener('pointerleave', clearHold);
    btn.addEventListener('pointercancel', clearHold);
  };

  bindStepButton(minusBtn, -0.1);
  bindStepButton(plusBtn, 0.1);

  // Teclado na régua: ← → (0,1 kg) e Shift+← → (1 kg)
  rulerEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      stopInertia();
      const step = e.shiftKey ? -1.0 : -0.1;
      syncUi(Math.round((currentKg + step) * 10) / 10, { snap: true });
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      stopInertia();
      const step = e.shiftKey ? 1.0 : 0.1;
      syncUi(Math.round((currentKg + step) * 10) / 10, { snap: true });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      root.querySelector('#btn-q-continue')?.click();
    }
  });

  const onResizeOrTheme = () => drawRuler();
  window.addEventListener('resize', onResizeOrTheme, { passive: true });
  window.addEventListener('clay:tema', onResizeOrTheme);

  requestAnimationFrame(() => {
    syncUi(currentKg, { snap: true });
  });

  activeWeightRulerCleanup = () => {
    stopInertia();
    clearHold();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('resize', onResizeOrTheme);
    window.removeEventListener('clay:tema', onResizeOrTheme);
  };

  return {
    getCurrentKg: () => Math.round(currentKg * 10) / 10,
    setKg: (val) => syncUi(Number(val), { snap: true })
  };
}

function bindQuestionnaireStepEvents(stepNum, root) {
  const sceneSlot = root.querySelector('#q-scene-slot');
  const stageEl = root.querySelector('#q-step-stage');
  const continueBtn = root.querySelector('#btn-q-continue');
  const skipBtn = root.querySelector('#btn-q-skip');

  const advanceToStep = (nextStep) => {
    if (activeWeightRulerCleanup) {
      activeWeightRulerCleanup();
      activeWeightRulerCleanup = null;
    }
    if (stageEl) {
      stageEl.classList.add('q-step-exit');
    }
    if (nextStep <= 8) {
      store.updatePerfil({
        onboardingPassoAtual: nextStep,
        introVersao: 2,
        etapaOnboarding: 'questionario'
      });
      router.navigate(`#/q/${nextStep}`, { mode: 'push' });
    } else {
      store.updatePerfil({
        objetivo: store.getEntity('perfil').objetivo || 'Os dois: ferro e asfalto',
        nivel: store.getEntity('perfil').nivel || 'Treino há alguns meses',
        etapaOnboarding: 'montando'
      });
      router.navigate('#/montando', { mode: 'replace' });
    }
  };

  root.querySelector('[data-q-back]')?.addEventListener('click', () => {
    vibrate('selecao');
    if (stepNum <= 1) {
      router.navigate('#/boas-vindas', { mode: 'pop' });
    } else {
      store.updatePerfil({
        onboardingPassoAtual: stepNum - 1,
        introVersao: 2
      });
      router.navigate(`#/q/${stepNum - 1}`, { mode: 'pop' });
    }
  });

  if (stepNum === 1 || stepNum === 2) {
    bindChoiceCards(root, ({ value }) => {
      if (stepNum === 1) {
        store.updatePerfil({ objetivo: value });
        if (sceneSlot) {
          sceneSlot.innerHTML = renderSceneB(value);
          animateSceneBSelection(sceneSlot, value);
        }
      } else {
        store.updatePerfil({ nivel: value });
        if (sceneSlot) sceneSlot.innerHTML = renderSceneC(value);
      }
      setContinueButtonEnabled(continueBtn, Boolean(value));
    });
  }

  if (stepNum === 3) {
    bindChoiceCards(root, ({ values }) => {
      store.updatePerfil({ locais: values });
      if (sceneSlot) sceneSlot.innerHTML = renderSceneD(values);
      setContinueButtonEnabled(continueBtn, values.length > 0);
    });
  }

  if (stepNum === 4) {
    const counterLabel = document.getElementById('q-days-counter-label');
    const warnEl = document.getElementById('q-days-warning');

    root.querySelectorAll('[data-day-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        vibrate('selecao');
        const idx = Number(btn.dataset.dayIndex);
        const current = store.getEntity('perfil').diasSemana || [];
        const next = current.includes(idx)
          ? current.filter((d) => d !== idx)
          : [...current, idx].sort();

        store.updatePerfil({ diasSemana: next });
        btn.setAttribute('aria-pressed', String(next.includes(idx)));

        if (sceneSlot) sceneSlot.innerHTML = renderSceneE(next);
        if (counterLabel) {
          counterLabel.style.transform = 'translateY(-4px)';
          counterLabel.textContent = formatDiasCount(next.length);
          setTimeout(() => {
            counterLabel.style.transform = 'translateY(0)';
          }, 180);
        }
        const under = next.length < 2;
        if (warnEl) warnEl.style.opacity = under ? '1' : '0';
        setContinueButtonEnabled(continueBtn, !under);
      });
    });
  }

  if (stepNum === 5) {
    root.querySelectorAll('[data-time-min]').forEach((chip) => {
      chip.addEventListener('click', () => {
        vibrate('selecao');
        const min = Number(chip.dataset.timeMin);
        store.updatePerfil({ tempoTreinoMin: min });
        root.querySelectorAll('[data-time-min]').forEach((peer) => {
          peer.setAttribute('aria-checked', String(peer === chip));
        });
        if (sceneSlot) sceneSlot.innerHTML = renderSceneF(min);
        setContinueButtonEnabled(continueBtn, true);
      });
    });
  }

  if (stepNum === 6) {
    bindChoiceCards(root, ({ values }) => {
      store.updatePerfil({ cuidados: values });
      if (sceneSlot) sceneSlot.innerHTML = renderSceneG(values);
      setContinueButtonEnabled(continueBtn, values.length > 0);
    });
  }

  if (stepNum === 7) {
    const savedKg = Number(store.getEntity('perfil')?.pesoKg || 70);
    let latestKg = Math.max(30, Math.min(250, Math.round(savedKg * 10) / 10));
    mountWeightRuler(root, latestKg, (val) => {
      latestKg = val;
    });

    continueBtn?.addEventListener('click', () => {
      const rulerEl = root.querySelector('#q-weight-ruler');
      const finalKg = Number(rulerEl?.dataset?.weightKg || latestKg || 70);
      store.registrarPeso(finalKg);
      vibrate('confirmacao');
      advanceToStep(8);
    });

    skipBtn?.addEventListener('click', () => {
      vibrate('selecao');
      advanceToStep(8);
    });
    return;
  }

  if (stepNum === 8) {
    const input = document.getElementById('q-input-nome');
    if (input) {
      input.addEventListener('input', (e) => {
        const sanitized = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, '').slice(0, 20);
        if (e.target.value !== sanitized) e.target.value = sanitized;
        if (sceneSlot) sceneSlot.innerHTML = renderSceneH(sanitized);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const finalName = input.value.trim() || 'Atleta';
          store.updatePerfil({ nome: finalName });
          vibrate('confirmacao');
          advanceToStep(9);
        }
      });
    }

    continueBtn?.addEventListener('click', () => {
      const finalName = input?.value.trim() || 'Atleta';
      store.updatePerfil({ nome: finalName });
      vibrate('confirmacao');
      advanceToStep(9);
    });

    skipBtn?.addEventListener('click', () => {
      store.updatePerfil({ nome: 'Atleta' });
      vibrate('selecao');
      advanceToStep(9);
    });
    return;
  }

  continueBtn?.addEventListener('click', () => {
    if (continueBtn.disabled) return;
    const nextStep = Number(continueBtn.dataset.qNext || stepNum + 1);
    vibrate('confirmacao');
    advanceToStep(nextStep);
  });
}

function bindHojeEvents(root) {
  // B2: Verifica se existe sessão em andamento com mais de 6 horas
  const ongoing = store.sessaoEmAndamento();
  if (ongoing && isSessionOlderThanSixHours(ongoing) && !staleSessionPromptShown) {
    staleSessionPromptShown = true;
    setTimeout(() => {
      openStaleSessionSheet(ongoing, {
        onSave: () => {
          store.finalizarSessao(ongoing.id, {
            duracaoSeg: computeActiveSeconds(ongoing)
          });
          renderCurrentRoute();
          showToast({ message: 'Treino anterior salvo' });
        },
        onDiscard: () => {
          store.descartarSessao(ongoing.id);
          renderCurrentRoute();
        }
      });
    }, 180);
  }

  // B3: Ações do cartão "Corrida interrompida" (Retomar / Salvar o que deu / Descartar)
  root.querySelectorAll('[data-buffer-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.bufferAction;
      const buf = store.lerBufferCorrida();
      if (!buf) {
        renderCurrentRoute();
        return;
      }
      if (act === 'retomar') {
        vibrate('confirmacao');
        let sessaoAlvo = (store.getState()?.sessoes || []).find((x) => x.id === buf.sessaoId);
        if (!sessaoAlvo) {
          sessaoAlvo = store.criarSessao({
            id: buf.sessaoId || `ses_corrida_${Date.now()}`,
            nome: buf.nome || 'Corrida ao vivo',
            tipo: 'corrida',
            grupoPrincipal: 'Corrida',
            modo: buf.modo || 'livre',
            meta: buf.meta,
            ritmoAlvoSegKm: buf.ritmoAlvoSegKm,
            intervalos: buf.intervalosConfig,
            restaurarDeBuffer: true,
            maquinaEstado: { fase: 'pausada' }
          });
        } else {
          store.atualizarSessao(sessaoAlvo.id, {
            restaurarDeBuffer: true,
            maquinaEstado: { ...(sessaoAlvo.maquinaEstado || {}), fase: 'pausada' }
          });
        }
        navigateSafelyWithGuard(`#/treino/${sessaoAlvo.id}`, { mode: 'push', fromSheet: false });
      } else if (act === 'salvar') {
        vibrate('sucesso');
        let rotaObj = null;
        if (Array.isArray(buf.rawPoints) && buf.rawPoints.length >= 2) {
          const { points: simpPts, simplified } = capToMaxPoints(buf.rawPoints, 3, 4000);
          rotaObj = encodeTrackToRoute(simpPts, simplified, buf.rawPoints.length);
        }
        let targetSes = (store.getState()?.sessoes || []).find((x) => x.id === buf.sessaoId);
        if (!targetSes) {
          targetSes = store.criarSessao({
            id: buf.sessaoId || `ses_corrida_${Date.now()}`,
            nome: buf.nome || 'Corrida recuperada',
            tipo: 'corrida',
            grupoPrincipal: 'Corrida'
          });
        }
        store.finalizarSessao(targetSes.id, {
          tipo: 'corrida',
          nome: buf.nome || 'Corrida recuperada',
          modo: buf.modo || 'livre',
          movimentoSeg: Math.max(1, Number(buf.movimentoSeg || 60)),
          pausadoSeg: Number(buf.pausadoSeg || 0),
          duracaoSeg: Math.max(1, Number(buf.duracaoSeg || buf.movimentoSeg || 60)),
          distanciaM: Number(buf.distanciaM || 0),
          ritmoMedioSegKm: buf.ritmoMedioSegKm,
          ritmoMelhorSegKm: buf.ritmoMelhorSegKm,
          calorias: Number(buf.calorias || 0),
          parciais: Array.isArray(buf.parciais) ? buf.parciais : [],
          rota: rotaObj,
          origem: buf.origem || 'gps'
        });
        store.limparBufferCorrida();
        renderCurrentRoute();
        showToast({ message: 'Corrida salva no histórico' });
      } else if (act === 'descartar') {
        vibrate('erro');
        if (buf.sessaoId) {
          store.descartarSessao(buf.sessaoId);
        }
        store.limparBufferCorrida();
        renderCurrentRoute();
      }
    });
  });

  // Botões de continuar sessão em andamento (no banner de 72px e no cartão principal)
  root.querySelectorAll('[data-resume-session-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.resumeSessionId;
      vibrate('confirmacao');
      navigateSafelyWithGuard(`#/treino/${id}`, { mode: 'push', fromSheet: false });
    });
  });

  // B5: Botão "Começar treino" no cartão de Hoje abre a folha "O que vamos fazer?"
  root.querySelectorAll('[data-open-start-sheet-card]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vibrate('selecao');
      openStartActionSheet();
    });
  });

  // B5: Botão secundário "Fazer um treino leve extra" quando o treino de hoje já foi concluído
  root.querySelector('[data-start-extra-light]')?.addEventListener('click', () => {
    vibrate('confirmacao');
    launchLiveWorkoutByChoice('rapido15');
  });

  const faceBtns = root.querySelectorAll('[data-checkin-face]');
  faceBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const level = Number(btn.dataset.checkinFace);
      vibrate('selecao');

      faceBtns.forEach((peer) => {
        if (peer !== btn) peer.classList.add('is-faded');
      });

      spring({
        from: 1,
        to: 1.25,
        stiffness: 260,
        damping: 18,
        onUpdate: (s) => {
          btn.style.transform = `scale(${s.toFixed(3)})`;
        }
      });

      setTimeout(() => {
        pulseWorkoutFieldsNextRender = true;
        store.saveCheckin({ energia: level });
        renderCurrentRoute();
      }, 360);
    });
  });

  document.getElementById('btn-reopen-checkin')?.addEventListener('click', () => {
    vibrate('selecao');
    store.updateHojeEstado({ checkinExpandido: true });
    renderCurrentRoute();
  });

  root.querySelectorAll('[data-open-alternatives-sheet]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vibrate('selecao');
      openAlternativesSheet();
    });
  });

  root.querySelectorAll('[data-open-day-preview]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vibrate('selecao');
      openDayScheduleSheet(btn.dataset.openDayPreview);
    });
  });
}

function initGlobalEnvironmentListeners() {
  document.addEventListener('keydown', (e) => {
    if (isAnySheetOpen()) return;
    if (!router || !router.currentRouteObj) return;
    const r = router.currentRouteObj;

    if (r.name === 'q') {
      const stepNum = Number(r.param || 1);
      const isSliderFocused = document.activeElement?.getAttribute('role') === 'slider';
      const isInputFocused = document.activeElement?.tagName === 'INPUT';
      if (e.key === 'Enter' && !isInputFocused) {
        const contBtn = document.getElementById('btn-q-continue');
        if (contBtn && !contBtn.disabled) {
          e.preventDefault();
          contBtn.click();
        }
      } else if (e.key === 'ArrowLeft' && stepNum > 1 && !isInputFocused && !isSliderFocused) {
        e.preventDefault();
        router.navigate(`#/q/${stepNum - 1}`, { mode: 'pop' });
      } else if (e.key === 'ArrowRight' && !isInputFocused && !isSliderFocused) {
        const contBtn = document.getElementById('btn-q-continue');
        if (contBtn && !contBtn.disabled) {
          contBtn.click();
        }
      }
    }
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const isKeyboard = window.visualViewport.height < window.innerHeight * 0.78;
      document.body.classList.toggle('keyboard-open', isKeyboard);
    });
  }

  const syncOfflineBanner = () => {
    document.body.classList.toggle('is-offline', !navigator.onLine);
  };
  window.addEventListener('online', syncOfflineBanner);
  window.addEventListener('offline', syncOfflineBanner);
  syncOfflineBanner();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showToast({
                  message: 'Atualização pronta',
                  actionLabel: 'Atualizar',
                  onAction: () => window.location.reload()
                });
              }
            });
          });
        })
        .catch(() => {});
    });
  }
}

export function initApp() {
  initThemeSystem();
  initMonochromeGrain();
  initGlobalTouchFeedback();
  initScrollListener();
  initGlobalEnvironmentListeners();

  try {
    const params = new URLSearchParams(window.location.search || '');
    if (params.get('demo') === '1') {
      carregarLote1();
      auditarCenas(true);
    }
  } catch (_) {}

  const sheetRoot = document.getElementById('app-sheet-root');
  if (sheetRoot) {
    sheetRoot.innerHTML = renderBottomSheet({ id: 'clay-sheet', title: 'Opções' });
    bindBottomSheets(sheetRoot);
  }

  router = new HashRouter({
    onRoute: () => {
      renderCurrentRoute();
    }
  });

  initEdgeBackSwipe({
    canSwipeBack: () => {
      if (!router || !router.currentRouteObj) return false;
      const r = router.currentRouteObj;
      return (
        r.name === 'previa' ||
        r.name === 'exercicio' ||
        (r.name === 'biblioteca' && r.param === 'buscar') ||
        (r.name === 'q' && Number(r.param) > 1)
      );
    },
    onBack: () => router.back()
  });

  window.clayRouter = router;
  router.init();
  agendarPreCarregamentoOcioso();
  registerServiceWorker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
