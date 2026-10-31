/**
 * ============================================================================
 * CLAY FIT — AVISOS DE VOZ EM PORTUGUÊS DURANTE A CORRIDA (C5)
 * /js/run/voice.js
 *
 * Especificação Prompt 4 (C5):
 * - Síntese de voz (`window.speechSynthesis` em `pt-BR`, opcional e desligável;
 *   fila de 1 mensagem para nunca empilhar):
 *   - Início: "Corrida iniciada."
 *   - A cada km: "Quilômetro 2. Tempo 10 minutos e 42 segundos. Último quilômetro em 5 e 18."
 *   - 50% e 100% da meta.
 *   - Transição de intervalo: "Tiro agora" / "Trote leve".
 *   - Pausa e retomada.
 * - Só fala se `perfil.somAtivo` e `perfil.vozEmCorrida` estiverem ativos e a API existir.
 * ============================================================================
 */

import { store } from '../store.js';

function canSpeakNow() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const perfil = store.getState()?.perfil || {};
  if (perfil.somAtivo === false || perfil.vozEmCorrida === false) return false;
  return true;
}

export function speakPtBr(text) {
  if (!text || !canSpeakNow()) return false;
  try {
    const synth = window.speechSynthesis;
    // Fila de 1 mensagem: cancela qualquer locução anterior antes de falar
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(String(text));
    utter.lang = 'pt-BR';
    utter.rate = 1.04;
    utter.pitch = 1.0;

    const voices = synth.getVoices ? synth.getVoices() : [];
    const ptVoice = voices.find(
      (v) => v.lang && v.lang.toLowerCase().startsWith('pt-br')
    ) || voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('pt'));
    if (ptVoice) {
      utter.voice = ptVoice;
    }

    synth.speak(utter);
    return true;
  } catch (_) {
    return false;
  }
}

function secondsToSpokenMinSec(totalSec) {
  const s = Math.max(0, Math.round(Number(totalSec || 0)));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  if (min === 0) return `${sec} segundos`;
  if (sec === 0) return `${min} ${min === 1 ? 'minuto' : 'minutos'}`;
  return `${min} ${min === 1 ? 'minuto' : 'minutos'} e ${sec} segundos`;
}

function paceToSpoken(ritmoSegKm) {
  const s = Math.max(0, Math.round(Number(ritmoSegKm || 0)));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  if (sec === 0) return `${min} minutos cravados`;
  return `${min} e ${sec < 10 ? `zero ${sec}` : sec}`;
}

export function announceRunStarted() {
  return speakPtBr('Corrida iniciada.');
}

export function announceKmSplit(kmNum, totalMovimentoSeg, ultimoKmSeg) {
  const totalTxt = secondsToSpokenMinSec(totalMovimentoSeg);
  const parcialTxt = paceToSpoken(ultimoKmSeg);
  return speakPtBr(
    `Quilômetro ${kmNum}. Tempo ${totalTxt}. Último quilômetro em ${parcialTxt}.`
  );
}

export function announceGoalMilestone(pct, metaDescricao = '') {
  if (pct === 50) {
    return speakPtBr('Metade da meta concluída. Continue firme.');
  }
  if (pct === 90) {
    return speakPtBr('Reta final. Faltam dez por cento para a meta.');
  }
  if (pct >= 100) {
    return speakPtBr(`Meta atingida! ${metaDescricao}`);
  }
  return false;
}

export function announceIntervalPhase(fase) {
  if (fase === 'tiro') return speakPtBr('Tiro agora.');
  if (fase === 'trote') return speakPtBr('Trote leve.');
  if (fase === 'volta_calma') return speakPtBr('Volta à calma.');
  return false;
}

export function announceRunPaused(isAuto = false) {
  return speakPtBr(isAuto ? 'Pausa automática.' : 'Corrida pausada.');
}

export function announceRunResumed() {
  return speakPtBr('Retomando corrida.');
}
