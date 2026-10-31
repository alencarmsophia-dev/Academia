/**
 * ============================================================================
 * CLAY FIT — COMPONENTE CHIP SELECIONÁVEL
 * /js/ui/chip.js
 *
 * Correção Prompt 2.1 (Seção 3.2):
 * - Sem ponto nem espaço fantasma à esquerda;
 * - Padding igual em todos (10px 16px);
 * - Chip ativo troca o fundo para terracota-suave e a borda para terracota.
 * ============================================================================
 */

export function renderChip({
  id = '',
  label = 'Todos',
  value = 'Todos',
  selected = false,
  state = 'normal',
  group = 'default'
} = {}) {
  const isDisabled = state === 'disabled';
  const stateClass =
    state === 'hover'
      ? 'is-hover'
      : state === 'pressed'
      ? 'is-pressed'
      : state === 'disabled'
      ? 'is-disabled'
      : '';

  return `
    <button
      type="button"
      ${id ? `id="${id}"` : ''}
      class="c-chip ${selected ? 'is-selected' : ''} ${stateClass}"
      aria-pressed="${selected ? 'true' : 'false'}"
      data-chip-group="${group}"
      data-chip-value="${value}"
      ${isDisabled ? 'disabled aria-disabled="true"' : ''}
    >
      <span>${label}</span>
    </button>
  `;
}

export function bindChips(root = document, onSelect = null) {
  const chips = root.querySelectorAll('.c-chip[data-chip-group]');
  chips.forEach((chip) => {
    if (chip.dataset.bound === 'true') return;
    chip.dataset.bound = 'true';
    chip.addEventListener('click', () => {
      if (chip.disabled) return;
      const group = chip.dataset.chipGroup;
      const mode = chip.closest('[data-chip-mode]')?.dataset.chipMode || 'single';
      if (mode === 'single') {
        root.querySelectorAll(`.c-chip[data-chip-group="${group}"]`).forEach((peer) => {
          peer.classList.remove('is-selected');
          peer.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('is-selected');
        chip.setAttribute('aria-pressed', 'true');
      } else {
        const next = chip.getAttribute('aria-pressed') !== 'true';
        chip.classList.toggle('is-selected', next);
        chip.setAttribute('aria-pressed', String(next));
      }
      if (typeof onSelect === 'function') {
        onSelect({
          group,
          value: chip.dataset.chipValue,
          selected: chip.getAttribute('aria-pressed') === 'true'
        });
      }
    });
  });
}
