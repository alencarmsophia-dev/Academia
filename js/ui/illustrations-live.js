/**
 * ============================================================================
 * CLAY FIT — ILUSTRAÇÕES E CENAS DO TREINO AO VIVO (PARTE B)
 * /js/ui/illustrations-live.js
 *
 * Especificações Prompt 3 (B7, B8, B10, B11, B14, B15):
 * - CENA O (Aquecimento e Alongamento): silhueta de argila em `` fazendo
 *   o movimento atual (rotação de ombro, agachamento sem peso, rotação de quadril,
 *   elevação de joelhos, mobilidade de coluna) em loop de 2s com arcos tracejados;
 *   zona de 240px de altura.
 * - CENAS DE EXERCÍCIO NO MODO ENERGIA (B8 e B10): formas em ``, sombras em
 *   ``, detalhes em carvão `` e areia ``, em loop de 2s
 *   demonstrando o movimento por grupo + variação por equipamento:
 *   • Peito: barra desce ao peito e sobe (`translateY 14px`, 2s)
 *   • Costas: cabo desce e barra puxa ao peito (2s)
 *   • Ombros: halteres sobem lateralmente até a altura do ombro (`rotação 0->80°`, 2s)
 *   • Braços: antebraço gira em torno do cotovelo (`0->110°`, 2s)
 *   • Pernas: silhueta agacha `12px` e sobe (2s)
 *   • Core: onda concêntrica saindo do abdômen (2s)
 *   • Corrida: tênis com riscos de velocidade (2s)
 *   • Mobilidade: arco da pose oscila (2s)
 * - CENA P (Descanso): forma de argila orgânica atrás do anel que respira
 *   (`scale 1 -> 1.12`, 4s inspirando e 4s soltando, `ease-in-out`).
 * - CENA M (Resumo): troféu de argila pequeno para cartões de recorde.
 * - CENA N (Celebração): sol nascente de argila terracota subindo atrás de
 *   colinas em sálvia e areia + 28 formas orgânicas de confete em canvas 2D
 *   interativas ao toque (com fallback estático em `prefers-reduced-motion`).
 * ============================================================================
 */

import { prefersReducedMotion } from '../motion.js';
import { corToken } from './theme.js';

/**
 * B7 & B12 — CENA O: Silhueta de argila em  realizando o movimento de
 * aquecimento ou alongamento em loop de 2s, com arcos tracejados indicando o movimento.
 */
export function renderSceneOWarmup(movimento = 'ombro') {
  const mov = String(movimento || 'ombro').toLowerCase();

  // 1. Agachamento sem peso
  if (mov.includes('agachamento') || mov.includes('isquio')) {
    return `
      <svg viewBox="0 0 280 240" width="100%" height="240" role="img" aria-label="Silhueta em argila fazendo agachamento leve de aquecimento">
        <ellipse cx="140" cy="212" rx="88" ry="12" fill="var(--energia-chip)" opacity="0.55"/>
        <path d="M54 88 A86 86 0 0 0 54 176 M226 88 A86 86 0 0 1 226 176" fill="none" stroke="var(--energia-fg)" stroke-width="2.5" stroke-dasharray="6 6" opacity="0.7"/>
        <g class="live-anim-pernas-2s">
          <circle cx="140" cy="54" r="18" fill="var(--energia-fg)"/>
          <rect x="118" y="78" width="44" height="62" rx="20" fill="var(--energia-fg)"/>
          <path d="M126 136 L104 172 L112 206 M154 136 L176 172 L168 206" fill="none" stroke="var(--energia-fg)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M118 96 L82 92 M162 96 L198 92" stroke="var(--ill-areia)" stroke-width="12" stroke-linecap="round"/>
        </g>
      </svg>
    `;
  }

  // 2. Rotação de quadril
  if (mov.includes('quadril')) {
    return `
      <svg viewBox="0 0 280 240" width="100%" height="240" role="img" aria-label="Silhueta em argila fazendo rotação ampla de quadril">
        <ellipse cx="140" cy="212" rx="88" ry="12" fill="var(--energia-chip)" opacity="0.55"/>
        <ellipse cx="140" cy="134" rx="74" ry="26" fill="none" stroke="var(--energia-fg)" stroke-width="3" stroke-dasharray="7 6"/>
        <g class="live-anim-mob-2s" style="transform-origin: 140px 140px;">
          <circle cx="140" cy="48" r="18" fill="var(--energia-fg)"/>
          <path d="M118 74 H162 L156 140 H124 Z" fill="var(--energia-fg)"/>
          <path d="M128 140 L110 204 M152 140 L170 204" stroke="var(--energia-fg)" stroke-width="15" stroke-linecap="round"/>
          <circle cx="140" cy="134" r="10" fill="var(--ill-areia)"/>
        </g>
      </svg>
    `;
  }

  // 3. Elevação de joelhos / tornozelo
  if (mov.includes('joelho') || mov.includes('tornozelo')) {
    return `
      <svg viewBox="0 0 280 240" width="100%" height="240" role="img" aria-label="Silhueta em argila elevando joelhos e soltando tornozelos">
        <ellipse cx="140" cy="212" rx="88" ry="12" fill="var(--energia-chip)" opacity="0.55"/>
        <path d="M196 184 A48 48 0 0 0 196 108" fill="none" stroke="var(--energia-fg)" stroke-width="3" stroke-dasharray="6 5"/>
        <circle cx="134" cy="48" r="18" fill="var(--energia-fg)"/>
        <rect x="114" y="72" width="40" height="66" rx="18" fill="var(--energia-fg)"/>
        <line x1="124" y1="138" x2="124" y2="206" stroke="var(--energia-fg)" stroke-width="16" stroke-linecap="round"/>
        <g class="live-anim-peito-2s">
          <path d="M144 134 L182 118 L182 162" fill="none" stroke="var(--ill-areia)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
      </svg>
    `;
  }

  // 4. Padrão: Rotação de ombros e coluna torácica
  return `
    <svg viewBox="0 0 280 240" width="100%" height="240" role="img" aria-label="Silhueta em argila girando os ombros com arcos tracejados">
      <ellipse cx="140" cy="212" rx="88" ry="12" fill="var(--energia-chip)" opacity="0.55"/>
      <!-- Arcos tracejados de rotação dos ombros -->
      <circle cx="88" cy="106" r="36" fill="none" stroke="var(--energia-fg)" stroke-width="2.5" stroke-dasharray="6 5" opacity="0.8"/>
      <circle cx="192" cy="106" r="36" fill="none" stroke="var(--energia-fg)" stroke-width="2.5" stroke-dasharray="6 5" opacity="0.8"/>
      <circle cx="140" cy="52" r="20" fill="var(--energia-fg)"/>
      <path d="M108 82 C110 74, 170 74, 172 82 L166 168 H114 Z" fill="var(--energia-fg)"/>
      <g class="live-anim-ombros-left-2s" style="transform-origin: 108px 92px;">
        <path d="M108 92 L64 132" stroke="var(--ill-areia)" stroke-width="15" stroke-linecap="round"/>
        <circle cx="64" cy="132" r="8" fill="var(--ill-contorno)"/>
      </g>
      <g class="live-anim-ombros-right-2s" style="transform-origin: 172px 92px;">
        <path d="M172 92 L216 132" stroke="var(--ill-areia)" stroke-width="15" stroke-linecap="round"/>
        <circle cx="216" cy="132" r="8" fill="var(--ill-contorno)"/>
      </g>
    </svg>
  `;
}

/**
 * B8 & B10 — CENAS DO EXERCÍCIO NA VERSÃO ENERGIA (loop de 2s demonstrando o movimento)
 * Formas em , sombras em , detalhes em carvão , areia .
 * Quando `theme === 'claro'` (folha B10 "Como fazer" 320×200), usa cores claras equivalentes.
 */
export function renderEnergyExerciseScene(ex = {}, { theme = 'energia', width = 320, height = 180 } = {}) {
  const grupo = ex.grupo || 'Peito';
  const equip = ex.equip || 'barra';
  const isLight = theme === 'claro';

  const mainFill = isLight ? 'var(--ill-argila)' : 'var(--energia-fg)';
  const shadowFill = isLight ? 'var(--salvia-suave)' : 'var(--energia-chip)';
  const sandFill = 'var(--ill-areia)';
  const inkFill = isLight ? 'var(--ill-traco)' : 'var(--carvao-fixo)';

  // 1. PEITO: barra/halter desce ao peito e sobe (translateY 14px, 2s)
  if (grupo === 'Peito') {
    const isHalter = equip === 'halteres' || equip === 'banco-arco';
    const isCorpo = equip === 'corpo' || equip === 'paralelas';
    return `
      <svg viewBox="0 0 320 180" width="100%" height="100%" style="max-width:${width}px;max-height:${height}px;" role="img" aria-label="Demonstração de ${ex.nome || 'exercício de peito'}">
        <ellipse cx="160" cy="148" rx="112" ry="18" fill="${shadowFill}"/>
        <rect x="84" y="118" width="152" height="18" rx="9" fill="${sandFill}" stroke="${inkFill}" stroke-width="2"/>
        <rect x="108" y="136" width="10" height="22" rx="4" fill="${inkFill}"/>
        <rect x="202" y="136" width="10" height="22" rx="4" fill="${inkFill}"/>
        <path d="M104 114 C122 92, 198 92, 216 114 Z" fill="${mainFill}" opacity="0.9"/>
        <g class="live-anim-peito-2s">
          ${
            isHalter
              ? `
                <rect x="78" y="42" width="14" height="36" rx="5" fill="${mainFill}" stroke="${inkFill}" stroke-width="1.5"/>
                <rect x="104" y="42" width="14" height="36" rx="5" fill="${mainFill}" stroke="${inkFill}" stroke-width="1.5"/>
                <rect x="88" y="56" width="20" height="8" fill="${inkFill}"/>
                <rect x="202" y="42" width="14" height="36" rx="5" fill="${mainFill}" stroke="${inkFill}" stroke-width="1.5"/>
                <rect x="228" y="42" width="14" height="36" rx="5" fill="${mainFill}" stroke="${inkFill}" stroke-width="1.5"/>
                <rect x="212" y="56" width="20" height="8" fill="${inkFill}"/>
              `
              : isCorpo
              ? `
                <path d="M82 96 L220 58" stroke="${mainFill}" stroke-width="20" stroke-linecap="round"/>
                <circle cx="236" cy="52" r="14" fill="${sandFill}" stroke="${inkFill}" stroke-width="1.75"/>
              `
              : `
                <rect x="52" y="58" width="216" height="8" rx="4" fill="${inkFill}"/>
                <rect x="68" y="34" width="22" height="56" rx="7" fill="${mainFill}" stroke="${inkFill}" stroke-width="1.75"/>
                <rect x="230" y="34" width="22" height="56" rx="7" fill="${mainFill}" stroke="${inkFill}" stroke-width="1.75"/>
                <rect x="52" y="42" width="12" height="40" rx="4" fill="${sandFill}"/>
                <rect x="256" y="42" width="12" height="40" rx="4" fill="${sandFill}"/>
              `
          }
        </g>
      </svg>
    `;
  }

  // 2. COSTAS: cabo desce e a barra puxa ao peito (2s)
  if (grupo === 'Costas') {
    return `
      <svg viewBox="0 0 320 180" width="100%" height="100%" style="max-width:${width}px;max-height:${height}px;" role="img" aria-label="Demonstração de ${ex.nome || 'exercício de costas'}">
        <polygon points="86,28 234,28 190,152 130,152" fill="${shadowFill}"/>
        <rect x="136" y="8" width="48" height="12" rx="6" fill="${inkFill}"/>
        <line x1="160" y1="20" x2="160" y2="86" stroke="${inkFill}" stroke-width="4"/>
        <circle cx="160" cy="108" r="16" fill="${sandFill}"/>
        <path d="M126 156 C130 118, 190 118, 194 156 Z" fill="${mainFill}"/>
        <g class="live-anim-costas-2s">
          <path d="M68 58 Q160 38 252 58" fill="none" stroke="${mainFill}" stroke-width="12" stroke-linecap="round"/>
          <circle cx="68" cy="58" r="8" fill="${inkFill}"/>
          <circle cx="252" cy="58" r="8" fill="${inkFill}"/>
        </g>
      </svg>
    `;
  }

  // 3. OMBROS: halteres sobem lateralmente até a altura do ombro (rotação 0->80°, 2s)
  if (grupo === 'Ombros') {
    return `
      <svg viewBox="0 0 320 180" width="100%" height="100%" style="max-width:${width}px;max-height:${height}px;" role="img" aria-label="Demonstração de ${ex.nome || 'exercício de ombros'}">
        <ellipse cx="160" cy="154" rx="96" ry="14" fill="${shadowFill}"/>
        <path d="M52 136 A108 108 0 0 1 268 136" fill="none" stroke="${mainFill}" stroke-width="2" stroke-dasharray="6 6" opacity="0.65"/>
        <circle cx="160" cy="48" r="17" fill="${sandFill}" stroke="${inkFill}" stroke-width="1.75"/>
        <path d="M126 152 C130 82, 190 82, 194 152 Z" fill="${mainFill}"/>
        <!-- Braço esquerdo girando 0->80° -->
        <g class="live-anim-ombros-left-2s" style="transform-origin: 132px 84px;">
          <path d="M132 84 L118 140" stroke="${sandFill}" stroke-width="14" stroke-linecap="round"/>
          <rect x="102" y="134" width="32" height="12" rx="4" fill="${inkFill}"/>
          <rect x="98" y="128" width="10" height="24" rx="3" fill="${mainFill}"/>
          <rect x="128" y="128" width="10" height="24" rx="3" fill="${mainFill}"/>
        </g>
        <!-- Braço direito girando 0->-80° -->
        <g class="live-anim-ombros-right-2s" style="transform-origin: 188px 84px;">
          <path d="M188 84 L202 140" stroke="${sandFill}" stroke-width="14" stroke-linecap="round"/>
          <rect x="186" y="134" width="32" height="12" rx="4" fill="${inkFill}"/>
          <rect x="182" y="128" width="10" height="24" rx="3" fill="${mainFill}"/>
          <rect x="212" y="128" width="10" height="24" rx="3" fill="${mainFill}"/>
        </g>
      </svg>
    `;
  }

  // 4. BRAÇOS: antebraço gira em torno do cotovelo (0->110°, 2s)
  if (grupo === 'Braços') {
    return `
      <svg viewBox="0 0 320 180" width="100%" height="100%" style="max-width:${width}px;max-height:${height}px;" role="img" aria-label="Demonstração de ${ex.nome || 'exercício de braços'}">
        <circle cx="156" cy="96" r="64" fill="${shadowFill}"/>
        <path d="M128 34 L128 108" stroke="${sandFill}" stroke-width="24" stroke-linecap="round"/>
        <circle cx="128" cy="108" r="10" fill="${inkFill}"/>
        <g class="live-anim-bracos-2s" style="transform-origin: 128px 108px;">
          <path d="M128 108 L198 118" stroke="${mainFill}" stroke-width="20" stroke-linecap="round"/>
          <rect x="192" y="96" width="14" height="44" rx="5" fill="${inkFill}"/>
          <rect x="212" y="96" width="14" height="44" rx="5" fill="${inkFill}"/>
          <rect x="198" y="114" width="22" height="8" fill="${sandFill}"/>
        </g>
      </svg>
    `;
  }

  // 5. PERNAS: silhueta agacha 12px e sobe (2s)
  if (grupo === 'Pernas') {
    return `
      <svg viewBox="0 0 320 180" width="100%" height="100%" style="max-width:${width}px;max-height:${height}px;" role="img" aria-label="Demonstração de ${ex.nome || 'exercício de pernas'}">
        <rect x="52" y="148" width="216" height="14" rx="7" fill="${sandFill}" stroke="${inkFill}" stroke-width="1.75"/>
        <g class="live-anim-pernas-2s">
          <circle cx="160" cy="34" r="14" fill="${sandFill}"/>
          <path d="M114 146 L132 96 L160 62 L188 96 L206 146" fill="none" stroke="${mainFill}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="64" y="48" width="192" height="8" rx="4" fill="${inkFill}"/>
          <rect x="78" y="26" width="18" height="48" rx="6" fill="${mainFill}" stroke="${inkFill}" stroke-width="1.5"/>
          <rect x="224" y="26" width="18" height="48" rx="6" fill="${mainFill}" stroke="${inkFill}" stroke-width="1.5"/>
        </g>
      </svg>
    `;
  }

  // 6. CORE: onda concêntrica saindo do abdômen (2s)
  if (grupo === 'Core') {
    return `
      <svg viewBox="0 0 320 180" width="100%" height="100%" style="max-width:${width}px;max-height:${height}px;" role="img" aria-label="Demonstração de ${ex.nome || 'exercício de core'}">
        <rect x="48" y="138" width="224" height="12" rx="6" fill="${sandFill}"/>
        <circle class="live-anim-core-wave-2s" cx="160" cy="92" r="24" fill="none" stroke="${mainFill}" stroke-width="3.5"/>
        <circle class="live-anim-core-wave-2s-delayed" cx="160" cy="92" r="44" fill="none" stroke="${mainFill}" stroke-width="2" stroke-dasharray="6 5"/>
        <path d="M74 126 L224 90 L230 134" fill="none" stroke="${mainFill}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="236" cy="74" r="15" fill="${sandFill}" stroke="${inkFill}" stroke-width="1.75"/>
      </svg>
    `;
  }

  // 7. CORRIDA: tênis com riscos de velocidade (2s)
  if (grupo === 'Corrida') {
    return `
      <svg viewBox="0 0 320 180" width="100%" height="100%" style="max-width:${width}px;max-height:${height}px;" role="img" aria-label="Demonstração de ${ex.nome || 'corrida'}">
        <path d="M36 144 Q160 116 284 140" fill="none" stroke="${sandFill}" stroke-width="14" stroke-linecap="round"/>
        <g class="live-anim-corrida-2s">
          <line x1="40" y1="62" x2="108" y2="62" stroke="${mainFill}" stroke-width="5" stroke-linecap="round"/>
          <line x1="26" y1="84" x2="98" y2="84" stroke="${sandFill}" stroke-width="5" stroke-linecap="round"/>
          <line x1="48" y1="106" x2="112" y2="106" stroke="${mainFill}" stroke-width="5" stroke-linecap="round"/>
        </g>
        <g transform="translate(122, 46) rotate(-10) scale(1.3)">
          <path d="M8 38 C6 24, 14 10, 26 10 C38 10, 44 20, 58 22 L82 30 C88 32, 88 38, 84 42 L8 42 Z" fill="${mainFill}" stroke="${inkFill}" stroke-width="1.5"/>
          <rect x="4" y="40" width="82" height="10" rx="5" fill="${sandFill}" stroke="${inkFill}" stroke-width="1.5"/>
        </g>
      </svg>
    `;
  }

  // 8. MOBILIDADE: arco da pose oscila (2s)
  return `
    <svg viewBox="0 0 320 180" width="100%" height="100%" style="max-width:${width}px;max-height:${height}px;" role="img" aria-label="Demonstração de ${ex.nome || 'mobilidade'}">
      <path d="M64 148 C100 104, 220 104, 256 148 Z" fill="${shadowFill}"/>
      <g class="live-anim-mob-2s" style="transform-origin: 160px 140px;">
        <circle cx="148" cy="76" r="14" fill="${sandFill}"/>
        <path d="M112 140 Q152 56 218 42" fill="none" stroke="${mainFill}" stroke-width="16" stroke-linecap="round"/>
        <path d="M132 140 Q164 84 208 74" fill="none" stroke="${sandFill}" stroke-width="10" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

/**
 * B11 — CENA P: Forma de argila orgânica atrás do anel de descanso que RESPIRA
 * (`scale 1 -> 1.12`, 4s inspirando e 4s soltando, `ease-in-out`).
 */
export function renderScenePBreathing() {
  return `
    <svg
      viewBox="0 0 320 320"
      width="300"
      height="300"
      class="live-scene-p-breath"
      aria-hidden="true"
    >
      <path
        d="M160 28 C224 26, 286 78, 290 154 C294 228, 232 292, 158 292 C82 292, 26 232, 30 156 C34 80, 96 30, 160 28 Z"
        fill="var(--energia-chip)"
        opacity="0.48"
      />
      <path
        d="M160 58 C208 56, 256 96, 258 156 C260 214, 212 262, 158 262 C102 262, 58 216, 62 158 C66 100, 112 60, 160 58 Z"
        fill="var(--energia-fg)"
        opacity="0.12"
      />
    </svg>
  `;
}

/**
 * B14 — CENA M: Troféu de argila pequeno para os cartões de recorde do Resumo.
 */
export function renderSceneMTrophy(size = 48) {
  return `
    <svg viewBox="0 0 56 56" width="${size}" height="${size}" role="img" aria-label="Troféu de argila de novo recorde">
      <circle cx="28" cy="28" r="26" fill="var(--terracota-suave)"/>
      <path d="M18 14 H38 V26 C38 33, 33 37, 28 37 C23 37, 18 33, 18 26 Z" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.75" stroke-linejoin="round"/>
      <path d="M18 18 H12 C12 24, 15 27, 18 27 M38 18 H44 C44 24, 41 27, 38 27" fill="none" stroke="var(--ill-contorno)" stroke-width="1.75" stroke-linecap="round"/>
      <line x1="28" y1="37" x2="28" y2="44" stroke="var(--ill-contorno)" stroke-width="2.5"/>
      <rect x="19" y="43" width="18" height="5" rx="2.5" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
      <circle cx="25" cy="22" r="2.5" fill="var(--energia-fg)"/>
    </svg>
  `;
}

/**
 * B15 — CENA N: Sol nascente de argila terracota subindo atrás de uma silhueta
 * de colinas em sálvia e areia.
 */
export function renderSceneNSunrise() {
  return `
    <svg
      viewBox="0 0 360 260"
      width="100%"
      height="240"
      style="max-width:360px;"
      role="img"
      aria-label="Sol nascente de argila terracota subindo atrás de colinas em sálvia e areia"
    >
      <!-- Raios solares sutis -->
      <circle cx="180" cy="148" r="92" fill="var(--terracota-suave)" opacity="0.5"/>
      <!-- Sol nascente terracota que sobe suavemente -->
      <g class="live-scene-n-sun">
        <circle cx="180" cy="138" r="56" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="2"/>
        <circle cx="162" cy="120" r="10" fill="var(--energia-fg)" opacity="0.55"/>
      </g>
      <!-- Colina de areia ao fundo -->
      <path d="M16 218 Q112 132 236 188 T344 176 L344 236 L16 236 Z" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      <!-- Colina de sálvia à frente -->
      <path d="M16 236 Q138 148 344 214 L344 244 L16 244 Z" fill="var(--ill-salvia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
      <!-- Check central de conquista -->
      <circle cx="180" cy="204" r="22" fill="var(--ill-creme)" stroke="var(--ill-contorno)" stroke-width="2"/>
      <path d="M170 204 L177 211 L191 196" fill="none" stroke="var(--sucesso)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

/**
 * B15 — Motor de Confetes de Argila em Canvas 2D:
 * - Exatamente 28 formas orgânicas (terracota , sálvia , areia )
 * - Gravidade, rotação e opacidade
 * - Tocar na tela faz as formas saltarem (interativo)
 * - Se `prefersReducedMotion()` estiver ativo: não desenha confete.
 */
export function mountClayConfettiCanvas(hostEl) {
  if (!hostEl || prefersReducedMotion()) {
    return () => {};
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'live-confetti-canvas';
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;';
  hostEl.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const getColors = () => [
    corToken('--terracota') || 'rgb(226, 87, 59)',
    corToken('--salvia') || 'rgb(143, 166, 138)',
    corToken('--areia') || 'rgb(217, 185, 138)',
    corToken('--terracota-profundo') || 'rgb(185, 63, 39)'
  ];
  const colors = getColors();
  const PARTICLE_COUNT = 28; // B15 & B18: máximo 28 partículas
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    x: window.innerWidth * (0.15 + Math.random() * 0.7),
    y: window.innerHeight * (0.2 + Math.random() * 0.25),
    vx: (Math.random() - 0.5) * 6,
    vy: -4 - Math.random() * 6,
    w: 10 + (i % 3) * 4,
    h: 8 + ((i + 1) % 3) * 3,
    rot: Math.random() * Math.PI * 2,
    vRot: (Math.random() - 0.5) * 0.14,
    color: colors[i % colors.length],
    alpha: 1
  }));

  // Tocar na tela faz as formas saltarem (B15)
  const onPointerDown = () => {
    particles.forEach((p) => {
      p.vy = -5 - Math.random() * 5;
      p.vx += (Math.random() - 0.5) * 4;
      p.alpha = 1;
    });
  };
  const onThemeChange = () => {
    const nextCols = getColors();
    particles.forEach((p, idx) => { p.color = nextCols[idx % nextCols.length]; });
  };
  window.addEventListener('clay:tema', onThemeChange);
  hostEl.addEventListener('pointerdown', onPointerDown, { passive: true });

  let rafId = null;
  let startMs = performance.now();

  const render = (now) => {
    if (!ctx) return;
    const elapsed = now - startMs;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    particles.forEach((p) => {
      p.vy += 0.22; // gravidade
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;
      if (elapsed > 1300) {
        p.alpha = Math.max(0, 1 - (elapsed - 1300) / 600);
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, 4);
      ctx.fill();
      ctx.restore();
    });

    if (elapsed < 2200) {
      rafId = requestAnimationFrame(render);
    } else {
      cleanup();
    }
  };

  const cleanup = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener('clay:tema', onThemeChange);
    hostEl.removeEventListener('pointerdown', onPointerDown);
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  };

  rafId = requestAnimationFrame(render);
  return cleanup;
}
