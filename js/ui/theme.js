/* ============================================================================
 * PLANO DE ARQUITETURA — SISTEMA DE TEMAS "STUDIO CLAY NOITE" (<= 25 LINHAS)
 * 1. Estado e Persistência: `perfil.tema` aceita 'escuro' | 'claro' | 'automatico'
 *    com padrão 'escuro' em `clay_fit_store_v5` (sem alterar schema nem chave).
 * 2. Boot Sem Flash: script inline no <head> de `index.html` resolve `data-theme`
 *    e `<meta name="theme-color">` antes da primeira pintura.
 * 3. Resolução Reativa: 'automatico' escuta `matchMedia('(prefers-color-scheme: dark)')`
 *    e reaplica `data-theme="escuro"|"claro"` em `<html>` em tempo real.
 * 4. Cache de Tokens: `corToken(nome)` consulta `getComputedStyle(documentElement)`
 *    com cache em `Map` invalidado a cada troca de tema (< 1ms por leitura).
 * 5. Transição e Acessibilidade: `aplicarTema(tema)` faz cross-fade de 240ms
 *    (`startViewTransition` ou classe CSS `.is-theme-transitioning`), respeita
 *    `prefers-reduced-motion`, dispara `'clay:tema'` e anuncia no leitor de tela.
 * ============================================================================ */

import { store, STORAGE_KEY } from '../store.js';
import { prefersReducedMotion } from '../motion.js';

const VALID_THEMES = ['escuro', 'claro', 'automatico'];
const tokenCache = new Map();
const themeSubscribers = new Set();
let mediaQueryList = null;
let transitionTimer = null;

function getSystemPrefersDark() {
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  } catch (_) {}
  return true;
}

export function lerTema() {
  try {
    const perfil = store?.getEntity ? store.getEntity('perfil') : null;
    if (perfil && VALID_THEMES.includes(perfil.tema)) {
      return perfil.tema;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const saved = parsed?.perfil?.tema;
        if (VALID_THEMES.includes(saved)) return saved;
      }
    }
  } catch (_) {}
  return 'escuro';
}

export function resolverTemaAtivo(tema = lerTema()) {
  const pref = VALID_THEMES.includes(tema) ? tema : 'escuro';
  if (pref === 'automatico') {
    return getSystemPrefersDark() ? 'escuro' : 'claro';
  }
  return pref;
}

export function temaAtivo() {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'claro' || attr === 'escuro') return attr;
  }
  return resolverTemaAtivo(lerTema());
}

export function invalidarCacheTokens() {
  tokenCache.clear();
}

export function corToken(nome) {
  if (!nome || typeof document === 'undefined') return '';
  const prop = String(nome).startsWith('--') ? String(nome) : `--${nome}`;
  const currentTheme = temaAtivo();
  const modeAttr = document.documentElement.getAttribute('data-mode') || 'normal';
  const cacheKey = `${currentTheme}:${modeAttr}:${prop}`;

  if (tokenCache.has(cacheKey)) {
    return tokenCache.get(cacheKey);
  }

  try {
    const val = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue(prop)
      .trim();
    if (val) {
      tokenCache.set(cacheKey, val);
    }
    return val;
  } catch (_) {
    return '';
  }
}

export function sincronizarMetaThemeColor(overrideColor = null) {
  if (typeof document === 'undefined') return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;

  if (overrideColor) {
    meta.setAttribute('content', overrideColor);
    return;
  }

  const isEnergia =
    document.documentElement.getAttribute('data-mode') === 'energia' ||
    document.body?.classList?.contains('modo-energia');
  const tokenName = isEnergia ? '--terracota' : '--fundo';
  const resolvedColor = corToken(tokenName);
  if (resolvedColor) {
    meta.setAttribute('content', resolvedColor);
  }
}

function announceThemeForScreenReader(resolvedTheme) {
  if (typeof document === 'undefined' || !document.body) return;
  let announcer = document.getElementById('theme-live-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'theme-live-announcer';
    announcer.className = 'sr-only';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
  }
  announcer.textContent =
    resolvedTheme === 'escuro' ? 'Tema escuro ativado' : 'Tema claro ativado';
}

export function aplicarTema(
  novoTema,
  { persist = true, animate = true, announce = true } = {}
) {
  const temaNormalizado = VALID_THEMES.includes(novoTema) ? novoTema : 'escuro';
  const resolved = resolverTemaAtivo(temaNormalizado);
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  const prevResolved = root ? root.getAttribute('data-theme') : null;
  const changed = prevResolved !== resolved;

  const commitDomUpdate = () => {
    if (root) {
      root.setAttribute('data-theme', resolved);
      root.setAttribute('data-theme-pref', temaNormalizado);
      root.style.colorScheme = resolved === 'escuro' ? 'dark' : 'light';
    }
    invalidarCacheTokens();
    sincronizarMetaThemeColor();
  };

  if (persist && store?.updatePerfil) {
    const currentSaved = store.getEntity('perfil')?.tema;
    if (currentSaved !== temaNormalizado) {
      store.updatePerfil({ tema: temaNormalizado });
    }
  }

  if (changed && animate && !prefersReducedMotion() && root) {
    root.classList.add('is-theme-transitioning');
    if (transitionTimer) clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      root.classList.remove('is-theme-transitioning');
      transitionTimer = null;
    }, 250);
  }

  commitDomUpdate();

  if (announce && changed) {
    announceThemeForScreenReader(resolved);
  }

  const detail = { tema: temaNormalizado, temaAtivo: resolved };
  for (const cb of themeSubscribers) {
    try {
      cb(detail);
    } catch (_) {}
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('clay:tema', { detail }));
  }

  return detail;
}

export function ouvirTema(callback) {
  if (typeof callback !== 'function') return () => {};
  themeSubscribers.add(callback);
  return () => {
    themeSubscribers.delete(callback);
  };
}

export function initThemeSystem() {
  const savedTema = lerTema();
  aplicarTema(savedTema, { persist: false, animate: false, announce: false });

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !mediaQueryList) {
    try {
      mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
      const onSystemChange = () => {
        if (lerTema() === 'automatico') {
          aplicarTema('automatico', { persist: false, animate: true, announce: true });
        }
      };
      if (typeof mediaQueryList.addEventListener === 'function') {
        mediaQueryList.addEventListener('change', onSystemChange);
      } else if (typeof mediaQueryList.addListener === 'function') {
        mediaQueryList.addListener(onSystemChange);
      }
    } catch (_) {}
  }
}

const themeApi = {
  lerTema,
  aplicarTema,
  ouvirTema,
  temaAtivo,
  corToken,
  invalidarCacheTokens,
  sincronizarMetaThemeColor,
  initThemeSystem
};

if (typeof window !== 'undefined') {
  window.clayTheme = themeApi;
}

export default themeApi;
