/**
 * ============================================================================
 * CLAY FIT — ARTE DO TRAJETO ("CLAY ROUTE ART") E MINIATURA 96×96 (C6.1 & C5)
 * /js/run/route-art.js
 *
 * Especificação Prompt 4 (C6.1) + Prompt 5.1 (C5):
 * - Funciona 100% sem rede e 100% tokenizado (zero rgba/hex literal):
 *   - Fundo em `var(--corrida-superficie)` (Modo Energia) ou `var(--ill-palco-cor)`
 *     (Resumo/Detalhe) com grade sutil (`--rota-grade`) e 4 curvas de nível
 *     orgânicas procedurais (`--rota-curva`) lidas via `corToken()` e redesenhadas
 *     automaticamente ao ouvir `'clay:tema'`.
 * ============================================================================
 */

import { haversineMeters } from './geo.js';
import { decodeRouteToTrack, computeBoundingBox } from './polyline.js';
import { corToken } from '../ui/theme.js';

function hashBboxSeed(bbox) {
  if (!Array.isArray(bbox) || bbox.length < 4) return 42;
  const sum =
    Math.abs(Math.round(bbox[0] * 10000)) +
    Math.abs(Math.round(bbox[1] * 10000)) * 3 +
    Math.abs(Math.round(bbox[2] * 10000)) * 7;
  return (sum % 997) + 17;
}

function getRouteContourColors() {
  const strokeColor = corToken('--rota-curva') || 'var(--rota-curva)';
  const gridColor = corToken('--rota-grade') || 'var(--rota-grade)';
  return { strokeColor, gridColor };
}

function buildProceduralContoursSvg(width, height, seed) {
  const { strokeColor, gridColor } = getRouteContourColors();

  const gridLines = [];
  for (let x = 32; x < width; x += 32) {
    gridLines.push(
      `<line class="route-art-grid-line" x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${gridColor}" stroke-width="1"/>`
    );
  }
  for (let y = 32; y < height; y += 32) {
    gridLines.push(
      `<line class="route-art-grid-line" x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${gridColor}" stroke-width="1"/>`
    );
  }

  const contours = [];
  const count = 4;
  for (let i = 0; i < count; i++) {
    const yBase = ((i + 1) / (count + 1)) * height;
    const amp1 = 16 + ((seed + i * 13) % 18);
    const amp2 = 12 + ((seed + i * 29) % 16);
    const dir = i % 2 === 0 ? 1 : -1;
    const yStart = Math.round(yBase + dir * amp1 * 0.5);
    const cp1x = Math.round(width * 0.28);
    const cp1y = Math.round(yBase - dir * amp1);
    const cp2x = Math.round(width * 0.68);
    const cp2y = Math.round(yBase + dir * amp2);
    const yEnd = Math.round(yBase - dir * amp2 * 0.4);
    contours.push(
      `<path class="route-art-contour-path" d="M -10 ${yStart} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${width + 10} ${yEnd}" fill="none" stroke="${strokeColor}" stroke-width="1" stroke-linecap="round"/>`
    );
  }

  return `${gridLines.join('')}${contours.join('')}`;
}

if (typeof window !== 'undefined') {
  window.addEventListener('clay:tema', () => {
    const { strokeColor, gridColor } = getRouteContourColors();
    document.querySelectorAll('.route-art-grid-line').forEach((el) => {
      el.setAttribute('stroke', gridColor);
    });
    document.querySelectorAll('.route-art-contour-path').forEach((el) => {
      el.setAttribute('stroke', strokeColor);
    });
  });
}

/**
 * Projeta pontos geográficos para coordenadas SVG com margem de 18% nos 4 lados.
 */
export function projectTrackPoints(points = [], width = 320, height = 180, marginRatio = 0.18) {
  if (!Array.isArray(points) || points.length === 0) {
    return { projected: [], spanM: 0, bbox: null };
  }

  const bbox = computeBoundingBox(points);
  const [minLat, minLng, maxLat, maxLng] = bbox;
  const spanM = haversineMeters({ lat: minLat, lng: minLng }, { lat: maxLat, lng: maxLng });

  const padX = width * marginRatio;
  const padY = height * marginRatio;
  const innerW = Math.max(20, width - padX * 2);
  const innerH = Math.max(20, height - padY * 2);

  const cosLat = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180) || 1;
  const rawW = Math.max(0.00018, (maxLng - minLng) * cosLat);
  const rawH = Math.max(0.00018, maxLat - minLat);

  const scale = Math.min(innerW / rawW, innerH / rawH);
  const usedW = rawW * scale;
  const usedH = rawH * scale;
  const offsetX = padX + (innerW - usedW) / 2;
  const offsetY = padY + (innerH - usedH) / 2;

  const projected = [];
  let cumDistM = 0;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    let segDistM = 0;
    let segSpeedMps = 2.8;
    if (i > 0) {
      const prev = points[i - 1];
      segDistM = haversineMeters(prev, pt);
      cumDistM += segDistM;
      const dtSec = Math.max(0.5, ((pt.t || 0) - (prev.t || 0)) / 1000);
      if (pt.t && prev.t && dtSec > 0) {
        segSpeedMps = segDistM / dtSec;
      }
    }
    const x = +(offsetX + (pt.lng - minLng) * cosLat * scale).toFixed(1);
    const y = +(offsetY + (maxLat - pt.lat) * scale).toFixed(1);
    projected.push({
      x,
      y,
      lat: pt.lat,
      lng: pt.lng,
      t: pt.t,
      cumDistM,
      segSpeedMps
    });
  }

  return { projected, spanM, bbox };
}

/**
 * Renderiza o SVG completo da Arte do Trajeto ("Clay Route Art").
 */
export function renderRouteArtSvg({
  points = [],
  rota = null,
  width = 340,
  height = 188,
  isDark = true,
  isFinished = false,
  animateDraw = false,
  showStreetToggle = false,
  streetsActive = false,
  highlightKm = null
} = {}) {
  let trackPoints = Array.isArray(points) && points.length > 0 ? points : [];
  if (trackPoints.length === 0 && rota && rota.polyline) {
    trackPoints = decodeRouteToTrack(rota.polyline, rota.temposB36 || '');
  }

  const bgFill = isDark ? 'var(--corrida-superficie)' : 'var(--ill-palco-cor)';
  const textFill = isDark ? 'var(--corrida-fg-2)' : 'var(--tinta-2)';
  const { projected, spanM, bbox } = projectTrackPoints(trackPoints, width, height, 0.18);
  const seed = hashBboxSeed(bbox || (rota && rota.bbox));
  const contoursSvg = buildProceduralContoursSvg(width, height, seed);

  // Estado inicial quando há menos de 2 pontos ou menos de 20m percorridos
  if (projected.length < 2 || spanM < 20) {
    const cx = Math.round(width / 2);
    const cy = Math.round(height / 2 - 10);
    return `
      <div class="clay-route-art-box ${isDark ? 'is-dark' : 'is-light'}" style="position:relative;width:100%;height:100%;">
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Arte do trajeto aguardando movimento">
          <rect width="${width}" height="${height}" rx="20" fill="${bgFill}"/>
          ${contoursSvg}
          <circle cx="${cx}" cy="${cy}" r="18" fill="rgba(var(--terracota-rgb), 0.24)" class="route-art-pulse-halo"/>
          <circle cx="${cx}" cy="${cy}" r="7" fill="var(--terracota)" stroke="var(--creme-fixo)" stroke-width="2.2"/>
          <text x="${cx}" y="${cy + 36}" text-anchor="middle" fill="${textFill}" font-family="Plus Jakarta Sans, sans-serif" font-size="12" font-weight="600">Trajeto aparece conforme você avança</text>
        </svg>
      </div>
    `;
  }

  // Constrói o caminho principal e os segmentos coloridos por velocidade relativa
  const fullPathD = projected
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x} ${p.y}`)
    .join(' ');

  const speeds = projected.slice(1).map((p) => p.segSpeedMps);
  const avgSpeed =
    speeds.reduce((acc, v) => acc + v, 0) / Math.max(1, speeds.length) || 2.8;

  const chunkSize = Math.max(1, Math.ceil((projected.length - 1) / 24));
  const coloredSegments = [];
  for (let i = 0; i < projected.length - 1; i += chunkSize) {
    const slice = projected.slice(i, Math.min(projected.length, i + chunkSize + 1));
    if (slice.length < 2) continue;
    const chunkAvgSpeed =
      slice.slice(1).reduce((s, p) => s + p.segSpeedMps, 0) / (slice.length - 1);
    let segColor = 'var(--terracota)'; // ritmo médio
    if (chunkAvgSpeed > avgSpeed * 1.07) {
      segColor = 'var(--terracota-profundo)'; // trecho mais rápido
    } else if (chunkAvgSpeed < avgSpeed * 0.93) {
      segColor = 'var(--salvia)'; // trecho mais leve
    }
    const d = slice.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
    coloredSegments.push(
      `<path d="${d}" fill="none" stroke="${segColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="${animateDraw ? 'route-art-draw-path' : ''}"/>`
    );
  }

  // Marcos de cada 1 km completo
  const kmMarkers = [];
  const totalDistM = projected[projected.length - 1].cumDistM;
  const maxKm = Math.min(42, Math.floor(totalDistM / 1000));
  for (let km = 1; km <= maxKm; km++) {
    const targetM = km * 1000;
    const pt = projected.find((p) => p.cumDistM >= targetM);
    if (pt) {
      const isHighlighted = Number(highlightKm) === km;
      const r = isHighlighted ? 12 : 10;
      const fill = isHighlighted ? 'var(--terracota)' : 'var(--creme-fixo)';
      const txtColor = isHighlighted ? 'var(--creme-fixo)' : 'var(--carvao-fixo)';
      kmMarkers.push(`
        <g class="route-km-marker ${isHighlighted ? 'is-highlighted' : ''}" data-km-marker="${km}" transform="translate(${pt.x}, ${pt.y})" style="cursor:pointer;">
          <circle cx="0" cy="0" r="${r}" fill="${fill}" stroke="var(--carvao-fixo)" stroke-width="1.6"/>
          <text x="0" y="3.8" text-anchor="middle" fill="${txtColor}" font-family="Plus Jakarta Sans, sans-serif" font-size="11" font-weight="700">${km}</text>
        </g>
      `);
    }
  }

  const startPt = projected[0];
  const endPt = projected[projected.length - 1];

  return `
    <div class="clay-route-art-box ${isDark ? 'is-dark' : 'is-light'}" data-route-bbox="${(bbox || []).join(',')}" style="position:relative;width:100%;height:100%;overflow:hidden;border-radius:20px;">
      <canvas class="route-osm-canvas" style="position:absolute;inset:0;width:100%;height:100%;display:${streetsActive ? 'block' : 'none'};pointer-events:none;"></canvas>
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa vetorial do trajeto percorrido" style="position:relative;z-index:1;">
        <rect width="${width}" height="${height}" rx="20" fill="${streetsActive ? 'transparent' : bgFill}" class="route-art-bg-rect"/>
        <g class="route-art-contours" style="opacity:${streetsActive ? '0.2' : '1'};">
          ${contoursSvg}
        </g>
        <!-- Camada base 8px translúcida -->
        <path d="${fullPathD}" fill="none" stroke="rgba(var(--terracota-rgb), 0.22)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Camada principal 4px colorida por velocidade -->
        ${coloredSegments.join('')}
        <!-- Ponto de início: 10px sálvia var(--salvia) com borda var(--creme-fixo) -->
        <circle cx="${startPt.x}" cy="${startPt.y}" r="5" fill="var(--salvia)" stroke="var(--creme-fixo)" stroke-width="2"/>
        <!-- Marcos de km -->
        ${kmMarkers.join('')}
        <!-- Ponto final: bandeirinha se concluída ou círculo 12px com halo pulsante se ao vivo -->
        ${
          isFinished
            ? `
              <g transform="translate(${endPt.x}, ${endPt.y})">
                <circle cx="0" cy="0" r="6" fill="var(--terracota)" stroke="var(--creme-fixo)" stroke-width="2"/>
                <line x1="0" y1="0" x2="0" y2="-18" stroke="var(--creme-fixo)" stroke-width="2.2" stroke-linecap="round"/>
                <path d="M0 -18 L13 -13 L0 -8 Z" fill="var(--terracota)" stroke="var(--creme-fixo)" stroke-width="1" stroke-linejoin="round"/>
              </g>
            `
            : `
              <g transform="translate(${endPt.x}, ${endPt.y})">
                <circle cx="0" cy="0" r="11" fill="rgba(var(--terracota-rgb), 0.45)" class="route-art-pulse-halo"/>
                <circle cx="0" cy="0" r="6" fill="var(--terracota)" stroke="var(--creme-fixo)" stroke-width="2"/>
              </g>
            `
        }
      </svg>
      ${
        showStreetToggle
          ? `
            <button type="button" class="route-streets-toggle-btn ${streetsActive ? 'is-active' : ''}" data-action="toggle-route-streets" aria-label="Alternar visualização de ruas no mapa">
              Ruas
            </button>
          `
          : ''
      }
      <span class="route-osm-attribution" style="display:${streetsActive ? 'block' : 'none'};">© OpenStreetMap</span>
    </div>
  `;
}

/**
 * Renderiza miniatura `96×96` (ou tamanho customizado) da Arte do Trajeto para cartões
 * do Histórico e da aba Corrida na Evolução.
 */
export function renderRouteArtThumbSvg(rota = null, size = 56) {
  let pts = [];
  if (rota && rota.polyline) {
    pts = decodeRouteToTrack(rota.polyline, rota.temposB36 || '');
  }
  const { projected, spanM } = projectTrackPoints(pts, 96, 96, 0.18);
  const { strokeColor } = getRouteContourColors();

  if (projected.length < 2 || spanM < 15) {
    return `
      <svg viewBox="0 0 96 96" width="${size}" height="${size}" role="img" aria-label="Miniatura de corrida">
        <rect width="96" height="96" rx="18" fill="var(--ill-palco-cor)"/>
        <path d="M18 66 Q48 26 78 52" fill="none" stroke="var(--terracota)" stroke-width="5" stroke-linecap="round"/>
        <circle cx="18" cy="66" r="4" fill="var(--salvia)"/>
        <circle cx="78" cy="52" r="4.5" fill="var(--terracota)" stroke="var(--creme-fixo)" stroke-width="1.5"/>
      </svg>
    `;
  }

  const d = projected.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const start = projected[0];
  const end = projected[projected.length - 1];

  return `
    <svg viewBox="0 0 96 96" width="${size}" height="${size}" role="img" aria-label="Miniatura do trajeto percorrido">
      <rect width="96" height="96" rx="18" fill="var(--ill-palco-cor)"/>
      <path class="route-art-contour-path" d="M 8 32 Q 48 18 88 36" fill="none" stroke="${strokeColor}" stroke-width="1"/>
      <path class="route-art-contour-path" d="M 8 68 Q 48 54 88 72" fill="none" stroke="${strokeColor}" stroke-width="1"/>
      <path d="${d}" fill="none" stroke="rgba(var(--terracota-rgb), 0.25)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="var(--terracota)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${start.x}" cy="${start.y}" r="3.5" fill="var(--salvia)"/>
      <circle cx="${end.x}" cy="${end.y}" r="4" fill="var(--terracota)" stroke="var(--creme-fixo)" stroke-width="1.5"/>
    </svg>
  `;
}
