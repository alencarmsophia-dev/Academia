/**
 * ============================================================================
 * CLAY FIT — CODIFICADOR E DECODIFICADOR DE POLYLINE (PRECISÃO 1e-5) + TEMPOS
 * /js/run/polyline.js
 *
 * Especificação Prompt 4 (B2):
 * - Algoritmo padrão de codificação/decodificação de polyline (precisão 1e-5).
 * - Codificação e decodificação de offsets de tempo em segundos (base36 separados por vírgula).
 * - Cálculo de bounding box `[latMin, lngMin, latMax, lngMax]`.
 * ============================================================================
 */

function encodeSignedNumber(num) {
  let sgnNum = num << 1;
  if (num < 0) {
    sgnNum = ~sgnNum;
  }
  let encoded = '';
  while (sgnNum >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgnNum & 0x1f)) + 63);
    sgnNum >>= 5;
  }
  encoded += String.fromCharCode(sgnNum + 63);
  return encoded;
}

/**
 * Codifica uma lista de pontos `[{ lat, lng }]` em string polyline (precisão 1e-5).
 * @param {Array<{lat:number, lng:number}>} points
 * @returns {string}
 */
export function encodePolyline(points = []) {
  if (!Array.isArray(points) || points.length === 0) return '';
  let lastLat = 0;
  let lastLng = 0;
  let result = '';

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const lat = Math.round(Number(pt.lat || 0) * 1e5);
    const lng = Math.round(Number(pt.lng || 0) * 1e5);
    const dLat = lat - lastLat;
    const dLng = lng - lastLng;
    result += encodeSignedNumber(dLat) + encodeSignedNumber(dLng);
    lastLat = lat;
    lastLng = lng;
  }
  return result;
}

/**
 * Decodifica uma string polyline (precisão 1e-5) em `[{ lat, lng }]`.
 * @param {string} encoded
 * @returns {Array<{lat:number, lng:number}>}
 */
export function decodePolyline(encoded = '') {
  if (!encoded || typeof encoded !== 'string') return [];
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index <= len);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index <= len);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5
    });
  }
  return points;
}

/**
 * Codifica os tempos dos pontos como offsets inteiros em segundos em base36 separados por vírgula.
 * @param {Array<{t?:number, offsetSeg?:number}>} points
 * @param {number} [startTimeMs]
 * @returns {string}
 */
export function encodeTimeOffsets(points = [], startTimeMs = null) {
  if (!Array.isArray(points) || points.length === 0) return '';
  const baseMs =
    startTimeMs !== null
      ? Number(startTimeMs)
      : Number(points[0]?.t || Date.now());

  return points
    .map((p) => {
      if (typeof p.offsetSeg === 'number') {
        return Math.max(0, Math.round(p.offsetSeg)).toString(36);
      }
      const sec = Math.max(0, Math.round((Number(p.t || baseMs) - baseMs) / 1000));
      return sec.toString(36);
    })
    .join(',');
}

/**
 * Decodifica a string de tempos base36 separados por vírgula para segundos.
 * @param {string} temposStr
 * @returns {number[]}
 */
export function decodeTimeOffsets(temposStr = '') {
  if (!temposStr || typeof temposStr !== 'string') return [];
  return temposStr
    .split(',')
    .filter(Boolean)
    .map((part) => {
      const n = parseInt(part, 36);
      return Number.isFinite(n) ? n : 0;
    });
}

/**
 * Calcula a bounding box `[latMin, lngMin, latMax, lngMax]` de uma lista de pontos.
 * @param {Array<{lat:number, lng:number}>} points
 * @returns {[number, number, number, number]}
 */
export function computeBoundingBox(points = []) {
  if (!Array.isArray(points) || points.length === 0) {
    return [-23.59, -46.66, -23.58, -46.65];
  }
  let latMin = Infinity;
  let lngMin = Infinity;
  let latMax = -Infinity;
  let lngMax = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const lat = Number(points[i].lat);
    const lng = Number(points[i].lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < latMin) latMin = lat;
    if (lat > latMax) latMax = lat;
    if (lng < lngMin) lngMin = lng;
    if (lng > lngMax) lngMax = lng;
  }

  if (!Number.isFinite(latMin)) {
    return [-23.59, -46.66, -23.58, -46.65];
  }
  return [
    Math.round(latMin * 1e5) / 1e5,
    Math.round(lngMin * 1e5) / 1e5,
    Math.round(latMax * 1e5) / 1e5,
    Math.round(lngMax * 1e5) / 1e5
  ];
}

/**
 * Codifica uma trilha completa `[{ lat, lng, t, alt }]` no objeto `rota` do store (B2).
 */
export function encodeTrackToRoute(points = [], simplificada = false, pontosOriginais = null) {
  if (!Array.isArray(points) || points.length === 0) return null;
  const polyline = encodePolyline(points);
  const temposB36 = encodeTimeOffsets(points);
  const bbox = computeBoundingBox(points);
  return {
    polyline,
    temposB36,
    bbox,
    simplificada: Boolean(simplificada),
    pontosOriginais: Number(pontosOriginais ?? points.length)
  };
}

/**
 * Decodifica `polyline` + `temposB36` de volta para `[{ lat, lng, t, offsetSeg }]`.
 */
export function decodeRouteToTrack(polyline = '', temposB36 = '', baseTimeMs = Date.now() - 3600000) {
  const coords = decodePolyline(polyline);
  const offsets = decodeTimeOffsets(temposB36);
  return coords.map((pt, idx) => {
    const offsetSeg = offsets[idx] !== undefined ? offsets[idx] : idx * 5;
    return {
      lat: pt.lat,
      lng: pt.lng,
      offsetSeg,
      t: baseTimeMs + offsetSeg * 1000
    };
  });
}
