/**
 * ============================================================================
 * CLAY FIT — SIMPLIFICAÇÃO DE TRAJETO DOUGLAS-PEUCKER EM METROS
 * /js/run/simplify.js
 *
 * Especificação Prompt 4 (B2):
 * - Simplificação Douglas-Peucker com tolerância configurável em metros:
 *   • 3,0 m para gravar a rota no store
 *   • 1,5 m para o desenho do resumo se houver pontos suficientes
 * - Limite máximo de 4.000 pontos por corrida gravada.
 * ============================================================================
 */

const METERS_PER_DEG_LAT = 111320;

function toLocalMeters(pt, refLat, refLng, cosLat) {
  return {
    x: (Number(pt.lng) - refLng) * METERS_PER_DEG_LAT * cosLat,
    y: (Number(pt.lat) - refLat) * METERS_PER_DEG_LAT
  };
}

function getSqSegDistMeters(p, p1, p2) {
  let x = p1.x;
  let y = p1.y;
  let dx = p2.x - x;
  let dy = p2.y - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2.x;
      y = p2.y;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p.x - x;
  dy = p.y - y;
  return dx * dx + dy * dy;
}

/**
 * Simplifica uma lista de pontos `[{ lat, lng, ... }]` usando Douglas-Peucker.
 * @param {Array<object>} points
 * @param {number} toleranceMeters - Tolerância em metros (ex.: 3 para gravar, 1.5 para desenho)
 * @param {number} maxPoints - Limite máximo de pontos (padrão 4000)
 * @returns {Array<object>}
 */
export function simplifyRoute(points = [], toleranceMeters = 3, maxPoints = 4000) {
  if (!Array.isArray(points) || points.length <= 2) {
    return Array.isArray(points) ? [...points] : [];
  }

  let working = points;
  // Se passar muito de maxPoints antes da simplificação, faz uma pré-amostragem uniforme preservando início e fim
  if (working.length > maxPoints * 2) {
    const step = (working.length - 1) / (maxPoints * 2 - 1);
    const sampled = [];
    for (let i = 0; i < maxPoints * 2 - 1; i++) {
      sampled.push(working[Math.round(i * step)]);
    }
    sampled.push(working[working.length - 1]);
    working = sampled;
  }

  const refLat = Number(working[0].lat || -23.5874);
  const refLng = Number(working[0].lng || -46.6576);
  const cosLat = Math.cos((refLat * Math.PI) / 180);
  const projected = working.map((pt) => toLocalMeters(pt, refLat, refLng, cosLat));

  let tol = Math.max(0.2, Number(toleranceMeters || 3));

  const runDp = (sqTol) => {
    const len = projected.length;
    const markers = new Uint8Array(len);
    markers[0] = 1;
    markers[len - 1] = 1;
    const stack = [[0, len - 1]];

    while (stack.length > 0) {
      const [first, last] = stack.pop();
      let maxSqDist = 0;
      let index = 0;

      for (let i = first + 1; i < last; i++) {
        const sqDist = getSqSegDistMeters(projected[i], projected[first], projected[last]);
        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }

      if (maxSqDist > sqTol) {
        markers[index] = 1;
        if (index - first > 1) stack.push([first, index]);
        if (last - index > 1) stack.push([index, last]);
      }
    }

    const out = [];
    for (let i = 0; i < len; i++) {
      if (markers[i]) out.push(working[i]);
    }
    return out;
  };

  let simplified = runDp(tol * tol);

  // Garante o limite máximo de 4.000 pontos aumentando a tolerância se necessário
  let guard = 0;
  while (simplified.length > maxPoints && guard < 6) {
    tol *= 1.6;
    simplified = runDp(tol * tol);
    guard += 1;
  }

  if (simplified.length > maxPoints) {
    const finalOut = [];
    const step = (simplified.length - 1) / (maxPoints - 1);
    for (let i = 0; i < maxPoints - 1; i++) {
      finalOut.push(simplified[Math.round(i * step)]);
    }
    finalOut.push(simplified[simplified.length - 1]);
    return finalOut;
  }

  return simplified;
}

/**
 * Simplifica uma trilha garantindo o limite máximo de pontos e devolve `{ points, simplified }`.
 */
export function capToMaxPoints(points = [], toleranceMeters = 3, maxPoints = 4000) {
  const out = simplifyRoute(points, toleranceMeters, maxPoints);
  return {
    points: out,
    simplified: out.length < (Array.isArray(points) ? points.length : 0)
  };
}
