/**
 * ============================================================================
 * CLAY FIT — CAMADA OPCIONAL DE MAPA COM RUAS (OPENSTREETMAP RASTER) (C6.2)
 * /js/run/tiles.js
 *
 * Especificação Prompt 4 (C6.2):
 * - Desligado por padrão (`perfil.mostrarRuasNoMapa = false`), ativável pelo botão
 *   "Ruas" no canto do mapa ou em Perfil > Corrida.
 * - Quando ativo e com rede (`navigator.onLine`), carrega blocos raster públicos
 *   do OpenStreetMap (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) num
 *   `<canvas>` em projeção Web Mercator, aplica filtro cálido para integrar à
 *   paleta Clay e desenha o traço da rota por cima.
 * - Mostra atribuição discreta "© OpenStreetMap" em 10px no canto inferior direito.
 * - Limites: zoom máximo 17, máximo 12 blocos por visualização; se falhar ou
 *   estiver sem rede, volta automaticamente para a Arte do Trajeto sem mensagem de erro.
 * ============================================================================
 */

const tileImageCache = new Map();

function lngToTileX(lng, z) {
  return ((lng + 180) / 360) * Math.pow(2, z);
}

function latToTileY(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, z)
  );
}

function chooseZoomForBbox(bbox, widthPx, heightPx) {
  if (!bbox) return 15;
  const [minLat, minLng, maxLat, maxLng] = bbox;
  const latSpan = Math.max(0.0015, maxLat - minLat);
  const lngSpan = Math.max(0.0015, maxLng - minLng);

  for (let z = 17; z >= 11; z--) {
    const xMin = Math.floor(lngToTileX(minLng - lngSpan * 0.15, z));
    const xMax = Math.floor(lngToTileX(maxLng + lngSpan * 0.15, z));
    const yMin = Math.floor(latToTileY(maxLat + latSpan * 0.15, z));
    const yMax = Math.floor(latToTileY(minLat - latSpan * 0.15, z));
    const count = (xMax - xMin + 1) * (yMax - yMin + 1);
    if (count <= 12) {
      return z;
    }
  }
  return 14;
}

function loadTileImage(z, x, y) {
  const key = `${z}/${x}/${y}`;
  if (tileImageCache.has(key)) {
    return tileImageCache.get(key);
  }
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      tileImageCache.delete(key);
      reject(err);
    };
    img.src = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  });
  tileImageCache.set(key, promise);
  return promise;
}

/**
 * Tenta desenhar os blocos raster do OpenStreetMap num `<canvas>`.
 * Retorna Promise<boolean> indicando se ao menos 1 bloco foi desenhado com sucesso.
 */
export async function renderOsmTilesOnCanvas(canvasEl, bbox, { isDark = true } = {}) {
  if (
    !canvasEl ||
    typeof window === 'undefined' ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  ) {
    return false;
  }

  const effectiveBbox =
    Array.isArray(bbox) && bbox.length === 4
      ? bbox
      : [-23.5895, -46.6605, -23.5845, -46.6545];

  const rect = canvasEl.getBoundingClientRect();
  const width = Math.max(240, Math.round(rect.width || 320));
  const height = Math.max(140, Math.round(rect.height || 180));
  canvasEl.width = width;
  canvasEl.height = height;

  const z = chooseZoomForBbox(effectiveBbox, width, height);
  const centerLat = (effectiveBbox[0] + effectiveBbox[2]) / 2;
  const centerLng = (effectiveBbox[1] + effectiveBbox[3]) / 2;

  const centerTileX = lngToTileX(centerLng, z);
  const centerTileY = latToTileY(centerLat, z);

  const halfTilesX = Math.min(2, Math.ceil(width / 512));
  const halfTilesY = Math.min(1, Math.ceil(height / 512));

  const baseX = Math.floor(centerTileX);
  const baseY = Math.floor(centerTileY);

  const requests = [];
  for (let dx = -halfTilesX; dx <= halfTilesX; dx++) {
    for (let dy = -halfTilesY; dy <= halfTilesY; dy++) {
      if (requests.length >= 12) break;
      const tx = baseX + dx;
      const ty = baseY + dy;
      if (tx < 0 || ty < 0) continue;
      requests.push({ tx, ty, promise: loadTileImage(z, tx, ty) });
    }
  }

  try {
    const settled = await Promise.allSettled(requests.map((r) => r.promise));
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return false;

    ctx.save();
    ctx.fillStyle = isDark ? (corToken('--corrida-superficie') || 'rgb(32, 29, 25)') : (corToken('--ill-palco-cor') || 'rgb(37, 34, 31)');
    ctx.fillRect(0, 0, width, height);
    ctx.filter = isDark
      ? 'sepia(0.28) contrast(0.92) brightness(0.68)'
      : 'sepia(0.22) contrast(0.95) brightness(0.98)';

    let drawn = 0;
    settled.forEach((res, idx) => {
      if (res.status === 'fulfilled' && res.value) {
        const { tx, ty } = requests[idx];
        const px = Math.round(width / 2 + (tx - centerTileX) * 256);
        const py = Math.round(height / 2 + (ty - centerTileY) * 256);
        ctx.drawImage(res.value, px, py, 256, 256);
        drawn += 1;
      }
    });
    ctx.restore();
    return drawn > 0;
  } catch (_) {
    return false;
  }
}
