/**
 * ============================================================================
 * CLAY FIT — SERVICE WORKER VERSIONADO (v8 — NOVA BIBLIOTECA COMPLETA, LOTES 1, 2 E 3)
 * /sw.js
 *
 * Especificação Prompt 8 (Parte C7):
 * - Versão de cache incrementada: `clay-fit-shell-v8` e `clay-fit-fonts-v8`.
 * - Pré-cacheia todos os módulos do app, incluindo `js/data/exercicios/lote-1.js`,
 *   `js/data/exercicios/lote-2.js` e `js/data/exercicios/lote-3.js` para
 *   funcionamento 100% offline.
 * - Estratégia: `stale-while-revalidate` para o shell e fontes;
 *   NUNCA pré-cacheia nem armazena blocos de mapa (`tile.openstreetmap.org`).
 * ============================================================================
 */

const SHELL_CACHE = 'clay-fit-shell-v8';
const FONT_CACHE = 'clay-fit-fonts-v8';

const SHELL_ASSETS = [
  './',
  './index.html',
  './design-guide.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/base.css',
  './css/motion.css',
  './css/components.css',
  './css/screens.css',
  './css/live.css',
  './css/run.css',
  './js/app.js',
  './js/motion.js',
  './js/router.js',
  './js/store.js',
  './js/gl/clayflow.js',
  './js/engine/catalog.js',
  './js/engine/planner.js',
  './js/engine/adapt.js',
  './js/engine/progression.js',
  './js/engine/selftest.js',
  './js/data/exercicios/index.js',
  './js/data/exercicios/taxonomia.js',
  './js/data/exercicios/sinonimos.js',
  './js/data/exercicios/populares.js',
  './js/data/exercicios/lote-1.js',
  './js/data/exercicios/lote-2.js',
  './js/data/exercicios/lote-3.js',
  './js/data/exercicios/busca.js',
  './js/data/exercicios/mapa-muscular.js',
  './js/run/geo.js',
  './js/run/polyline.js',
  './js/run/simplify.js',
  './js/run/filters.js',
  './js/run/metrics.js',
  './js/run/intervals.js',
  './js/run/voice.js',
  './js/run/route-art.js',
  './js/run/tiles.js',
  './js/run/simulator.js',
  './js/run/tracker.js',
  './js/run/run.js',
  './js/run/screens/pre.js',
  './js/run/screens/searching.js',
  './js/run/screens/denied.js',
  './js/run/screens/countdown.js',
  './js/run/screens/running.js',
  './js/run/screens/paused.js',
  './js/run/screens/finish.js',
  './js/run/screens/celebrate.js',
  './js/ui/theme.js',
  './js/ui/mapa-muscular.js',
  './js/ui/exercicio-row.js',
  './js/ui/biblioteca.js',
  './js/ui/illustrations.js',
  './js/ui/illustrations-live.js',
  './js/ui/illustrations-run.js',
  './js/ui/evolucao.js',
  './js/ui/button.js',
  './js/ui/card.js',
  './js/ui/chip.js',
  './js/ui/choice-card.js',
  './js/ui/checkin-slider.js',
  './js/ui/progress-ring.js',
  './js/ui/progress-bar.js',
  './js/ui/toggle.js',
  './js/ui/stepper.js',
  './js/ui/bottom-sheet.js',
  './js/ui/toast.js',
  './js/ui/skeleton.js',
  './js/ui/empty-state.js',
  './js/ui/nav.js',
  './js/live/live.js',
  './js/live/session.js',
  './js/live/timer.js',
  './js/live/audio.js',
  './js/live/wake.js',
  './js/live/screens/warmup.js',
  './js/live/screens/exercise.js',
  './js/live/screens/rest.js',
  './js/live/screens/transition.js',
  './js/live/screens/pause.js',
  './js/live/screens/exit-sheet.js',
  './js/live/screens/how-to-sheet.js',
  './js/live/screens/finish.js',
  './js/live/screens/celebrate.js',
  './assets/icons/logo.svg',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg',
  './assets/icons/icon-maskable-192.svg',
  './assets/icons/icon-maskable-512.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== FONT_CACHE)
            .map((oldKey) => caches.delete(oldKey))
        )
      )
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SW_UPDATED', version: SHELL_CACHE });
          });
        })
      )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.hostname.includes('tile.openstreetmap.org')) {
    return;
  }

  if (url.pathname.includes('/api/') || url.pathname.includes('supabase')) {
    return;
  }

  if (
    url.origin.includes('fonts.googleapis.com') ||
    url.origin.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const networkPromise = fetch(request)
            .then((res) => {
              if (res && res.status === 200) {
                cache.put(request, res.clone());
              }
              return res;
            })
            .catch(() => cached);
          return cached || networkPromise;
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((res) => {
            if (res && res.status === 200 && url.origin === self.location.origin) {
              cache.put(request, res.clone());
            }
            return res;
          })
          .catch(() => cached || caches.match('./index.html'));
        return cached || networkFetch;
      })
    )
  );
});
