/**
 * ============================================================================
 * CLAY FIT — GEOLOCALIZAÇÃO, HAVERSINE E FORMATAÇÃO DE RITMO/DISTÂNCIA
 * /js/run/geo.js
 *
 * Especificações Prompt 4 (C0, C2, C3):
 * - Cálculo Haversine em metros e quilômetros.
 * - Formatação pt-BR com vírgula decimal para distância ("5,32 km", "5,32") e
 *   ritmo ("5:42", "5:42 /km", "--:--").
 * - Projeção equirretangular local em metros com correção `cos(lat)`.
 * ============================================================================
 */

const EARTH_RADIUS_M = 6371000;
const EARTH_RADIUS_KM = 6371;

const kmDecimalFmt = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const kmShortFmt = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

/**
 * Calcula a distância em metros entre dois pontos `{ lat, lng }` usando Haversine.
 */
export function haversineMeters(p1, p2) {
  if (!p1 || !p2) return 0;
  const lat1 = Number(p1.lat);
  const lng1 = Number(p1.lng);
  const lat2 = Number(p2.lat);
  const lng2 = Number(p2.lng);
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return 0;
  }
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * Calcula a distância em quilômetros entre dois pontos `{ lat, lng }`.
 */
export function calculateDistanceKm(p1, p2) {
  return haversineMeters(p1, p2) / 1000;
}

/**
 * Formata distância em metros para string em km com 2 casas e vírgula (ex.: "5,32").
 */
export function formatKmNumber(distanciaM = 0, decimals = 2) {
  const km = Math.max(0, Number(distanciaM || 0)) / 1000;
  if (decimals === 1) {
    return kmShortFmt.format(Math.round(km * 10) / 10);
  }
  return kmDecimalFmt.format(Math.round(km * 100) / 100);
}

/**
 * Formata distância em metros com unidade (ex.: "5,32 km").
 */
export function formatKmWithUnit(distanciaM = 0, decimals = 2) {
  return `${formatKmNumber(distanciaM, decimals)} km`;
}

/**
 * Formata ritmo em segundos por km para "M:SS" (ex.: 342 -> "5:42"; inválido -> "--:--").
 */
export function formatPaceSegKm(ritmoSegKm) {
  const sec = Number(ritmoSegKm);
  if (!Number.isFinite(sec) || sec <= 60 || sec >= 3600) {
    return '--:--';
  }
  const rounded = Math.round(sec);
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Compatibilidade com `formatPaceMinKm(distanciaKm, duracaoSeg)`.
 */
export function formatPaceMinKm(distanciaKm, duracaoSeg) {
  if (!distanciaKm || distanciaKm <= 0.01 || !duracaoSeg || duracaoSeg <= 0) {
    return '--:--';
  }
  return formatPaceSegKm(duracaoSeg / distanciaKm);
}

/**
 * Formata segundos totais em "MM:SS" ou "H:MM:SS" (ex.: 1868 -> "31:08").
 */
export function formatRunClock(totalSeconds = 0) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds || 0)));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Interpola linearmente entre dois pontos `{ lat, lng, t, alt }` na fração `ratio` (0..1).
 */
export function interpolatePoint(p1, p2, ratio = 0.5) {
  const r = Math.max(0, Math.min(1, Number(ratio)));
  return {
    lat: Number(p1.lat) + (Number(p2.lat) - Number(p1.lat)) * r,
    lng: Number(p1.lng) + (Number(p2.lng) - Number(p1.lng)) * r,
    t: Math.round(Number(p1.t || 0) + (Number(p2.t || 0) - Number(p1.t || 0)) * r),
    alt:
      p1.alt != null && p2.alt != null
        ? Number(p1.alt) + (Number(p2.alt) - Number(p1.alt)) * r
        : p2.alt ?? p1.alt ?? null
  };
}

/**
 * Controlador legado preservado por compatibilidade.
 */
export class RunGeoTracker {
  constructor(options = {}) {
    this.watchId = null;
    this.points = [];
    this.onUpdate = options.onUpdate || (() => {});
  }
  start() {
    if (!('geolocation' in navigator)) {
      return { ok: false, motivo: 'Geolocalização indisponível neste dispositivo.' };
    }
    return { ok: true, status: 'pronto_para_iniciar' };
  }
  stop() {
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    return this.points;
  }
}
