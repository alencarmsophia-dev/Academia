/**
 * ============================================================================
 * CLAY FIT — ILUSTRAÇÕES E CENAS VETORIAIS DA CORRIDA E DA EVOLUÇÃO (PARTE E)
 * /js/ui/illustrations-run.js
 *
 * Especificação Prompt 4 (Parte E — Itens 1 a 11):
 * - Linguagem "Studio Clay": paleta  / , , ,
 *   , , ; cantos arredondados, curvas suaves, zero cantos
 *   vivos, versão grande e miniatura, respeito a `prefers-reduced-motion` e
 *   reação ao toque.
 * ============================================================================
 */

import { vibrate } from '../motion.js';

/**
 * 1. Cena da Pré-corrida:
 * Pista de corrida em curva em perspectiva suave (areia ), árvore em
 * sálvia (), sol em terracota () com halo respirando (scale 1→1.05
 * em 4s) e silhueta de corredor em ciclo suave de 4 quadros (1,1s).
 * Toque no corredor: acelera por 1,5s e solta uma bolha "Bora?".
 */
export function renderRunPreScene({ isThumb = false } = {}) {
  const vb = isThumb ? '0 0 160 110' : '0 0 320 156';
  if (isThumb) {
    return `
      <svg viewBox="${vb}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cena de pré-corrida">
        <rect width="160" height="110" rx="18" fill="var(--corrida-superficie)"/>
        <circle cx="126" cy="28" r="14" fill="var(--ill-argila)" class="run-pre-sun"/>
        <ellipse cx="34" cy="54" rx="14" ry="20" fill="var(--ill-salvia)"/>
        <path d="M12 96 Q80 62 148 88" fill="none" stroke="var(--ill-areia)" stroke-width="14" stroke-linecap="round"/>
        <circle cx="82" cy="48" r="7" fill="var(--ill-creme)"/>
        <path d="M74 64 L84 56 L92 66 M78 78 L84 66 L92 76" stroke="var(--ill-argila)" stroke-width="4" stroke-linecap="round" fill="none"/>
      </svg>
    `;
  }

  return `
    <div class="run-pre-scene-wrap" data-run-interactive="pre-runner" role="button" tabindex="0" aria-label="Corredor aquecendo na pista. Toque para interagir">
      <svg viewBox="${vb}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" class="run-pre-svg">
        <!-- Fundo orgânico noturno em Modo Energia -->
        <rect x="4" y="4" width="312" height="148" rx="24" fill="var(--corrida-superficie)"/>
        <path d="M4 112 Q96 86 204 102 T316 96 L316 152 L4 152 Z" fill="var(--corrida-bg)" opacity="0.72"/>

        <!-- Sol terracota com halo respirando (4s) -->
        <g class="run-pre-sun-group" style="transform-origin: 256px 40px;">
          <circle cx="256" cy="40" r="28" fill="var(--ill-argila)" opacity="0.22" class="run-pre-sun-halo"/>
          <circle cx="256" cy="40" r="17" fill="var(--ill-argila)"/>
        </g>

        <!-- Árvores esculturais em sálvia -->
        <g transform="translate(46, 36)">
          <rect x="13" y="44" width="5" height="22" rx="2.5" fill="var(--ill-areia)"/>
          <ellipse cx="15.5" cy="28" rx="16" ry="24" fill="var(--ill-salvia)" opacity="0.88"/>
          <ellipse cx="29" cy="36" rx="11" ry="16" fill="var(--ill-salvia)" opacity="0.58"/>
        </g>

        <!-- Pista de corrida em curva em perspectiva suave (areia var(--ill-areia)) -->
        <path d="M18 138 C86 102, 192 92, 302 126" fill="none" stroke="var(--ill-areia)" stroke-width="24" stroke-linecap="round" opacity="0.92"/>
        <path d="M26 138 C90 104, 192 94, 294 126" fill="none" stroke="var(--corrida-bg)" stroke-width="2" stroke-dasharray="8 8" stroke-linecap="round" opacity="0.45"/>

        <!-- Silhueta de corredor em ciclo de 4 quadros (1,1s) -->
        <g class="run-pre-runner" transform="translate(148, 46)">
          <ellipse cx="18" cy="64" rx="18" ry="4.5" fill="var(--ill-contorno)" opacity="0.45"/>
          <!-- Braço de trás -->
          <path d="M18 22 L6 32 L12 40" fill="none" stroke="var(--ill-areia)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" class="run-limb-arm-b"/>
          <!-- Perna de trás -->
          <path d="M16 38 L4 52 L-4 58" fill="none" stroke="var(--ill-areia)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" class="run-limb-leg-b"/>
          <!-- Tronco terracota -->
          <path d="M14 18 L20 38" stroke="var(--ill-argila)" stroke-width="11" stroke-linecap="round"/>
          <!-- Cabeça -->
          <circle cx="22" cy="8" r="8" fill="var(--ill-creme)"/>
          <path d="M16 6 Q23 2 29 6" fill="none" stroke="var(--ill-argila)" stroke-width="3" stroke-linecap="round"/>
          <!-- Perna da frente -->
          <path d="M18 38 L30 48 L34 60" fill="none" stroke="var(--ill-creme)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" class="run-limb-leg-f"/>
          <!-- Braço da frente -->
          <path d="M20 22 L32 28 L38 20" fill="none" stroke="var(--ill-creme)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" class="run-limb-arm-f"/>
        </g>

        <!-- Bolha "Bora?" acionada no toque -->
        <g class="run-pre-bora-bubble" transform="translate(184, 18)">
          <rect x="0" y="0" width="58" height="26" rx="13" fill="var(--ill-creme)" stroke="var(--ill-argila)" stroke-width="1.8"/>
          <path d="M10 25 L4 32 L18 25 Z" fill="var(--ill-creme)"/>
          <text x="29" y="17" text-anchor="middle" fill="var(--carvao-fixo)" font-family="Plus Jakarta Sans, sans-serif" font-size="12" font-weight="700">Bora?</text>
        </g>
      </svg>
    </div>
  `;
}

/**
 * 2. Cena "Buscando sinal":
 * Pino central em terracota com 3 ondas concêntricas de radar (scale 0.3→1.6,
 * opacity 0.7→0, 1,8s escalonadas).
 * Quando state === 'ok': ondas viram círculo verde-sálvia com check.
 * Quando state === 'weak': ondas ficam tracejadas em âmbar ().
 */
export function renderRunSignalScene(state = 'searching') {
  const isOk = state === 'ok';
  const isWeak = state === 'weak';
  const waveStroke = isOk ? 'var(--ill-salvia)' : isWeak ? 'var(--corrida-amber)' : 'var(--ill-argila)';
  const dashAttr = isWeak ? 'stroke-dasharray="6 5"' : '';

  return `
    <div class="run-signal-scene" data-signal-state="${state}" data-run-interactive="tap-pop">
      <svg viewBox="0 0 180 150" width="168" height="140" role="img" aria-label="Estado do sinal de GPS">
        ${
          isOk
            ? `
              <circle cx="90" cy="75" r="52" fill="rgba(var(--salvia-rgb), 0.16)" stroke="var(--ill-salvia)" stroke-width="2.5"/>
              <circle cx="90" cy="75" r="36" fill="var(--ill-salvia)"/>
              <path d="M74 75 L85 86 L108 63" fill="none" stroke="var(--ill-traco)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
            `
            : `
              <circle cx="90" cy="75" r="34" fill="none" stroke="${waveStroke}" stroke-width="2.5" ${dashAttr} class="run-radar-wave run-radar-wave-1"/>
              <circle cx="90" cy="75" r="34" fill="none" stroke="${waveStroke}" stroke-width="2.5" ${dashAttr} class="run-radar-wave run-radar-wave-2"/>
              <circle cx="90" cy="75" r="34" fill="none" stroke="${waveStroke}" stroke-width="2.5" ${dashAttr} class="run-radar-wave run-radar-wave-3"/>
              <!-- Pino central em terracota -->
              <g transform="translate(90, 75)">
                <path d="M0 -26 C13 -26, 22 -16, 22 -4 C22 11, 0 28, 0 28 C0 28, -22 11, -22 -4 C-22 -16, -13 -26, 0 -26 Z" fill="${waveStroke}" stroke="var(--ill-creme)" stroke-width="2"/>
                <circle cx="0" cy="-5" r="7" fill="var(--ill-creme)"/>
              </g>
            `
        }
      </svg>
    </div>
  `;
}

/**
 * 3. Cena "GPS negado":
 * Telefone estilizado em argila com pino e cadeado aberto em sálvia;
 * ao tocar, o cadeado balança suavemente.
 */
export function renderRunDeniedScene() {
  return `
    <div class="run-denied-scene" data-run-interactive="denied-lock" role="button" tabindex="0" aria-label="Ilustração de permissão de localização">
      <svg viewBox="0 0 180 150" width="168" height="140" role="img" aria-label="Telefone com pino de localização e cadeado aberto">
        <!-- Halo suave -->
        <circle cx="90" cy="76" r="56" fill="rgba(var(--areia-rgb), 0.1)"/>
        <!-- Corpo do telefone em argila -->
        <rect x="54" y="18" width="64" height="114" rx="16" fill="var(--corrida-superficie)" stroke="var(--ill-areia)" stroke-width="2.5"/>
        <line x1="76" y1="27" x2="96" y2="27" stroke="var(--ill-areia)" stroke-width="3" stroke-linecap="round"/>
        <!-- Pista interna + pino -->
        <path d="M64 104 Q86 82 108 96" fill="none" stroke="var(--ill-salvia)" stroke-width="4" stroke-linecap="round"/>
        <path d="M86 48 C94 48, 100 54, 100 62 C100 72, 86 84, 86 84 C86 84, 72 72, 72 62 C72 54, 78 48, 86 48 Z" fill="var(--ill-argila)"/>
        <circle cx="86" cy="61" r="4.5" fill="var(--ill-creme)"/>
        <!-- Cadeado aberto em sálvia que balança ao tocar -->
        <g class="run-denied-padlock" transform="translate(106, 72)" style="transform-origin: 18px 22px;">
          <path d="M10 16 V10 C10 4, 24 4, 24 10" fill="none" stroke="var(--ill-salvia)" stroke-width="3.5" stroke-linecap="round"/>
          <rect x="4" y="16" width="26" height="22" rx="7" fill="var(--ill-salvia)" stroke="var(--corrida-bg)" stroke-width="2"/>
          <circle cx="17" cy="27" r="2.8" fill="var(--ill-contorno)"/>
        </g>
      </svg>
    </div>
  `;
}

/**
 * 4. Cena da Contagem:
 * Anel concêntrico que pulsa a cada número (3, 2, 1, JÁ!).
 */
export function renderRunCountdownScene(label = '3') {
  const isGo = String(label).toUpperCase().includes('JÁ');
  const ringColor = isGo ? 'var(--ill-salvia)' : 'var(--ill-argila)';
  return `
    <div class="run-countdown-scene">
      <svg viewBox="0 0 240 240" width="220" height="220" aria-hidden="true">
        <circle cx="120" cy="120" r="102" fill="none" stroke="${ringColor}" stroke-width="3" opacity="0.24" class="run-countdown-ring-outer"/>
        <circle cx="120" cy="120" r="82" fill="none" stroke="var(--ill-areia)" stroke-width="2" stroke-dasharray="8 8" opacity="0.38"/>
        <circle cx="120" cy="120" r="66" fill="rgba(var(--terracota-rgb), 0.12)" stroke="${ringColor}" stroke-width="4" class="run-countdown-ring-inner"/>
      </svg>
      <div class="run-countdown-number ${isGo ? 'is-go' : ''}">${label}</div>
    </div>
  `;
}

/**
 * 6. Ícones de fase de Intervalos:
 * Dois selos vetoriais distintos — Trote (onda suave em sálvia) e Tiro (raio/faísca em terracota).
 */
export function renderIntervalPhaseIcon(fase = 'trote', size = 28) {
  if (fase === 'tiro') {
    return `
      <svg viewBox="0 0 32 32" width="${size}" height="${size}" role="img" aria-label="Fase de tiro forte">
        <circle cx="16" cy="16" r="15" fill="var(--terracota-profundo)"/>
        <path d="M18 6 L10 17 H16 L14 26 L22 15 H16 Z" fill="var(--ill-creme)" stroke="var(--ill-creme)" stroke-width="1.2" stroke-linejoin="round"/>
      </svg>
    `;
  }
  if (fase === 'aquecimento' || fase === 'volta_calma') {
    return `
      <svg viewBox="0 0 32 32" width="${size}" height="${size}" role="img" aria-label="Fase de aquecimento ou volta à calma">
        <circle cx="16" cy="16" r="15" fill="rgba(var(--areia-rgb), 0.22)" stroke="var(--ill-areia)" stroke-width="1.8"/>
        <circle cx="16" cy="16" r="6" fill="var(--ill-areia)"/>
      </svg>
    `;
  }
  // Trote: onda suave em sálvia
  return `
    <svg viewBox="0 0 32 32" width="${size}" height="${size}" role="img" aria-label="Fase de trote leve">
      <circle cx="16" cy="16" r="15" fill="rgba(var(--salvia-rgb), 0.22)" stroke="var(--ill-salvia)" stroke-width="1.8"/>
      <path d="M6 17 Q11 11 16 17 T26 17" fill="none" stroke="var(--ill-salvia)" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;
}

/**
 * 7. Anéis de Atividade (Evolução > Resumo D1.1):
 * 3 anéis concêntricos com pontas arredondadas, trilha translúcida e preenchimento
 * animado:
 * - Externo (terracota ): Sessões na semana vs meta semanal
 * - Médio (sálvia ): Minutos ativos na semana vs meta
 * - Interno (areia ): Consistência (dias ativos / meta)
 */
export function renderActivityRingsSvg({
  sessoesPct = 0,
  minutosPct = 0,
  consistenciaPct = 0,
  centerTop = '0/4',
  centerBottom = 'semana',
  size = 148
} = {}) {
  const clampPct = (v) => Math.max(0.04, Math.min(1, Number(v || 0)));
  const r1 = 58;
  const r2 = 44;
  const r3 = 30;
  const c1 = +(2 * Math.PI * r1).toFixed(1);
  const c2 = +(2 * Math.PI * r2).toFixed(1);
  const c3 = +(2 * Math.PI * r3).toFixed(1);

  const off1 = +(c1 * (1 - clampPct(sessoesPct))).toFixed(1);
  const off2 = +(c2 * (1 - clampPct(minutosPct))).toFixed(1);
  const off3 = +(c3 * (1 - clampPct(consistenciaPct))).toFixed(1);

  return `
    <div class="evo-rings-figure" data-run-interactive="tap-pop">
      <svg viewBox="0 0 140 140" width="${size}" height="${size}" role="img" aria-label="Anéis de atividade da semana: ${centerTop}">
        <g transform="rotate(-90 70 70)">
          <!-- Trilhas translúcidas -->
          <circle cx="70" cy="70" r="${r1}" fill="none" stroke="rgba(var(--terracota-rgb), 0.16)" stroke-width="10"/>
          <circle cx="70" cy="70" r="${r2}" fill="none" stroke="rgba(var(--salvia-rgb), 0.2)" stroke-width="10"/>
          <circle cx="70" cy="70" r="${r3}" fill="none" stroke="rgba(var(--areia-rgb), 0.24)" stroke-width="10"/>

          <!-- Preenchimentos com pontas arredondadas -->
          <circle
            cx="70"
            cy="70"
            r="${r1}"
            fill="none"
            stroke="var(--ill-argila)"
            stroke-width="10"
            stroke-linecap="round"
            stroke-dasharray="${c1}"
            stroke-dashoffset="${off1}"
            data-ring-circ="${c1}"
            data-ring-target="${off1}"
            class="evo-ring-stroke"
          />
          <circle
            cx="70"
            cy="70"
            r="${r2}"
            fill="none"
            stroke="var(--ill-salvia)"
            stroke-width="10"
            stroke-linecap="round"
            stroke-dasharray="${c2}"
            stroke-dashoffset="${off2}"
            data-ring-circ="${c2}"
            data-ring-target="${off2}"
            class="evo-ring-stroke"
          />
          <circle
            cx="70"
            cy="70"
            r="${r3}"
            fill="none"
            stroke="var(--ill-areia)"
            stroke-width="10"
            stroke-linecap="round"
            stroke-dasharray="${c3}"
            stroke-dashoffset="${off3}"
            data-ring-circ="${c3}"
            data-ring-target="${off3}"
            class="evo-ring-stroke"
          />
        </g>
        <text x="70" y="68" text-anchor="middle" fill="var(--tinta)" font-family="Instrument Serif, Georgia, serif" font-size="22" font-weight="400">${centerTop}</text>
        <text x="70" y="84" text-anchor="middle" fill="var(--tinta-2)" font-family="Plus Jakarta Sans, sans-serif" font-size="11" font-weight="600">${centerBottom}</text>
      </svg>
    </div>
  `;
}

/**
 * 8. Medalha de Recorde em argila:
 * Disco em areia  com borda terracota  e fita dupla em sálvia ;
 * brilho diagonal atravessa uma vez ao montar (900ms) e de novo ao tocar;
 * estado apagado (opacity: 0.4) quando o recorde ainda não existe.
 */
export function renderClayRecordMedal({ isMuted = false, size = 44 } = {}) {
  const uid = `medal_${Math.random().toString(36).slice(2, 8)}`;
  return `
    <div class="clay-record-medal ${isMuted ? 'is-muted' : 'has-shine'}" data-run-interactive="medal-shine" style="width:${size}px;height:${size}px;" aria-hidden="true">
      <svg viewBox="0 0 48 48" width="${size}" height="${size}">
        <defs>
          <clipPath id="${uid}">
            <circle cx="24" cy="26" r="15"/>
          </clipPath>
        </defs>
        <!-- Fita dupla em sálvia -->
        <path d="M15 6 L20 16 L13 18 L10 8 Z" fill="var(--ill-salvia)"/>
        <path d="M33 6 L28 16 L35 18 L38 8 Z" fill="var(--salvia-texto)"/>
        <!-- Disco em areia com borda terracota -->
        <circle cx="24" cy="26" r="15" fill="var(--ill-areia)" stroke="var(--ill-argila)" stroke-width="2.5"/>
        <circle cx="24" cy="26" r="11" fill="none" stroke="var(--ill-creme)" stroke-width="1.2" opacity="0.7"/>
        <!-- Estrela escultural no centro -->
        <path d="M24 18 L26.2 22.6 L31.2 23.3 L27.6 26.8 L28.5 31.8 L24 29.4 L19.5 31.8 L20.4 26.8 L16.8 23.3 L21.8 22.6 Z" fill="var(--ill-argila)"/>
        <!-- Brilho diagonal (900ms) -->
        <g clip-path="url(#${uid})">
          <rect x="-24" y="8" width="14" height="38" transform="rotate(25 24 26)" fill="rgba(var(--energia-fg-rgb), 0.65)" class="clay-medal-shine-bar"/>
        </g>
      </svg>
    </div>
  `;
}

/**
 * 9. Chama da Sequência (Streak):
 * Chama em 3 tamanhos (1–2 dias pequena, 3–6 dias média, 7+ dias grande com núcleo
 * claro ), oscilação suave de 3s; ao tocar, solta 3 faíscas que sobem e somem.
 */
export function renderStreakFlame({ dias = 1, size = 48 } = {}) {
  const d = Number(dias || 0);
  const tier = d >= 7 ? 'large' : d >= 3 ? 'medium' : 'small';
  const flameScale = tier === 'large' ? 1.0 : tier === 'medium' ? 0.86 : 0.72;

  return `
    <div class="clay-streak-flame-wrap is-${tier}" data-run-interactive="flame-sparks" role="button" tabindex="0" aria-label="Chama de sequência de ${d} dias. Toque para soltar faíscas">
      <svg viewBox="0 0 56 56" width="${size}" height="${size}">
        <circle cx="28" cy="30" r="22" fill="rgba(var(--terracota-rgb), 0.12)"/>
        <g class="clay-flame-body" transform="translate(28, 30) scale(${flameScale}) translate(-28, -30)">
          <!-- Chama externa terracota -->
          <path
            d="M28 7 C33 16, 44 21, 42 34 C40 43, 34 49, 28 49 C22 49, 14 43, 14 33 C14 23, 22 18, 24 12 C25 16, 27 17, 28 7 Z"
            fill="var(--ill-argila)"
            stroke="var(--terracota-profundo)"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <!-- Camada intermediária areia -->
          <path
            d="M28 18 C31 24, 37 27, 36 35 C35 41, 31 45, 28 45 C24 45, 20 41, 20 35 C20 29, 25 24, 28 18 Z"
            fill="var(--ill-areia)"
          />
          ${
            tier === 'large'
              ? `
                <!-- Núcleo claro var(--ill-creme) para 7+ dias -->
                <path
                  d="M28 27 C30 31, 33 33, 32 38 C31 42, 29 44, 28 44 C26 44, 24 42, 24 38 C24 34, 26 31, 28 27 Z"
                  fill="var(--ill-creme)"
                />
              `
              : ''
          }
        </g>
        <!-- 3 faíscas acionadas no toque -->
        <circle cx="20" cy="18" r="2.5" fill="var(--ill-argila)" class="flame-spark flame-spark-1"/>
        <circle cx="28" cy="12" r="3" fill="var(--ill-areia)" class="flame-spark flame-spark-2"/>
        <circle cx="36" cy="17" r="2.2" fill="var(--ill-argila)" class="flame-spark flame-spark-3"/>
      </svg>
    </div>
  `;
}

/**
 * 10. 5 cenas exclusivas de estado vazio da Evolução (nenhuma reutilizada de outras abas):
 * - 10a ('evolucao'): caderno de treino em argila aberto com página em branco,
 *   lápis terracota apoiado e broto verde-sálvia nascendo no canto.
 * - 10b ('forca'): par de halteres em repouso sobre tapete em sálvia com sombra suave.
 * - 10c ('corrida'): par de tênis estilizados ao lado de uma linha de largada em areia
 *   com bandeirinha terracota.
 * - 10d ('recordes'): pedestal em argila em três níveis com estrela pontilhada no topo.
 * - 10e ('historico'): calendário em argila com lupa suave em sálvia.
 */
export function renderEvolutionEmptyScene(tipo = 'evolucao') {
  if (tipo === 'forca') {
    // 10b. Aba Força sem treinos de força
    return `
      <div class="evo-empty-scene" data-run-interactive="empty-react" role="button" tabindex="0" aria-label="Ilustração de halteres em repouso">
        <svg viewBox="0 0 220 132" width="200" height="120" role="img" aria-label="Par de halteres em repouso sobre tapete sálvia">
          <!-- Tapete sálvia -->
          <rect x="24" y="76" width="172" height="36" rx="18" fill="var(--salvia-suave)" stroke="var(--ill-salvia)" stroke-width="1.8"/>
          <ellipse cx="110" cy="94" rx="64" ry="8" fill="var(--ill-salvia)" opacity="0.28"/>
          <!-- Haltere de trás -->
          <g class="evo-empty-actor" transform="translate(56, 46)">
            <rect x="22" y="16" width="52" height="8" rx="4" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.6"/>
            <rect x="8" y="4" width="16" height="32" rx="6" fill="var(--ill-salvia)" stroke="var(--ill-contorno)" stroke-width="1.6"/>
            <rect x="72" y="4" width="16" height="32" rx="6" fill="var(--ill-salvia)" stroke="var(--ill-contorno)" stroke-width="1.6"/>
          </g>
          <!-- Haltere da frente em terracota -->
          <g class="evo-empty-actor-primary" transform="translate(74, 58)">
            <rect x="22" y="16" width="56" height="9" rx="4.5" fill="var(--ill-contorno)"/>
            <rect x="6" y="2" width="18" height="36" rx="7" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
            <rect x="76" y="2" width="18" height="36" rx="7" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
          </g>
          <!-- Poeira suave ao tocar -->
          <circle cx="54" cy="88" r="4" fill="var(--ill-areia)" class="evo-empty-dust"/>
          <circle cx="168" cy="88" r="5" fill="var(--ill-areia)" class="evo-empty-dust"/>
        </svg>
      </div>
    `;
  }

  if (tipo === 'corrida') {
    // 10c. Aba Corrida sem corridas
    return `
      <div class="evo-empty-scene" data-run-interactive="empty-react" role="button" tabindex="0" aria-label="Ilustração de tênis na linha de largada">
        <svg viewBox="0 0 220 132" width="200" height="120" role="img" aria-label="Par de tênis ao lado de linha de largada com bandeirinha terracota">
          <!-- Pista e linha de largada em areia -->
          <path d="M18 104 H202" stroke="var(--ill-areia)" stroke-width="14" stroke-linecap="round"/>
          <line x1="148" y1="97" x2="148" y2="111" stroke="var(--ill-creme)" stroke-width="4" stroke-linecap="round"/>
          <!-- Bandeirinha terracota -->
          <g class="evo-empty-actor-primary" style="transform-origin: 158px 98px;">
            <line x1="158" y1="32" x2="158" y2="98" stroke="var(--ill-traco)" stroke-width="3" stroke-linecap="round"/>
            <path d="M158 34 L192 46 L158 58 Z" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.6" stroke-linejoin="round"/>
          </g>
          <!-- Par de tênis estilizados -->
          <g class="evo-empty-actor" transform="translate(42, 58)">
            <path d="M8 30 C12 16, 28 14, 38 22 L64 28 C72 30, 74 38, 66 40 L8 40 Z" fill="var(--ill-salvia)" stroke="var(--ill-contorno)" stroke-width="1.6"/>
            <path d="M18 32 C22 18, 38 16, 48 24 L76 30 C84 32, 86 40, 78 42 L18 42 Z" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
            <rect x="16" y="40" width="66" height="6" rx="3" fill="var(--ill-creme)" stroke="var(--ill-contorno)" stroke-width="1.4"/>
          </g>
          <circle cx="36" cy="96" r="4" fill="var(--ill-areia)" class="evo-empty-dust"/>
        </svg>
      </div>
    `;
  }

  if (tipo === 'recordes') {
    // 10d. Recordes ainda vazios: pedestal em argila em três níveis com estrela pontilhada esperando no topo
    return `
      <div class="evo-empty-scene" data-run-interactive="empty-react" role="button" tabindex="0" aria-label="Ilustração de pedestal de recordes">
        <svg viewBox="0 0 220 132" width="200" height="120" role="img" aria-label="Pedestal em argila em três níveis com estrela pontilhada no topo">
          <!-- Base de três níveis em argila -->
          <rect x="38" y="84" width="46" height="30" rx="8" fill="var(--salvia-suave)" stroke="var(--ill-contorno)" stroke-width="1.6"/>
          <rect x="84" y="68" width="52" height="46" rx="10" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
          <rect x="136" y="90" width="46" height="24" rx="8" fill="var(--superficie-2)" stroke="var(--ill-contorno)" stroke-width="1.6"/>
          <!-- Estrela pontilhada esperando no topo -->
          <g class="evo-empty-actor-primary" style="transform-origin: 110px 36px;">
            <path
              d="M110 14 L115.5 25.2 L128 27 L119 35.8 L121.2 48 L110 42.2 L98.8 48 L101 35.8 L92 27 L104.5 25.2 Z"
              fill="rgba(var(--terracota-rgb), 0.14)"
              stroke="var(--ill-argila)"
              stroke-width="2"
              stroke-dasharray="4 3"
              stroke-linejoin="round"
            />
          </g>
        </svg>
      </div>
    `;
  }

  if (tipo === 'historico') {
    // 10e. Histórico vazio no filtro escolhido: calendário em argila com lupa suave em sálvia
    return `
      <div class="evo-empty-scene" data-run-interactive="empty-react" role="button" tabindex="0" aria-label="Ilustração de calendário com lupa">
        <svg viewBox="0 0 220 132" width="200" height="120" role="img" aria-label="Calendário em argila com lupa suave em sálvia">
          <rect x="48" y="22" width="104" height="88" rx="16" fill="var(--ill-creme)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
          <path d="M48 44 H152" stroke="var(--ill-contorno)" stroke-width="1.6"/>
          <line x1="74" y1="16" x2="74" y2="28" stroke="var(--ill-argila)" stroke-width="4" stroke-linecap="round"/>
          <line x1="126" y1="16" x2="126" y2="28" stroke="var(--ill-argila)" stroke-width="4" stroke-linecap="round"/>
          <!-- Pontos dos dias -->
          <circle cx="72" cy="62" r="4" fill="var(--ill-areia)"/>
          <circle cx="100" cy="62" r="4" fill="var(--ill-areia)"/>
          <circle cx="128" cy="62" r="4" fill="var(--ill-areia)"/>
          <circle cx="72" cy="84" r="4" fill="var(--ill-areia)"/>
          <circle cx="100" cy="84" r="4" fill="var(--salvia-suave)"/>
          <!-- Lupa suave em sálvia -->
          <g class="evo-empty-actor-primary" style="transform-origin: 138px 82px;">
            <circle cx="134" cy="78" r="20" fill="rgba(var(--salvia-rgb), 0.25)" stroke="var(--ill-salvia)" stroke-width="3.5"/>
            <line x1="149" y1="93" x2="166" y2="110" stroke="var(--ill-traco)" stroke-width="4.5" stroke-linecap="round"/>
          </g>
        </svg>
      </div>
    `;
  }

  // 10a. Evolução sem nenhuma sessão: caderno de treino em argila aberto com página em branco,
  // lápis terracota apoiado e broto verde-sálvia nascendo no canto.
  return `
    <div class="evo-empty-scene" data-run-interactive="empty-react" role="button" tabindex="0" aria-label="Ilustração de caderno de treino em branco com broto sálvia">
      <svg viewBox="0 0 220 132" width="200" height="120" role="img" aria-label="Caderno de treino em argila aberto com lápis terracota e broto verde-sálvia">
        <!-- Sombra base -->
        <ellipse cx="110" cy="112" rx="76" ry="10" fill="var(--ill-areia)" opacity="0.35"/>
        <!-- Caderno aberto -->
        <path d="M40 34 Q75 28 110 36 L110 104 Q75 96 40 102 Z" fill="var(--ill-creme)" stroke="var(--ill-contorno)" stroke-width="1.75" stroke-linejoin="round"/>
        <path d="M110 36 Q145 28 180 34 L180 102 Q145 96 110 104 Z" fill="var(--ill-creme)" stroke="var(--ill-contorno)" stroke-width="1.75" stroke-linejoin="round" class="evo-empty-actor"/>
        <!-- Linhas sutis na página esquerda -->
        <line x1="54" y1="54" x2="96" y2="54" stroke="var(--ill-areia)" stroke-width="2" stroke-linecap="round"/>
        <line x1="54" y1="68" x2="90" y2="68" stroke="var(--ill-areia)" stroke-width="2" stroke-linecap="round"/>
        <!-- Broto verde-sálvia nascendo no canto -->
        <g class="evo-empty-actor-primary" style="transform-origin: 164px 36px;">
          <path d="M164 42 V20" stroke="var(--salvia-texto)" stroke-width="2.8" stroke-linecap="round"/>
          <path d="M164 26 C152 24, 150 14, 162 16 C164 17, 164 22, 164 26 Z" fill="var(--ill-salvia)"/>
          <path d="M164 22 C176 20, 178 10, 166 12 C164 13, 164 18, 164 22 Z" fill="var(--ill-salvia)"/>
        </g>
        <!-- Lápis terracota apoiado -->
        <g class="evo-empty-actor" transform="rotate(-18 136 82)">
          <rect x="104" y="76" width="58" height="9" rx="4.5" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.5"/>
          <polygon points="162,76 174,80.5 162,85" fill="var(--ill-areia)" stroke="var(--ill-contorno)" stroke-width="1.4" stroke-linejoin="round"/>
        </g>
      </svg>
    </div>
  `;
}

/**
 * 11. 6 cenas exclusivas dos "Tipos de corrida" na Biblioteca (C9.2):
 * Cada uma das 6 cartas tem composição própria e única validada por `auditarCenas()`.
 */
export function renderRunTypeCardScene(sceneKey = 'leve-20', { isThumb = false } = {}) {
  const vb = '0 0 160 110';
  const attrs = `viewBox="${vb}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img"`;

  switch (sceneKey) {
    case 'leve-20':
      // 1. Corrida leve 20 min: relógio de 20 min em areia + pista suave + brisa sálvia
      return `
        <svg ${attrs} aria-label="Cena Corrida leve 20 minutos">
          <rect width="160" height="110" rx="16" fill="var(--ill-palco-cor)"/>
          <circle cx="38" cy="36" r="18" fill="var(--salvia-suave)" stroke="var(--ill-salvia)" stroke-width="2"/>
          <path d="M38 26 V36 L45 40" fill="none" stroke="var(--ill-traco)" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M14 90 Q80 68 146 88" fill="none" stroke="var(--ill-areia)" stroke-width="12" stroke-linecap="round"/>
          <path d="M68 44 Q96 36 124 44" fill="none" stroke="var(--ill-salvia)" stroke-width="3" stroke-linecap="round"/>
          <circle cx="112" cy="62" r="12" fill="var(--ill-argila)"/>
          <path d="M92 74 L132 74" stroke="var(--ill-contorno)" stroke-width="4" stroke-linecap="round"/>
        </svg>
      `;

    case 'rodagem-5k':
      // 2. Rodagem 5 km: marco escultural "5K" em terracota + estrada curva com árvore sálvia
      return `
        <svg ${attrs} aria-label="Cena Rodagem 5 quilômetros">
          <rect width="160" height="110" rx="16" fill="var(--ill-palco-cor)"/>
          <path d="M16 94 C58 64, 104 64, 144 92" fill="none" stroke="var(--ill-areia)" stroke-width="14" stroke-linecap="round"/>
          <ellipse cx="36" cy="52" rx="13" ry="19" fill="var(--ill-salvia)"/>
          <rect x="88" y="24" width="44" height="34" rx="10" fill="var(--ill-argila)" stroke="var(--ill-contorno)" stroke-width="1.75"/>
          <text x="110" y="46" text-anchor="middle" fill="var(--ill-creme)" font-family="Plus Jakarta Sans, sans-serif" font-size="15" font-weight="800">5K</text>
        </svg>
      `;

    case 'ritmo-30':
      // 3. Ritmo controlado 30 min: faixa horizontal de ritmo com agulha centralizada em sálvia
      return `
        <svg ${attrs} aria-label="Cena Ritmo controlado 30 minutos">
          <rect width="160" height="110" rx="16" fill="var(--ill-palco-cor)"/>
          <rect x="20" y="38" width="120" height="18" rx="9" fill="var(--ill-areia)"/>
          <rect x="56" y="38" width="48" height="18" rx="6" fill="var(--ill-salvia)"/>
          <circle cx="80" cy="47" r="11" fill="var(--ill-argila)" stroke="var(--ill-creme)" stroke-width="2.5"/>
          <path d="M26 84 H134" stroke="var(--ill-contorno)" stroke-width="3" stroke-dasharray="6 6" stroke-linecap="round"/>
        </svg>
      `;

    case 'tiros-6x400':
      // 4. Tiros 6 × 400 m: oval de pista de 400m em terracota com 6 barras de velocidade
      return `
        <svg ${attrs} aria-label="Cena Tiros 6 por 400 metros">
          <rect width="160" height="110" rx="16" fill="var(--ill-palco-cor)"/>
          <rect x="22" y="32" width="116" height="52" rx="26" fill="none" stroke="var(--ill-argila)" stroke-width="8"/>
          <rect x="28" y="38" width="104" height="40" rx="20" fill="none" stroke="var(--ill-areia)" stroke-width="2" stroke-dasharray="5 5"/>
          <g fill="var(--ill-traco)">
            <rect x="50" y="50" width="6" height="16" rx="3"/>
            <rect x="61" y="47" width="6" height="19" rx="3"/>
            <rect x="72" y="44" width="6" height="22" rx="3"/>
            <rect x="83" y="47" width="6" height="19" rx="3"/>
            <rect x="94" y="44" width="6" height="22" rx="3"/>
            <rect x="105" y="41" width="6" height="25" rx="3" fill="var(--terracota-profundo)"/>
          </g>
        </svg>
      `;

    case 'intervalado-8x1':
      // 5. Intervalado 8 × 1 min: 8 blocos alternando tiro terracota alto e trote sálvia baixo
      return `
        <svg ${attrs} aria-label="Cena Intervalado 8 por 1 minuto">
          <rect width="160" height="110" rx="16" fill="var(--ill-palco-cor)"/>
          <line x1="16" y1="88" x2="144" y2="88" stroke="var(--ill-traco)" stroke-width="2" stroke-linecap="round"/>
          <rect x="20" y="36" width="11" height="50" rx="5.5" fill="var(--ill-argila)"/>
          <rect x="35" y="60" width="11" height="26" rx="5.5" fill="var(--ill-salvia)"/>
          <rect x="50" y="32" width="11" height="54" rx="5.5" fill="var(--ill-argila)"/>
          <rect x="65" y="60" width="11" height="26" rx="5.5" fill="var(--ill-salvia)"/>
          <rect x="80" y="28" width="11" height="58" rx="5.5" fill="var(--ill-argila)"/>
          <rect x="95" y="60" width="11" height="26" rx="5.5" fill="var(--ill-salvia)"/>
          <rect x="110" y="24" width="11" height="62" rx="5.5" fill="var(--terracota-profundo)"/>
          <rect x="125" y="60" width="11" height="26" rx="5.5" fill="var(--ill-salvia)"/>
        </svg>
      `;

    case 'longao-8k':
    default:
      // 6. Longão de fim de semana: horizonte de colinas em camadas + sol grande + trilha longa sinuosa
      return `
        <svg ${attrs} aria-label="Cena Longão de fim de semana">
          <rect width="160" height="110" rx="16" fill="var(--ill-palco-cor)"/>
          <circle cx="122" cy="30" r="16" fill="var(--ill-areia)"/>
          <path d="M0 78 Q46 48 96 72 T160 66 L160 110 L0 110 Z" fill="var(--salvia-suave)"/>
          <path d="M0 90 Q64 68 118 84 T160 80 L160 110 L0 110 Z" fill="var(--ill-salvia)" opacity="0.72"/>
          <path d="M18 104 C52 88, 74 72, 128 58" fill="none" stroke="var(--ill-argila)" stroke-width="6" stroke-linecap="round"/>
          <circle cx="128" cy="58" r="5" fill="var(--ill-creme)" stroke="var(--terracota-profundo)" stroke-width="2.5"/>
        </svg>
      `;
  }
}

/**
 * Conecta microinterações de toque para todas as cenas da Parte E dentro de `rootEl`.
 */
export function wireRunIllustrations(rootEl = document) {
  if (!rootEl) return;

  // 1. Pré-corrida: acelerar corredor por 1,5s e mostrar bolha "Bora?"
  rootEl.querySelectorAll('[data-run-interactive="pre-runner"]').forEach((el) => {
    if (el.dataset.boundTap === '1') return;
    el.dataset.boundTap = '1';
    const triggerBora = () => {
      vibrate('selecao');
      el.classList.add('is-boosted');
      clearTimeout(el._boraTimer);
      el._boraTimer = setTimeout(() => {
        el.classList.remove('is-boosted');
      }, 1500);
    };
    el.addEventListener('click', triggerBora);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerBora();
      }
    });
  });

  // 3. GPS negado: balançar cadeado ao tocar
  rootEl.querySelectorAll('[data-run-interactive="denied-lock"]').forEach((el) => {
    if (el.dataset.boundTap === '1') return;
    el.dataset.boundTap = '1';
    el.addEventListener('click', () => {
      vibrate('selecao');
      el.classList.remove('is-wiggling');
      void el.offsetWidth;
      el.classList.add('is-wiggling');
    });
  });

  // 8. Medalha: repetir brilho diagonal ao tocar
  rootEl.querySelectorAll('[data-run-interactive="medal-shine"]').forEach((el) => {
    if (el.dataset.boundTap === '1') return;
    el.dataset.boundTap = '1';
    el.addEventListener('click', () => {
      vibrate('selecao');
      el.classList.remove('has-shine');
      void el.offsetWidth;
      el.classList.add('has-shine');
    });
  });

  // 9. Chama da sequência: soltar 3 faíscas ao tocar
  rootEl.querySelectorAll('[data-run-interactive="flame-sparks"]').forEach((el) => {
    if (el.dataset.boundTap === '1') return;
    el.dataset.boundTap = '1';
    el.addEventListener('click', () => {
      vibrate('selecao');
      el.classList.remove('is-sparking');
      void el.offsetWidth;
      el.classList.add('is-sparking');
      clearTimeout(el._sparkTimer);
      el._sparkTimer = setTimeout(() => {
        el.classList.remove('is-sparking');
      }, 950);
    });
  });

  // 10. Cenas de estado vazio e pop geral: reação ao toque (scale 0.96 -> 1.03 -> 1)
  rootEl
    .querySelectorAll('[data-run-interactive="empty-react"], [data-run-interactive="tap-pop"]')
    .forEach((el) => {
      if (el.dataset.boundTap === '1') return;
      el.dataset.boundTap = '1';
      el.addEventListener('click', () => {
        vibrate('selecao');
        el.classList.remove('is-popping');
        void el.offsetWidth;
        el.classList.add('is-popping');
        clearTimeout(el._popTimer);
        el._popTimer = setTimeout(() => {
          el.classList.remove('is-popping');
        }, 650);
      });
    });
}
