/**
 * ============================================================================
 * CLAY FIT — FOLHA INFERIOR ARRASTÁVEL COM FÍSICA ELÁSTICA, INERT E HISTÓRICO
 * /js/ui/bottom-sheet.js
 *
 * Correção Prompt 3.1 (G1):
 * - `closeBottomSheet(id, { silent: true })` fecha a folha SEM chamar
 *   `history.back()`: remove o estado de folha com `history.replaceState`
 *   (preservando o state sem a chave `sheet`) apenas se o estado atual for
 *   dessa folha, atualiza o DOM e limpa `activeSheetId`.
 * - `closeAllSheets({ silent: true, clearContent: true })` garante que nenhuma
 *   folha de `#app-sheet-root` continue aberta ao montar rotas de treino.
 * - O fechamento por botão voltar do aparelho (`popstate`) continua intacto.
 * ============================================================================
 */

import { spring, vibrate } from '../motion.js';
import { getIconSvg } from './illustrations.js';

let activeSheetId = null;
let previousFocusedElement = null;
let closingFromPopstate = false;

export function renderBottomSheet({
  id = 'clay-sheet',
  title = 'Opções',
  contentHtml = ''
} = {}) {
  return `
    <div id="${id}-backdrop" class="c-sheet-backdrop" data-sheet-close="${id}" aria-hidden="true"></div>
    <section
      id="${id}"
      class="c-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="${id}-title"
      aria-hidden="true"
      tabindex="-1"
    >
      <div class="c-sheet__drag-zone" data-sheet-drag="${id}">
        <span class="c-sheet__handle" aria-hidden="true"></span>
      </div>
      <header class="c-sheet__header" data-sheet-drag="${id}">
        <h2 id="${id}-title" class="t-h2">${title}</h2>
        <button
          type="button"
          class="c-topbar__icon-btn"
          data-sheet-close="${id}"
          aria-label="Fechar janela"
        >
          ${getIconSvg('fechar', 22)}
        </button>
      </header>
      <div class="c-sheet__body" id="${id}-body">
        ${contentHtml}
      </div>
    </section>
  `;
}

function setAppInert(isInert) {
  const appLayout = document.querySelector('.app-layout');
  if (!appLayout) return;
  if (isInert) {
    appLayout.setAttribute('inert', '');
    appLayout.setAttribute('aria-hidden', 'true');
  } else {
    appLayout.removeAttribute('inert');
    appLayout.removeAttribute('aria-hidden');
  }
}

function stripSheetFromHistoryState(targetSheetId = null) {
  try {
    const curState = window.history.state;
    if (curState && typeof curState === 'object' && 'sheet' in curState) {
      if (!targetSheetId || curState.sheet === targetSheetId) {
        const nextState = { ...curState };
        delete nextState.sheet;
        window.history.replaceState(
          Object.keys(nextState).length > 0 ? nextState : null,
          '',
          window.location.href
        );
      }
    }
  } catch (e) {
    // Ignorado em ambientes restritos (ex.: data: URL)
  }
}

export function isAnySheetOpen() {
  return Boolean(activeSheetId);
}

export function openBottomSheet(id = 'clay-sheet', customOptions = null) {
  if (typeof id === 'object' && id !== null) {
    customOptions = id;
    id = customOptions.id || 'clay-sheet';
  }
  if (!document.getElementById(id)) {
    id = 'clay-sheet';
  }
  const sheet = document.getElementById(id);
  const backdrop = document.getElementById(`${id}-backdrop`);
  if (!sheet || !backdrop) return null;

  previousFocusedElement = document.activeElement;

  if (customOptions) {
    const titleEl = document.getElementById(`${id}-title`);
    const bodyEl = document.getElementById(`${id}-body`);
    if (titleEl && customOptions.title) titleEl.textContent = customOptions.title;
    const htmlContent = customOptions.contentHtml !== undefined ? customOptions.contentHtml : customOptions.html;
    if (bodyEl && htmlContent !== undefined) {
      bodyEl.innerHTML = htmlContent;
    }
  }

  activeSheetId = id;
  sheet.style.transform = '';
  backdrop.style.opacity = '';
  backdrop.classList.add('is-open');
  sheet.classList.add('is-open');
  sheet.setAttribute('aria-hidden', 'false');
  setAppInert(true);

  try {
    if (window.location.protocol !== 'data:') {
      if (!window.history.state || window.history.state.sheet !== id) {
        window.history.pushState({ ...(window.history.state || {}), sheet: id }, '');
      }
    }
  } catch (e) {
    // Ignorado em ambientes restritos
  }

  requestAnimationFrame(() => {
    const firstFocusable = sheet.querySelector(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusable) {
      firstFocusable.focus();
    } else {
      sheet.focus();
    }
  });
  return sheet;
}

/**
 * G1a — Fecha a folha inferior.
 * Quando `options` é `{ silent: true }`, fecha a folha SEM chamar `history.back()`,
 * limpando o estado do histórico via `history.replaceState` para não desfazer
 * navegações subsequentes.
 */
export function closeBottomSheet(
  id = activeSheetId || 'clay-sheet',
  options = false
) {
  const rawId = id || activeSheetId || 'clay-sheet';
  const targetId = document.getElementById(rawId) ? rawId : (activeSheetId || 'clay-sheet');
  const isSilent =
    typeof options === 'object' && options !== null
      ? Boolean(options.silent)
      : false;
  const fromHistory = typeof options === 'boolean' ? options : false;

  const sheet = document.getElementById(targetId);
  const backdrop = document.getElementById(`${targetId}-backdrop`);

  const wasOpen = Boolean(
    activeSheetId === targetId ||
      sheet?.classList.contains('is-open') ||
      backdrop?.classList.contains('is-open')
  );

  activeSheetId = null;

  if (sheet) {
    sheet.style.transform = '';
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
  }
  if (backdrop) {
    backdrop.style.opacity = '';
    backdrop.classList.remove('is-open');
  }
  setAppInert(false);

  if (isSilent) {
    stripSheetFromHistoryState(targetId);
  } else if (wasOpen && !fromHistory && !closingFromPopstate) {
    try {
      if (
        window.location.protocol !== 'data:' &&
        window.history.state &&
        window.history.state.sheet === targetId
      ) {
        window.history.back();
      }
    } catch (e) {
      // Ignorado
    }
  }

  if (!isSilent && previousFocusedElement && typeof previousFocusedElement.focus === 'function') {
    try {
      previousFocusedElement.focus();
    } catch (e) {
      // Ignorado
    }
  }
}

/**
 * G1c — Garante que TODAS as folhas em `#app-sheet-root` sejam fechadas
 * imediatamente e sem disparar `history.back()`.
 */
export function closeAllSheets({ silent = true, clearContent = false } = {}) {
  activeSheetId = null;
  setAppInert(false);

  document.querySelectorAll('.c-sheet').forEach((sheet) => {
    sheet.style.transform = '';
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    if (clearContent) {
      const bodyEl = sheet.querySelector('.c-sheet__body');
      if (bodyEl) bodyEl.innerHTML = '';
    }
  });

  document.querySelectorAll('.c-sheet-backdrop').forEach((backdrop) => {
    backdrop.style.opacity = '';
    backdrop.classList.remove('is-open');
  });

  if (silent) {
    stripSheetFromHistoryState(null);
  }
}

let popstateSheetBound = false;
export function bindBottomSheets(root = document) {
  if (!popstateSheetBound) {
    popstateSheetBound = true;
    window.addEventListener('popstate', () => {
      if (activeSheetId) {
        closingFromPopstate = true;
        closeBottomSheet(activeSheetId, true);
        closingFromPopstate = false;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!activeSheetId) return;
      const sheet = document.getElementById(activeSheetId);
      if (!sheet) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeBottomSheet(activeSheetId);
        return;
      }

      if (e.key === 'Tab') {
        const focusables = Array.from(
          sheet.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  root.querySelectorAll('[data-sheet-close]').forEach((el) => {
    if (el.dataset.boundClose === 'true') return;
    el.dataset.boundClose = 'true';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      closeBottomSheet(el.dataset.sheetClose);
    });
  });

  root.querySelectorAll('[data-sheet-drag]').forEach((zone) => {
    if (zone.dataset.boundDrag === 'true') return;
    zone.dataset.boundDrag = 'true';

    const sheetId = zone.dataset.sheetDrag;
    const sheet = document.getElementById(sheetId);
    const backdrop = document.getElementById(`${sheetId}-backdrop`);
    if (!sheet) return;

    let startY = 0;
    let startTime = 0;
    let currentDelta = 0;
    let dragging = false;

    zone.addEventListener('pointerdown', (e) => {
      if (e.target.closest('[data-sheet-close]')) return;
      dragging = true;
      startY = e.clientY;
      startTime = performance.now();
      currentDelta = 0;
      sheet.style.transition = 'none';
      if (backdrop) backdrop.style.transition = 'none';
      zone.setPointerCapture(e.pointerId);
    });

    zone.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rawDelta = e.clientY - startY;
      currentDelta = rawDelta < 0 ? rawDelta * 0.35 : rawDelta;
      sheet.style.transform = `translateY(${currentDelta.toFixed(1)}px)`;

      if (backdrop) {
        const sheetH = Math.max(240, sheet.offsetHeight);
        const progress = Math.max(0, Math.min(1, currentDelta / sheetH));
        backdrop.style.opacity = String((1 - progress).toFixed(2));
      }
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      const elapsed = Math.max(1, performance.now() - startTime);
      const velocity = currentDelta / elapsed;
      const sheetH = Math.max(240, sheet.offsetHeight);

      if (backdrop) backdrop.style.transition = '';

      if (velocity > 0.6 || currentDelta > sheetH * 0.35) {
        sheet.style.transition = '';
        vibrate('selecao');
        closeBottomSheet(sheetId);
      } else {
        spring({
          from: currentDelta,
          to: 0,
          stiffness: 260,
          damping: 24,
          onUpdate: (val) => {
            sheet.style.transform = `translateY(${val.toFixed(1)}px)`;
          },
          onDone: () => {
            sheet.style.transition = '';
            sheet.style.transform = '';
          }
        });
        if (backdrop) backdrop.style.opacity = '1';
      }
    };

    zone.addEventListener('pointerup', endDrag);
    zone.addEventListener('pointercancel', endDrag);
  });
}
