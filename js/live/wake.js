/**
 * ============================================================================
 * CLAY FIT — GERENCIADOR DE WAKE LOCK (TELA SEMPRE ACESA NO TREINO)
 * /js/live/wake.js
 *
 * Especificação B11 (Prompt 3):
 * - Mantém a tela acesa durante todo o treino (`navigator.wakeLock.request('screen')`).
 * - Reativa automaticamente ao voltar à aba (`visibilitychange`).
 * - Falha silenciosa se não houver suporte no navegador/dispositivo.
 * ============================================================================
 */

class WakeLockManager {
  constructor() {
    this.sentinel = null;
    this.shouldKeepAwake = false;
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  async request() {
    this.shouldKeepAwake = true;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    try {
      if (
        typeof navigator !== 'undefined' &&
        'wakeLock' in navigator &&
        typeof navigator.wakeLock?.request === 'function' &&
        !document.hidden
      ) {
        this.sentinel = await navigator.wakeLock.request('screen');
        return true;
      }
    } catch (e) {
      // Falha silenciosa se não houver suporte ou permissão
    }
    return false;
  }

  async handleVisibilityChange() {
    if (this.shouldKeepAwake && !document.hidden) {
      try {
        if (
          typeof navigator !== 'undefined' &&
          'wakeLock' in navigator &&
          typeof navigator.wakeLock?.request === 'function'
        ) {
          this.sentinel = await navigator.wakeLock.request('screen');
        }
      } catch (e) {
        // Falha silenciosa
      }
    }
  }

  async release() {
    this.shouldKeepAwake = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    try {
      if (this.sentinel && typeof this.sentinel.release === 'function') {
        await this.sentinel.release();
      }
    } catch (e) {
      // Silencioso
    }
    this.sentinel = null;
  }
}

export const wakeLock = new WakeLockManager();
export default wakeLock;
