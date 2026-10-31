/**
 * ============================================================================
 * CLAY FIT — TONS SONOROS POR WEB AUDIO API (TREINO DE FORÇA E CORRIDA — C5)
 * /js/live/audio.js
 *
 * Especificações Prompt 3 (B11) e Prompt 4 (C3.2, C5):
 * - Bipe curto (880 Hz, 90 ms) para contagem regressiva (3, 2, 1) e últimos 3 s.
 * - Tom de descanso concluído / "Vai!" (1320 Hz, 220 ms).
 * - Duplo de km (880 Hz + 1175 Hz).
 * - Conquista / meta atingida / recorde (acorde ascendente de 3 notas: 659 Hz, 880 Hz, 1175 Hz).
 * - Tiro de intervalado (1175 Hz longo, 200 ms).
 * - Respeita `perfil.somAtivo` e `perfil.bipesCorridaAtivo`. Inicializa o
 *   AudioContext no primeiro toque do usuário.
 * ============================================================================
 */

import { store } from '../store.js';

let sharedAudioCtx = null;
let gestureListenerBound = false;

export function getAudioContext() {
  try {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

function bindFirstGestureUnlock() {
  if (gestureListenerBound || typeof document === 'undefined') return;
  gestureListenerBound = true;
  const unlock = () => {
    getAudioContext();
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
  };
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock, { passive: true });
}
bindFirstGestureUnlock();

export function isSoundEnabled(forRun = false) {
  const perfil = store.getEntity('perfil');
  if (forRun && perfil?.bipesCorridaAtivo === false) return false;
  return perfil?.somAtivo !== false;
}

/**
 * Toca um tom senoidal suave com envelope anti-clique.
 */
export function playTone(frequencyHz = 880, durationMs = 120, delaySec = 0, forRun = false) {
  if (!isSoundEnabled(forRun)) return false;
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    const now = ctx.currentTime + Math.max(0, Number(delaySec || 0));
    const durSec = Math.max(0.05, Number(durationMs || 120) / 1000);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(Number(frequencyHz || 880), now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durSec + 0.01);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * B11 & C5: Bipe curto (880 Hz, 90 ms) para 3, 2, 1.
 */
export function playCountdownTick(forRun = false) {
  return playTone(880, 90, 0, forRun);
}

/**
 * B11 & C3.2: Tom mais agudo (1320 Hz, 220 ms) ao zerar o descanso ou no "Vai!".
 */
export function playRestCompleteTone(forRun = false) {
  return playTone(1320, 220, 0, forRun);
}

/**
 * C5: Duplo de km (880 Hz + 1175 Hz).
 */
export function playKmDoubleBeep() {
  if (!isSoundEnabled(true)) return false;
  playTone(880, 90, 0, true);
  return playTone(1175, 130, 0.12, true);
}

/**
 * C5: Conquista / meta atingida (acorde ascendente de 3 notas).
 */
export function playAchievementChord() {
  if (!isSoundEnabled(true)) return false;
  playTone(659.25, 110, 0, true);
  playTone(880, 120, 0.11, true);
  return playTone(1174.66, 220, 0.23, true);
}

/**
 * C5: Tiro de corrida intervalada (1175 Hz longo, 200 ms).
 */
export function playIntervalSprintTone() {
  return playTone(1175, 200, 0, true);
}
