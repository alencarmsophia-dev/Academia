/**
 * ============================================================================
 * CLAY FIT — MOTOR DE MOVIMENTO, FÍSICA SPRING, VIBRAÇÃO E GESTOS
 * /js/motion.js
 *
 * Exports obrigatórios:
 * - spring({from, to, stiffness=260, damping=24, mass=1, onUpdate, onDone})
 * - prefersReducedMotion()
 * - vibrate(tipo) ('selecao'|'confirmacao'|'sucesso'|'erro')
 * - initMonochromeGrain()
 * - initGlobalTouchFeedback()
 * - initScrollListener()
 * - scrollToTopSmooth()
 * - initEdgeBackSwipe({canSwipeBack, onBack})
 * - runViewTransition(fn)
 * - saveRouteScroll(nome) e restoreRouteScroll(nome)
 * ============================================================================
 */

import { store } from './store.js';

/**
 * Retorna true se o sistema operacional/navegador estiver com movimento reduzido ativo.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  try {
    return Boolean(
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch (e) {
    return false;
  }
}

/**
 * Integração semi-implícita de mola em requestAnimationFrame.
 * Devolve uma função `cancel()` (que também possui `.cancel` para compatibilidade).
 */
export function spring({
  from = 0,
  to = 1,
  stiffness = 260,
  damping = 24,
  mass = 1,
  velocity = 0,
  onUpdate = () => {},
  onDone = () => {}
} = {}) {
  let rafId = null;
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
  cancel.cancel = cancel;

  if (prefersReducedMotion() || document.hidden) {
    onUpdate(to);
    onDone(to);
    return cancel;
  }

  let position = Number(from);
  let vel = Number(velocity);
  const target = Number(to);
  let lastTime = performance.now();
  const precision = Math.max(0.001, Math.abs(target - position) * 0.002);

  function frame(now) {
    if (cancelled) return;
    if (document.hidden) {
      onUpdate(target);
      onDone(target);
      return;
    }

    const dt = Math.min((now - lastTime) / 1000, 0.032);
    lastTime = now;

    const displacement = position - target;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * vel;
    const acceleration = (springForce + dampingForce) / Math.max(0.0001, mass);

    // Integração semi-implícita (atualiza velocidade antes da posição)
    vel += acceleration * dt;
    position += vel * dt;

    if (Math.abs(vel) < precision && Math.abs(target - position) < precision) {
      onUpdate(target);
      onDone(target);
      return;
    }

    onUpdate(position);
    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);
  return cancel;
}

/**
 * Vibração tátil (só vibra se a API existir e se perfil.vibracaoAtiva não for falso no store).
 * @param {'selecao'|'confirmacao'|'sucesso'|'erro'} tipo
 */
export function vibrate(tipo = 'selecao') {
  try {
    const perfil = store.getEntity('perfil');
    if (perfil && perfil.vibracaoAtiva === false) return false;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return false;
    }
    if (
      typeof navigator.userActivation === 'object' &&
      navigator.userActivation !== null &&
      !navigator.userActivation.hasBeenActive
    ) {
      return false;
    }

    const padroes = {
      selecao: 8,
      confirmacao: [10, 30, 16],
      sucesso: [12, 40, 12, 40, 24],
      erro: [30, 40, 30]
    };

    return navigator.vibrate(padroes[tipo] ?? 8);
  } catch (e) {
    return false;
  }
}

/**
 * A5 — Gera em canvas de 160×160 tanto o grão claro (para o tema escuro, opacidade .05)
 * quanto o grão escuro (para o tema claro, opacidade .035), aplicando a variável CSS
 * `--clay-grain-url` e sincronizando automaticamente em `'clay:tema'`.
 */
let grainReady = false;
let grainLightUrl = '';
let grainDarkUrl = '';

function syncGrainForCurrentTheme() {
  try {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'claro';
    const url = isDark ? grainLightUrl : grainDarkUrl;
    if (url) {
      document.documentElement.style.setProperty('--clay-grain-url', `url("${url}")`);
    }
  } catch (_) {}
}

export function initMonochromeGrain() {
  if (grainReady) {
    syncGrainForCurrentTheme();
    return;
  }
  grainReady = true;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Grão escuro (para tema claro, alpha ~10%, opacidade CSS .035)
    const darkImg = ctx.createImageData(160, 160);
    const dbuf = darkImg.data;
    let seed = 1337;
    for (let i = 0; i < dbuf.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const gray = seed & 255;
      dbuf[i] = gray;
      dbuf[i + 1] = gray;
      dbuf[i + 2] = gray;
      dbuf[i + 3] = 26;
    }
    ctx.putImageData(darkImg, 0, 0);
    grainDarkUrl = canvas.toDataURL('image/png');

    // 2. Grão claro (para tema escuro, tons quentes de creme, opacidade CSS .05)
    const lightImg = ctx.createImageData(160, 160);
    const lbuf = lightImg.data;
    let seed2 = 4201;
    for (let i = 0; i < lbuf.length; i += 4) {
      seed2 = (seed2 * 16807) % 2147483647;
      const v = 180 + (seed2 % 76);
      lbuf[i] = v;
      lbuf[i + 1] = Math.max(0, v - 4);
      lbuf[i + 2] = Math.max(0, v - 10);
      lbuf[i + 3] = 32;
    }
    ctx.putImageData(lightImg, 0, 0);
    grainLightUrl = canvas.toDataURL('image/png');

    document.documentElement.style.setProperty('--clay-grain-dark-url', `url("${grainDarkUrl}")`);
    document.documentElement.style.setProperty('--clay-grain-light-url', `url("${grainLightUrl}")`);
    syncGrainForCurrentTheme();

    window.addEventListener('clay:tema', syncGrainForCurrentTheme);
  } catch (e) {
    // Fallback silencioso
  }
}

/**
 * Feedback de toque universal (<100ms):
 * scale(.97) em 120ms ao pressionar; ao soltar volta com overshoot (1.015 → 1) em 220ms.
 * Usa somente transform e listeners passivos.
 */
let touchFeedbackBound = false;
export function initGlobalTouchFeedback() {
  if (touchFeedbackBound) return;
  touchFeedbackBound = true;

  const TOUCHABLE_SELECTOR =
    '.c-btn, .c-chip, .c-choice-card, .c-card--interactive, .app-nav__link, .app-nav__start-btn, .day-circle-btn, .checkin-face-btn, .list-row-btn, .q-time-chip, .week-col-btn, .upcoming-card, .lib-card, .avatar-circle-btn, .c-topbar__icon-btn, .theme-seg-btn, .q-ruler-step-btn';

  document.addEventListener(
    'pointerdown',
    (e) => {
      const el = e.target?.closest ? e.target.closest(TOUCHABLE_SELECTOR) : null;
      if (!el || el.disabled || el.classList.contains('is-disabled')) return;
      el.classList.remove('is-releasing');
      el.classList.add('is-pressed');
    },
    { passive: true }
  );

  const onRelease = (e) => {
    const target = e.target?.closest ? e.target.closest(TOUCHABLE_SELECTOR) : null;
    const pressedList = document.querySelectorAll('.is-pressed');
    pressedList.forEach((el) => {
      el.classList.remove('is-pressed');
      if (!prefersReducedMotion()) {
        el.classList.add('is-releasing');
        setTimeout(() => el.classList.remove('is-releasing'), 230);
      }
    });
    if (target && !prefersReducedMotion() && !target.classList.contains('is-releasing')) {
      target.classList.add('is-releasing');
      setTimeout(() => target.classList.remove('is-releasing'), 230);
    }
  };

  document.addEventListener('pointerup', onRelease, { passive: true });
  document.addEventListener('pointercancel', onRelease, { passive: true });
}

/**
 * Mapa de posições de rolagem por rota (Map nome -> scrollTop).
 */
export const scrollMemory = new Map();

export function saveRouteScroll(nome) {
  if (!nome) return;
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  scrollMemory.set(String(nome), y);
}

export function restoreRouteScroll(nome) {
  const targetY = scrollMemory.get(String(nome)) ?? 0;
  requestAnimationFrame(() => {
    window.scrollTo({ top: targetY, behavior: 'instant' });
    updateCollapsibleTopbar();
  });
}

/**
 * Rola suavemente até o topo da tela em 360ms (usado no duplo toque da aba ativa).
 */
export function scrollToTopSmooth() {
  const startY = window.scrollY || document.documentElement.scrollTop || 0;
  if (startY <= 0) return;
  if (prefersReducedMotion()) {
    window.scrollTo(0, 0);
    return;
  }

  const duration = 360;
  const startTime = performance.now();

  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3.2);
    window.scrollTo(0, Math.round(startY * (1 - eased)));
    if (t < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

/**
 * Atualiza o colapso do título grande para o título de 18px na barra superior
 * ao longo de 80px de rolagem, aplicando fundo com blur(12px) e linha de 1px.
 */
export function updateCollapsibleTopbar() {
  const topbar = document.getElementById('clay-topbar');
  const heroHeading = document.querySelector('[data-collapsible-heading]');
  if (!topbar) return;

  const y = window.scrollY || document.documentElement.scrollTop || 0;
  const progress = Math.max(0, Math.min(1, y / 80));

  topbar.classList.toggle('is-scrolled', progress > 0.12);
  const titleEl = topbar.querySelector('.c-topbar__title');
  if (titleEl && heroHeading) {
    titleEl.style.opacity = String(progress.toFixed(2));
    titleEl.style.transform = `translateY(${((1 - progress) * 6).toFixed(1)}px)`;
  }
}

let scrollListenerInitialized = false;
export function initScrollListener() {
  if (scrollListenerInitialized) return;
  scrollListenerInitialized = true;

  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          updateCollapsibleTopbar();
          ticking = false;
        });
      }
    },
    { passive: true }
  );

  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('is-document-hidden', document.hidden);
  });
}

/**
 * Gesto de voltar por borda:
 * Toque iniciado em x <= 20px acompanha o dedo; confirma se deslocamento > 96px
 * ou velocidade > 0.5px/ms; caso contrário retorna com spring().
 */
let edgeSwipeBound = false;
export function initEdgeBackSwipe({
  canSwipeBack = () => false,
  onBack = () => {}
} = {}) {
  if (edgeSwipeBound) return;
  edgeSwipeBound = true;

  let overlay = document.getElementById('edge-swipe-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'edge-swipe-overlay';
    overlay.className = 'edge-swipe-overlay';
    document.body.appendChild(overlay);
  }

  let tracking = false;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let deltaX = 0;

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.clientX > 20 || !canSwipeBack()) return;
      tracking = true;
      startX = e.clientX;
      startY = e.clientY;
      deltaX = 0;
      startTime = performance.now();
    },
    { passive: true }
  );

  document.addEventListener(
    'pointermove',
    (e) => {
      if (!tracking) return;
      const dx = Math.max(0, e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dy > dx && dx < 24) {
        tracking = false;
        return;
      }
      deltaX = dx;
      const stage = document.getElementById('screen-stage');
      if (stage) {
        stage.style.willChange = 'transform';
        stage.style.transform = `translateX(${dx.toFixed(1)}px)`;
      }
      if (overlay) {
        overlay.style.opacity = String(Math.min(1, dx / 220).toFixed(2));
      }
    },
    { passive: true }
  );

  const finishSwipe = () => {
    if (!tracking) return;
    tracking = false;
    const elapsed = Math.max(1, performance.now() - startTime);
    const velocity = deltaX / elapsed;
    const stage = document.getElementById('screen-stage');

    if (deltaX > 96 || velocity > 0.5) {
      vibrate('selecao');
      if (overlay) overlay.style.opacity = '0';
      if (stage) {
        stage.style.transform = '';
        stage.style.willChange = '';
      }
      onBack();
    } else if (stage) {
      spring({
        from: deltaX,
        to: 0,
        stiffness: 260,
        damping: 24,
        mass: 1,
        onUpdate: (val) => {
          stage.style.transform = `translateX(${val.toFixed(1)}px)`;
          if (overlay) {
            overlay.style.opacity = String(Math.max(0, val / 220).toFixed(2));
          }
        },
        onDone: () => {
          stage.style.transform = '';
          stage.style.willChange = '';
          if (overlay) overlay.style.opacity = '0';
        }
      });
    }
  };

  document.addEventListener('pointerup', finishSwipe, { passive: true });
  document.addEventListener('pointercancel', finishSwipe, { passive: true });
}

/**
 * Executa transição de visualização usando `document.startViewTransition` quando
 * existir, com fallback de fade de 220ms (`nav-transition-replace`).
 */
export function runViewTransition(fn, transitionClass = 'nav-transition-replace') {
  if (prefersReducedMotion()) {
    fn();
    return Promise.resolve();
  }

  if (typeof document.startViewTransition === 'function') {
    try {
      const vt = document.startViewTransition(() => {
        fn();
      });
      if (vt.ready && typeof vt.ready.catch === 'function') {
        vt.ready.catch(() => {});
      }
      if (vt.updateCallbackDone && typeof vt.updateCallbackDone.catch === 'function') {
        vt.updateCallbackDone.catch(() => {});
      }
      return vt.finished.catch(() => {});
    } catch (e) {
      // Continua para o fallback
    }
  }

  fn();
  const stage = document.getElementById('screen-stage');
  if (stage) {
    stage.classList.remove(
      'nav-transition-tab',
      'nav-transition-push',
      'nav-transition-pop',
      'nav-transition-replace'
    );
    void stage.offsetWidth;
    stage.classList.add(transitionClass || 'nav-transition-replace');
  }
  return new Promise((resolve) => setTimeout(resolve, 220));
}
