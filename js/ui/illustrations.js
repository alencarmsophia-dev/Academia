/**
 * ============================================================================
 * CLAY FIT — SISTEMA COMPLETO DE ILUSTRAÇÕES E CENAS VETORIAIS (PARTE A + M7)
 * /js/ui/illustrations.js
 *
 * Correções Prompt 3 & 3.1 (A3, A4 e M7):
 * - A3: `renderSceneJ(grupoPrincipal, customSize, grupoSecundario)` renderiza a
 *   versão GRANDE (`viewBox 320×168`, `preserveAspectRatio="xMidYMid meet"`) da
 *   MESMA cena do grupo usada na Biblioteca (`Peito`, `Costas`, `Ombros`,
 *   `Braços`, `Pernas`, `Core`, `Corrida`, `Mobilidade`), com 1 detalhe extra
 *   que a miniatura não tem e loop sutil de 6s, mais selo do segundo grupo.
 * - A4: `renderLibraryGroupScene(itemOrGroup, { isThumb })` diferencia cada um
 *   dos 8 treinos de Corrida por `subtipo`/`equip` e cada uma das 6 regiões de
 *   Mobilidade (`coluna`, `quadril`, `toracica`, `tornozelo`, `isquiotibiais`,
 *   `pescoco`), garantindo zero cartas repetidas no mesmo grupo.
 * - M7: `auditarCenas()` lista TODOS os 8 grupos da Biblioteca (`Peito`,
 *   `Costas`, `Pernas`, `Ombros`, `Braços`, `Core`, `Mobilidade`, `Corrida`)
 *   com `{ cartas, unicas, paresIguaisAdjacentes }` e verifica também que a
 *   Cena J grande (`renderSceneJ`) de cada um dos 8 grupos é diferente das demais.
 * ============================================================================
 */

import { spring } from '../motion.js';
import { ALL_LIBRARY_ITEMS, RUN_TYPES_CARDS } from '../engine/catalog.js';
import { renderRunTypeCardScene } from './illustrations-run.js';

/**
 * SÍMBOLO DE ABERTURA (F0: 96px de lado; traçado terracota desenhado em 700ms e preenchimento em 300ms)
 */
export function getBrandMarkSvg(size = 96, animated = false) {
  const strokeCls = animated ? 'logo-draw-stroke' : '';
  const fillCls = animated ? 'logo-draw-fill' : '';
  return `
    <svg
      viewBox="0 0 96 96"
      width="${size}"
      height="${size}"
      role="img"
      aria-label="Símbolo escultural do Clay Fit"
    >
      <rect
        x="6"
        y="6"
        width="84"
        height="84"
        rx="26"
        fill="var(--ill-creme)"
        stroke="var(--ill-argila)"
        stroke-width="2.5"
        class="${strokeCls}"
      />
      <path
        d="M24 62 C24 38, 42 24, 58 28 C72 31, 76 48, 66 62 C58 72, 32 74, 24 62 Z"
        fill="var(--ill-argila)"
        class="${fillCls}"
      />
      <path
        d="M52 24 C66 24, 76 36, 72 52 C69 63, 56 66, 48 58 C41 51, 42 24, 52 24 Z"
        fill="var(--ill-salvia)"
        opacity="0.88"
        class="${fillCls}"
      />
      <circle
        cx="56"
        cy="42"
        r="9"
        fill="var(--ill-areia)"
        class="${fillCls}"
      />
      <path
        d="M26 58 Q48 38 70 54"
        fill="none"
        stroke="var(--ill-contorno)"
        stroke-width="3"
        stroke-linecap="round"
        class="${strokeCls}"
      />
    </svg>
  `;
}

/**
 * ÍCONES LINEARES DO SISTEMA (24×24, traço 1.75px, pontas arredondadas)
 */
export function getIconSvg(name, size = 24) {
  const icons = {
    hoje: `<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2.5 12H5M19 12h2.5M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>`,
    biblioteca: `<rect x="3.5" y="4" width="7" height="7" rx="2"/><rect x="13.5" y="4" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>`,
    comecar: `<polygon points="9,6.5 18.5,12 9,17.5" fill="currentColor" stroke="currentColor" stroke-linejoin="round"/>`,
    evolucao: `<path d="M4 19.5h16"/><path d="M6.5 16V11"/><path d="M12 16V7.5"/><path d="M17.5 16V4.5"/>`,
    perfil: `<circle cx="12" cy="8.2" r="3.8"/><path d="M4.8 19.5c1.6-3.4 4.3-5 7.2-5s5.6 1.6 7.2 5"/>`,
    haltere: `<path d="M6.5 9v6M17.5 9v6M3.5 10.5v3M20.5 10.5v3M6.5 12h11"/>`,
    corrida: `<circle cx="15.5" cy="5.5" r="2"/><path d="M10 9.5l3.5 1.5 2 3.5h3M7 14l3.5-2.5 2 3-2 4.5M5.5 18.5h4"/>`,
    fogo: `<path d="M12.5 3.5c.8 3.2-2.2 4.8-1.5 7.5.5 1.8 2.8 2.2 3.5.5 1.4 1.6 2 3.8 1 6-1.2 2.5-4.8 3.5-7.2 1.8-2.3-1.6-2.8-5-1-7.8 1.4-2.1 3.8-4.5 5.2-8Z"/>`,
    relogio: `<circle cx="12" cy="12.5" r="8"/><path d="M12 8.5v4.2l2.8 1.8"/><path d="M9.5 2.5h5"/>`,
    casa: `<path d="M3.5 10.8 12 4l8.5 6.8"/><path d="M6.2 9.5V19.5h11.6V9.5"/>`,
    arvore: `<path d="M12 20v-5"/><path d="M12 4.5c-3.5 0-6 2.8-5.5 6.2.4 2.5 2.5 4.3 5.5 4.3s5.1-1.8 5.5-4.3c.5-3.4-2-6.2-5.5-6.2Z"/>`,
    escudo: `<path d="M12 3.5 5 6.5v5.2c0 4.5 3 7.6 7 8.8 4-1.2 7-4.3 7-8.8V6.5l-7-3Z"/><path d="M9.5 12.2l1.8 1.8 3.5-3.6"/>`,
    check: `<path d="M5 12.5 10 17l9-10"/>`,
    fechar: `<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>`,
    voltar: `<path d="M15 5.5 8.5 12 15 18.5"/>`,
    avancar: `<path d="M9 5.5 15.5 12 9 18.5"/>`,
    mais: `<path d="M12 5.5v13M5.5 12h13"/>`,
    menos: `<path d="M5.5 12h13"/>`,
    brilho: `<path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6-4.6-1.9 4.6-1.9L12 3.5Z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z"/>`,
    maisOpcoes: `<circle cx="6" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="18" cy="12" r="1.5" fill="currentColor"/>`,
    lua: `<path d="M20.2 14.8A8.5 8.5 0 0 1 9.2 3.8a8.5 8.5 0 1 0 11 11Z"/>`,
    sol: `<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/>`,
    'meio-circulo': `<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none"/>`,
    cadeado: `<rect x="5" y="11" width="14" height="10" rx="3"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>`
  };

  return `
    <svg
      viewBox="0 0 24 24"
      width="${size}"
      height="${size}"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      ${icons[name] || icons.brilho}
    </svg>
  `;
}

/**
 * CENA A — Boas-vindas (320×260)
 */
export function renderSceneA() {
  return `
    <svg
      id="scene-a-svg"
      viewBox="0 0 320 260"
      width="100%"
      height="100%"
      style="max-width:320px; max-height:260px; cursor:pointer; overflow:visible;"
      role="img"
      aria-label="Escultura em argila com arco terracota, esfera sálvia e halter sobre base de areia"
    >
      <defs>
        <linearGradient id="clayTerracotaA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="var(--ill-argila)"/>
          <stop offset="100%" stop-color="var(--terracota-profundo)"/>
        </linearGradient>
        <linearGradient id="claySalviaA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="var(--salvia-suave)"/>
          <stop offset="100%" stop-color="var(--ill-salvia)"/>
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="222" rx="116" ry="20" fill="var(--ill-areia)" opacity="0.65"/>
      <ellipse cx="160" cy="216" rx="94" ry="13" fill="var(--superficie-2)"/>
      <g id="scene-a-piece-1" class="ill-float-6s">
        <path
          d="M78 198 C78 106, 214 106, 214 198"
          fill="none"
          stroke="url(#clayTerracotaA)"
          stroke-width="34"
          stroke-linecap="round"
        />
      </g>
      <g id="scene-a-piece-2" class="ill-float-7s">
        <circle cx="206" cy="96" r="40" fill="url(#claySalviaA)"/>
        <circle cx="194" cy="84" r="10" fill="var(--ill-creme)" opacity="0.55"/>
      </g>
      <g id="scene-a-piece-3" class="ill-float-5s">
        <rect x="86" y="168" width="22" height="44" rx="9" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <rect x="172" y="168" width="22" height="44" rx="9" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <rect x="108" y="185" width="64" height="10" rx="5" fill="var(--ill-traco)"/>
        <path d="M114 188 H166" stroke="var(--ill-creme)" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

export function bindSceneAInteraction(root = document) {
  const svg = root.querySelector('#scene-a-svg');
  if (!svg || svg.dataset.bound === 'true') return;
  svg.dataset.bound = 'true';

  svg.addEventListener('click', () => {
    const p1 = svg.querySelector('#scene-a-piece-1');
    const p2 = svg.querySelector('#scene-a-piece-2');
    const p3 = svg.querySelector('#scene-a-piece-3');
    [
      { el: p1, dx: -10, dy: -12, rot: -5 },
      { el: p2, dx: 14, dy: -14, rot: 8 },
      { el: p3, dx: 0, dy: 10, rot: -4 }
    ].forEach(({ el, dx, dy, rot }) => {
      if (!el) return;
      spring({
        from: 0,
        to: 1,
        stiffness: 260,
        damping: 18,
        onUpdate: (v) => {
          const wave = Math.sin(v * Math.PI);
          el.style.transform = `translate(${(dx * wave).toFixed(1)}px, ${(dy * wave).toFixed(1)}px) rotate(${(rot * wave).toFixed(1)}deg)`;
        },
        onDone: () => {
          el.style.transform = '';
        }
      });
    });
  });
}

/**
 * 2.3 CENA B — Objetivo (320×180)
 */
export function renderSceneB(selectedValue = '') {
  const hasSelection = Boolean(selectedValue && String(selectedValue).trim() !== '');

  const isForca = selectedValue === 'Mais força e músculo';
  const isCorrida = selectedValue === 'Correr mais e melhor';
  const isGordura = selectedValue === 'Perder gordura com saúde';
  const isAmbos = selectedValue === 'Os dois: ferro e asfalto';

  const getPieceAttrs = (pieceKey) => {
    if (!hasSelection) {
      return {
        cls: `scene-b-piece scene-b-float-${pieceKey}`,
        style: 'transform-origin: center; transform-box: fill-box; opacity: 1;'
      };
    }
    const active =
      (pieceKey === 1 && isForca) ||
      (pieceKey === 2 && isCorrida) ||
      (pieceKey === 3 && isGordura) ||
      (pieceKey === 4 && isAmbos);

    return {
      cls: 'scene-b-piece',
      style: `transform-origin: center; transform-box: fill-box; opacity: ${active ? '1' : '0.5'}; transform: scale(${active ? '1.12' : '0.94'});`
    };
  };

  const p1 = getPieceAttrs(1);
  const p2 = getPieceAttrs(2);
  const p3 = getPieceAttrs(3);
  const p4 = getPieceAttrs(4);

  return `
    <svg viewBox="0 0 320 180" width="100%" height="100%" style="max-width:320px;max-height:180px;" role="img" aria-label="Quatro totens esculturais representando os objetivos de treino">
      <g data-scene-b-piece="Mais força e músculo" class="${p1.cls}" style="${p1.style}">
        <rect x="20" y="54" width="56" height="84" rx="22" fill="var(--terracota-suave)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <rect x="30" y="76" width="10" height="38" rx="4" fill="var(--ill-argila)"/>
        <rect x="56" y="76" width="10" height="38" rx="4" fill="var(--ill-argila)"/>
        <rect x="38" y="92" width="20" height="6" rx="3" fill="var(--ill-traco)"/>
      </g>
      <g data-scene-b-piece="Correr mais e melhor" class="${p2.cls}" style="${p2.style}">
        <rect x="94" y="46" width="56" height="92" rx="22" fill="var(--salvia-suave)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <path d="M106 116 Q122 68 138 92 T142 66" fill="none" stroke="var(--sucesso)" stroke-width="4" stroke-linecap="round"/>
        <circle cx="142" cy="66" r="5" fill="var(--ill-argila)"/>
      </g>
      <g data-scene-b-piece="Perder gordura com saúde" class="${p3.cls}" style="${p3.style}">
        <rect x="168" y="46" width="56" height="92" rx="22" fill="var(--superficie-2)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <path d="M196 64 C204 78, 212 90, 206 106 C202 116, 190 116, 186 106 C180 90, 188 78, 196 64 Z" fill="var(--ill-argila)"/>
        <circle cx="196" cy="102" r="5" fill="var(--ill-areia)"/>
      </g>
      <g data-scene-b-piece="Os dois: ferro e asfalto" class="${p4.cls}" style="${p4.style}">
        <rect x="242" y="54" width="58" height="84" rx="22" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <circle cx="263" cy="96" r="14" fill="var(--ill-argila)"/>
        <circle cx="279" cy="96" r="14" fill="var(--ill-salvia)" opacity="0.9"/>
      </g>
    </svg>
  `;
}

export function animateSceneBSelection(rootEl, selectedValue) {
  if (!rootEl || !selectedValue) return;
  const pieces = rootEl.querySelectorAll('[data-scene-b-piece]');
  pieces.forEach((piece) => {
    piece.classList.remove(
      'scene-b-float-1',
      'scene-b-float-2',
      'scene-b-float-3',
      'scene-b-float-4'
    );
    const isChosen = piece.getAttribute('data-scene-b-piece') === selectedValue;
    piece.style.opacity = isChosen ? '1' : '0.5';
    spring({
      from: 1,
      to: isChosen ? 1.12 : 0.94,
      stiffness: 260,
      damping: 24,
      mass: 1,
      onUpdate: (val) => {
        piece.style.transform = `scale(${val.toFixed(3)})`;
      }
    });
  });
}

/**
 * CENA C — Nível (320×180)
 */
export function renderSceneC(nivel = '') {
  const stepIndex =
    nivel === 'Estou começando'
      ? 1
      : nivel === 'Treino há anos'
      ? 3
      : nivel === 'Treino há alguns meses'
      ? 2
      : 0;

  const sphereCoords =
    stepIndex === 1
      ? { cx: 88, cy: 108 }
      : stepIndex === 3
      ? { cx: 232, cy: 36 }
      : { cx: 160, cy: 72 };

  return `
    <svg viewBox="0 0 320 180" width="100%" height="100%" style="max-width:320px;max-height:180px;" role="img" aria-label="Três degraus de argila com esfera no seu nível">
      <rect x="52" y="124" width="72" height="36" rx="10" fill="${stepIndex === 1 ? 'var(--terracota-suave)' : 'var(--superficie-2)'}" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      <rect x="124" y="88" width="72" height="72" rx="12" fill="${stepIndex === 2 ? 'var(--salvia-suave)' : 'var(--superficie-2)'}" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      <rect x="196" y="52" width="72" height="108" rx="14" fill="${stepIndex === 3 ? 'var(--ill-areia)' : 'var(--superficie-2)'}" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      <g style="transition: transform 380ms cubic-bezier(.34, 1.56, .64, 1); transform: translate(${sphereCoords.cx}px, ${sphereCoords.cy}px);">
        <circle cx="0" cy="0" r="18" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <circle cx="-5" cy="-5" r="4" fill="var(--ill-creme)" opacity="0.7"/>
      </g>
    </svg>
  `;
}

/**
 * CENA D — Local (320×180)
 */
export function renderSceneD(locais = ['Academia completa']) {
  const list = Array.isArray(locais) ? locais : [locais];
  const hasGym = list.includes('Academia completa');
  const hasHome = list.includes('Em casa com halteres') || list.includes('Em casa só com o corpo');
  const hasOutdoor = list.includes('Ao ar livre');

  return `
    <svg viewBox="0 0 320 180" width="100%" height="100%" style="max-width:320px;max-height:180px;" role="img" aria-label="Locais de treino selecionados">
      <g style="opacity:${hasGym ? '1' : '0.32'}; transition: opacity 260ms ease, transform 260ms ease; transform: translateY(${hasGym ? '-4px' : '0'});">
        <rect x="24" y="44" width="80" height="106" rx="18" fill="${hasGym ? 'var(--terracota-suave)' : 'var(--superficie-2)'}" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <path d="M44 134 V68 H84 V134" fill="none" stroke="var(--ill-traco)" stroke-width="2.5"/>
        <line x1="36" y1="92" x2="92" y2="92" stroke="var(--ill-argila)" stroke-width="5" stroke-linecap="round"/>
      </g>
      <g style="opacity:${hasHome ? '1' : '0.32'}; transition: opacity 260ms ease, transform 260ms ease; transform: translateY(${hasHome ? '-4px' : '0'});">
        <rect x="120" y="44" width="80" height="106" rx="18" fill="${hasHome ? 'var(--salvia-suave)' : 'var(--superficie-2)'}" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <path d="M138 96 L160 74 L182 96" fill="none" stroke="var(--ill-traco)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="145" y="96" width="30" height="32" rx="6" fill="var(--ill-salvia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      </g>
      <g style="opacity:${hasOutdoor ? '1' : '0.32'}; transition: opacity 260ms ease, transform 260ms ease; transform: translateY(${hasOutdoor ? '-4px' : '0'});">
        <rect x="216" y="44" width="80" height="106" rx="18" fill="${hasOutdoor ? 'var(--ill-areia)' : 'var(--superficie-2)'}" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <circle cx="272" cy="70" r="10" fill="var(--ill-argila)"/>
        <circle cx="248" cy="96" r="18" fill="var(--ill-salvia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <line x1="248" y1="114" x2="248" y2="134" stroke="var(--ill-traco)" stroke-width="2.5" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

/**
 * CENA E — Dias da semana (320×180)
 */
export function renderSceneE(diasAtivos = [1, 2, 4, 5]) {
  const ativos = Array.isArray(diasAtivos) ? diasAtivos : [1, 2, 4, 5];
  const cols = [0, 1, 2, 3, 4, 5, 6];

  return `
    <svg viewBox="0 0 320 180" width="100%" height="100%" style="max-width:320px;max-height:180px;" role="img" aria-label="Grade escultural dos sete dias da semana">
      <rect x="20" y="28" width="280" height="124" rx="26" fill="var(--superficie-2)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      ${cols
        .map((d, i) => {
          const isSelected = ativos.includes(d);
          const x = 38 + i * 36;
          return `
            <g>
              <rect
                x="${x}"
                y="${isSelected ? 46 : 58}"
                width="26"
                height="${isSelected ? 88 : 68}"
                rx="13"
                fill="${isSelected ? 'var(--ill-argila)' : 'var(--ill-creme)'}"
                stroke="var(--ill-contorno)"
                stroke-width="1.5"
              />
              <circle
                cx="${x + 13}"
                cy="${isSelected ? 64 : 92}"
                r="4.5"
                fill="${isSelected ? 'var(--ill-creme)' : 'var(--tinta-3)'}"
              />
            </g>
          `;
        })
        .join('')}
    </svg>
  `;
}

/**
 * CENA F — Tempo (320×180)
 */
export function renderSceneF(tempoMin = 45) {
  const durMap = { 20: '1.8s', 30: '2.4s', 45: '3.2s', 60: '4.2s' };
  const cycleDur = durMap[Number(tempoMin)] || '3s';

  return `
    <svg viewBox="0 0 320 180" width="100%" height="100%" style="max-width:320px;max-height:180px;" role="img" aria-label="Ampulheta escultural marcando ${tempoMin} minutos">
      <circle cx="160" cy="90" r="72" fill="var(--superficie-2)" opacity="0.6"/>
      <rect x="108" y="18" width="104" height="12" rx="6" fill="var(--ill-argila)"/>
      <rect x="108" y="150" width="104" height="12" rx="6" fill="var(--ill-argila)"/>
      <path d="M126 44 H194 L160 84 Z" fill="var(--ill-areia)"/>
      <path d="M122 146 C128 122, 192 122, 198 146 Z" fill="var(--ill-areia)"/>
      <line
        x1="160" y1="82" x2="160" y2="136"
        stroke="var(--ill-areia)"
        stroke-width="4"
        stroke-linecap="round"
        stroke-dasharray="6 6"
        style="animation: clayBenchLoop ${cycleDur} linear infinite;"
      />
      <path
        d="M120 30 C120 66, 152 78, 154 90 C152 102, 120 114, 120 150 H200 C200 114, 168 102, 166 90 C168 78, 200 66, 200 30 Z"
        fill="none"
        stroke="var(--ill-contorno)"
        stroke-width="3"
        stroke-linejoin="round"
      />
    </svg>
  `;
}

/**
 * CENA G — Cuidado (320×180)
 */
export function renderSceneG(cuidados = ['Nenhum']) {
  const list = Array.isArray(cuidados) ? cuidados : ['Nenhum'];
  const isNone = list.includes('Nenhum') || list.length === 0;
  const hasOmbro = list.includes('Ombro');
  const hasLombar = list.includes('Lombar');
  const hasJoelho = list.includes('Joelho');
  const bodyFill = isNone ? 'var(--ill-salvia)' : 'var(--superficie-2)';

  const renderJoint = (cx, cy, active) => `
    <g transform="translate(${cx}, ${cy})">
      ${
        active
          ? `<circle cx="0" cy="0" r="14" fill="none" stroke="var(--ill-argila)" stroke-width="2" class="ill-joint-pulse"/>`
          : ''
      }
      <circle cx="0" cy="0" r="8" fill="${active ? 'var(--ill-argila)' : 'var(--salvia-suave)'}" stroke="var(--ill-contorno)" stroke-width="1.5"/>
    </g>
  `;

  return `
    <svg viewBox="0 0 320 180" width="100%" height="100%" style="max-width:320px;max-height:180px;" role="img" aria-label="Silhueta corporal abstrata destacando articulações protegidas">
      ${isNone ? `<circle cx="160" cy="90" r="76" fill="var(--salvia-suave)" opacity="0.55"/>` : ''}
      <circle cx="160" cy="28" r="15" fill="${bodyFill}" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      <rect x="132" y="48" width="56" height="64" rx="24" fill="${bodyFill}" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      <rect x="136" y="114" width="18" height="48" rx="9" fill="${bodyFill}" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      <rect x="166" y="114" width="18" height="48" rx="9" fill="${bodyFill}" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      ${renderJoint(128, 60, hasOmbro)}
      ${renderJoint(192, 60, hasOmbro)}
      ${renderJoint(144, 102, hasLombar)}
      ${renderJoint(176, 102, hasLombar)}
      ${renderJoint(145, 140, hasJoelho)}
      ${renderJoint(175, 140, hasJoelho)}
    </svg>
  `;
}

/**
 * CENA H — Nome (320×180)
 */
export function renderSceneH(nome = '') {
  const clean = String(nome || '').trim();
  const hasName = clean.length > 0;
  const chars = (hasName ? clean : 'Seu nome').split('');

  const spans = chars
    .map(
      (ch, i) =>
        `<span class="plaque-char" style="display:inline-block; animation: clayStaggerIn 260ms var(--ease-out) ${i * 40}ms both;">${
          ch === ' ' ? '&nbsp;' : ch
        }</span>`
    )
    .join('');

  return `
    <div style="position:relative; width:100%; max-width:320px; height:170px; margin:0 auto; display:flex; align-items:center; justify-content:center;">
      <svg viewBox="0 0 320 180" width="100%" height="100%" role="img" aria-label="Plaquinha de argila em relevo com seu nome">
        <rect x="44" y="48" width="240" height="92" rx="22" fill="var(--ill-sombra)" opacity="1"/>
        <rect x="40" y="42" width="240" height="92" rx="22" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <circle cx="62" cy="88" r="6" fill="var(--superficie-2)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
        <path d="M59 88 H65" stroke="var(--ill-contorno)" stroke-width="1.5"/>
        <circle cx="258" cy="88" r="6" fill="var(--superficie-2)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
        <path d="M255 88 H261" stroke="var(--ill-contorno)" stroke-width="1.5"/>
      </svg>
      <div
        id="scene-h-plaque-text"
        style="
          position:absolute;
          inset:0;
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 0 68px;
          font-family: var(--font-display);
          font-size: ${clean.length > 11 ? '28px' : '36px'};
          font-weight: 600;
          color: ${hasName ? 'var(--carvao-fixo)' : 'rgba(var(--carvao-fixo-rgb), 0.42)'};
          text-shadow: var(--placa-text-shadow);
          pointer-events:none;
          overflow:hidden;
          white-space:nowrap;
        "
      >
        ${spans}
      </div>
    </div>
  `;
}

/**
 * CENA I — Montando o plano (320×220)
 */
export function renderSceneI(progress = 0) {
  const p = Math.max(0, Math.min(1, Number(progress)));
  const handOffset = Math.sin(p * Math.PI * 2) * 8;
  const blockOpacity = 1 - p * 0.85;
  const colsOpacity = Math.min(1, p * 1.25);

  return `
    <svg viewBox="0 0 320 220" width="100%" height="100%" style="max-width:320px;max-height:220px;" role="img" aria-label="Mãos abstratas em terracota moldando sua semana de treinos">
      <path d="M54 ${60 + handOffset} C26 86, 26 134, 54 160" fill="none" stroke="var(--ill-argila)" stroke-width="14" stroke-linecap="round"/>
      <path d="M266 ${60 - handOffset} C294 86, 294 134, 266 160" fill="none" stroke="var(--ill-argila)" stroke-width="14" stroke-linecap="round"/>
      <rect
        x="${96 - p * 26}"
        y="58"
        width="${128 + p * 52}"
        height="104"
        rx="${28 - p * 16}"
        fill="var(--ill-areia)"
        opacity="${blockOpacity.toFixed(2)}"
      />
      <g opacity="${colsOpacity.toFixed(2)}">
        ${[0, 1, 2, 3, 4, 5, 6]
          .map((c) => {
            const x = 68 + c * 27;
            const h = c % 2 === 0 ? 88 : 72;
            const y = 110 - h / 2;
            const colColor = c === 1 || c === 4 ? 'var(--ill-argila)' : c === 2 || c === 5 ? 'var(--ill-salvia)' : 'var(--superficie-2)';
            return `<rect x="${x}" y="${y}" width="21" height="${h}" rx="8" fill="${colColor}" stroke="var(--ill-contorno)" stroke-width="1.5"/>`;
          })
          .join('')}
      </g>
    </svg>
  `;
}

/**
 * A3 — CENA J GRANDE DO CARTÃO "TREINO DE HOJE" (viewBox 320×168, preserveAspectRatio="xMidYMid meet")
 * Versão grande da MESMA cena do grupo usada na Biblioteca, escolhida por `treino.grupoPrincipal`:
 * Peito, Costas, Ombros, Braços, Pernas, Core, Corrida, Mobilidade.
 * Cada versão grande tem 1 detalhe extra que a miniatura não tem + loop sutil de 6s,
 * e treinos de grupo misto exibem um selo menor do segundo grupo no canto.
 */
export function renderSceneJ(grupoOrTipo = 'Peito', customSize = null, grupoSecundario = null) {
  const raw = String(grupoOrTipo || 'Peito').trim();
  const norm = raw.toLowerCase();

  let grupo = 'Peito';
  if (norm === 'ombros') grupo = 'Ombros';
  else if (norm === 'costas') grupo = 'Costas';
  else if (norm === 'pernas') grupo = 'Pernas';
  else if (norm === 'braços' || norm === 'bracos') grupo = 'Braços';
  else if (norm === 'core') grupo = 'Core';
  else if (norm === 'corrida') grupo = 'Corrida';
  else if (norm === 'mobilidade' || norm === 'descanso') grupo = 'Mobilidade';
  else grupo = 'Peito';

  const sizeAttrs = customSize
    ? `width="${customSize}" height="${customSize}" preserveAspectRatio="xMidYMid meet"`
    : `width="100%" height="168" preserveAspectRatio="xMidYMid meet"`;

  // Selo menor do segundo grupo no canto superior direito em treinos mistos (só no cartão grande)
  const secondaryBadgeSvg =
    !customSize && grupoSecundario
      ? `
        <g transform="translate(216, 14)" aria-label="Segundo grupo: ${grupoSecundario}">
          <rect x="0" y="0" width="90" height="26" rx="13" fill="var(--superficie)" stroke="var(--ill-contorno)" stroke-width="1.5" opacity="0.96"/>
          <circle cx="14" cy="13" r="4" fill="var(--ill-salvia)"/>
          <text x="24" y="17" font-family="DM Sans, sans-serif" font-size="11" font-weight="600" fill="var(--tinta)">+ ${grupoSecundario}</text>
        </g>
      `
      : '';

  // 1. OMBROS: halteres em elevação lateral formando um "T" aberto com arcos tracejados
  // + detalhe extra da versão grande: silhueta de argila sálvia entre os halteres e sol terracota pequeno ao fundo + loop 6s
  if (grupo === 'Ombros') {
    return `
      <svg viewBox="0 0 320 168" ${sizeAttrs} data-scene-group="Ombros" role="img" aria-label="Cena de Ombros: halteres em elevação lateral em T aberto com arcos tracejados e silhueta sálvia">
        <ellipse cx="160" cy="92" rx="126" ry="64" fill="var(--grupo-ombros-bg)" opacity="0.78"/>
        <!-- Detalhe extra versão grande: sol terracota pequeno ao fundo -->
        <circle cx="212" cy="36" r="16" fill="var(--ill-argila)" opacity="0.88"/>
        <!-- Arcos tracejados amplos indicando elevação lateral -->
        <path d="M46 132 A114 114 0 0 1 274 132" fill="none" stroke="var(--ill-traco)" stroke-width="2" stroke-dasharray="6 6" opacity="0.58"/>
        <!-- Detalhe extra versão grande: silhueta escultural de argila sálvia entre os halteres -->
        <circle cx="160" cy="48" r="16" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <path d="M126 146 C130 82, 190 82, 194 146 Z" fill="var(--ill-salvia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <!-- Braço e halter esquerdo em T aberto (loop 6s) -->
        <g class="lib-anim-ombros-left">
          <path d="M132 82 L64 70" stroke="var(--ill-areia)" stroke-width="12" stroke-linecap="round"/>
          <rect x="38" y="52" width="14" height="34" rx="5" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
          <rect x="62" y="52" width="14" height="34" rx="5" fill="var(--terracota-profundo)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
          <rect x="48" y="65" width="18" height="8" rx="3" fill="var(--ill-traco)"/>
        </g>
        <!-- Braço e halter direito em T aberto (loop 6s) -->
        <g class="lib-anim-ombros-right">
          <path d="M188 82 L256 70" stroke="var(--ill-areia)" stroke-width="12" stroke-linecap="round"/>
          <rect x="244" y="52" width="14" height="34" rx="5" fill="var(--terracota-profundo)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
          <rect x="268" y="52" width="14" height="34" rx="5" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
          <rect x="254" y="65" width="18" height="8" rx="3" fill="var(--ill-traco)"/>
        </g>
        ${secondaryBadgeSvg}
      </svg>
    `;
  }

  // 2. COSTAS: polia alta em carvão, barra curva e cabo vertical + detalhe extra: coluna dorsal em V sálvia e banco de apoio em areia
  if (grupo === 'Costas') {
    return `
      <svg viewBox="0 0 320 168" ${sizeAttrs} data-scene-group="Costas" role="img" aria-label="Cena de Costas: puxada alta na polia sobre escudo dorsal em V sálvia">
        <ellipse cx="160" cy="90" rx="124" ry="64" fill="var(--salvia-suave)" opacity="0.72"/>
        <!-- Forma em V sálvia atrás + detalhe extra de escápulas esculpidas -->
        <polygon points="78,28 242,28 188,138 132,138" fill="var(--ill-salvia)" opacity="0.62"/>
        <circle cx="136" cy="88" r="14" fill="var(--ill-areia)" opacity="0.75"/>
        <circle cx="184" cy="88" r="14" fill="var(--ill-areia)" opacity="0.75"/>
        <rect x="136" y="10" width="48" height="12" rx="6" fill="var(--ill-traco)"/>
        <line x1="160" y1="22" x2="160" y2="74" stroke="var(--ill-traco)" stroke-width="3.5"/>
        <g class="lib-anim-costas-cable">
          <path d="M72 64 Q160 44 248 64" fill="none" stroke="var(--ill-argila)" stroke-width="11" stroke-linecap="round"/>
          <circle cx="72" cy="64" r="7" fill="var(--ill-traco)"/>
          <circle cx="248" cy="64" r="7" fill="var(--ill-traco)"/>
        </g>
        <rect x="104" y="136" width="112" height="18" rx="9" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="2"/>
        ${secondaryBadgeSvg}
      </svg>
    `;
  }

  // 3. PERNAS: barra de agachamento nas costas de silhueta de argila + detalhe extra: plataforma de apoio e sol sálvia ao fundo
  if (grupo === 'Pernas') {
    return `
      <svg viewBox="0 0 320 168" ${sizeAttrs} data-scene-group="Pernas" role="img" aria-label="Cena de Pernas: barra de agachamento sobre silhueta de argila">
        <ellipse cx="160" cy="90" rx="124" ry="64" fill="var(--superficie-2)" opacity="0.82"/>
        <!-- Detalhe extra versão grande: arco solar sálvia ao fundo -->
        <circle cx="104" cy="40" r="18" fill="var(--ill-salvia)" opacity="0.55"/>
        <rect x="48" y="138" width="224" height="14" rx="7" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <g class="lib-anim-pernas-squat">
          <circle cx="160" cy="34" r="13" fill="var(--ill-salvia)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
          <path d="M114 136 L132 92 L160 62 L188 92 L206 136" fill="none" stroke="var(--ill-salvia)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="62" y="48" width="196" height="8" rx="4" fill="var(--ill-traco)"/>
          <rect x="76" y="26" width="18" height="50" rx="6" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
          <rect x="226" y="26" width="18" height="50" rx="6" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
        </g>
        ${secondaryBadgeSvg}
      </svg>
    `;
  }

  // 4. BRAÇOS: haltere de rosca e corda de polia de tríceps + detalhe extra: suporte escultural em areia
  if (grupo === 'Braços') {
    return `
      <svg viewBox="0 0 320 168" ${sizeAttrs} data-scene-group="Braços" role="img" aria-label="Cena de Braços: rosca com halter e polia de tríceps">
        <ellipse cx="160" cy="90" rx="124" ry="64" fill="var(--grupo-bracos-bg)" opacity="0.65"/>
        <circle cx="122" cy="86" r="54" fill="var(--salvia-suave)" opacity="0.7"/>
        <!-- Detalhe extra versão grande: banco preacher em areia -->
        <path d="M64 142 L106 94 H146 L124 142 Z" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <line x1="232" y1="14" x2="232" y2="66" stroke="var(--ill-traco)" stroke-width="3"/>
        <path d="M232 66 L212 112 M232 66 L252 112" stroke="var(--ill-areia)" stroke-width="7" stroke-linecap="round"/>
        <circle cx="212" cy="114" r="7" fill="var(--ill-traco)"/>
        <circle cx="252" cy="114" r="7" fill="var(--ill-traco)"/>
        <path d="M98 42 L98 98" stroke="var(--ill-salvia)" stroke-width="22" stroke-linecap="round"/>
        <g class="lib-anim-bracos-curl" style="transform-origin: 98px 98px;">
          <path d="M98 98 L156 68" stroke="var(--ill-argila)" stroke-width="18" stroke-linecap="round"/>
          <rect x="144" y="44" width="12" height="36" rx="4" fill="var(--ill-traco)"/>
          <rect x="166" y="44" width="12" height="36" rx="4" fill="var(--ill-traco)"/>
          <rect x="150" y="58" width="22" height="8" fill="var(--ill-areia)"/>
        </g>
        ${secondaryBadgeSvg}
      </svg>
    `;
  }

  // 5. CORE: prancha horizontal em sálvia sobre tapete em areia com ondas concêntricas terracota + detalhe extra: sol de equilíbrio
  if (grupo === 'Core') {
    return `
      <svg viewBox="0 0 320 168" ${sizeAttrs} data-scene-group="Core" role="img" aria-label="Cena de Core: prancha abdominal com ondas concêntricas de estabilidade">
        <ellipse cx="160" cy="90" rx="124" ry="64" fill="var(--grupo-core-bg)" opacity="0.78"/>
        <circle cx="84" cy="38" r="14" fill="var(--ill-areia)"/>
        <rect x="52" y="128" width="216" height="14" rx="7" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <circle class="lib-anim-core-wave-1" cx="160" cy="88" r="24" fill="none" stroke="var(--ill-argila)" stroke-width="3"/>
        <circle class="lib-anim-core-wave-2" cx="160" cy="88" r="42" fill="none" stroke="var(--ill-argila)" stroke-width="2" stroke-dasharray="5 5"/>
        <path d="M76 114 L222 82 L228 124" fill="none" stroke="var(--ill-salvia)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="234" cy="68" r="14" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        ${secondaryBadgeSvg}
      </svg>
    `;
  }

  // 6. CORRIDA: tênis sálvia em movimento com 3 riscos de velocidade terracota e pista curva em areia + colina ao fundo
  if (grupo === 'Corrida') {
    return `
      <svg viewBox="0 0 320 168" ${sizeAttrs} data-scene-group="Corrida" role="img" aria-label="Cena de Corrida: tênis sálvia em velocidade sobre pista em areia">
        <ellipse cx="160" cy="88" rx="126" ry="64" fill="var(--salvia-suave)" opacity="0.68"/>
        <circle cx="242" cy="40" r="20" fill="var(--ill-areia)"/>
        <path d="M36 138 Q144 92 284 128" fill="none" stroke="var(--ill-areia)" stroke-width="16" stroke-linecap="round"/>
        <g class="lib-anim-corrida-streaks">
          <line x1="48" y1="62" x2="104" y2="62" stroke="var(--ill-argila)" stroke-width="5" stroke-linecap="round"/>
          <line x1="36" y1="80" x2="94" y2="80" stroke="var(--terracota-profundo)" stroke-width="5" stroke-linecap="round"/>
          <line x1="56" y1="98" x2="108" y2="98" stroke="var(--ill-argila)" stroke-width="5" stroke-linecap="round"/>
        </g>
        <g transform="translate(122, 46) rotate(-8) scale(1.28)">
          <path d="M8 38 C6 24, 14 10, 26 10 C38 10, 44 20, 58 22 L82 30 C88 32, 88 38, 84 42 L8 42 Z" fill="var(--ill-salvia)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
          <rect x="4" y="40" width="82" height="10" rx="5" fill="var(--ill-creme)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
          <path d="M46 18 L52 12 M56 21 L62 15" stroke="var(--ill-contorno)" stroke-width="2" stroke-linecap="round"/>
        </g>
        ${secondaryBadgeSvg}
      </svg>
    `;
  }

  // 7. MOBILIDADE: silhueta em alongamento sobre meia-lua sálvia e sol terracota + detalhe extra: arco respiratório
  if (grupo === 'Mobilidade') {
    return `
      <svg viewBox="0 0 320 168" ${sizeAttrs} data-scene-group="Mobilidade" role="img" aria-label="Cena de Mobilidade: silhueta em alongamento sobre meia-lua sálvia">
        <ellipse cx="160" cy="88" rx="124" ry="64" fill="var(--salvia-suave)" opacity="0.65"/>
        <circle cx="232" cy="42" r="18" fill="var(--ill-argila)"/>
        <path d="M64 138 C98 92, 222 92, 256 138 Z" fill="var(--ill-salvia)" opacity="0.72"/>
        <g class="lib-anim-mob-sway" style="transform-origin: 160px 132px;">
          <circle cx="148" cy="72" r="13" fill="var(--ill-traco)"/>
          <path d="M112 132 Q152 54 214 40" fill="none" stroke="var(--ill-areia)" stroke-width="14" stroke-linecap="round"/>
          <path d="M132 132 Q160 82 204 72" fill="none" stroke="var(--ill-argila)" stroke-width="9" stroke-linecap="round"/>
        </g>
        ${secondaryBadgeSvg}
      </svg>
    `;
  }

  // 8. PEITO (padrão para grupoPrincipal === 'Peito'): barra de supino sobre banco vista lateral,
  // forma orgânica sálvia atrás que respira (6s) + detalhe extra: suporte de anilhas escultural
  return `
    <svg viewBox="0 0 320 168" ${sizeAttrs} data-scene-group="Peito" role="img" aria-label="Cena de Peito: banco de supino, barra e discos em terracota sobre forma sálvia">
      <path
        class="lib-anim-peito-breath"
        d="M54 134 C38 82, 82 26, 164 26 C246 26, 282 78, 264 132 C244 156, 72 156, 54 134 Z"
        fill="var(--ill-salvia)"
        opacity="0.48"
      />
      <rect x="108" y="54" width="7" height="84" rx="3.5" fill="var(--ill-traco)"/>
      <rect x="205" y="54" width="7" height="84" rx="3.5" fill="var(--ill-traco)"/>
      <rect x="88" y="114" width="144" height="20" rx="10" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="2"/>
      <!-- Detalhe extra versão grande: pilha de discos em argila à esquerda -->
      <rect x="46" y="136" width="38" height="10" rx="5" fill="var(--ill-salvia)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
      <rect x="50" y="124" width="30" height="10" rx="5" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
      <g class="lib-anim-peito-bar">
        <rect x="54" y="68" width="212" height="8" rx="4" fill="var(--ill-traco)"/>
        <rect x="68" y="44" width="22" height="56" rx="7" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
        <rect x="230" y="44" width="22" height="56" rx="7" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
        <rect x="52" y="52" width="14" height="40" rx="5" fill="var(--terracota-profundo)"/>
        <rect x="254" y="52" width="14" height="40" rx="5" fill="var(--terracota-profundo)"/>
      </g>
      ${secondaryBadgeSvg}
    </svg>
  `;
}

/**
 * CENA K — Rostos do check-in (44px)
 */
export function renderCheckinFaceSvg(level = 4, size = 44) {
  const faces = {
    1: `
      <circle cx="22" cy="22" r="20" fill="var(--terracota-suave)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      <path d="M12.5 18c1.5 1.6 3.5 1.6 5 0M26.5 18c1.5 1.6 3.5 1.6 5 0" fill="none" stroke="var(--ill-traco)" stroke-width="1.75" stroke-linecap="round"/>
      <path d="M15.5 29.5c2-2.5 11-2.5 13 0" fill="none" stroke="var(--ill-traco)" stroke-width="1.75" stroke-linecap="round"/>
    `,
    2: `
      <circle cx="22" cy="22" r="20" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      <circle cx="15.5" cy="18.5" r="1.7" fill="var(--ill-traco)"/>
      <circle cx="28.5" cy="18.5" r="1.7" fill="var(--ill-traco)"/>
      <path d="M16 28.5c2-1.4 10-1.4 12 0" fill="none" stroke="var(--ill-traco)" stroke-width="1.75" stroke-linecap="round"/>
    `,
    3: `
      <circle cx="22" cy="22" r="20" fill="var(--superficie-2)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      <circle cx="15.5" cy="18.5" r="1.7" fill="var(--ill-traco)"/>
      <circle cx="28.5" cy="18.5" r="1.7" fill="var(--ill-traco)"/>
      <path d="M16 27.5h12" fill="none" stroke="var(--ill-traco)" stroke-width="1.75" stroke-linecap="round"/>
    `,
    4: `
      <circle cx="22" cy="22" r="20" fill="var(--salvia-suave)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      <circle cx="15.5" cy="18" r="1.8" fill="var(--ill-traco)"/>
      <circle cx="28.5" cy="18" r="1.8" fill="var(--ill-traco)"/>
      <path d="M15.5 26c2.2 3 10.8 3 13 0" fill="none" stroke="var(--ill-traco)" stroke-width="1.75" stroke-linecap="round"/>
    `,
    5: `
      <circle cx="22" cy="22" r="20" fill="var(--ill-salvia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      <circle cx="15.5" cy="17.5" r="1.8" fill="var(--ill-traco)"/>
      <circle cx="28.5" cy="17.5" r="1.8" fill="var(--ill-traco)"/>
      <path d="M14 25c2.6 5 13.4 5 16 0Z" fill="var(--ill-creme)" stroke="var(--ill-contorno)" stroke-width="1.75" stroke-linejoin="round"/>
    `
  };

  return `
    <svg viewBox="0 0 44 44" width="${size}" height="${size}" aria-hidden="true">
      ${faces[level] || faces[4]}
    </svg>
  `;
}

/**
 * CENA L — Estado vazio de busca na Biblioteca
 */
export function renderSceneL() {
  return `
    <svg viewBox="0 0 220 160" width="200" height="145" role="img" aria-label="Lupa de argila examinando um halter">
      <circle cx="102" cy="74" r="46" fill="var(--superficie-2)" stroke="var(--ill-contorno)" stroke-width="2.5"/>
      <line x1="136" y1="108" x2="174" y2="142" stroke="var(--ill-argila)" stroke-width="12" stroke-linecap="round"/>
      <rect x="78" y="62" width="10" height="24" rx="4" fill="var(--ill-argila)"/>
      <rect x="116" y="62" width="10" height="24" rx="4" fill="var(--ill-argila)"/>
      <rect x="86" y="71" width="32" height="6" rx="3" fill="var(--ill-traco)"/>
    </svg>
  `;
}

/**
 * 3.1 & A4 — OITO CENAS EXCLUSIVAS POR GRUPO MUSCULAR NA BIBLIOTECA E MINIATURA 56×56 NA PRÉVIA
 * Diferencia todos os subtipos de Corrida e todas as 6 regiões de Mobilidade,
 * além de cada variação de `equip` nos grupos de força.
 */
export function renderLibraryGroupScene(itemOrGroup = 'Peito', { isThumb = false } = {}) {
  const grupo = typeof itemOrGroup === 'string' ? itemOrGroup : itemOrGroup?.grupo || 'Peito';
  const equip = typeof itemOrGroup === 'object' ? itemOrGroup?.equip || 'barra' : 'barra';
  const subtipo = typeof itemOrGroup === 'object' ? itemOrGroup?.subtipo || equip : equip;
  const regiao = typeof itemOrGroup === 'object' ? itemOrGroup?.regiao || equip : equip;

  const svgAttrs = isThumb
    ? `viewBox="20 6 120 100" width="56" height="56" preserveAspectRatio="xMidYMid slice"`
    : `viewBox="0 0 160 112" width="100%" height="112" preserveAspectRatio="xMidYMid slice"`;

  // 1. PEITO (7 variações distintas por equip)
  if (grupo === 'Peito') {
    let equipForeground = '';
    if (equip === 'halteres') {
      equipForeground = `
        <g class="lib-anim-peito-bar">
          <rect x="44" y="34" width="28" height="10" rx="4" fill="var(--ill-traco)"/>
          <rect x="40" y="28" width="10" height="22" rx="4" fill="var(--ill-argila)"/>
          <rect x="64" y="28" width="10" height="22" rx="4" fill="var(--ill-argila)"/>
          <rect x="92" y="34" width="28" height="10" rx="4" fill="var(--ill-traco)"/>
          <rect x="88" y="28" width="10" height="22" rx="4" fill="var(--ill-argila)"/>
          <rect x="112" y="28" width="10" height="22" rx="4" fill="var(--ill-argila)"/>
        </g>
      `;
    } else if (equip === 'banco-arco') {
      equipForeground = `
        <path d="M32 62 Q80 14 128 62" fill="none" stroke="var(--ill-traco)" stroke-width="2" stroke-dasharray="4 4"/>
        <g class="lib-anim-peito-bar">
          <circle cx="38" cy="48" r="11" fill="var(--ill-argila)"/>
          <circle cx="122" cy="48" r="11" fill="var(--ill-argila)"/>
        </g>
      `;
    } else if (equip === 'corpo') {
      equipForeground = `
        <g class="lib-anim-peito-bar">
          <path d="M28 76 L116 48" stroke="var(--ill-argila)" stroke-width="14" stroke-linecap="round"/>
          <circle cx="126" cy="44" r="10" fill="var(--ill-areia)"/>
          <line x1="114" y1="54" x2="114" y2="86" stroke="var(--ill-traco)" stroke-width="5" stroke-linecap="round"/>
        </g>
      `;
    } else if (equip === 'polia') {
      equipForeground = `
        <line x1="20" y1="12" x2="66" y2="54" stroke="var(--ill-traco)" stroke-width="2.5"/>
        <line x1="140" y1="12" x2="94" y2="54" stroke="var(--ill-traco)" stroke-width="2.5"/>
        <g class="lib-anim-peito-bar">
          <circle cx="66" cy="54" r="9" fill="var(--ill-argila)"/>
          <circle cx="94" cy="54" r="9" fill="var(--ill-argila)"/>
        </g>
      `;
    } else if (equip === 'maquina') {
      equipForeground = `
        <rect x="26" y="20" width="14" height="74" rx="6" fill="var(--ill-traco)"/>
        <g class="lib-anim-peito-bar">
          <path d="M40 36 H112" stroke="var(--ill-argila)" stroke-width="10" stroke-linecap="round"/>
          <circle cx="116" cy="36" r="8" fill="var(--ill-areia)"/>
        </g>
      `;
    } else if (equip === 'paralelas') {
      equipForeground = `
        <path d="M36 96 V46 H64 M124 96 V46 H96" fill="none" stroke="var(--ill-traco)" stroke-width="4" stroke-linecap="round"/>
        <g class="lib-anim-peito-bar">
          <rect x="64" y="30" width="32" height="44" rx="14" fill="var(--ill-argila)"/>
        </g>
      `;
    } else {
      equipForeground = `
        <g class="lib-anim-peito-bar">
          <rect x="22" y="42" width="116" height="6" rx="3" fill="var(--ill-traco)"/>
          <rect x="30" y="24" width="14" height="42" rx="5" fill="var(--ill-argila)"/>
          <rect x="116" y="24" width="14" height="42" rx="5" fill="var(--ill-argila)"/>
          <rect x="20" y="30" width="9" height="30" rx="4" fill="var(--terracota-profundo)"/>
          <rect x="131" y="30" width="9" height="30" rx="4" fill="var(--terracota-profundo)"/>
        </g>
      `;
    }

    return `
      <svg ${svgAttrs} aria-hidden="true">
        <path
          class="lib-anim-peito-breath"
          d="M24 88 C14 54, 42 18, 84 18 C126 18, 148 52, 136 86 C124 106, 34 106, 24 88 Z"
          fill="var(--ill-salvia)"
          opacity="0.52"
        />
        <rect x="34" y="78" width="92" height="14" rx="7" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
        <rect x="48" y="92" width="8" height="16" rx="3" fill="var(--ill-traco)"/>
        <rect x="104" y="92" width="8" height="16" rx="3" fill="var(--ill-traco)"/>
        ${equipForeground}
      </svg>
    `;
  }

  // 2. COSTAS (7 variações distintas por equip)
  if (grupo === 'Costas') {
    let equipElement = '';
    if (equip === 'barra') {
      equipElement = `
        <g class="lib-anim-costas-cable">
          <rect x="28" y="62" width="104" height="6" rx="3" fill="var(--ill-traco)"/>
          <rect x="36" y="46" width="14" height="38" rx="5" fill="var(--ill-argila)"/>
          <rect x="110" y="46" width="14" height="38" rx="5" fill="var(--ill-argila)"/>
        </g>
      `;
    } else if (equip === 'halteres') {
      equipElement = `
        <rect x="34" y="76" width="52" height="12" rx="6" fill="var(--ill-areia)"/>
        <g class="lib-anim-costas-cable">
          <rect x="94" y="48" width="12" height="28" rx="4" fill="var(--ill-argila)"/>
          <rect x="86" y="58" width="28" height="8" rx="3" fill="var(--ill-traco)"/>
        </g>
      `;
    } else if (equip === 'cabo-baixo') {
      equipElement = `
        <line x1="18" y1="68" x2="96" y2="68" stroke="var(--ill-traco)" stroke-width="3"/>
        <g class="lib-anim-costas-cable">
          <polygon points="96,54 114,68 96,82" fill="var(--ill-argila)"/>
        </g>
      `;
    } else if (equip === 'barra-fixa') {
      equipElement = `
        <line x1="18" y1="22" x2="142" y2="22" stroke="var(--ill-traco)" stroke-width="5" stroke-linecap="round"/>
        <g class="lib-anim-costas-cable">
          <circle cx="80" cy="46" r="11" fill="var(--ill-areia)"/>
          <path d="M56 22 L68 58 H92 L104 22" fill="none" stroke="var(--ill-argila)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
      `;
    } else if (equip === 'polia-reta') {
      equipElement = `
        <line x1="80" y1="10" x2="80" y2="62" stroke="var(--ill-traco)" stroke-width="2.5"/>
        <g class="lib-anim-costas-cable">
          <rect x="52" y="58" width="56" height="8" rx="4" fill="var(--ill-argila)"/>
          <path d="M56 24 L80 58 L104 24" fill="none" stroke="var(--ill-areia)" stroke-width="4" stroke-linecap="round"/>
        </g>
      `;
    } else if (equip === 'corpo') {
      equipElement = `
        <line x1="26" y1="36" x2="134" y2="36" stroke="var(--ill-traco)" stroke-width="4" stroke-linecap="round"/>
        <g class="lib-anim-costas-cable">
          <path d="M44 86 L108 46" stroke="var(--ill-argila)" stroke-width="12" stroke-linecap="round"/>
        </g>
      `;
    } else {
      equipElement = `
        <rect x="64" y="6" width="32" height="10" rx="5" fill="var(--ill-traco)"/>
        <line x1="80" y1="16" x2="80" y2="54" stroke="var(--ill-traco)" stroke-width="2.5"/>
        <g class="lib-anim-costas-cable">
          <path d="M30 48 Q80 34 130 48" fill="none" stroke="var(--ill-argila)" stroke-width="8" stroke-linecap="round"/>
          <circle cx="30" cy="48" r="5" fill="var(--ill-traco)"/>
          <circle cx="130" cy="48" r="5" fill="var(--ill-traco)"/>
        </g>
      `;
    }

    return `
      <svg ${svgAttrs} aria-hidden="true">
        <polygon points="26,18 134,18 96,98 64,98" fill="var(--ill-salvia)" opacity="0.55"/>
        <path d="M44 98 H116" stroke="var(--ill-areia)" stroke-width="8" stroke-linecap="round"/>
        ${equipElement}
      </svg>
    `;
  }

  // 3. OMBROS (6 variações distintas por equip)
  if (grupo === 'Ombros') {
    const isHigh = equip === 'halteres-alto';
    const isRot = equip === 'rotacao';
    const isCable = equip === 'polia';
    const isIncline = equip === 'inclinado';
    const isFront = equip === 'frontal';

    return `
      <svg ${svgAttrs} aria-hidden="true">
        <path d="M24 84 A56 56 0 0 1 136 84" fill="none" stroke="var(--ill-traco)" stroke-width="1.75" stroke-dasharray="${isRot ? '3 4' : '5 5'}" opacity="0.55"/>
        <circle cx="80" cy="36" r="${isFront ? 14 : 12}" fill="${isRot ? 'var(--ill-argila)' : 'var(--ill-areia)'}"/>
        <path d="M58 96 C60 58, 100 58, 102 96 Z" fill="var(--ill-salvia)"/>

        <g class="lib-anim-ombros-left" transform="translate(0, ${isHigh ? -16 : isRot ? -10 : 0})">
          ${
            isCable
              ? `<line x1="16" y1="54" x2="58" y2="48" stroke="var(--ill-traco)" stroke-width="3"/>`
              : `<path d="M62 56 L30 ${isIncline ? 68 : 48}" stroke="var(--ill-areia)" stroke-width="8" stroke-linecap="round"/>`
          }
          <rect x="16" y="36" width="10" height="22" rx="4" fill="var(--ill-argila)"/>
          <rect x="32" y="36" width="10" height="22" rx="4" fill="var(--terracota-profundo)"/>
          <rect x="22" y="44" width="14" height="6" fill="var(--ill-traco)"/>
        </g>

        <g class="lib-anim-ombros-right" transform="translate(0, ${isFront ? -8 : isHigh ? -16 : isRot ? -10 : 0})">
          ${
            isCable
              ? `<line x1="144" y1="54" x2="102" y2="48" stroke="var(--ill-traco)" stroke-width="3"/>`
              : `<path d="M98 56 L130 ${isIncline ? 68 : 48}" stroke="var(--ill-areia)" stroke-width="8" stroke-linecap="round"/>`
          }
          <rect x="118" y="36" width="10" height="22" rx="4" fill="var(--terracota-profundo)"/>
          <rect x="134" y="36" width="10" height="22" rx="4" fill="var(--ill-argila)"/>
          <rect x="124" y="44" width="14" height="6" fill="var(--ill-traco)"/>
        </g>
      </svg>
    `;
  }

  // 4. BRAÇOS (6 variações distintas por equip)
  if (grupo === 'Braços') {
    const showBar = equip === 'barra';
    const showBenchTesta = equip === 'banco-testa';
    const showCorpo = equip === 'corpo';
    const showHammer = equip === 'martelo';
    const showPolia = equip === 'polia';

    return `
      <svg ${svgAttrs} aria-hidden="true">
        <circle cx="${showPolia ? 72 : 64}" cy="58" r="${showCorpo ? 36 : 42}" fill="var(--salvia-suave)" opacity="0.65"/>
        <line x1="126" y1="8" x2="126" y2="${showPolia ? 52 : 44}" stroke="var(--ill-traco)" stroke-width="2.5"/>
        <path d="M126 44 L114 74 M126 44 L138 74" stroke="var(--ill-areia)" stroke-width="5" stroke-linecap="round"/>
        <circle cx="114" cy="76" r="5" fill="var(--ill-traco)"/>
        <circle cx="138" cy="76" r="5" fill="var(--ill-traco)"/>

        ${showBenchTesta ? `<rect x="18" y="84" width="84" height="12" rx="6" fill="var(--ill-areia)"/>` : ''}
        ${showCorpo ? `<rect x="20" y="72" width="48" height="24" rx="8" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.5"/>` : ''}

        <path d="M44 26 L44 68" stroke="var(--ill-salvia)" stroke-width="16" stroke-linecap="round"/>
        <g class="lib-anim-bracos-curl" style="transform-origin: 44px 68px;">
          <path d="M44 68 L84 ${showPolia ? 56 : 48}" stroke="var(--ill-argila)" stroke-width="14" stroke-linecap="round"/>
          ${
            showBar
              ? `<rect x="74" y="30" width="14" height="34" rx="5" fill="var(--ill-traco)"/>`
              : showHammer
              ? `<rect x="78" y="28" width="16" height="32" rx="6" fill="var(--terracota-profundo)" stroke="var(--ill-contorno)" stroke-width="1.5"/>`
              : `<g>
                   <rect x="72" y="32" width="8" height="24" rx="3" fill="var(--ill-traco)"/>
                   <rect x="88" y="32" width="8" height="24" rx="3" fill="var(--ill-traco)"/>
                   <rect x="76" y="41" width="16" height="6" fill="var(--ill-areia)"/>
                 </g>`
          }
        </g>
      </svg>
    `;
  }

  // 5. PERNAS (7 variações distintas por equip)
  if (grupo === 'Pernas') {
    let customLoad = '';
    if (equip === 'halteres') {
      customLoad = `
        <rect x="68" y="42" width="24" height="18" rx="6" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
      `;
    } else if (equip === 'halteres-duplo') {
      customLoad = `
        <rect x="46" y="54" width="14" height="24" rx="4" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
        <rect x="100" y="54" width="14" height="24" rx="4" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
      `;
    } else if (equip === 'maquina') {
      customLoad = `
        <line x1="28" y1="88" x2="124" y2="26" stroke="var(--ill-traco)" stroke-width="4" stroke-linecap="round"/>
        <rect x="92" y="24" width="28" height="18" rx="5" fill="var(--ill-argila)" transform="rotate(-32 106 33)"/>
      `;
    } else if (equip === 'banco-apoio') {
      customLoad = `<rect x="108" y="68" width="32" height="22" rx="6" fill="var(--ill-salvia)" stroke="var(--ill-contorno)" stroke-width="1.5"/>`;
    } else if (equip === 'ponte-quadril') {
      customLoad = `<path d="M34 84 Q80 42 126 84" fill="none" stroke="var(--ill-argila)" stroke-width="14" stroke-linecap="round"/>`;
    } else if (equip === 'degrau') {
      customLoad = `<rect x="48" y="82" width="64" height="12" rx="4" fill="var(--ill-argila)"/>`;
    } else {
      customLoad = `
        <rect x="26" y="32" width="108" height="6" rx="3" fill="var(--ill-traco)"/>
        <rect x="34" y="18" width="12" height="34" rx="4" fill="var(--ill-argila)"/>
        <rect x="114" y="18" width="12" height="34" rx="4" fill="var(--ill-argila)"/>
      `;
    }

    return `
      <svg ${svgAttrs} aria-hidden="true">
        <rect x="14" y="92" width="132" height="12" rx="6" fill="var(--ill-areia)"/>
        <g class="lib-anim-pernas-squat">
          <circle cx="80" cy="22" r="10" fill="var(--ill-salvia)"/>
          <path d="M54 90 L64 62 L80 42 L96 62 L106 90" fill="none" stroke="var(--ill-salvia)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
          ${customLoad}
        </g>
      </svg>
    `;
  }

  // 6. CORE (6 variações distintas por equip)
  if (grupo === 'Core') {
    const isLegsUp = equip === 'solo-pernas';
    const isCross = equip === 'solo-cruzado';
    const isPolia = equip === 'polia';
    const isAntiRot = equip === 'cabo-antirotacao';
    const isSide = equip === 'lateral';

    return `
      <svg ${svgAttrs} aria-hidden="true">
        <rect x="16" y="84" width="128" height="10" rx="5" fill="var(--ill-areia)"/>
        <circle class="lib-anim-core-wave-1" cx="80" cy="58" r="${isPolia ? 18 : 16}" fill="none" stroke="var(--ill-argila)" stroke-width="2.5"/>
        <circle class="lib-anim-core-wave-2" cx="80" cy="58" r="28" fill="none" stroke="var(--ill-argila)" stroke-width="1.75" stroke-dasharray="4 4"/>

        ${
          isLegsUp
            ? `<path d="M34 76 H84 L106 30" fill="none" stroke="var(--ill-salvia)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`
            : isCross
            ? `<path d="M32 74 H92 L124 42 M54 74 L34 38" fill="none" stroke="var(--ill-salvia)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`
            : isPolia
            ? `<path d="M80 12 V46 M62 82 Q68 50 96 46" fill="none" stroke="var(--ill-traco)" stroke-width="4" stroke-linecap="round"/>
               <circle cx="80" cy="58" r="13" fill="var(--ill-salvia)"/>`
            : isAntiRot
            ? `<path d="M22 54 H78 M78 32 V82" fill="none" stroke="var(--ill-traco)" stroke-width="4" stroke-linecap="round"/>
               <rect x="66" y="44" width="28" height="28" rx="10" fill="var(--ill-salvia)"/>`
            : `<path d="M28 74 L122 ${isSide ? '44' : '54'} L126 82" fill="none" stroke="var(--ill-salvia)" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`
        }
        <circle cx="${isLegsUp || isCross ? 34 : 128}" cy="${isLegsUp ? 68 : isSide ? 36 : 44}" r="10" fill="var(--ill-argila)"/>
      </svg>
    `;
  }

  // 7. A4 — CORRIDA (8 variações únicas mantendo o tênis sálvia como assinatura)
  if (grupo === 'Corrida') {
    const shoeBase = (tx = 58, ty = 34, rot = -8, sc = 1) => `
      <g transform="translate(${tx}, ${ty}) rotate(${rot}) scale(${sc})">
        <path d="M8 38 C6 24, 14 10, 26 10 C38 10, 44 20, 58 22 L82 30 C88 32, 88 38, 84 42 L8 42 Z" fill="var(--ill-salvia)" stroke="var(--ill-contorno)" stroke-width="1.4"/>
        <rect x="4" y="40" width="82" height="9" rx="4.5" fill="var(--ill-creme)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
        <path d="M46 18 L52 12 M56 21 L62 15" stroke="var(--ill-contorno)" stroke-width="2" stroke-linecap="round"/>
      </g>
    `;

    // (a) Intervalado: 4 cones terracota em fila na pista e riscos de velocidade longos e agressivos
    if (subtipo === 'intervalado') {
      return `
        <svg ${svgAttrs} aria-hidden="true">
          <path d="M8 94 H152" stroke="var(--ill-areia)" stroke-width="12" stroke-linecap="round"/>
          ${[22, 54, 86, 118]
            .map(
              (cx) => `<polygon points="${cx},90 ${cx + 7},72 ${cx + 14},90" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.2"/>`
            )
            .join('')}
          <g class="lib-anim-corrida-streaks">
            <line x1="6" y1="28" x2="72" y2="28" stroke="var(--ill-argila)" stroke-width="4.5" stroke-linecap="round"/>
            <line x1="2" y1="42" x2="66" y2="42" stroke="var(--terracota-profundo)" stroke-width="4.5" stroke-linecap="round"/>
            <line x1="12" y1="56" x2="76" y2="56" stroke="var(--ill-argila)" stroke-width="4.5" stroke-linecap="round"/>
          </g>
          ${shoeBase(64, 24, -12, 0.94)}
        </svg>
      `;
    }

    // (b) Tiros curtos: 4 cones terracota + raio de aceleração e riscos longos inclinados
    if (subtipo === 'tiros') {
      return `
        <svg ${svgAttrs} aria-hidden="true">
          <path d="M8 96 L152 84" stroke="var(--ill-areia)" stroke-width="11" stroke-linecap="round"/>
          ${[20, 48, 76, 104]
            .map(
              (cx, i) => `<polygon points="${cx},${93 - i * 2} ${cx + 6},${76 - i * 2} ${cx + 12},${93 - i * 2}" fill="var(--terracota-profundo)"/>`
            )
            .join('')}
          <g class="lib-anim-corrida-streaks">
            <line x1="8" y1="24" x2="78" y2="20" stroke="var(--terracota-profundo)" stroke-width="5" stroke-linecap="round"/>
            <line x1="14" y1="38" x2="84" y2="34" stroke="var(--ill-argila)" stroke-width="4.5" stroke-linecap="round"/>
            <polygon points="134,14 122,32 132,32 124,48 144,28 134,28" fill="var(--ill-argila)"/>
          </g>
          ${shoeBase(58, 26, -15, 0.92)}
        </svg>
      `;
    }

    // (c) Longão: pista bem comprida em perspectiva indo ao horizonte, sol baixo grande em terracota-suave
    if (subtipo === 'longao' || subtipo === 'horizonte') {
      return `
        <svg ${svgAttrs} aria-hidden="true">
          <circle cx="80" cy="54" r="34" fill="var(--terracota-suave)" stroke="var(--ill-argila)" stroke-width="1.5"/>
          <polygon points="12,106 148,106 94,52 66,52" fill="var(--ill-areia)" opacity="0.88"/>
          <line x1="80" y1="54" x2="80" y2="104" stroke="var(--ill-creme)" stroke-width="2" stroke-dasharray="5 5"/>
          ${shoeBase(46, 38, -5, 0.86)}
        </svg>
      `;
    }

    // (d) Progressivo: 3 tênis em tamanhos crescentes, da esquerda para a direita, com riscos cada vez maiores
    if (subtipo === 'progressivo' || subtipo === 'variado') {
      return `
        <svg ${svgAttrs} aria-hidden="true">
          <path d="M10 96 Q80 84 150 92" fill="none" stroke="var(--ill-areia)" stroke-width="10" stroke-linecap="round"/>
          <line x1="8" y1="68" x2="22" y2="68" stroke="var(--ill-argila)" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="48" y1="54" x2="70" y2="54" stroke="var(--ill-argila)" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="94" y1="36" x2="126" y2="36" stroke="var(--terracota-profundo)" stroke-width="4.5" stroke-linecap="round"/>
          ${shoeBase(10, 56, -4, 0.44)}
          ${shoeBase(48, 42, -7, 0.62)}
          ${shoeBase(88, 24, -11, 0.82)}
        </svg>
      `;
    }

    // (e) Recuperação / regenerativo: tênis em repouso com uma folha de sálvia caindo
    if (subtipo === 'recuperacao' || subtipo === 'regenerativo') {
      return `
        <svg ${svgAttrs} aria-hidden="true">
          <rect x="18" y="88" width="124" height="10" rx="5" fill="var(--ill-areia)"/>
          <!-- Folha de sálvia caindo suavemente -->
          <g class="lib-anim-mob-sway" style="transform-origin: 112px 26px;">
            <path d="M102 26 C112 12, 132 16, 126 34 C118 46, 98 38, 102 26 Z" fill="var(--ill-salvia)" stroke="var(--ill-contorno)" stroke-width="1.4"/>
            <path d="M104 32 Q116 26 126 22" fill="none" stroke="var(--ill-traco)" stroke-width="1.2"/>
          </g>
          ${shoeBase(36, 40, 0, 0.96)}
        </svg>
      `;
    }

    // (f) Caminhada/corrida: um tênis e uma bolinha de ritmo alternando
    if (subtipo === 'caminhada-corrida') {
      return `
        <svg ${svgAttrs} aria-hidden="true">
          <path d="M12 92 Q80 78 148 92" fill="none" stroke="var(--ill-areia)" stroke-width="10" stroke-linecap="round"/>
          <circle cx="34" cy="54" r="14" fill="var(--ill-argila)" class="lib-anim-peito-breath"/>
          ${shoeBase(62, 34, -4, 0.9)}
        </svg>
      `;
    }

    // (g) Rodagem no parque: pista curva suave, ciprestes sálvia ao fundo e sol em areia
    if (subtipo === 'rodagem-parque' || subtipo === 'parque') {
      return `
        <svg ${svgAttrs} aria-hidden="true">
          <circle cx="132" cy="24" r="12" fill="var(--ill-areia)"/>
          <circle cx="28" cy="52" r="14" fill="var(--salvia-suave)"/>
          <circle cx="46" cy="58" r="11" fill="var(--ill-salvia)" opacity="0.6"/>
          <path d="M10 94 Q80 72 150 92" fill="none" stroke="var(--ill-areia)" stroke-width="12" stroke-linecap="round"/>
          <g class="lib-anim-corrida-streaks">
            <line x1="22" y1="44" x2="48" y2="44" stroke="var(--ill-argila)" stroke-width="3.5" stroke-linecap="round"/>
            <line x1="16" y1="58" x2="44" y2="58" stroke="var(--ill-argila)" stroke-width="3.5" stroke-linecap="round"/>
          </g>
          ${shoeBase(58, 34, -7, 0.96)}
        </svg>
      `;
    }

    // (h) Base aeróbica: pista dupla com marco de km terracota e onda de ritmo
    if (subtipo === 'base-aerobica' || subtipo === 'estrada') {
      return `
        <svg ${svgAttrs} aria-hidden="true">
          <rect x="20" y="34" width="22" height="36" rx="6" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.4"/>
          <circle cx="31" cy="46" r="4" fill="var(--ill-creme)"/>
          <path d="M10 92 H150" stroke="var(--ill-areia)" stroke-width="12" stroke-linecap="round"/>
          <path d="M16 92 H144" stroke="var(--ill-creme)" stroke-width="2" stroke-dasharray="6 6"/>
          ${shoeBase(58, 34, -6, 0.95)}
        </svg>
      `;
    }

    // Padrão Corrida leve: 3 riscos de velocidade curtos e uma pista curva suave, sol pequeno em areia
    return `
      <svg ${svgAttrs} aria-hidden="true">
        <circle cx="134" cy="26" r="13" fill="var(--ill-areia)"/>
        <path d="M10 94 Q80 68 150 92" fill="none" stroke="var(--ill-areia)" stroke-width="12" stroke-linecap="round"/>
        <g class="lib-anim-corrida-streaks">
          <line x1="18" y1="42" x2="46" y2="42" stroke="var(--ill-argila)" stroke-width="4" stroke-linecap="round"/>
          <line x1="12" y1="56" x2="40" y2="56" stroke="var(--terracota-profundo)" stroke-width="4" stroke-linecap="round"/>
          <line x1="22" y1="70" x2="48" y2="70" stroke="var(--ill-argila)" stroke-width="4" stroke-linecap="round"/>
        </g>
        ${shoeBase(56, 34, -8, 1)}
      </svg>
    `;
  }

  // 8. A4 — MOBILIDADE (6 regiões com pose e elemento exclusivos)
  // (a) Coluna: gato-vaca, arco da coluna oscilando
  if (regiao === 'coluna') {
    return `
      <svg ${svgAttrs} aria-hidden="true">
        <rect x="18" y="90" width="124" height="10" rx="5" fill="var(--ill-areia)"/>
        <circle cx="130" cy="26" r="11" fill="var(--ill-argila)"/>
        <g class="lib-anim-mob-sway" style="transform-origin: 80px 72px;">
          <circle cx="42" cy="54" r="9" fill="var(--ill-traco)"/>
          <path d="M48 56 Q80 26 114 56" fill="none" stroke="var(--ill-salvia)" stroke-width="14" stroke-linecap="round"/>
          <path d="M52 88 V58 M110 88 V58" stroke="var(--ill-contorno)" stroke-width="5" stroke-linecap="round"/>
          <path d="M52 38 Q80 14 108 38" fill="none" stroke="var(--ill-argila)" stroke-width="2.5" stroke-dasharray="4 4"/>
        </g>
      </svg>
    `;
  }

  // (b) Quadril: pose de 90/90 com um arco em torno do quadril
  if (regiao === 'quadril') {
    return `
      <svg ${svgAttrs} aria-hidden="true">
        <ellipse cx="80" cy="86" rx="58" ry="14" fill="var(--salvia-suave)"/>
        <g class="lib-anim-mob-sway" style="transform-origin: 80px 76px;">
          <circle cx="80" cy="28" r="10" fill="var(--ill-traco)"/>
          <rect x="68" y="40" width="24" height="36" rx="10" fill="var(--ill-salvia)"/>
          <!-- Pernas dobradas em 90/90 -->
          <path d="M72 74 L42 74 L32 94 M88 74 L118 74 L128 56" fill="none" stroke="var(--ill-areia)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Arco de rotação em torno do quadril -->
          <path d="M46 58 A38 22 0 1 1 114 58" fill="none" stroke="var(--ill-argila)" stroke-width="3" stroke-dasharray="5 4"/>
        </g>
      </svg>
    `;
  }

  // (c) Torácica/ombros: silhueta com braço em círculo e arco tracejado
  if (regiao === 'toracica') {
    return `
      <svg ${svgAttrs} aria-hidden="true">
        <circle cx="84" cy="56" r="38" fill="none" stroke="var(--ill-argila)" stroke-width="2.5" stroke-dasharray="5 5"/>
        <path d="M26 94 C44 68, 116 68, 134 94 Z" fill="var(--salvia-suave)"/>
        <g class="lib-anim-mob-sway" style="transform-origin: 84px 66px;">
          <circle cx="72" cy="44" r="9" fill="var(--ill-traco)"/>
          <path d="M56 88 Q74 58 84 62 L114 30" fill="none" stroke="var(--ill-salvia)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="114" cy="30" r="6" fill="var(--ill-argila)"/>
        </g>
      </svg>
    `;
  }

  // (d) Tornozelo: pé em apoio com uma seta curva no tornozelo
  if (regiao === 'tornozelo' || regiao === 'parede') {
    return `
      <svg ${svgAttrs} aria-hidden="true">
        <rect x="118" y="18" width="10" height="80" rx="4" fill="var(--ill-traco)"/>
        <rect x="20" y="92" width="120" height="8" rx="4" fill="var(--ill-areia)"/>
        <g class="lib-anim-mob-sway" style="transform-origin: 68px 88px;">
          <path d="M54 28 L86 62 L68 88 H98" fill="none" stroke="var(--ill-salvia)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Seta curva no tornozelo -->
          <path d="M42 74 A26 26 0 0 1 78 46" fill="none" stroke="var(--ill-argila)" stroke-width="3.5" stroke-linecap="round"/>
          <polygon points="82,44 72,42 76,52" fill="var(--ill-argila)"/>
        </g>
      </svg>
    `;
  }

  // (e) Isquiotibiais/posterior: silhueta sentada alcançando o pé, com onda sálvia na perna
  if (regiao === 'isquiotibiais' || regiao === 'ar-livre') {
    return `
      <svg ${svgAttrs} aria-hidden="true">
        <rect x="18" y="90" width="124" height="8" rx="4" fill="var(--ill-areia)"/>
        <g class="lib-anim-mob-sway" style="transform-origin: 48px 82px;">
          <circle cx="56" cy="38" r="9" fill="var(--ill-traco)"/>
          <!-- Silhueta sentada alcançando o pé -->
          <path d="M46 82 L122 82 L122 68" fill="none" stroke="var(--ill-areia)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M46 82 Q58 50 108 58" fill="none" stroke="var(--ill-argila)" stroke-width="11" stroke-linecap="round"/>
          <!-- Onda sálvia na perna -->
          <path d="M56 96 Q84 86 114 96" fill="none" stroke="var(--ill-salvia)" stroke-width="4" stroke-linecap="round"/>
        </g>
      </svg>
    `;
  }

  // (f) Pescoço: cabeça inclinando com um arco suave
  return `
    <svg ${svgAttrs} aria-hidden="true">
      <path d="M36 98 C42 66, 118 66, 124 98 Z" fill="var(--ill-salvia)" opacity="0.72"/>
      <path d="M48 34 A36 36 0 0 1 112 34" fill="none" stroke="var(--ill-argila)" stroke-width="3" stroke-dasharray="5 4" stroke-linecap="round"/>
      <g class="lib-anim-mob-sway" style="transform-origin: 80px 68px;">
        <rect x="73" y="52" width="14" height="22" rx="6" fill="var(--ill-areia)"/>
        <circle cx="84" cy="38" r="16" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      </g>
    </svg>
  `;
}

/**
 * Mantém compatibilidade com chamadas de miniatura da Prévia e folha de detalhe da Biblioteca.
 */
export function renderExerciseFigureSvg(itemOrGrupo = 'Peito', animated = false, size = 56) {
  const isThumb = size <= 64;
  return renderLibraryGroupScene(itemOrGrupo, { isThumb, animated });
}

/**
 * M7 & A4 — Teste automático `auditarCenas()` que lista TODOS os 8 grupos da Biblioteca
 * (`Peito`, `Costas`, `Pernas`, `Ombros`, `Braços`, `Core`, `Mobilidade`, `Corrida`)
 * com `{ cartas, unicas, paresIguaisAdjacentes }` e verifica também que a Cena J
 * grande (`renderSceneJ`) de cada um dos 8 grupos é diferente das demais.
 */
export function auditarCenas(logToConsole = true) {
  const grupos = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Core', 'Mobilidade', 'Corrida'];
  const relatorio = {};
  let paresIguaisAdjacentes = 0;

  grupos.forEach((grp) => {
    const itens = ALL_LIBRARY_ITEMS.filter((it) => it.grupo === grp);
    const svgs = itens.map((it) => renderLibraryGroupScene(it, { isThumb: false }).trim());
    const unicos = new Set(svgs);
    let paresGrupo = 0;
    for (let i = 0; i < svgs.length - 1; i++) {
      if (svgs[i] === svgs[i + 1]) {
        paresGrupo += 1;
        paresIguaisAdjacentes += 1;
      }
    }
    relatorio[grp] = {
      cartas: itens.length,
      unicas: unicos.size,
      paresIguaisAdjacentes: paresGrupo,
      totalCartas: itens.length,
      cenasUnicas: unicos.size,
      todasUnicas: unicos.size === itens.length
    };
  });

  // Verifica que a Cena J grande de cada um dos 8 grupos é diferente das demais
  const cenasJ = grupos.map((grp) => renderSceneJ(grp).trim());
  const cenasJUnicas = new Set(cenasJ).size;
  const todasCenasJDiferentes = cenasJUnicas === grupos.length;

  const tiposCorridaSvgs = (RUN_TYPES_CARDS || []).map((tc) => renderRunTypeCardScene(tc.sceneKey).trim());
  const tiposCorridaUnicos = new Set(tiposCorridaSvgs).size;

  const resultado = {
    grupos: relatorio,
    relatorio,
    paresIguaisAdjacentes,
    cenasJ: {
      totalGrupos: grupos.length,
      unicas: cenasJUnicas,
      todasDiferentes: todasCenasJDiferentes
    },
    tiposCorrida: {
      cartas: tiposCorridaSvgs.length,
      unicas: tiposCorridaUnicos,
      todasUnicas: tiposCorridaUnicos === tiposCorridaSvgs.length
    }
  };

  if (logToConsole) {
    console.info('[Clay Fit · auditarCenas]', resultado);
  }
  return resultado;
}

if (typeof window !== 'undefined') {
  window.auditarCenas = auditarCenas;
}
