/**
 * ============================================================================
 * CLAY FIT — NOVA BIBLIOTECA, BUSCA VIRTUALIZADA E DETALHE DO EXERCÍCIO (C1–C5)
 * /js/ui/biblioteca.js
 *
 * Especificações Prompt 6 (Partes C1, C2, C3, C4, C5):
 * - C1 (#/biblioteca): cabeçalho colapsável, falso-botão de busca (56px, raio 20px),
 *   cartão "TREINADOR DO CLAY" (112px vidro -> #/previa/hoje), grade "ROTINAS"
 *   (2 colunas, 8 cartões de 120px com selo "Em breve" e aria-disabled="true" quando < 3),
 *   seção "TIPOS DE CORRIDA" mantida, seção "EXERCÍCIOS POR GRUPO" (10 chips + até 8 linhas
 *   + botão "Ver todos os N").
 * - C2 (#/biblioteca/buscar): tela cheia sem barra inferior, barra 56px ("Cancelar" à esquerda,
 *   "Exercícios" ou nome da rotina ao centro), campo role="search" 56px sem foco automático,
 *   debounce 120ms (input + compositionend), botão × 48px, 3 chips-filtro de 44px abrindo
 *   folha inferior com caixas de seleção de 56px + "Limpar" e "Aplicar (N)".
 *   Lista virtualizada (#biblioteca-lista, role="list", altura 80px por linha, <= 30 itens no DOM).
 * - C4 (#/exercicio/:id): quadro 16:9 com mapa muscular grande, título Fraunces 28/32,
 *   chips, "Como fazer" (círculos 28px), "Erros comuns", "Respiração", "Atenção" (--alerta-suave),
 *   "Dicas" e rodapé "Em caso de dor, pare e procure um profissional de saúde.".
 * - C5: preserva texto buscado, filtros ativos e posição de rolagem ao voltar do detalhe.
 * ============================================================================
 */

import {
  carregarLote1,
  ouvirAtualizacaoCatalogo,
  getExercicioPorId,
  listarExercicios,
  pesquisarCatalogo,
  listarExerciciosPopulares,
  contarPorGrupo,
  listarRotinasComContagem,
  GRUPOS_BIBLIOTECA,
  NIVEIS_EXERCICIO,
  TIPOS_EQUIPAMENTO,
  LISTA_MUSCULOS,
  ROTINAS_BIBLIOTECA
} from '../data/exercicios/index.js';
import { RUN_TYPES_CARDS } from '../engine/catalog.js';
import { renderRunTypeCardScene } from './illustrations-run.js';
import { getIconSvg } from './illustrations.js';
import { renderMapaMuscular } from './mapa-muscular.js';
import { renderExercicioRow } from './exercicio-row.js';
import {
  openBottomSheet,
  closeBottomSheet
} from './bottom-sheet.js';
import { vibrate } from '../motion.js';
import { store } from '../store.js';
import { showToast } from './toast.js';

const ITEM_HEIGHT_PX = 80;
const ITEM_GAP_PX = 8;
const ITEM_STRIDE_PX = ITEM_HEIGHT_PX + ITEM_GAP_PX; // 88px por linha
const BUFFER_ITEMS = 6; // 6 de folga acima e 6 abaixo

/**
 * Estado persistido em memória da Biblioteca e da tela de Busca (C5)
 */
const bibliotecaState = {
  grupoSelecionadoC1: 'Peito',
  consulta: '',
  equipamentos: [],
  musculos: [],
  niveis: [],
  grupoBusca: null, // ex: 'Peito' quando veio de "Ver todos os N"
  rotinaId: null, // ex: 'rotina-so-halteres' quando veio de um cartão de Rotina
  scrollYBusca: 0,
  retornoDeDetalhe: false,
  origemDetalhe: '#/biblioteca'
};

let activeSearchCleanup = null;
let catalogUnsubscribe = null;

export function getBibliotecaState() {
  return bibliotecaState;
}

export function resetarBuscaState({
  grupoBusca = null,
  rotinaId = null,
  manterFiltros = false
} = {}) {
  if (!manterFiltros) {
    bibliotecaState.consulta = '';
    bibliotecaState.equipamentos = [];
    bibliotecaState.musculos = [];
    bibliotecaState.niveis = [];
    bibliotecaState.scrollYBusca = 0;
  }
  bibliotecaState.grupoBusca = grupoBusca;
  bibliotecaState.rotinaId = rotinaId;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatExerciciosPlural(n) {
  const num = Number(n || 0);
  return num === 1 ? '1 exercício' : `${num} exercícios`;
}

/**
 * Ilustração SVG do cartão "TREINADOR DO CLAY" (C1 item 3) — apenas tokens --ill-*
 */
function renderTreinadorClaySvg() {
  return `
    <svg viewBox="0 0 88 88" width="76" height="76" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="6" y="6" width="76" height="76" rx="22" fill="var(--ill-palco-cor)" stroke="var(--ill-contorno)" stroke-width="1.5" />
      <circle cx="44" cy="44" r="24" stroke="var(--ill-sombra)" stroke-width="5" />
      <path d="M44 20 A24 24 0 1 1 23 56" stroke="var(--ill-terracota)" stroke-width="5" stroke-linecap="round" />
      <circle cx="44" cy="44" r="11" fill="var(--ill-areia)" opacity="0.88" />
      <path d="M39 44.5L42.5 48L49.5 40.5" stroke="var(--ill-tinta)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="64" cy="24" r="5" fill="var(--ill-salvia)" />
    </svg>
  `;
}

/**
 * Cenas SVG exclusivas para os 8 cartões de Rotinas (C1 item 4) — apenas tokens --ill-*
 */
export function renderRoutineCardScene(sceneKey = 'academia') {
  switch (sceneKey) {
    case 'academia':
    case 'academia-completa':
      return `
        <svg viewBox="0 0 96 64" width="76" height="52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <line x1="12" y1="32" x2="84" y2="32" stroke="var(--ill-tinta)" stroke-width="3.5" stroke-linecap="round" />
          <rect x="16" y="14" width="9" height="36" rx="4" fill="var(--ill-terracota)" />
          <rect x="27" y="19" width="7" height="26" rx="3" fill="var(--ill-areia)" />
          <rect x="71" y="14" width="9" height="36" rx="4" fill="var(--ill-terracota)" />
          <rect x="62" y="19" width="7" height="26" rx="3" fill="var(--ill-areia)" />
        </svg>
      `;
    case 'apenas-halteres':
    case 'so-halteres':
      return `
        <svg viewBox="0 0 96 64" width="76" height="52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g transform="translate(8, 6)">
            <rect x="8" y="14" width="9" height="24" rx="4" fill="var(--ill-terracota)" />
            <rect x="17" y="22" width="20" height="8" rx="3" fill="var(--ill-creme)" stroke="var(--ill-contorno)" stroke-width="1.2" />
            <rect x="37" y="14" width="9" height="24" rx="4" fill="var(--ill-terracota)" />
          </g>
          <g transform="translate(36, 18)">
            <rect x="8" y="14" width="9" height="24" rx="4" fill="var(--ill-areia)" />
            <rect x="17" y="22" width="20" height="8" rx="3" fill="var(--ill-creme)" stroke="var(--ill-contorno)" stroke-width="1.2" />
            <rect x="37" y="14" width="9" height="24" rx="4" fill="var(--ill-areia)" />
          </g>
        </svg>
      `;
    case 'em-casa':
      return `
        <svg viewBox="0 0 96 64" width="76" height="52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="14" y="44" width="68" height="7" rx="3.5" fill="var(--ill-salvia)" />
          <path d="M30 28L48 14L66 28" stroke="var(--ill-areia)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
          <rect x="36" y="28" width="24" height="16" rx="4" fill="var(--ill-terracota)" />
        </svg>
      `;
    case 'em-viagem':
      return `
        <svg viewBox="0 0 96 64" width="76" height="52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="26" y="20" width="44" height="30" rx="8" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.5" />
          <path d="M38 20V14C38 11.8 39.8 10 42 10H54C56.2 10 58 11.8 58 14V20" stroke="var(--ill-terracota)" stroke-width="3.5" stroke-linecap="round" />
          <line x1="38" y1="20" x2="38" y2="50" stroke="var(--ill-terracota)" stroke-width="2.5" />
          <line x1="58" y1="20" x2="58" y2="50" stroke="var(--ill-terracota)" stroke-width="2.5" />
        </svg>
      `;
    case 'elastico':
      return `
        <svg viewBox="0 0 96 64" width="76" height="52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M22 32C22 18 74 18 74 32C74 46 22 46 22 32Z" stroke="var(--ill-terracota)" stroke-width="4.5" stroke-linecap="round" />
          <circle cx="22" cy="32" r="6" fill="var(--ill-areia)" />
          <circle cx="74" cy="32" r="6" fill="var(--ill-areia)" />
        </svg>
      `;
    case 'cardio-hiit':
      return `
        <svg viewBox="0 0 96 64" width="76" height="52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <polyline points="14,36 32,36 40,16 50,48 58,26 66,36 82,36" stroke="var(--ill-terracota)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="74" cy="18" r="5" fill="var(--ill-salvia)" />
        </svg>
      `;
    case 'peso-corporal':
      return `
        <svg viewBox="0 0 96 64" width="76" height="52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="30" cy="22" r="7" fill="var(--ill-terracota)" />
          <path d="M36 27L68 36L78 44" stroke="var(--ill-creme)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M34 29L28 44" stroke="var(--ill-areia)" stroke-width="4" stroke-linecap="round" />
          <line x1="16" y1="46" x2="82" y2="46" stroke="var(--ill-salvia)" stroke-width="3.5" stroke-linecap="round" />
        </svg>
      `;
    case 'fita-suspensao':
    default:
      return `
        <svg viewBox="0 0 96 64" width="76" height="52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="48" cy="10" r="4" fill="var(--ill-salvia)" />
          <line x1="48" y1="14" x2="32" y2="40" stroke="var(--ill-areia)" stroke-width="3.5" stroke-linecap="round" />
          <line x1="48" y1="14" x2="64" y2="40" stroke="var(--ill-areia)" stroke-width="3.5" stroke-linecap="round" />
          <circle cx="32" cy="46" r="6" stroke="var(--ill-terracota)" stroke-width="3.5" />
          <circle cx="64" cy="46" r="6" stroke="var(--ill-terracota)" stroke-width="3.5" />
        </svg>
      `;
  }
}

/**
 * Cena SVG para estado vazio da busca (C2)
 */
function renderEmptySearchSceneSvg() {
  return `
    <svg viewBox="0 0 120 96" width="120" height="96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="12" y="12" width="96" height="72" rx="24" fill="var(--ill-palco-cor)" stroke="var(--ill-contorno)" stroke-width="1.5" />
      <circle cx="55" cy="45" r="16" stroke="var(--ill-areia)" stroke-width="3.5" />
      <line x1="67" y1="57" x2="80" y2="70" stroke="var(--ill-terracota)" stroke-width="4" stroke-linecap="round" />
      <line x1="49" y1="45" x2="61" y2="45" stroke="var(--ill-tinta)" stroke-width="2.5" stroke-linecap="round" />
    </svg>
  `;
}

/* ==========================================================================
   C1. TELA PRINCIPAL DA BIBLIOTECA (#/biblioteca)
   ========================================================================== */
export function renderScreenBibliotecaNova() {
  const contagensPorGrupo = contarPorGrupo();
  const rotinas = listarRotinasComContagem();

  const grpAtivo = bibliotecaState.grupoSelecionadoC1 || 'Todos';
  const exerciciosDoGrupo = listarExercicios({
    grupo: grpAtivo === 'Todos' ? null : grpAtivo
  });
  const primeiros8 = exerciciosDoGrupo.slice(0, 8);
  const totalNoGrupo = exerciciosDoGrupo.length;

  const chipsGrupoHtml = GRUPOS_BIBLIOTECA
    .map((grp) => {
      const count = Number(contagensPorGrupo[grp] || 0);
      const isZero = grp !== 'Todos' && count === 0;
      const isSelected = grpAtivo === grp;
      return `
        <button
          type="button"
          class="c-chip lib-grp-chip ${isSelected ? 'is-selected' : ''} ${isZero ? 'is-disabled-group' : ''}"
          data-lib-group-chip="${escapeHtml(grp)}"
          aria-pressed="${isSelected ? 'true' : 'false'}"
          ${isZero ? 'aria-disabled="true"' : ''}
        >
          <span>${escapeHtml(grp)}</span>
          <span class="lib-grp-chip__count">${count}</span>
        </button>
      `;
    })
    .join('');

  const rotinasHtml = rotinas
    .map((rot) => {
      const disabledAttr = rot.emBreve ? 'aria-disabled="true"' : '';
      const subText = rot.emBreve
        ? `<span class="lib-routine-card__badge-soon">Em breve</span>`
        : `<span class="lib-routine-card__count">${formatExerciciosPlural(rot.contagem)}</span>`;
      return `
        <button
          type="button"
          class="lib-routine-card ${rot.emBreve ? 'is-soon' : ''}"
          data-open-routine="${escapeHtml(rot.id)}"
          ${disabledAttr}
        >
          <div class="lib-routine-card__art">
            ${renderRoutineCardScene(rot.cena || rot.sceneKey || rot.id)}
          </div>
          <div class="lib-routine-card__info">
            <div class="lib-routine-card__title">${escapeHtml(rot.nome)}</div>
            <div class="lib-routine-card__meta">${subText}</div>
          </div>
        </button>
      `;
    })
    .join('');

  const rowsHtml =
    primeiros8.length > 0
      ? primeiros8.map((ex) => renderExercicioRow(ex)).join('')
      : `
        <div class="lib-group-empty-box">
          <p class="t-small" style="color:var(--tinta-3); margin:0;">
            Este grupo receberá exercícios nos próximos lotes da Biblioteca.
          </p>
        </div>
      `;

  return `
    <div class="reading-column lib-screen-c1" id="biblioteca-c1-root">
      <div class="top-ambient-gradient" aria-hidden="true"></div>

      <!-- (1) Cabeçalho colapsável "Biblioteca" -->
      <header id="clay-topbar" class="c-topbar">
        <span></span>
        <div class="c-topbar__title" style="opacity:0;">Biblioteca</div>
        <div class="c-topbar__right"></div>
      </header>

      <h1 class="t-h1" data-collapsible-heading style="margin-bottom: 4px;">Biblioteca</h1>

      <!-- (2) Falso-botão de busca (56px, border-radius: 20px) -->
      <button
        type="button"
        id="btn-lib-fake-search"
        class="lib-fake-search-btn"
        aria-label="Buscar exercício"
      >
        <span class="lib-fake-search-btn__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="20" y1="20" x2="16.2" y2="16.2" />
          </svg>
        </span>
        <span class="lib-fake-search-btn__text">Buscar exercício</span>
      </button>

      <!-- (3) Cartão "TREINADOR DO CLAY" (altura 112px, fundo vidro) -->
      <section class="lib-coach-card" aria-label="Treinador do Clay">
        <div class="lib-coach-card__main">
          <span class="lib-coach-card__badge">TREINADOR</span>
          <h2 class="lib-coach-card__title">Programa baseado nas suas necessidades e metas</h2>
          <button
            type="button"
            id="btn-lib-coach-explore"
            class="lib-coach-card__cta"
          >
            <span>Explorar agora</span>
            ${getIconSvg('avancar', 16)}
          </button>
        </div>
        <div class="lib-coach-card__art" aria-hidden="true">
          ${renderTreinadorClaySvg()}
        </div>
      </section>

      <!-- (4) Seção "ROTINAS" (20/24 Fraunces, grade 2 colunas, gap 12px, 8 cartões de 120px) -->
      <section class="lib-section-block" aria-label="Rotinas">
        <h2 class="lib-section-title">Rotinas</h2>
        <div class="lib-routines-grid" id="lib-routines-grid">
          ${rotinasHtml}
        </div>
      </section>

      <!-- (5) Seção "TIPOS DE CORRIDA" (mantida intacta) -->
      <section class="lib-run-types-section" aria-label="Tipos de corrida">
        <div class="lib-section-head">
          <h2 class="lib-section-title">Tipos de corrida</h2>
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

      <!-- (6) Seção "EXERCÍCIOS POR GRUPO" -->
      <section class="lib-section-block" aria-label="Exercícios por grupo">
        <div class="lib-section-head">
          <h2 class="lib-section-title">Exercícios por grupo</h2>
          <span class="t-small" style="color:var(--tinta-3);">${formatExerciciosPlural(totalNoGrupo)}</span>
        </div>

        <div class="lib-sticky-filter" role="region" aria-label="Filtrar por grupo muscular">
          <div class="c-chip-group" id="lib-group-chips-row">
            ${chipsGrupoHtml}
          </div>
        </div>

        <div class="lib-group-rows" role="list" id="lib-c1-group-rows">
          ${rowsHtml}
        </div>

        ${
          totalNoGrupo > 0
            ? `
              <button
                type="button"
                id="btn-lib-see-all-group"
                class="c-btn c-btn--secondary c-btn--full"
                data-see-all-group="${escapeHtml(grpAtivo)}"
                style="margin-top: 12px;"
              >
                <span>Ver todos os ${totalNoGrupo}</span>
              </button>
            `
            : ''
        }
      </section>
    </div>
  `;
}

export function bindScreenBibliotecaNovaEvents(root, { router, onOpenRunTypeSheet, onRerender }) {
  // Carrega o Lote 1 imediatamente ao entrar na Biblioteca
  carregarLote1();

  if (catalogUnsubscribe) {
    catalogUnsubscribe();
    catalogUnsubscribe = null;
  }
  catalogUnsubscribe = ouvirAtualizacaoCatalogo(() => {
    if (router?.currentRouteObj?.name === 'biblioteca') {
      onRerender();
    }
  });

  // (2) Falso-botão de busca -> #/biblioteca/buscar (push 240ms)
  root.querySelector('#btn-lib-fake-search')?.addEventListener('click', () => {
    vibrate('selecao');
    resetarBuscaState({ grupoBusca: null, rotinaId: null, manterFiltros: false });
    router.navigate('#/biblioteca/buscar', { mode: 'push' });
  });

  // (3) Cartão "TREINADOR DO CLAY" -> #/previa/hoje
  root.querySelector('#btn-lib-coach-explore')?.addEventListener('click', () => {
    vibrate('selecao');
    router.navigate('#/previa/hoje', { mode: 'push' });
  });

  // (4) Cartões de Rotinas
  root.querySelectorAll('[data-open-routine]').forEach((card) => {
    card.addEventListener('click', () => {
      if (card.getAttribute('aria-disabled') === 'true') {
        vibrate('erro');
        showToast({ message: 'Rotina disponível nos próximos lotes' });
        return;
      }
      const rotId = card.dataset.openRoutine;
      vibrate('selecao');
      resetarBuscaState({ grupoBusca: null, rotinaId: rotId, manterFiltros: false });
      router.navigate('#/biblioteca/buscar', { mode: 'push' });
    });
  });

  // (5) Tipos de corrida
  root.querySelectorAll('[data-open-run-type-sheet]').forEach((card) => {
    card.addEventListener('click', () => {
      vibrate('selecao');
      onOpenRunTypeSheet(card.dataset.openRunTypeSheet);
    });
  });

  // (6) Chips de grupo muscular + scroll horizontal do chip selecionado sem mexer na rolagem vertical
  const syncSelectedGroupChipScroll = () => {
    const filterContainer = root.querySelector('.lib-sticky-filter');
    const selectedChip = root.querySelector('[data-lib-group-chip].is-selected');
    if (!filterContainer || !selectedChip) return;
    const savedWinY = window.scrollY || document.documentElement.scrollTop || 0;
    const contRect = filterContainer.getBoundingClientRect();
    const chipRect = selectedChip.getBoundingClientRect();
    if (chipRect.left < contRect.left + 12 || chipRect.right > contRect.right - 12) {
      const targetLeft =
        filterContainer.scrollLeft +
        (chipRect.left - contRect.left) -
        Math.max(16, (contRect.width - chipRect.width) / 2);
      filterContainer.scrollLeft = Math.max(0, Math.round(targetLeft));
    }
    if ((window.scrollY || 0) !== savedWinY) {
      window.scrollTo({ top: savedWinY, behavior: 'instant' });
    }
  };
  requestAnimationFrame(syncSelectedGroupChipScroll);

  root.querySelectorAll('[data-lib-group-chip]').forEach((chip) => {
    chip.addEventListener('click', () => {
      if (chip.getAttribute('aria-disabled') === 'true') {
        vibrate('erro');
        showToast({ message: 'Esse grupo chega nas próximas atualizações' });
        return;
      }
      const grp = chip.dataset.libGroupChip;
      vibrate('selecao');
      bibliotecaState.grupoSelecionadoC1 = grp;
      const savedWinY = window.scrollY || document.documentElement.scrollTop || 0;
      onRerender();
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedWinY, behavior: 'instant' });
      });
    });
  });

  // Botão "Ver todos os N"
  root.querySelector('#btn-lib-see-all-group')?.addEventListener('click', (e) => {
    const grp = e.currentTarget.dataset.seeAllGroup;
    vibrate('selecao');
    resetarBuscaState({
      grupoBusca: grp && grp !== 'Todos' ? grp : null,
      rotinaId: null,
      manterFiltros: false
    });
    router.navigate('#/biblioteca/buscar', { mode: 'push' });
  });

  // Linhas de exercício (C3) -> abre detalhe (#/exercicio/:id)
  bindExerciseRowClicks(root, {
    router,
    origem: '#/biblioteca'
  });
}

/* ==========================================================================
   C2. TELA DE BUSCA E LISTAGEM COMPLETA (#/biblioteca/buscar)
   ========================================================================== */
function formatFilterChipLabel(tipo, selecionados = []) {
  const n = selecionados.length;
  if (tipo === 'equipamentos') {
    if (n === 0) return 'Todos os equipamentos';
    return n === 1 ? '1 equipamento' : `${n} equipamentos`;
  }
  if (tipo === 'musculos') {
    if (n === 0) return 'Todos os músculos';
    return n === 1 ? '1 músculo' : `${n} músculos`;
  }
  if (tipo === 'niveis') {
    if (n === 0) return 'Todos os níveis';
    return n === 1 ? '1 nível' : `${n} níveis`;
  }
  return '';
}

function getHeaderTitleForSearch() {
  if (bibliotecaState.rotinaId) {
    const rot = ROTINAS_BIBLIOTECA.find((r) => r.id === bibliotecaState.rotinaId);
    if (rot) return rot.nome;
  }
  if (bibliotecaState.grupoBusca && bibliotecaState.grupoBusca !== 'Todos') {
    return `Exercícios · ${bibliotecaState.grupoBusca}`;
  }
  return 'Exercícios';
}

function hasActiveQueryOrFilters() {
  return (
    Boolean(bibliotecaState.consulta && bibliotecaState.consulta.trim()) ||
    bibliotecaState.equipamentos.length > 0 ||
    bibliotecaState.musculos.length > 0 ||
    bibliotecaState.niveis.length > 0 ||
    Boolean(bibliotecaState.grupoBusca && bibliotecaState.grupoBusca !== 'Todos') ||
    Boolean(bibliotecaState.rotinaId)
  );
}

export function renderScreenBibliotecaBuscar() {
  const headerTitle = getHeaderTitleForSearch();
  const eqCount = bibliotecaState.equipamentos.length;
  const muCount = bibliotecaState.musculos.length;
  const niCount = bibliotecaState.niveis.length;

  return `
    <div class="lib-search-screen" id="biblioteca-buscar-root">
      <!-- Barra superior de 56px: "Cancelar" à esquerda (48px), "Exercícios" (ou nome da rotina) ao centro, vazio à direita -->
      <header class="lib-search-topbar">
        <button
          type="button"
          id="btn-search-cancel"
          class="lib-search-cancel-btn"
          aria-label="Cancelar e voltar para Biblioteca"
        >
          <span>Cancelar</span>
        </button>
        <h1 class="lib-search-topbar__title" tabindex="-1">${escapeHtml(headerTitle)}</h1>
        <span class="lib-search-topbar__spacer" aria-hidden="true"></span>
      </header>

      <!-- Campo de busca (role="search") de 56px -->
      <div class="lib-search-sticky-controls">
        <div class="lib-search-box" role="search">
          <span class="lib-search-box__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="20" y1="20" x2="16.2" y2="16.2" />
            </svg>
          </span>
          <input
            type="search"
            id="lib-search-input"
            class="lib-search-box__input"
            placeholder="Buscar exercício, músculo ou equipamento"
            aria-label="Buscar exercício"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            value="${escapeHtml(bibliotecaState.consulta)}"
          />
          <button
            type="button"
            id="btn-search-clear"
            class="lib-search-box__clear ${bibliotecaState.consulta ? 'is-visible' : ''}"
            aria-label="Limpar busca"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- Linha de 3 chips-filtro (44px de altura) -->
        <div class="lib-filter-chips-bar" role="region" aria-label="Filtros de exercícios">
          <button
            type="button"
            class="lib-filter-chip ${eqCount > 0 ? 'is-active' : ''}"
            data-open-filter-sheet="equipamentos"
          >
            <span id="chip-label-equipamentos">${escapeHtml(formatFilterChipLabel('equipamentos', bibliotecaState.equipamentos))}</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <button
            type="button"
            class="lib-filter-chip ${muCount > 0 ? 'is-active' : ''}"
            data-open-filter-sheet="musculos"
          >
            <span id="chip-label-musculos">${escapeHtml(formatFilterChipLabel('musculos', bibliotecaState.musculos))}</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <button
            type="button"
            class="lib-filter-chip ${niCount > 0 ? 'is-active' : ''}"
            data-open-filter-sheet="niveis"
          >
            <span id="chip-label-niveis">${escapeHtml(formatFilterChipLabel('niveis', bibliotecaState.niveis))}</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Status e contagem aria-live="polite" -->
      <div class="lib-search-status-row" aria-live="polite" id="lib-search-status-row"></div>

      <!-- Seção Exercícios Populares (visível sem texto e sem filtro) -->
      <section class="lib-popular-section" id="lib-popular-section" aria-label="Exercícios populares">
        <h2 class="lib-subsection-heading">Exercícios populares</h2>
        <div id="biblioteca-populares-lista" class="lib-virtual-list" role="list"></div>
      </section>

      <!-- Seção Todos os exercícios / Resultados filtrados (virtualizada: #biblioteca-lista) -->
      <section class="lib-all-section" id="lib-all-section" aria-label="Lista de exercícios">
        <h2 class="lib-subsection-heading" id="lib-all-heading">Todos os exercícios</h2>
        <div class="lib-all-with-az">
          <div id="biblioteca-lista" class="lib-virtual-list" role="list"></div>
          <nav class="lib-az-index" id="lib-az-index" aria-label="Índice alfabético A a Z"></nav>
        </div>
      </section>

      <!-- Estado vazio -->
      <div id="lib-search-empty" class="lib-search-empty" hidden>
        <div class="lib-search-empty__art">${renderEmptySearchSceneSvg()}</div>
        <h2 class="lib-search-empty__title">Nenhum exercício encontrado</h2>
        <p class="lib-search-empty__desc">
          Tente outro nome, como supino ou agachamento, ou limpe os filtros.
        </p>
        <button type="button" id="btn-empty-clear-filters" class="c-btn c-btn--secondary">
          <span>Limpar filtros</span>
        </button>
      </div>
    </div>
  `;
}

export function bindScreenBibliotecaBuscarEvents(root, { router }) {
  if (activeSearchCleanup) {
    activeSearchCleanup();
    activeSearchCleanup = null;
  }

  carregarLote1();

  const inputEl = root.querySelector('#lib-search-input');
  const clearBtn = root.querySelector('#btn-search-clear');
  const cancelBtn = root.querySelector('#btn-search-cancel');
  const emptyClearBtn = root.querySelector('#btn-empty-clear-filters');
  const statusRow = root.querySelector('#lib-search-status-row');
  const popularSection = root.querySelector('#lib-popular-section');
  const popularListEl = root.querySelector('#biblioteca-populares-lista');
  const allSection = root.querySelector('#lib-all-section');
  const allHeadingEl = root.querySelector('#lib-all-heading');
  const mainListEl = root.querySelector('#biblioteca-lista');
  const azIndexEl = root.querySelector('#lib-az-index');
  const emptyEl = root.querySelector('#lib-search-empty');

  let currentPopularItems = [];
  let currentMainItems = [];
  let isFilteredMode = false;
  let debounceTimer = null;
  let isComposing = false;

  const updateFilterChipsUi = () => {
    const eqChip = root.querySelector('[data-open-filter-sheet="equipamentos"]');
    const muChip = root.querySelector('[data-open-filter-sheet="musculos"]');
    const niChip = root.querySelector('[data-open-filter-sheet="niveis"]');
    const eqLbl = root.querySelector('#chip-label-equipamentos');
    const muLbl = root.querySelector('#chip-label-musculos');
    const niLbl = root.querySelector('#chip-label-niveis');

    if (eqLbl) eqLbl.textContent = formatFilterChipLabel('equipamentos', bibliotecaState.equipamentos);
    if (muLbl) muLbl.textContent = formatFilterChipLabel('musculos', bibliotecaState.musculos);
    if (niLbl) niLbl.textContent = formatFilterChipLabel('niveis', bibliotecaState.niveis);

    eqChip?.classList.toggle('is-active', bibliotecaState.equipamentos.length > 0);
    muChip?.classList.toggle('is-active', bibliotecaState.musculos.length > 0);
    niChip?.classList.toggle('is-active', bibliotecaState.niveis.length > 0);
  };

  /**
   * Renderiza apenas as linhas visíveis na janela + folga (virtualização real de 80px)
   * garantindo <= 30 [role="listitem"] no DOM em qualquer posição de rolagem.
   */
  const renderVirtualizedSlice = (containerEl, items, maxCap = 24) => {
    if (!containerEl) return;
    const total = items.length;
    if (total === 0) {
      containerEl.style.minHeight = '0px';
      containerEl.style.height = '0px';
      containerEl.style.paddingTop = '0px';
      containerEl.style.paddingBottom = '0px';
      containerEl.innerHTML = '';
      return;
    }

    const totalHeightPx = total * ITEM_STRIDE_PX - ITEM_GAP_PX;
    containerEl.style.minHeight = `${totalHeightPx}px`;
    containerEl.style.height = 'auto';

    const rect = containerEl.getBoundingClientRect();
    const viewH = window.innerHeight || 844;

    const marginPx = BUFFER_ITEMS * ITEM_STRIDE_PX;
    if (rect.bottom < -marginPx) {
      containerEl.dataset.lastRange = 'off-above';
      containerEl.style.paddingTop = `${totalHeightPx}px`;
      containerEl.style.paddingBottom = '0px';
      containerEl.innerHTML = '';
      return;
    }
    if (rect.top > viewH + marginPx) {
      if (containerEl.id === 'biblioteca-lista') {
        const preloadEnd = Math.min(total - 1, BUFFER_ITEMS - 1);
        const rangeKey = `preload-0-${preloadEnd}-${total}`;
        if (containerEl.dataset.lastRange !== rangeKey) {
          containerEl.dataset.lastRange = rangeKey;
          containerEl.style.paddingTop = '0px';
          containerEl.style.paddingBottom = `${Math.max(0, (total - 1 - preloadEnd) * ITEM_STRIDE_PX)}px`;
          let preloadHtml = '';
          for (let i = 0; i <= preloadEnd; i++) {
            const ex = items[i];
            if (!ex) continue;
            preloadHtml += renderExercicioRow(ex);
          }
          containerEl.innerHTML = preloadHtml;
          bindExerciseRowClicks(containerEl, {
            router,
            origem: '#/biblioteca/buscar',
            beforeNavigate: () => {
              bibliotecaState.scrollYBusca = window.scrollY || 0;
              bibliotecaState.retornoDeDetalhe = true;
            }
          });
        }
      } else {
        containerEl.dataset.lastRange = 'off-below';
        containerEl.style.paddingTop = '0px';
        containerEl.style.paddingBottom = `${totalHeightPx}px`;
        containerEl.innerHTML = '';
      }
      return;
    }

    const visibleStartPx = Math.max(0, -rect.top - marginPx);
    const visibleEndPx = Math.min(totalHeightPx, viewH - rect.top + marginPx);

    let startIndex = Math.max(0, Math.floor(visibleStartPx / ITEM_STRIDE_PX));
    let endIndex = Math.min(total - 1, Math.ceil(visibleEndPx / ITEM_STRIDE_PX));

    if (endIndex - startIndex + 1 > maxCap) {
      endIndex = startIndex + maxCap - 1;
    }

    let html = '';
    for (let i = startIndex; i <= endIndex; i++) {
      const ex = items[i];
      if (!ex) continue;
      html += renderExercicioRow(ex);
    }

    if (containerEl.dataset.lastRange !== `${startIndex}-${endIndex}-${total}`) {
      containerEl.dataset.lastRange = `${startIndex}-${endIndex}-${total}`;
      containerEl.style.paddingTop = `${startIndex * ITEM_STRIDE_PX}px`;
      containerEl.style.paddingBottom = `${Math.max(0, (total - 1 - endIndex) * ITEM_STRIDE_PX)}px`;
      containerEl.innerHTML = html;
      bindExerciseRowClicks(containerEl, {
        router,
        origem: '#/biblioteca/buscar',
        beforeNavigate: () => {
          bibliotecaState.scrollYBusca = window.scrollY || 0;
          bibliotecaState.retornoDeDetalhe = true;
        }
      });
    }
  };

  const syncVirtualListsOnScroll = () => {
    if (!isFilteredMode) {
      renderVirtualizedSlice(popularListEl, currentPopularItems, 14);
      // Limita a fatia de Todos os Exercícios para que a soma total no DOM nunca passe de 28
      const popCountInDom = popularListEl ? popularListEl.querySelectorAll('[role="listitem"]').length : 0;
      const remainingBudget = Math.max(12, 28 - popCountInDom);
      renderVirtualizedSlice(mainListEl, currentMainItems, remainingBudget);
    } else {
      if (popularListEl) {
        popularListEl.innerHTML = '';
        popularListEl.style.height = '0px';
      }
      renderVirtualizedSlice(mainListEl, currentMainItems, 24);
    }
  };

  const buildAzIndex = (items) => {
    if (!azIndexEl) return;
    if (isFilteredMode || items.length === 0) {
      azIndexEl.hidden = true;
      azIndexEl.innerHTML = '';
      return;
    }
    const letterToIndex = new Map();
    items.forEach((ex, idx) => {
      const firstLetter = (ex.nome || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .charAt(0)
        .toUpperCase();
      if (firstLetter && !letterToIndex.has(firstLetter)) {
        letterToIndex.set(firstLetter, idx);
      }
    });

    const letters = Array.from(letterToIndex.keys()).sort();
    azIndexEl.hidden = letters.length <= 1;
    azIndexEl.innerHTML = letters
      .map(
        (l) => `
          <button
            type="button"
            class="lib-az-index__btn"
            data-az-letter="${l}"
            data-az-target-idx="${letterToIndex.get(l)}"
            aria-label="Ir para letra ${l}"
          >
            ${l}
          </button>
        `
      )
      .join('');

    azIndexEl.querySelectorAll('[data-az-target-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.azTargetIdx || 0);
        if (!mainListEl) return;
        const listTop = mainListEl.getBoundingClientRect().top + window.scrollY;
        const targetY = Math.max(0, listTop + idx * ITEM_STRIDE_PX - 136);
        vibrate('selecao');
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      });
    });
  };

  const recomputeAndRender = () => {
    updateFilterChipsUi();
    isFilteredMode = hasActiveQueryOrFilters();

    if (!isFilteredMode) {
      currentPopularItems = listarExerciciosPopulares();
      currentMainItems = listarExercicios();

      if (statusRow) {
        statusRow.innerHTML = `
          <span class="lib-search-count">${formatExerciciosPlural(currentMainItems.length)} no catálogo</span>
        `;
      }
      if (popularSection) popularSection.hidden = currentPopularItems.length === 0;
      if (allSection) allSection.hidden = false;
      if (allHeadingEl) {
        allHeadingEl.hidden = false;
        allHeadingEl.textContent = 'Todos os exercícios';
      }
      if (emptyEl) emptyEl.hidden = true;

      if (popularListEl) popularListEl.dataset.lastRange = '';
      if (mainListEl) mainListEl.dataset.lastRange = '';
      buildAzIndex(currentMainItems);
      syncVirtualListsOnScroll();
      return;
    }

    // Modo com texto ou filtros ativos
    const resultado = pesquisarCatalogo(bibliotecaState.consulta, {
      equipamentos: bibliotecaState.equipamentos,
      musculos: bibliotecaState.musculos,
      niveis: bibliotecaState.niveis,
      grupo: bibliotecaState.grupoBusca,
      rotinaId: bibliotecaState.rotinaId
    });

    currentPopularItems = [];
    currentMainItems = resultado.itens;

    if (popularSection) popularSection.hidden = true;
    if (azIndexEl) azIndexEl.hidden = true;

    if (currentMainItems.length === 0) {
      if (statusRow) {
        statusRow.innerHTML = `<span class="lib-search-count">0 exercícios</span>`;
      }
      if (allSection) allSection.hidden = true;
      if (emptyEl) emptyEl.hidden = false;
      if (mainListEl) {
        mainListEl.innerHTML = '';
        mainListEl.style.height = '0px';
      }
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    if (allSection) allSection.hidden = false;
    if (allHeadingEl) {
      allHeadingEl.hidden = true;
    }

    const fuzzyBadgeHtml = resultado.resultadosParecidos
      ? `<span class="lib-fuzzy-badge" data-termo-sugerido="${escapeHtml(resultado.termoSugerido || '')}">Resultados parecidos${resultado.termoSugerido ? ` · “${escapeHtml(resultado.termoSugerido)}”` : ''}</span>`
      : '';

    if (statusRow) {
      statusRow.innerHTML = `
        <span class="lib-search-count">${formatExerciciosPlural(currentMainItems.length)}</span>
        ${fuzzyBadgeHtml}
      `;
    }

    if (mainListEl) mainListEl.dataset.lastRange = '';
    syncVirtualListsOnScroll();
  };

  // Trata input e compositionend com debounce de 120ms (sem foco automático ao abrir)
  const triggerDebouncedSearch = () => {
    const val = inputEl ? inputEl.value : '';
    clearBtn?.classList.toggle('is-visible', val.length > 0);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      bibliotecaState.consulta = val;
      window.scrollTo({ top: 0, behavior: 'instant' });
      recomputeAndRender();
    }, 120);
  };

  inputEl?.addEventListener('compositionstart', () => {
    isComposing = true;
  });
  inputEl?.addEventListener('compositionend', () => {
    isComposing = false;
    triggerDebouncedSearch();
  });
  inputEl?.addEventListener('input', () => {
    if (isComposing) return;
    triggerDebouncedSearch();
  });

  clearBtn?.addEventListener('click', () => {
    vibrate('selecao');
    if (inputEl) {
      inputEl.value = '';
      inputEl.focus();
    }
    bibliotecaState.consulta = '';
    clearBtn.classList.remove('is-visible');
    recomputeAndRender();
  });

  cancelBtn?.addEventListener('click', () => {
    vibrate('selecao');
    router.navigate('#/biblioteca', { mode: 'pop' });
  });

  emptyClearBtn?.addEventListener('click', () => {
    vibrate('selecao');
    if (inputEl) inputEl.value = '';
    clearBtn?.classList.remove('is-visible');
    resetarBuscaState({ grupoBusca: null, rotinaId: null, manterFiltros: false });
    recomputeAndRender();
  });

  // 3 chips-filtro -> folha inferior com caixas de seleção de 56px + "Limpar" e "Aplicar (N)"
  root.querySelectorAll('[data-open-filter-sheet]').forEach((chipBtn) => {
    chipBtn.addEventListener('click', () => {
      vibrate('selecao');
      openSearchFilterSheet(chipBtn.dataset.openFilterSheet, {
        onApply: () => {
          window.scrollTo({ top: 0, behavior: 'instant' });
          recomputeAndRender();
        }
      });
    });
  });

  const onWindowScrollOrResize = () => {
    syncVirtualListsOnScroll();
  };
  window.addEventListener('scroll', onWindowScrollOrResize, { passive: true });
  window.addEventListener('resize', onWindowScrollOrResize, { passive: true });

  const unsubCatalog = ouvirAtualizacaoCatalogo(() => {
    recomputeAndRender();
  });

  recomputeAndRender();

  // C5: Restaura scroll caso esteja voltando do detalhe (#/exercicio/:id)
  if (bibliotecaState.retornoDeDetalhe && bibliotecaState.scrollYBusca > 0) {
    const savedY = bibliotecaState.scrollYBusca;
    bibliotecaState.retornoDeDetalhe = false;
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedY, behavior: 'instant' });
      syncVirtualListsOnScroll();
    });
  } else {
    bibliotecaState.retornoDeDetalhe = false;
  }

  activeSearchCleanup = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    window.removeEventListener('scroll', onWindowScrollOrResize);
    window.removeEventListener('resize', onWindowScrollOrResize);
    unsubCatalog();
  };
}

/**
 * Folha inferior de filtros de múltipla escolha (56px por linha, "Limpar" e "Aplicar (N)")
 */
function openSearchFilterSheet(tipo, { onApply }) {
  const titulos = {
    equipamentos: 'Equipamentos',
    musculos: 'Músculos',
    niveis: 'Níveis'
  };
  const opcoes =
    tipo === 'equipamentos'
      ? TIPOS_EQUIPAMENTO
      : tipo === 'musculos'
      ? LISTA_MUSCULOS
      : NIVEIS_EXERCICIO;

  let selecionadosTemp = [...(bibliotecaState[tipo] || [])];

  const computeMatchingCount = (tempList) => {
    const filtrosTeste = {
      equipamentos: tipo === 'equipamentos' ? tempList : bibliotecaState.equipamentos,
      musculos: tipo === 'musculos' ? tempList : bibliotecaState.musculos,
      niveis: tipo === 'niveis' ? tempList : bibliotecaState.niveis,
      grupo: bibliotecaState.grupoBusca,
      rotinaId: bibliotecaState.rotinaId
    };
    return pesquisarCatalogo(bibliotecaState.consulta, filtrosTeste).total;
  };

  const initialCount = computeMatchingCount(selecionadosTemp);

  const rowsHtml = opcoes
    .map((opt) => {
      const checked = selecionadosTemp.includes(opt);
      const optCount = computeMatchingCount([opt]);
      return `
        <button
          type="button"
          role="checkbox"
          aria-checked="${checked ? 'true' : 'false'}"
          class="lib-filter-option-row ${checked ? 'is-checked' : ''}"
          data-filter-opt="${escapeHtml(opt)}"
        >
          <span class="lib-filter-option-row__label">${escapeHtml(opt)} <span style="color:var(--tinta-3); font-size:13px; font-weight:500;">(${optCount})</span></span>
          <span class="lib-filter-option-row__box" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </button>
      `;
    })
    .join('');

  openBottomSheet('clay-sheet', {
    title: titulos[tipo] || 'Filtrar',
    contentHtml: `
      <div class="lib-filter-sheet-wrap">
        <div class="lib-filter-sheet-list" role="group" aria-label="${escapeHtml(titulos[tipo] || 'Opções')}">
          ${rowsHtml}
        </div>
        <div class="lib-filter-sheet-footer">
          <button
            type="button"
            id="btn-filter-sheet-clear"
            class="c-btn c-btn--secondary"
            style="flex: 1;"
          >
            <span>Limpar</span>
          </button>
          <button
            type="button"
            id="btn-filter-sheet-apply"
            class="c-btn c-btn--primary"
            style="flex: 1.4;"
          >
            <span id="filter-sheet-apply-label">Aplicar (${initialCount})</span>
          </button>
        </div>
      </div>
    `
  });

  const sheetEl = document.getElementById('clay-sheet');
  const applyLbl = document.getElementById('filter-sheet-apply-label');

  const syncSheetCount = () => {
    const n = computeMatchingCount(selecionadosTemp);
    if (applyLbl) applyLbl.textContent = `Aplicar (${n})`;
  };

  sheetEl?.querySelectorAll('[data-filter-opt]').forEach((rowBtn) => {
    rowBtn.addEventListener('click', () => {
      vibrate('selecao');
      const val = rowBtn.dataset.filterOpt;
      if (selecionadosTemp.includes(val)) {
        selecionadosTemp = selecionadosTemp.filter((x) => x !== val);
      } else {
        selecionadosTemp = [...selecionadosTemp, val];
      }
      const isNowChecked = selecionadosTemp.includes(val);
      rowBtn.classList.toggle('is-checked', isNowChecked);
      rowBtn.setAttribute('aria-checked', String(isNowChecked));
      syncSheetCount();
    });
  });

  document.getElementById('btn-filter-sheet-clear')?.addEventListener('click', () => {
    vibrate('selecao');
    selecionadosTemp = [];
    sheetEl?.querySelectorAll('[data-filter-opt]').forEach((rowBtn) => {
      rowBtn.classList.remove('is-checked');
      rowBtn.setAttribute('aria-checked', 'false');
    });
    syncSheetCount();
  });

  document.getElementById('btn-filter-sheet-apply')?.addEventListener('click', () => {
    vibrate('confirmacao');
    bibliotecaState[tipo] = [...selecionadosTemp];
    closeBottomSheet('clay-sheet', { silent: true });
    if (typeof onApply === 'function') onApply();
  });
}

/* ==========================================================================
   C4. DETALHE DO EXERCÍCIO (#/exercicio/:id)
   ========================================================================== */
export function renderScreenExercicioDetalhe(exercicioId) {
  const ex = getExercicioPorId(exercicioId);
  if (!ex) {
    return `
      <div class="reading-column">
        <header id="clay-topbar" class="c-topbar">
          <button type="button" class="c-topbar__icon-btn" data-ex-detail-back aria-label="Voltar">
            ${getIconSvg('voltar', 24)}
          </button>
          <div class="c-topbar__title">Exercício</div>
          <div class="c-topbar__right"></div>
        </header>
        <div class="c-card" style="text-align:center; padding:32px 20px;">
          <h1 class="t-h2" tabindex="-1">Exercício não encontrado</h1>
          <p class="t-body" style="color:var(--tinta-2); margin-top:8px;">
            Volte para a Biblioteca para explorar o catálogo completo.
          </p>
        </div>
      </div>
    `;
  }

  const secundarios = Array.isArray(ex.musculosSecundarios) ? ex.musculosSecundarios : [];
  const passos = Array.isArray(ex.comoFazer) ? ex.comoFazer : [];
  const erros = Array.isArray(ex.errosComuns) && ex.errosComuns.length > 0
    ? ex.errosComuns
    : ex.erroComum
    ? [ex.erroComum]
    : [];
  const dicas = Array.isArray(ex.dicas) ? ex.dicas : [];
  const hasGrandeImg = Boolean(ex.imagem && ex.imagem.grande);

  return `
    <div class="reading-column ex-detail-screen" id="exercicio-detalhe-root">
      <header id="clay-topbar" class="c-topbar">
        <button
          type="button"
          class="c-topbar__icon-btn"
          data-ex-detail-back
          aria-label="Voltar"
        >
          ${getIconSvg('voltar', 24)}
        </button>
        <div class="c-topbar__title">${escapeHtml(ex.grupo || 'Exercício')}</div>
        <div class="c-topbar__right"></div>
      </header>

      <!-- Topo: quadro 16:9 (border-radius: 24px, fundo --ill-palco) com mapa muscular grande -->
      <div class="ex-detail-hero-stage">
        ${renderMapaMuscular(ex, { tamanho: 'grande' })}
        ${
          hasGrandeImg
            ? `<img
                 class="ex-detail-hero-img"
                 src="${escapeHtml(ex.imagem.grande)}"
                 alt="${escapeHtml(ex.nome)}"
                 loading="lazy"
                 onerror="this.remove()"
               />`
            : ''
        }
      </div>

      <!-- Título: Fraunces 600 28/32 -->
      <h1 class="ex-detail-title" tabindex="-1">${escapeHtml(ex.nome)}</h1>

      <!-- Linha de chips: musculoPrincipal (terracota suave), musculosSecundarios (--superficie-2), equipamentoTipo, nivel -->
      <div class="ex-detail-chips" aria-label="Características do exercício">
        <span class="ex-detail-chip ex-detail-chip--primary">${escapeHtml(ex.musculoPrincipal)}</span>
        ${secundarios
          .map(
            (m) =>
              `<span class="ex-detail-chip ex-detail-chip--secondary">${escapeHtml(m)}</span>`
          )
          .join('')}
        <span class="ex-detail-chip ex-detail-chip--meta">${escapeHtml(ex.equipamentoTipo || ex.equipamento)}</span>
        <span class="ex-detail-chip ex-detail-chip--meta">${escapeHtml(ex.nivel)}</span>
        ${
          ex.seriesPadrao
            ? `<span class="ex-detail-chip ex-detail-chip--meta" data-detail-prescription>${escapeHtml(ex.seriesPadrao)}</span>`
            : ''
        }
      </div>

      <!-- Bloco "Como fazer": passos numerados 1., 2., 3. em círculos de 28px, texto 16/24 --tinta -->
      <section class="ex-detail-card" aria-label="Como fazer">
        <h2 class="ex-detail-section-title">Como fazer</h2>
        <ol class="ex-detail-steps-list">
          ${passos
            .map(
              (passo, idx) => `
                <li class="ex-detail-step-item">
                  <span class="ex-detail-step-num" aria-hidden="true">${idx + 1}.</span>
                  <span class="ex-detail-step-text">${escapeHtml(passo)}</span>
                </li>
              `
            )
            .join('')}
        </ol>
      </section>

      <!-- Bloco "Erros comuns": lista com ícone de alerta discreto, texto 15/22 --tinta-2 -->
      <section class="ex-detail-card" aria-label="Erros comuns">
        <h2 class="ex-detail-section-title">Erros comuns</h2>
        <ul class="ex-detail-errors-list">
          ${erros
            .map(
              (erro) => `
                <li class="ex-detail-error-item">
                  <span class="ex-detail-error-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <line x1="12" y1="8" x2="12" y2="12.5" />
                      <circle cx="12" cy="16" r="0.6" fill="currentColor" />
                    </svg>
                  </span>
                  <span class="ex-detail-error-text">${escapeHtml(erro)}</span>
                </li>
              `
            )
            .join('')}
        </ul>
      </section>

      <!-- Bloco "Respiração": 1 frase curta em cartão suave -->
      <section class="ex-detail-breath-card" aria-label="Respiração">
        <div class="ex-detail-breath-card__head">Respiração</div>
        <p class="ex-detail-breath-card__text">${escapeHtml(ex.respiracao)}</p>
      </section>

      <!-- Bloco "Atenção": avisoSeguranca em cartão --alerta-suave com ícone -->
      <section class="ex-detail-alert-card" aria-label="Atenção">
        <div class="ex-detail-alert-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <circle cx="12" cy="17" r="0.6" fill="currentColor" />
          </svg>
        </div>
        <div class="ex-detail-alert-card__body">
          <div class="ex-detail-alert-card__title">Atenção</div>
          <p class="ex-detail-alert-card__text">${escapeHtml(ex.avisoSeguranca)}</p>
        </div>
      </section>

      <!-- Bloco "Dicas": 1-2 frases práticas -->
      ${
        dicas.length > 0
          ? `
            <section class="ex-detail-card" aria-label="Dicas">
              <h2 class="ex-detail-section-title">Dicas</h2>
              <ul class="ex-detail-tips-list">
                ${dicas
                  .map((d) => `<li class="ex-detail-tip-item">${escapeHtml(d)}</li>`)
                  .join('')}
              </ul>
            </section>
          `
          : ''
      }

      <button
        type="button"
        id="btn-detail-add-today"
        class="c-btn c-btn--secondary c-btn--full"
        data-add-ex-id="${escapeHtml(ex.id)}"
      >
        <span>Adicionar ao treino de hoje</span>
      </button>

      <!-- Rodapé discreto (13/18 --tinta-3) -->
      <footer class="ex-detail-disclaimer">
        Em caso de dor, pare e procure um profissional de saúde.
      </footer>
    </div>
  `;
}

export function bindScreenExercicioDetalheEvents(root, { router }) {
  carregarLote1();

  const focusDetailH1 = () => {
    const h1 = root.querySelector('h1.ex-detail-title') || root.querySelector('h1');
    if (h1) {
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }
  };
  requestAnimationFrame(focusDetailH1);
  setTimeout(focusDetailH1, 260);

  root.querySelector('[data-ex-detail-back]')?.addEventListener('click', () => {
    vibrate('selecao');
    if (bibliotecaState.origemDetalhe === '#/biblioteca/buscar') {
      bibliotecaState.retornoDeDetalhe = true;
      router.navigate('#/biblioteca/buscar', { mode: 'pop' });
    } else if (window.history.length > 1) {
      router.back();
    } else {
      router.navigate('#/biblioteca', { mode: 'pop' });
    }
  });

  root.querySelector('#btn-detail-add-today')?.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.addExId;
    if (!id) return;
    store.addExtraExerciseToday(id);
    vibrate('sucesso');
    showToast({ message: 'Exercício adicionado ao treino de hoje' });
  });
}

function bindExerciseRowClicks(container, { router, origem = '#/biblioteca', beforeNavigate } = {}) {
  if (!container) return;
  container.querySelectorAll('.ex-row[data-open-exercise]').forEach((rowEl) => {
    const navigateToDetail = () => {
      const id = rowEl.dataset.openExercise;
      if (!id) return;
      vibrate('selecao');
      rowEl.classList.add('is-pressing');
      setTimeout(() => rowEl.classList.remove('is-pressing'), 120);
      bibliotecaState.origemDetalhe = origem;
      if (typeof beforeNavigate === 'function') beforeNavigate();
      router.navigate(`#/exercicio/${id}`, { mode: 'push' });
    };

    rowEl.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateToDetail();
    });

    rowEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateToDetail();
      }
    });
  });
}

export default {
  renderScreenBibliotecaNova,
  bindScreenBibliotecaNovaEvents,
  renderScreenBibliotecaBuscar,
  bindScreenBibliotecaBuscarEvents,
  renderScreenExercicioDetalhe,
  bindScreenExercicioDetalheEvents,
  renderRoutineCardScene
};
