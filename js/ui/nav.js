/**
 * ============================================================================
 * CLAY FIT — BARRA DE NAVEGAÇÃO COM PÍLULA DESLIZANTE (Seção 5.4 e 5.6)
 * /js/ui/nav.js
 *
 * - 5 posições: Hoje | Biblioteca | [Começar 64px elevado 20px] | Evolução | Perfil
 * - Aba ativa com pílula terracota-suave de 56×32 que desliza (translateX 360ms)
 *   e rótulo 12/16 600; inativa com ícone tinta-3.
 * - Tocar duas vezes na aba ativa rola ao topo em 360ms.
 * - Esconde-se (translateY 100%) em #/treino, #/abertura, #/boas-vindas,
 *   #/q/*, #/montando, #/plano e quando um teclado está aberto.
 * ============================================================================
 */

import { getBrandMarkSvg, getIconSvg } from './illustrations.js';

export const NAV_ITEMS = [
  { route: 'hoje', label: 'Hoje', icon: 'hoje', type: 'tab', slotIndex: 0 },
  { route: 'biblioteca', label: 'Biblioteca', icon: 'biblioteca', type: 'tab', slotIndex: 1 },
  { route: 'comecar', label: 'Começar', icon: 'comecar', type: 'fab', slotIndex: 2 },
  { route: 'evolucao', label: 'Evolução', icon: 'evolucao', type: 'tab', slotIndex: 3 },
  { route: 'perfil', label: 'Perfil', icon: 'perfil', type: 'tab', slotIndex: 4 }
];

export function renderNavigation(activeRoute = 'hoje', hidden = false) {
  const activeItem = NAV_ITEMS.find((i) => i.route === activeRoute);
  const activeSlot = activeItem && activeItem.type === 'tab' ? activeItem.slotIndex : -1;

  const itemsHtml = NAV_ITEMS.map((item) => {
    const isActive = activeRoute === item.route;

    if (item.type === 'fab') {
      return `
        <li class="app-nav__item app-nav__start-wrap">
          <button
            type="button"
            id="nav-btn-comecar"
            class="app-nav__start-btn"
            data-nav-action="open-start-sheet"
            aria-label="Começar treino ou corrida"
          >
            ${getIconSvg('comecar', 28)}
            <span class="app-nav__start-desktop-text">Começar</span>
          </button>
        </li>
      `;
    }

    return `
      <li class="app-nav__item">
        <button
          type="button"
          class="app-nav__link ${isActive ? 'is-active' : ''}"
          data-route="${item.route}"
          aria-label="${item.label}"
          aria-current="${isActive ? 'page' : 'false'}"
        >
          <span class="app-nav__pill" aria-hidden="true">
            ${getIconSvg(item.icon, 22)}
          </span>
          <span class="app-nav__label">${item.label}</span>
        </button>
      </li>
    `;
  }).join('');

  return `
    <nav
      id="main-app-nav"
      class="app-nav ${hidden ? 'is-hidden' : ''}"
      data-active-slot="${activeSlot}"
      aria-label="Navegação principal"
    >
      <div class="app-nav__header">
        <a href="#/hoje" class="app-brand" aria-label="Clay Fit — Hoje">
          <span class="app-brand__mark">${getBrandMarkSvg(36)}</span>
          <span class="app-nav__brand-text">Clay Fit</span>
        </a>
      </div>

      <div class="app-nav__list-wrap" style="position:relative; width:100%; max-width:520px;">
        <!-- Pílula deslizante 56x32 no mobile -->
        <div
          class="app-nav__sliding-pill"
          style="
            opacity: ${activeSlot >= 0 ? '1' : '0'};
            transform: translateX(calc(${Math.max(0, activeSlot)} * 100%));
          "
          aria-hidden="true"
        ></div>
        <ul class="app-nav__list">
          ${itemsHtml}
        </ul>
      </div>
    </nav>
  `;
}
