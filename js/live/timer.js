/**
 * ============================================================================
 * CLAY FIT — CRONÔMETROS DE PRECISÃO POR TIMESTAMP E FORMATAÇÃO PT-BR
 * /js/live/timer.js
 *
 * Especificações Prompt 3 e Prompt 3.1 (M6, V1, V2):
 * - Usa exclusivamente timestamps (`Date.now()` e `performance.now()`), NUNCA
 *   contagem acumulada por `setInterval`.
 * - Ao voltar de aba oculta (`visibilitychange`) ou bloqueio de tela, recalcula
 *   imediatamente o tempo restante.
 * - Parâmetro de teste `?fast=1` divide TODOS os cronômetros por 10.
 * - M6: `formatKg(n)` usa `Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })`
 *   para formatar cargas e volumes sempre com vírgula decimal ("42,5 kg") e
 *   ponto de milhar ("5.050 kg").
 * ============================================================================
 */

let simulatedOffsetMs = 0;

const ptBrKgFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

/**
 * M6 — Formata número de carga ou volume no padrão pt-BR ("42,5", "5.050").
 */
export function formatKg(n) {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return '0';
  const rounded = Math.round(num * 10) / 10;
  return ptBrKgFormatter.format(rounded);
}

/**
 * Retorna o fator de escala de tempo: 0.1 quando `?fast=1` está ativo na URL,
 * ou 1.0 em uso normal.
 */
export function getTimeScale() {
  try {
    if (typeof window === 'undefined') return 1;
    if (window.__CLAY_FAST_MODE === false) return 1;
    const params = new URLSearchParams(window.location.search || '');
    if (params.get('fast') === '1' || window.__CLAY_FAST_MODE === true) {
      return 0.1;
    }
  } catch (e) {
    // Silencioso
  }
  return 1;
}

export function isFastMode() {
  return getTimeScale() < 1;
}

/**
 * Converte uma duração nominal em milissegundos aplicando `?fast=1`.
 */
export function scaleMs(nominalMs) {
  return Math.max(40, Math.round(Number(nominalMs || 0) * getTimeScale()));
}

/**
 * Retorna o timestamp atual (suporta avanço simulado para auditoria de aba oculta).
 */
export function nowMs() {
  return Date.now() + simulatedOffsetMs;
}

/**
 * Permite avançar o relógio em `seconds` segundos para auditar o recálculo
 * após 30s com a aba oculta (V2).
 */
export function advanceSimulatedClock(seconds = 30) {
  simulatedOffsetMs += Number(seconds || 0) * 1000;
  document.dispatchEvent(new Event('visibilitychange'));
  return nowMs();
}

export function resetSimulatedClock() {
  simulatedOffsetMs = 0;
}

/**
 * Formata segundos em `M:SS` (ex.: 90 -> "1:30", 5 -> "0:05") com números tabulares.
 */
export function formatRestClock(totalSeconds) {
  const s = Math.max(0, Math.ceil(Number(totalSeconds || 0)));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Formata segundos em `MM:SS` (ex.: 125 -> "02:05").
 */
export function formatElapsedClock(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds || 0)));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Cronômetro regressivo baseado em timestamp final (`endTimeMs`) e `requestAnimationFrame`.
 */
export class TimestampCountdown {
  constructor({
    durationSec = 60,
    existingEndTimeMs = null,
    existingNominalSec = null,
    onFrame = () => {},
    onSecond = () => {},
    onComplete = () => {}
  } = {}) {
    this.nominalTotalSec = Number(existingNominalSec || durationSec || 60);
    const scale = getTimeScale();
    this.effectiveDurationMs = Math.max(200, this.nominalTotalSec * 1000 * scale);
    this.scale = scale;

    const current = nowMs();
    if (existingEndTimeMs) {
      this.endTimeMs = existingEndTimeMs;
      this.startTimeMs = this.endTimeMs - this.effectiveDurationMs;
    } else {
      this.startTimeMs = current;
      this.endTimeMs = current + this.effectiveDurationMs;
    }

    this.onFrame = onFrame;
    this.onSecond = onSecond;
    this.onComplete = onComplete;

    this.rafId = null;
    this.paused = false;
    this.remainingWhenPausedMs = 0;
    this.completed = false;
    this.lastNominalSec = null;

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  start() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.tick();
    return this;
  }

  handleVisibilityChange() {
    if (this.completed || this.paused) return;
    this.evaluateNow(true);
  }

  getRemainingNominalSec() {
    if (this.paused) {
      return Math.max(0, Math.ceil(this.remainingWhenPausedMs / (1000 * this.scale)));
    }
    const remEffectiveMs = Math.max(0, this.endTimeMs - nowMs());
    return Math.max(0, Math.ceil(remEffectiveMs / (1000 * this.scale)));
  }

  getFractionRemaining() {
    const remMs = this.paused
      ? this.remainingWhenPausedMs
      : Math.max(0, this.endTimeMs - nowMs());
    return Math.max(0, Math.min(1, remMs / Math.max(1, this.effectiveDurationMs)));
  }

  adjustSeconds(deltaNominalSec) {
    if (this.completed) return;
    const deltaEffectiveMs = Number(deltaNominalSec || 0) * 1000 * this.scale;
    this.nominalTotalSec = Math.max(5, this.nominalTotalSec + Number(deltaNominalSec || 0));
    this.effectiveDurationMs = Math.max(200, this.nominalTotalSec * 1000 * this.scale);

    if (this.paused) {
      this.remainingWhenPausedMs = Math.max(1000 * this.scale, this.remainingWhenPausedMs + deltaEffectiveMs);
    } else {
      const nextEnd = Math.max(nowMs() + 1000 * this.scale, this.endTimeMs + deltaEffectiveMs);
      this.endTimeMs = nextEnd;
    }
    this.lastNominalSec = null;
    this.evaluateNow(false);
  }

  pause() {
    if (this.paused || this.completed) return;
    this.paused = true;
    this.remainingWhenPausedMs = Math.max(0, this.endTimeMs - nowMs());
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume() {
    if (!this.paused || this.completed) return;
    this.paused = false;
    this.endTimeMs = nowMs() + this.remainingWhenPausedMs;
    this.tick();
  }

  togglePause() {
    if (this.paused) this.resume();
    else this.pause();
    return this.paused;
  }

  evaluateNow(fromWake = false) {
    if (this.completed) return;
    const remEffectiveMs = this.paused
      ? this.remainingWhenPausedMs
      : this.endTimeMs - nowMs();

    if (remEffectiveMs <= 0) {
      this.completed = true;
      this.stop();
      this.onFrame({ remainingSec: 0, fraction: 0 });
      this.onSecond(0, { fromWake });
      this.onComplete({ expiredWhileHidden: fromWake });
      return;
    }

    const remainingSec = Math.max(0, Math.ceil(remEffectiveMs / (1000 * this.scale)));
    const fraction = Math.max(0, Math.min(1, remEffectiveMs / Math.max(1, this.effectiveDurationMs)));

    this.onFrame({ remainingSec, fraction });

    if (remainingSec !== this.lastNominalSec) {
      this.lastNominalSec = remainingSec;
      this.onSecond(remainingSec, { fromWake });
    }
  }

  tick() {
    if (this.completed || this.paused) return;
    this.evaluateNow(false);
    if (!this.completed && !this.paused) {
      this.rafId = requestAnimationFrame(() => this.tick());
    }
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}

if (typeof window !== 'undefined') {
  window.clayTimer = {
    formatKg,
    getTimeScale,
    isFastMode,
    advanceSimulatedClock,
    resetSimulatedClock,
    nowMs
  };
}
