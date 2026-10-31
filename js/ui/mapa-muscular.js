/**
 * ============================================================================
 * CLAY FIT — COMPONENTE DE MAPA MUSCULAR ANATÔMICO (MINI 64×64 E GRANDE 16:9)
 * /js/ui/mapa-muscular.js
 *
 * Especificações Prompt 7.1 (Parte A1, A2, A3 e A4):
 * - Zero chamadas de rede, < 2ms por renderização, funciona nos 2 temas.
 * - Músculo principal em var(--ill-terracota) (#E2573B -> rgb(226, 87, 59)) com
 *   opacidade 1;
 * - Músculos secundários em var(--ill-areia) (#D9B98A -> rgb(217, 185, 138)) com
 *   opacidade 0.8;
 * - Corpo base em cinza-argila var(--ill-corpo-base) com contraste claro contra
 *   o fundo do cartão nos dois temas, contorno fino var(--ill-corpo-contorno) e
 *   linhas sutis de divisão muscular var(--ill-corpo-linha). Zero preto puro.
 * - Em `costas-levantamento-terra`, destaca Posterior de coxa e Glúteos como
 *   principais e Lombar, Dorsais e Trapézio como secundários.
 * ============================================================================
 */

import { TAXONOMIA_MUSCULOS } from '../data/exercicios/taxonomia.js';
import {
  SILHUETA_BASE_PATHS,
  SILHUETA_LINHAS_ANATOMICAS,
  REGIOES_MAPA_MUSCULAR
} from '../data/exercicios/mapa-muscular.js';

function renderBodySilhouetteSvg(vista = 'frente', primarios = [], secundarios = []) {
  const basePaths = Object.values(SILHUETA_BASE_PATHS)
    .map(
      (d) =>
        `<path class="muscle-map-body" d="${d}" fill="var(--ill-corpo-base)" stroke="var(--ill-corpo-contorno)" stroke-width="1.15" stroke-linejoin="round" />`
    )
    .join('');

  const anatomyLines = (SILHUETA_LINHAS_ANATOMICAS[vista] || [])
    .map(
      (d) =>
        `<path class="muscle-map-line" d="${d}" fill="none" stroke="var(--ill-corpo-linha)" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round" />`
    )
    .join('');

  const secPaths = [];
  secundarios.forEach((muscNome) => {
    const info = TAXONOMIA_MUSCULOS[muscNome];
    if (!info) return;
    const reg = REGIOES_MAPA_MUSCULAR[info.regiao];
    if (!reg || !Array.isArray(reg[vista])) return;
    reg[vista].forEach((d) => {
      secPaths.push(
        `<path class="muscle-map-secondary" data-muscle-role="secundario" data-muscle-name="${muscNome}" d="${d}" fill="var(--ill-areia)" opacity="0.8" fill-opacity="0.8" stroke="var(--ill-corpo-contorno)" stroke-width="0.7" stroke-linejoin="round" />`
      );
    });
  });

  const priPaths = [];
  primarios.forEach((muscNome) => {
    const info = TAXONOMIA_MUSCULOS[muscNome];
    if (!info) return;
    const reg = REGIOES_MAPA_MUSCULAR[info.regiao];
    if (!reg || !Array.isArray(reg[vista])) return;
    reg[vista].forEach((d) => {
      priPaths.push(
        `<path class="muscle-map-primary" data-muscle-role="principal" data-muscle-name="${muscNome}" d="${d}" fill="var(--ill-terracota)" opacity="1" fill-opacity="1" stroke="var(--ill-creme)" stroke-width="0.65" stroke-opacity="0.5" stroke-linejoin="round" />`
      );
    });
  });

  return `
    <g class="muscle-body-group" data-vista="${vista}">
      ${basePaths}
      ${anatomyLines}
      ${secPaths.join('')}
      ${priPaths.join('')}
    </g>
  `;
}

export function renderMapaMuscular(exercicio = {}, { tamanho = 'mini' } = {}) {
  const musculoPrincipal = exercicio?.musculoPrincipal || 'Peitoral';
  const rawSecundarios = Array.isArray(exercicio?.musculosSecundarios)
    ? exercicio.musculosSecundarios
    : [];

  const isLevantamentoTerra = exercicio?.id === 'costas-levantamento-terra';
  const primarios = isLevantamentoTerra
    ? ['Posterior de coxa', 'Glúteos']
    : [musculoPrincipal];
  const secundarios = isLevantamentoTerra
    ? rawSecundarios.filter((m) => m !== 'Glúteos' && m !== 'Posterior de coxa')
    : rawSecundarios;

  const infoPrincipal = TAXONOMIA_MUSCULOS[musculoPrincipal] || TAXONOMIA_MUSCULOS.Peitoral;
  const vistaPrincipal = infoPrincipal.vistaPrincipal || 'frente';

  if (tamanho === 'mini') {
    const zoomBox = isLevantamentoTerra
      ? '46 92 108 134'
      : infoPrincipal.zoomViewBox || '44 28 112 112';
    return `
      <svg
        class="clay-muscle-map clay-muscle-map--mini"
        viewBox="${zoomBox}"
        width="64"
        height="64"
        role="img"
        aria-label="Mapa muscular destacando ${primarios.join(' e ')}"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="0" y="0" width="200" height="280" fill="var(--ill-palco-cor)" opacity="0.01" />
        ${renderBodySilhouetteSvg(vistaPrincipal, primarios, secundarios)}
      </svg>
    `;
  }

  // Tamanho 'grande' (16:9 no topo de #/exercicio/:id): exibe Frente e Costas lado a lado
  return `
    <svg
      class="clay-muscle-map clay-muscle-map--grande"
      viewBox="0 0 480 270"
      width="100%"
      height="100%"
      role="img"
      aria-label="Mapa muscular de frente e costas destacando ${primarios.join(' e ')}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" width="480" height="270" rx="20" fill="var(--ill-palco-cor)" />
      <g transform="translate(52, -4) scale(0.92)">
        ${renderBodySilhouetteSvg('frente', primarios, secundarios)}
      </g>
      <g transform="translate(244, -4) scale(0.92)">
        ${renderBodySilhouetteSvg('costas', primarios, secundarios)}
      </g>
      <text x="144" y="258" text-anchor="middle" fill="var(--tinta-3)" font-size="11" font-weight="600" font-family="var(--font-sans)">Frente</text>
      <text x="336" y="258" text-anchor="middle" fill="var(--tinta-3)" font-size="11" font-weight="600" font-family="var(--font-sans)">Costas</text>
    </svg>
  `;
}

export default { renderMapaMuscular };
