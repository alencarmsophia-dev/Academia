/**
 * ============================================================================
 * CLAY FIT — ROTEADOR COM GUARDA DE ONBOARDING (8 PASSOS), HISTÓRICO E TRANSIÇÕES
 * /js/router.js
 *
 * Especificações Prompt 2.1, Prompt 5 (Parte A1 & B1) e Prompt 6 (Parte C5):
 * - Guarda respeita `perfil.etapaOnboarding` ('questionario' | 'montando' | 'plano' | 'concluido')
 *   e os 8 passos da nova introdução (`#/q/1` a `#/q/8`).
 * - Suporta `#/biblioteca`, `#/biblioteca/buscar` (tela cheia sem barra inferior) e `#/exercicio/:id`.
 * - Sincroniza `<meta name="theme-color">` via `sincronizarMetaThemeColor()` sem hex fixo.
 * - Transição horizontal de 240ms (`push` ao avançar, `pop` ao voltar) e foco movido ao `<h1>`.
 * ============================================================================
 */

import { store } from './store.js';
import {
  runViewTransition,
  saveRouteScroll,
  restoreRouteScroll
} from './motion.js';
import { sincronizarMetaThemeColor } from './ui/theme.js';

export const TAB_ROUTES = ['hoje', 'biblioteca', 'evolucao', 'perfil'];
export const ONBOARDING_ROUTES = ['abertura', 'boas-vindas', 'q', 'montando', 'plano'];

function isMainTabRoute(routeObj) {
  if (!routeObj) return false;
  if (routeObj.name === 'biblioteca' && routeObj.param === 'buscar') return false;
  return TAB_ROUTES.includes(routeObj.name);
}

export class HashRouter {
  constructor({ onRoute = () => {} } = {}) {
    this.onRoute = onRoute;
    this.currentRouteObj = null;
    this.virtualHash = '#/abertura';
    this.historyStack = [];
    this.lastNavMode = 'tab'; // 'tab' | 'push' | 'pop' | 'replace'
    this.handleHashChange = this.handleHashChange.bind(this);
  }

  getRawHash() {
    if ((window.location.protocol === 'data:' || window.location.protocol === 'about:')) {
      return this.virtualHash;
    }
    const h = window.location.hash;
    if (h && h !== '#' && h !== '#/') {
      this.virtualHash = h;
      return h;
    }
    return this.virtualHash;
  }

  setHashSilently(newHash, replace = false) {
    this.virtualHash = newHash;
    try {
      if ((window.location.protocol !== 'data:' && window.location.protocol !== 'about:')) {
        if (replace) {
          window.history.replaceState(window.history.state, '', newHash);
        } else {
          window.location.hash = newHash;
        }
      }
    } catch (e) {
      // Fallback para virtualHash
    }
  }

  init() {
    this.ensureLiveAnnouncer();
    window.addEventListener('hashchange', () => {
      if ((window.location.protocol === 'data:' || window.location.protocol === 'about:') && window.location.hash && window.location.hash !== this.virtualHash) {
        this.virtualHash = window.location.hash;
      }
      this.handleHashChange();
    });

    let forceOnboardingParam = false;
    try {
      const params = new URLSearchParams(window.location.search || '');
      if (params.get('onboarding') === '1') {
        forceOnboardingParam = true;
      }
    } catch (_) {}

    if (forceOnboardingParam) {
      const currentH = window.location.hash || '';
      const parsedCur = this.parseHash(currentH);
      if (!ONBOARDING_ROUTES.includes(parsedCur.name)) {
        this.setHashSilently('#/q/1', true);
      }
    } else if (window.location.hash && window.location.hash !== '#' && window.location.hash !== '#/') {
      this.virtualHash = window.location.hash;
    }

    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
      const perfil = store.getEntity('perfil') || {};
      const savedStep =
        !perfil.onboardingConcluido && !perfil.introVersao && Number(perfil.onboardingPassoAtual) === 7
          ? 8
          : Number(perfil.onboardingPassoAtual || 1);
      let initialHash = '#/abertura';
      if (perfil.onboardingConcluido || perfil.etapaOnboarding === 'concluido') {
        initialHash = '#/hoje';
      } else if (perfil.etapaOnboarding === 'plano') {
        initialHash = '#/plano';
      } else if (perfil.etapaOnboarding === 'montando') {
        initialHash = '#/montando';
      } else if (forceOnboardingParam) {
        initialHash = '#/q/1';
      } else if (savedStep > 1 && savedStep <= 8) {
        initialHash = `#/q/${savedStep}`;
      }
      this.setHashSilently(initialHash, true);
    }
    this.historyStack = [this.getRawHash()];
    this.handleHashChange();
  }

  ensureLiveAnnouncer() {
    let el = document.getElementById('route-live-announcer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'route-live-announcer';
      el.className = 'sr-only';
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'true');
      document.body.appendChild(el);
    }
    this.announcerEl = el;
  }

  parseHash(hash = this.getRawHash()) {
    const raw = hash.replace(/^#\/?/, '').trim();
    if (!raw) {
      return { name: 'abertura', param: null, query: {}, full: 'abertura' };
    }
    const [pathPart, queryPart = ''] = raw.split('?');
    const parts = pathPart.split('/');
    const name = parts[0].toLowerCase();
    const param = parts[1] || null;
    const query = Object.fromEntries(new URLSearchParams(queryPart).entries());
    return { name, param, query, full: raw };
  }

  applyGuard(parsed) {
    const perfil = store.getEntity('perfil') || {};
    const etapa = perfil.etapaOnboarding || (perfil.onboardingConcluido ? 'concluido' : 'questionario');
    const done = Boolean(perfil.onboardingConcluido && etapa === 'concluido');
    const savedStep = Number(perfil.onboardingPassoAtual || 1);

    if (!done) {
      if (etapa === 'plano') {
        if (parsed.name !== 'plano' && parsed.name !== 'q') {
          this.setHashSilently('#/plano', true);
          return this.parseHash('#/plano');
        }
        return parsed;
      }

      if (etapa === 'montando') {
        if (parsed.name !== 'montando' && parsed.name !== 'plano') {
          this.setHashSilently('#/montando', true);
          return this.parseHash('#/montando');
        }
        return parsed;
      }

      if (!ONBOARDING_ROUTES.includes(parsed.name)) {
        const target =
          savedStep > 1 && savedStep <= 8 ? `#/q/${savedStep}` : '#/abertura';
        this.setHashSilently(target, true);
        return this.parseHash(target);
      }

      if (parsed.name === 'q') {
        const stepNum = Number(parsed.param);
        if (!stepNum || stepNum < 1 || stepNum > 8) {
          this.setHashSilently('#/q/1', true);
          return this.parseHash('#/q/1');
        }
        if (!perfil.introVersao && stepNum === 7 && Number(perfil.onboardingPassoAtual) >= 7) {
          this.setHashSilently('#/q/8', true);
          return this.parseHash('#/q/8');
        }
      }
      return parsed;
    }

    if (done && ONBOARDING_ROUTES.includes(parsed.name) && parsed.name !== 'abertura') {
      this.setHashSilently('#/hoje', true);
      return this.parseHash('#/hoje');
    }

    return parsed;
  }

  navigate(path, { mode = 'push' } = {}) {
    const cleanPath = path.startsWith('#/') ? path : `#/${path.replace(/^#?\/?/, '')}`;
    this.lastNavMode = mode;

    if (mode === 'replace') {
      if (this.historyStack.length > 0) {
        this.historyStack[this.historyStack.length - 1] = cleanPath;
      } else {
        this.historyStack.push(cleanPath);
      }
      this.setHashSilently(cleanPath, true);
      this.handleHashChange();
    } else {
      this.historyStack.push(cleanPath);
      const prevHash = window.location.hash;
      this.setHashSilently(cleanPath, false);
      if ((window.location.protocol === 'data:' || window.location.protocol === 'about:') || prevHash === cleanPath) {
        this.handleHashChange();
      }
    }
  }

  back() {
    this.lastNavMode = 'pop';
    if ((window.location.protocol === 'data:' || window.location.protocol === 'about:')) {
      if (this.historyStack.length > 1) {
        this.historyStack.pop();
        this.virtualHash = this.historyStack[this.historyStack.length - 1];
        this.handleHashChange();
      }
    } else {
      window.history.back();
    }
  }

  handleHashChange() {
    const prev = this.currentRouteObj;
    if (prev && isMainTabRoute(prev)) {
      saveRouteScroll(prev.name);
    }

    let next = this.parseHash(this.getRawHash());
    next = this.applyGuard(next);
    this.currentRouteObj = next;

    const isTreino = next.name === 'treino';
    if (isTreino) {
      document.documentElement.setAttribute('data-mode', 'energia');
      document.body.classList.add('modo-energia');
      sincronizarMetaThemeColor();
    } else {
      document.documentElement.removeAttribute('data-mode');
      document.body.classList.remove('modo-energia');
      sincronizarMetaThemeColor();
    }

    const isSearchRoute = next.name === 'biblioteca' && next.param === 'buscar';
    const wasFromDetailToSearch = prev && prev.name === 'exercicio' && isSearchRoute;

    let transitionClass = 'nav-transition-tab';
    if (prev && prev.name === 'q' && next.name === 'q') {
      transitionClass = Number(next.param) < Number(prev.param) ? 'nav-transition-pop' : 'nav-transition-push';
    } else if (this.lastNavMode === 'pop' || wasFromDetailToSearch) {
      transitionClass = 'nav-transition-pop';
    } else if (
      this.lastNavMode === 'push' ||
      next.name === 'previa' ||
      next.name === 'sessao' ||
      next.name === 'exercicio' ||
      isSearchRoute
    ) {
      transitionClass = 'nav-transition-push';
    } else if (this.lastNavMode === 'replace' || next.name === 'montando' || next.name === 'plano') {
      transitionClass = 'nav-transition-replace';
    }

    runViewTransition(() => {
      this.onRoute(next, prev);
    }, transitionClass).then(() => {
      if (isMainTabRoute(next)) {
        restoreRouteScroll(next.name);
      } else if (!wasFromDetailToSearch) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      this.focusHeadingAndAnnounce();
    });

    this.lastNavMode = 'tab';
  }

  focusHeadingAndAnnounce() {
    requestAnimationFrame(() => {
      const h1 = document.querySelector('#app-main-root h1');
      if (!h1) return;
      if (!h1.hasAttribute('tabindex')) {
        h1.setAttribute('tabindex', '-1');
      }
      const activeTag = document.activeElement?.tagName;
      if (activeTag !== 'INPUT') {
        h1.focus({ preventScroll: true });
      }
      if (this.announcerEl) {
        this.announcerEl.textContent = h1.textContent.trim();
      }
    });
  }
}

export default HashRouter;
