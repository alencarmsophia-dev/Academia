/**
 * ============================================================================
 * CLAY FIT — COMPONENTE TOAST (A2 & C4: Pílula Compacta de 44px no Modo Energia)
 * /js/ui/toast.js
 *
 * Especificações Prompt 4 (A2) + Prompt 5.1 (C4):
 * - No Modo Energia (`html[data-mode="energia"]` ou `body.modo-energia`), o aviso
 *   vira uma PÍLULA compacta: altura 44px, raio 22px, `min-width: 200px`,
 *   `max-width: 260px`, alinhada à ESQUERDA (`left: 12px; right: auto`), com
 *   verificação geométrica automática contra todos os botões visíveis ("Como fazer",
 *   `X`, `···`, "Série feita", etc.) para garantir interseção ZERO em 360×640 e 390×844.
 * - Duração: 3,5 s (3500ms) no Modo Energia; 5 s (5000ms) fora dele.
 * - Toque na pílula (fora do "Desfazer") fecha na hora; deslizar para cima também fecha.
 * ============================================================================
 */

let activeToastTimer = null;
let activePositionCleanup = null;

function ensureToastStack() {
  let stack = document.getElementById('clay-toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'clay-toast-stack';
    stack.className = 'c-toast-Stack';
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  return stack;
}

function rectsIntersect(a, b, pad = 2) {
  return !(
    a.right + pad <= b.left ||
    a.left - pad >= b.right ||
    a.bottom + pad <= b.top ||
    a.top - pad >= b.bottom
  );
}

/**
 * C4 — Garante que em Modo Energia o aviso compacto (`left: 12px`, `min-width: 200px`,
 * `max-width: 260px`) fique logo abaixo do cabeçalho e NUNCA intersecte nenhum botão
 * visível ("Como fazer", X, "···", "Série feita", etc.) em qualquer fase do treino.
 */
export function resolveEnergyToastPlacement() {
  const stack = document.getElementById('clay-toast-stack');
  if (!stack) return;
  const toast = stack.querySelector('.c-toast');
  if (!toast) return;

  const isEnergia =
    document.documentElement.getAttribute('data-mode') === 'energia' ||
    document.body.classList.contains('modo-energia') ||
    toast.classList.contains('c-toast--energia');

  if (!isEnergia) {
    stack.style.top = '';
    stack.style.left = '';
    stack.style.right = '';
    toast.style.maxWidth = '';
    return;
  }

  stack.style.left = '12px';
  stack.style.right = 'auto';
  toast.style.minWidth = '200px';
  toast.style.maxWidth = '260px';

  const topbar = document.querySelector('.live-topbar, .run-active-topbar');
  const topbarH = topbar ? Math.max(topbar.offsetHeight || 0, Math.round(topbar.getBoundingClientRect().height || 54)) : 54;
  const baseTop = Math.max(58, topbarH + 6);
  stack.style.top = `${baseTop}px`;

  const visibleButtons = Array.from(document.querySelectorAll('button')).filter((btn) => {
    if (toast.contains(btn)) return false;
    if (btn.hidden || btn.disabled) return false;
    if (btn.closest('.app-nav')) return false;
    const cs = window.getComputedStyle(btn);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) {
      return false;
    }
    const r = btn.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  let tRect = toast.getBoundingClientRect();
  const hasOverlap = () =>
    visibleButtons.some((btn) => rectsIntersect(tRect, btn.getBoundingClientRect(), 1));

  if (!hasOverlap()) return;

  const candidatesTop = [
    baseTop,
    baseTop + 4,
    baseTop + 8,
    baseTop + 14
  ];

  for (const candTop of candidatesTop) {
    stack.style.top = `${candTop}px`;
    tRect = toast.getBoundingClientRect();
    if (!hasOverlap()) return;
  }
}

/**
 * A2 & G2c — Remove imediatamente todos os avisos ativos.
 */
export function clearToasts() {
  if (activeToastTimer) {
    clearTimeout(activeToastTimer);
    activeToastTimer = null;
  }
  if (activePositionCleanup) {
    activePositionCleanup();
    activePositionCleanup = null;
  }
  const stack = document.getElementById('clay-toast-stack');
  if (stack) {
    stack.innerHTML = '';
  }
}

export function showToast({
  message = 'Salvo',
  actionLabel = '',
  onAction = null,
  duration = null,
  variant = ''
} = {}) {
  if (activeToastTimer) {
    clearTimeout(activeToastTimer);
    activeToastTimer = null;
  }
  if (activePositionCleanup) {
    activePositionCleanup();
    activePositionCleanup = null;
  }

  const stack = ensureToastStack();
  stack.innerHTML = '';

  const isEnergia =
    document.documentElement.getAttribute('data-mode') === 'energia' ||
    document.body.classList.contains('modo-energia');

  const hasAction = Boolean(actionLabel && typeof onAction === 'function');
  const defaultDuration = isEnergia ? 3500 : hasAction ? 5000 : 3500;
  const finalDuration = duration !== null ? Number(duration) : defaultDuration;

  const toast = document.createElement('div');
  const classes = ['c-toast'];
  if (isEnergia) classes.push('c-toast--energia');
  if (variant) classes.push(`c-toast--${variant}`);
  toast.className = classes.join(' ');
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <span class="c-toast__msg">${message}</span>
    ${
      hasAction
        ? `<button type="button" class="c-toast__action">${actionLabel}</button>`
        : ''
    }
  `;

  let removed = false;
  const removeToast = () => {
    if (removed) return;
    removed = true;
    if (activeToastTimer) {
      clearTimeout(activeToastTimer);
      activeToastTimer = null;
    }
    if (activePositionCleanup) {
      activePositionCleanup();
      activePositionCleanup = null;
    }
    toast.style.opacity = '0';
    toast.style.transform = isEnergia ? 'translateY(-12px)' : 'translateY(12px)';
    toast.style.transition = 'opacity 160ms ease, transform 160ms ease';
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 165);
  };

  if (hasAction) {
    const btn = toast.querySelector('.c-toast__action');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onAction();
        removeToast();
      });
    }
  }

  toast.addEventListener('click', (e) => {
    if (e.target.closest('.c-toast__action')) return;
    removeToast();
  });

  let startY = null;
  toast.addEventListener(
    'pointerdown',
    (e) => {
      startY = e.clientY;
    },
    { passive: true }
  );
  toast.addEventListener(
    'pointermove',
    (e) => {
      if (startY === null) return;
      if (e.clientY - startY < -10) {
        startY = null;
        removeToast();
      }
    },
    { passive: true }
  );
  toast.addEventListener(
    'pointerup',
    () => {
      startY = null;
    },
    { passive: true }
  );

  stack.appendChild(toast);

  if (isEnergia) {
    resolveEnergyToastPlacement();
    requestAnimationFrame(resolveEnergyToastPlacement);
    const t1 = setTimeout(resolveEnergyToastPlacement, 60);
    const t2 = setTimeout(resolveEnergyToastPlacement, 220);
    window.addEventListener('resize', resolveEnergyToastPlacement);
    activePositionCleanup = () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', resolveEnergyToastPlacement);
    };
  }

  if (finalDuration > 0) {
    activeToastTimer = setTimeout(removeToast, finalDuration);
  }

  return { close: removeToast };
}
