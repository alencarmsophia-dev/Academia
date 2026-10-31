/**
 * ============================================================================
 * CLAY FIT — RASTREADOR DE CORRIDA GPS, RELÓGIO E MÁQUINA DE ESTADOS (C1–C5 & 4.1)
 * /js/run/tracker.js
 *
 * Especificação Prompt 4 (C1–C5) e Prompt 4.1 (Itens 4 e 5.5):
 * - Estados:
 *   `preparando → buscando_gps → pronta → contagem → correndo ⇄ pausada | pausa_auto → finalizando → resumo → celebracao`
 * - Item 4: Propaga lacunas de sinal (`crossedGap`) e pausas para `RollingPaceCalculator`
 *   para que saltos de reconexão nunca contaminem o ritmo atual, e retoma o ritmo atual
 *   em 6 s e 10 m após pausa manual ou automática.
 * - Item 5.5: Congela estritamente `movimentoSeg` (`this.frozenMovimentoSeg`) durante
 *   `pausada` e `pausa_auto` (tanto em 1× quanto em `?speed=10`, inclusive após
 *   recarregar a página na tela de pausa e retomar).
 * ============================================================================
 */

import { store } from '../store.js';
import { vibrate } from '../motion.js';
import { showToast } from '../ui/toast.js';
import {
  playCountdownTick,
  playRestCompleteTone,
  playKmDoubleBeep,
  playAchievementChord,
  playIntervalSprintTone
} from '../live/audio.js';
import {
  interpolatePoint,
  formatPaceSegKm,
  formatRunClock,
  formatKmWithUnit
} from './geo.js';
import { GpsPointFilter } from './filters.js';
import { RollingPaceCalculator, estimateRunCalories } from './metrics.js';
import { encodeTrackToRoute } from './polyline.js';
import { capToMaxPoints } from './simplify.js';
import { RunIntervalsEngine } from './intervals.js';
import {
  announceRunStarted,
  announceKmSplit,
  announceGoalMilestone,
  announceIntervalPhase,
  announceRunPaused,
  announceRunResumed
} from './voice.js';
import { getGpsQueryConfig, GpsSimulatorWatch } from './simulator.js';

export class RunSessionTracker {
  constructor(sessao, { onStateChange, onTick } = {}) {
    this.sessao = sessao;
    this.onStateChange = onStateChange;
    this.onTick = onTick;

    const gpsCfg = getGpsQueryConfig();
    this.gpsCfg = gpsCfg;
    this.gpsQueryMode = gpsCfg.mode; // 'real' | 'sim' | 'denied' | 'none' | 'weak'
    this.speedMultiplier = gpsCfg.speedMultiplier || 1;

    // Estado da máquina (C1)
    this.fase = sessao?.maquinaEstado?.fase || 'preparando';
    this.modo = sessao?.modo || 'livre';
    this.meta = sessao?.meta || { tipo: null, valor: null };
    this.ritmoAlvoSegKm = sessao?.ritmoAlvoSegKm || 330;
    this.intervalosConfig = sessao?.intervalos || {
      aquecimentoSeg: 180,
      tiroSeg: 60,
      tiroM: null,
      troteSeg: 90,
      rodadas: 6,
      voltaCalmaSeg: 180
    };

    // Estado do sinal GPS
    this.gpsStatus = 'searching';
    this.gpsAccuracyM = null;
    this.origem = this.gpsQueryMode === 'sim' ? 'simulada' : 'gps';
    this.semGpsModo = false;

    // Relógio baseado em timestamps reais com congelamento estrito em pausa (Item 5.5)
    this.movimentoSeg = Number(sessao?.movimentoSeg || 0);
    this.pausadoSeg = Number(sessao?.pausadoSeg || 0);
    this.duracaoSeg = Number(sessao?.duracaoSeg || this.movimentoSeg + this.pausadoSeg);
    this.frozenMovimentoSeg = this.movimentoSeg;
    this.basePausadoSeg = this.pausadoSeg;
    this.runStartRealMs = null;
    this.pauseStartRealMs =
      this.fase === 'pausada' || this.fase === 'pausa_auto' ? Date.now() : null;
    this.accumulatedPausedVirtualMs = this.pausadoSeg * 1000;

    // Métricas e trilha
    this.distanciaM = Number(sessao?.distanciaM || 0);
    this.ritmoAtualSegKm = null;
    this.ritmoMedioSegKm = sessao?.ritmoMedioSegKm || null;
    this.ritmoMelhorSegKm = sessao?.ritmoMelhorSegKm || null;
    this.calorias = Number(sessao?.calorias || 0);
    this.parciais = Array.isArray(sessao?.parciais) ? [...sessao.parciais] : [];
    this.rawPoints = [];
    this.lastAcceptedPoint = null;
    this.nextSplitKm = this.parciais.length + 1;
    this.lastSplitMovSeg = 0;
    this.lastSplitElevM = 0;

    // Filtros e calculadores
    this.pointFilter = new GpsPointFilter({ isIntervalMode: this.modo === 'intervalos' });
    this.paceCalc = new RollingPaceCalculator();
    this.intervalsEngine = new RunIntervalsEngine(this.intervalosConfig);
    this.intervalState = null;

    // Pausa automática (C2.8)
    this.lowSpeedSinceMs = null;
    this.highSpeedSinceMs = null;
    this.lastPosTimestampMs = null;

    // Marcos de meta (C4.2)
    this.goalMilestonesTriggered = { 50: false, 90: false, 100: false };
    this.goalReachedBannerDismissed = false;

    // Bloqueio de tela na corrida (C3.5)
    this.screenLocked = false;

    // Watchers e timers
    this.geoWatchId = null;
    this.simWatch = null;
    this.clockIntervalId = null;
    this.bufferIntervalId = null;

    this._boundVisChange = () => {
      if (document.visibilityState === 'hidden') {
        this.saveSafetyBuffer();
      } else {
        this._syncClockAndNotify();
      }
    };
    this._boundPageHide = () => this.saveSafetyBuffer();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._boundVisChange);
      window.addEventListener('pagehide', this._boundPageHide);
    }
  }

  /**
   * Restaura estado de um buffer salvo em `clay_fit_run_buffer` (B3 & Item 5.5).
   */
  restoreFromBuffer(buf) {
    if (!buf) return;
    this.modo = buf.modo || this.modo;
    this.meta = buf.meta || this.meta;
    this.ritmoAlvoSegKm = buf.ritmoAlvoSegKm || this.ritmoAlvoSegKm;
    this.intervalosConfig = buf.intervalosConfig || this.intervalosConfig;
    this.intervalsEngine = new RunIntervalsEngine(this.intervalosConfig);

    this.movimentoSeg = Number(buf.movimentoSeg || 0);
    this.pausadoSeg = Number(buf.pausadoSeg || 0);
    this.duracaoSeg = Number(buf.duracaoSeg || this.movimentoSeg + this.pausadoSeg);
    this.frozenMovimentoSeg = this.movimentoSeg;
    this.basePausadoSeg = this.pausadoSeg;

    this.distanciaM = Number(buf.distanciaM || 0);
    this.ritmoMedioSegKm = buf.ritmoMedioSegKm ?? null;
    this.ritmoMelhorSegKm = buf.ritmoMelhorSegKm ?? null;
    this.calorias = Number(buf.calorias || 0);
    this.parciais = Array.isArray(buf.parciais) ? buf.parciais : [];
    this.rawPoints = Array.isArray(buf.rawPoints) ? buf.rawPoints : [];
    if (this.rawPoints.length > 0) {
      this.lastAcceptedPoint = this.rawPoints[this.rawPoints.length - 1];
    }
    this.nextSplitKm = this.parciais.length + 1;
    this.origem = buf.origem || this.origem;
    this.semGpsModo = Boolean(buf.semGpsModo);

    const nowMs = Date.now();
    this.accumulatedPausedVirtualMs = this.pausadoSeg * 1000;
    this.runStartRealMs =
      nowMs - ((this.movimentoSeg + this.pausadoSeg) * 1000) / this.speedMultiplier;

    if (this.fase === 'pausada' || this.fase === 'pausa_auto') {
      this.pauseStartRealMs = nowMs;
    } else {
      this.pauseStartRealMs = null;
    }
  }

  setModeConfig({ modo, meta, ritmoAlvoSegKm, intervalos } = {}) {
    if (modo) this.modo = modo;
    if (meta) this.meta = meta;
    if (ritmoAlvoSegKm !== undefined) this.ritmoAlvoSegKm = ritmoAlvoSegKm;
    if (intervalos) {
      this.intervalosConfig = { ...this.intervalosConfig, ...intervalos };
      this.intervalsEngine = new RunIntervalsEngine(this.intervalosConfig);
    }
    this.pointFilter.setIntervalMode(this.modo === 'intervalos');
    store.atualizarSessao(this.sessao.id, {
      modo: this.modo,
      meta: this.meta,
      ritmoAlvoSegKm: this.ritmoAlvoSegKm,
      intervalos: this.modo === 'intervalos' ? this.intervalosConfig : null
    });
  }

  startGpsListening() {
    this.stopGpsListening();

    const cfg = getGpsQueryConfig();
    this.gpsCfg = cfg;
    this.gpsQueryMode = cfg.mode;
    this.speedMultiplier = cfg.speedMultiplier || 1;

    if (this.gpsQueryMode !== 'real') {
      this.simWatch = new GpsSimulatorWatch({
        mode: this.gpsQueryMode,
        speedMultiplier: this.speedMultiplier,
        constantSpeedMps: cfg.constantSpeedMps,
        disableAnomalies: cfg.disableAnomalies,
        customDropWindow: cfg.customDropWindow,
        customStopWindow: cfg.customStopWindow,
        onPosition: (pos) => this._handlePosition(pos),
        onError: (err) => this._handlePositionError(err)
      });
      this.simWatch.start();
      return;
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      this._handlePositionError({ code: 2, noGeolocationSupport: true, message: 'Geolocalização não suportada.' });
      return;
    }

    try {
      this.geoWatchId = navigator.geolocation.watchPosition(
        (pos) => this._handlePosition(pos),
        (err) => this._handlePositionError(err),
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 10000
        }
      );
    } catch (e) {
      this._handlePositionError({ code: 2, message: e.message });
    }
  }

  stopGpsListening() {
    if (this.simWatch) {
      this.simWatch.stop();
      this.simWatch = null;
    }
    if (this.geoWatchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        navigator.geolocation.clearWatch(this.geoWatchId);
      } catch (_) {}
      this.geoWatchId = null;
    }
  }

  _handlePositionError(err) {
    const code = Number(err?.code || 2);
    if (code === 1 || err?.noGeolocationSupport) {
      this.gpsStatus = code === 1 ? 'denied' : 'none';
      if (this.fase === 'buscando_gps') {
        this.transitionTo('gps_negado');
      } else if (this.onStateChange) {
        this.onStateChange(this);
      }
      return;
    }
    this.gpsStatus = 'none';
    if (this.onStateChange) {
      this.onStateChange(this);
    }
  }

  _handlePosition(pos) {
    if (!pos || !pos.coords) return;
    const acc = Number(pos.coords.accuracy ?? 999);
    this.gpsAccuracyM = Math.round(acc);

    if (acc <= 25) {
      this.gpsStatus = 'ok';
    } else {
      this.gpsStatus = 'weak';
    }

    if (this.fase === 'preparando' && this.gpsStatus === 'ok') {
      if (this.onStateChange) this.onStateChange(this);
    } else if (this.fase === 'buscando_gps' && this.gpsStatus === 'ok') {
      vibrate('confirmacao');
      this.transitionTo('contagem');
      return;
    }

    // Se estiver em pausa manual (`pausada`), ignora pontos de GPS para não alterar distância nem ritmo
    if (this.fase !== 'correndo' && this.fase !== 'pausa_auto') {
      if (this.onTick) this.onTick(this);
      return;
    }

    if (this.semGpsModo) return;

    const nowTs = Number(pos.timestamp || Date.now());
    const gapMs = this.lastPosTimestampMs ? nowTs - this.lastPosTimestampMs : 0;
    if (gapMs > 30000) {
      showToast({ message: 'Sinal retomado' });
    }
    if (gapMs > 3200) {
      this.paceCalc.notifyGapOrPause();
    }
    this.lastPosTimestampMs = nowTs;

    const filtered = this.pointFilter.process({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: acc,
      altitude: pos.coords.altitude,
      timestamp: nowTs
    });

    const currentSpeedMps =
      typeof pos.coords.speed === 'number' && pos.coords.speed >= 0
        ? pos.coords.speed
        : filtered.speedMps || 0;

    this._evaluateAutoPause(currentSpeedMps, nowTs);

    if (this.fase !== 'correndo') {
      if (this.onTick) this.onTick(this);
      return;
    }

    if (!filtered.accepted || !filtered.point) {
      if (currentSpeedMps < 0.5) {
        this.ritmoAtualSegKm = null;
      }
      this._syncClockAndNotify();
      return;
    }

    const pt = filtered.point;
    const prevPt = this.lastAcceptedPoint;
    this.lastAcceptedPoint = pt;
    this.rawPoints.push(pt);

    if (filtered.crossedGap && filtered.deltaM === 0) {
      this.paceCalc.addPoint({
        t: pt.t,
        cumDistM: this.distanciaM,
        isGapReset: true
      });
    } else if (filtered.deltaM > 0 && prevPt) {
      const prevDistM = this.distanciaM;
      const newDistM = prevDistM + filtered.deltaM;
      this.distanciaM = newDistM;

      // Item 4: Se este ponto cruzou uma lacuna > 3s, a distância entra no total,
      // mas o calculador de ritmo atual reinicia a âncora neste ponto sem somar o salto
      const paceRes = this.paceCalc.addPoint({
        t: pt.t,
        cumDistM: newDistM,
        isGapReset: Boolean(filtered.crossedGap)
      });
      this.ritmoAtualSegKm = paceRes.ritmoAtualSegKm;
      if (paceRes.ritmoMelhorSegKm) {
        this.ritmoMelhorSegKm = paceRes.ritmoMelhorSegKm;
      }

      // Verifica se cruzou 1 ou mais marcos de 1000m (C2.6)
      while (newDistM >= this.nextSplitKm * 1000) {
        const targetM = this.nextSplitKm * 1000;
        const segSpan = Math.max(0.1, newDistM - prevDistM);
        const frac = Math.max(0, Math.min(1, (targetM - prevDistM) / segSpan));
        const interpPt = interpolatePoint(prevPt, pt, frac);
        const splitMovSeg = Math.max(1, Math.round(this.movimentoSeg));
        const tempoParcialSeg = Math.max(1, splitMovSeg - this.lastSplitMovSeg);
        const curElevNet = filtered.ganhoElevM - filtered.perdaElevM;
        const elevDeltaM = Math.round(curElevNet - this.lastSplitElevM);

        const parcialObj = {
          km: this.nextSplitKm,
          tempoSeg: tempoParcialSeg,
          ritmoSegKm: tempoParcialSeg,
          elevDeltaM,
          ponto: { lat: interpPt.lat, lng: interpPt.lng }
        };
        this.parciais.push(parcialObj);

        this.lastSplitMovSeg = splitMovSeg;
        this.lastSplitElevM = curElevNet;

        playKmDoubleBeep();
        vibrate('confirmacao');
        announceKmSplit(this.nextSplitKm, splitMovSeg, tempoParcialSeg);
        showToast({
          message: `Km ${this.nextSplitKm} · ${formatPaceSegKm(tempoParcialSeg)} /km · Total ${formatRunClock(splitMovSeg)}`
        });

        this.nextSplitKm += 1;
      }
    }

    this._syncClockAndNotify();
  }

  _evaluateAutoPause(speedMps, nowTs) {
    const perfil = store.getState()?.perfil || {};
    if (perfil.pausaAutomaticaCorrida === false || this.semGpsModo) return;

    if (this.fase === 'correndo') {
      if (speedMps < 0.6) {
        if (!this.lowSpeedSinceMs) {
          this.lowSpeedSinceMs = nowTs;
        } else if (nowTs - this.lowSpeedSinceMs >= 8000) {
          this.lowSpeedSinceMs = null;
          this.pauseRun(true);
        }
      } else {
        this.lowSpeedSinceMs = null;
      }
    } else if (this.fase === 'pausa_auto') {
      if (speedMps > 1.2) {
        if (!this.highSpeedSinceMs) {
          this.highSpeedSinceMs = nowTs;
        } else if (nowTs - this.highSpeedSinceMs >= 2000) {
          // Retoma após 2s de movimento consistente (> 1.2 m/s) para que o ritmo apareça rápido
          this.highSpeedSinceMs = null;
          this.resumeRun(true);
        }
      } else {
        this.highSpeedSinceMs = null;
      }
    }
  }

  transitionTo(novaFase) {
    this.fase = novaFase;
    store.atualizarSessao(this.sessao.id, {
      maquinaEstado: {
        ...(this.sessao.maquinaEstado || {}),
        fase: novaFase,
        ultimoTimestampAtivo: Date.now()
      }
    });
    if (this.onStateChange) {
      this.onStateChange(this);
    }
  }

  requestStartRun({ semGps = false } = {}) {
    if (semGps) {
      this.semGpsModo = true;
      this.origem = 'sem_gps';
      this.transitionTo('contagem');
      return;
    }

    if (this.gpsQueryMode === 'denied' || this.gpsQueryMode === 'none') {
      this.gpsStatus = this.gpsQueryMode === 'denied' ? 'denied' : 'none';
      this.transitionTo('gps_negado');
      return;
    }

    if (this.gpsStatus === 'ok') {
      this.transitionTo('contagem');
    } else {
      this.transitionTo('buscando_gps');
      this.startGpsListening();
    }
  }

  beginActiveRunning() {
    const nowMs = Date.now();
    if (!this.runStartRealMs) {
      this.runStartRealMs =
        nowMs - ((this.movimentoSeg + this.pausadoSeg) * 1000) / this.speedMultiplier;
      this.pointFilter.reset(nowMs);
    }
    this.pauseStartRealMs = null;
    this.fase = 'correndo';

    playRestCompleteTone();
    vibrate('confirmacao');
    announceRunStarted();

    this._startLoops();
    this.saveSafetyBuffer();
    if (this.onStateChange) {
      this.onStateChange(this);
    }
  }

  pauseRun(isAuto = false) {
    if (this.fase !== 'correndo') return;
    this._syncClockMetrics();

    // Item 5.5: Congela estritamente `movimentoSeg` ao entrar em pausa
    this.frozenMovimentoSeg = this.movimentoSeg;
    this.basePausadoSeg = this.pausadoSeg;
    this.pauseStartRealMs = Date.now();
    this.fase = isAuto ? 'pausa_auto' : 'pausada';
    this.ritmoAtualSegKm = null;

    this.pointFilter.notifyResumeFromPause();
    this.paceCalc.notifyGapOrPause();

    vibrate('selecao');
    announceRunPaused(isAuto);
    this.saveSafetyBuffer();

    store.atualizarSessao(this.sessao.id, {
      status: 'pausada',
      movimentoSeg: this.movimentoSeg,
      pausadoSeg: this.pausadoSeg,
      duracaoSeg: this.duracaoSeg,
      distanciaM: Math.round(this.distanciaM),
      maquinaEstado: {
        ...(this.sessao.maquinaEstado || {}),
        fase: this.fase
      }
    });

    if (this.onStateChange) {
      this.onStateChange(this);
    }
  }

  resumeRun(fromAuto = false) {
    if (this.fase !== 'pausada' && this.fase !== 'pausa_auto') return;

    // Atualiza pausadoSeg acumulado até este exato instante e reancora runStartRealMs
    this._syncClockMetrics();
    this.movimentoSeg = this.frozenMovimentoSeg;
    this.basePausadoSeg = this.pausadoSeg;
    this.accumulatedPausedVirtualMs = this.pausadoSeg * 1000;
    this.pauseStartRealMs = null;
    this.runStartRealMs =
      Date.now() - ((this.movimentoSeg + this.pausadoSeg) * 1000) / this.speedMultiplier;

    this.fase = 'correndo';
    this.pointFilter.notifyResumeFromPause();
    this.paceCalc.notifyGapOrPause();

    vibrate('confirmacao');
    if (!fromAuto) {
      announceRunResumed();
    }
    this._startLoops();
    this.saveSafetyBuffer();

    store.atualizarSessao(this.sessao.id, {
      status: 'andamento',
      movimentoSeg: this.movimentoSeg,
      pausadoSeg: this.pausadoSeg,
      duracaoSeg: this.duracaoSeg,
      maquinaEstado: {
        ...(this.sessao.maquinaEstado || {}),
        fase: 'correndo'
      }
    });

    if (this.onStateChange) {
      this.onStateChange(this);
    }
  }

  _startLoops() {
    this._stopLoops();
    const tickMs = this.speedMultiplier > 1 ? 200 : 500;
    this.clockIntervalId = setInterval(() => {
      this._syncClockAndNotify();
    }, tickMs);

    this.bufferIntervalId = setInterval(() => {
      this.saveSafetyBuffer();
    }, 10000);
  }

  _stopLoops() {
    if (this.clockIntervalId) {
      clearInterval(this.clockIntervalId);
      this.clockIntervalId = null;
    }
    if (this.bufferIntervalId) {
      clearInterval(this.bufferIntervalId);
      this.bufferIntervalId = null;
    }
  }

  _syncClockMetrics() {
    const nowMs = Date.now();

    // Item 5.5: Enquanto pausada (manual ou automática), movimentoSeg NUNCA cresce
    if (this.fase === 'pausada' || this.fase === 'pausa_auto') {
      this.movimentoSeg = this.frozenMovimentoSeg;
      if (this.pauseStartRealMs) {
        const pauseElapsedVirtualMs = Math.max(
          0,
          (nowMs - this.pauseStartRealMs) * this.speedMultiplier
        );
        this.pausadoSeg = this.basePausadoSeg + Math.floor(pauseElapsedVirtualMs / 1000);
      }
      this.duracaoSeg = this.movimentoSeg + this.pausadoSeg;
      return;
    }

    if (!this.runStartRealMs) return;

    const totalElapsedVirtualMs = Math.max(
      0,
      (nowMs - this.runStartRealMs) * this.speedMultiplier
    );
    const activeVirtualMs = Math.max(
      0,
      totalElapsedVirtualMs - this.accumulatedPausedVirtualMs
    );

    this.movimentoSeg = Math.floor(activeVirtualMs / 1000);
    this.frozenMovimentoSeg = this.movimentoSeg;
    this.pausadoSeg = Math.floor(this.accumulatedPausedVirtualMs / 1000);
    this.duracaoSeg = this.movimentoSeg + this.pausadoSeg;

    if (this.distanciaM >= 50 && this.movimentoSeg > 0) {
      this.ritmoMedioSegKm = Math.round(this.movimentoSeg / (this.distanciaM / 1000));
    }

    const pesoKg = store.getState()?.perfil?.pesoKg || 70;
    this.calorias = estimateRunCalories(this.distanciaM, pesoKg);

    if (this.modo === 'meta_distancia' || this.modo === 'meta_tempo') {
      this._checkGoalProgress();
    }

    if (this.modo === 'intervalos' && this.fase === 'correndo') {
      const ivRes = this.intervalsEngine.update(this.movimentoSeg, this.distanciaM);
      this.intervalState = ivRes;
      if (ivRes.countdownTick) {
        playCountdownTick(false);
      }
      if (ivRes.phaseChanged) {
        vibrate('confirmacao');
        if (ivRes.phaseChanged.tipo === 'tiro') {
          playIntervalSprintTone();
        } else {
          playRestCompleteTone();
        }
        announceIntervalPhase(ivRes.phaseChanged.tipo);
      }
    }
  }

  _checkGoalProgress() {
    const tipo = this.meta?.tipo || (this.modo === 'meta_tempo' ? 'tempo' : 'distancia');
    const alvo = Number(this.meta?.valor || (tipo === 'tempo' ? 1800 : 5000));
    if (alvo <= 0) return;

    const atual = tipo === 'tempo' ? this.movimentoSeg : this.distanciaM;
    const pct = Math.min(100, Math.floor((atual / alvo) * 100));

    if (pct >= 50 && !this.goalMilestonesTriggered[50] && pct < 90) {
      this.goalMilestonesTriggered[50] = true;
      playCountdownTick(true);
      vibrate('selecao');
      announceGoalMilestone(50);
      showToast({ message: '50% da meta concluída!' });
    }
    if (pct >= 90 && !this.goalMilestonesTriggered[90] && pct < 100) {
      this.goalMilestonesTriggered[90] = true;
      playCountdownTick(true);
      vibrate('selecao');
      announceGoalMilestone(90);
      showToast({ message: '90% da meta · Reta final!' });
    }
    if (pct >= 100 && !this.goalMilestonesTriggered[100]) {
      this.goalMilestonesTriggered[100] = true;
      this.goalMilestonesTriggered[50] = true;
      this.goalMilestonesTriggered[90] = true;
      playAchievementChord();
      vibrate('sucesso');
      const desc =
        tipo === 'tempo'
          ? `${Math.round(alvo / 60)} min em ${formatKmWithUnit(this.distanciaM)}`
          : `${formatKmWithUnit(alvo)} em ${formatRunClock(this.movimentoSeg)}`;
      announceGoalMilestone(100, desc);
      if (this.onStateChange) {
        this.onStateChange(this);
      }
    }
  }

  getGoalStatus() {
    if (this.modo !== 'meta_distancia' && this.modo !== 'meta_tempo') return null;
    const tipo = this.meta?.tipo || (this.modo === 'meta_tempo' ? 'tempo' : 'distancia');
    const alvo = Number(this.meta?.valor || (tipo === 'tempo' ? 1800 : 5000));
    const atual = tipo === 'tempo' ? this.movimentoSeg : this.distanciaM;
    const progresso = Math.min(1, atual / Math.max(1, alvo));

    let restanteTexto = '';
    if (tipo === 'tempo') {
      const remSeg = Math.max(0, alvo - this.movimentoSeg);
      restanteTexto = remSeg > 0 ? `Faltam ${formatRunClock(remSeg)}` : 'Meta atingida!';
    } else {
      const remM = Math.max(0, alvo - this.distanciaM);
      restanteTexto = remM > 0 ? `Faltam ${formatKmWithUnit(remM)}` : 'Meta atingida!';
    }

    const reached = progresso >= 1;
    const resumoMeta =
      tipo === 'tempo'
        ? `${Math.round(alvo / 60)} min · ${formatKmWithUnit(this.distanciaM)}`
        : `${formatKmWithUnit(alvo)} em ${formatRunClock(this.movimentoSeg)}`;

    return {
      tipo,
      alvo,
      atual,
      progresso,
      restanteTexto,
      reached,
      showReachedBanner: reached && !this.goalReachedBannerDismissed,
      resumoMeta
    };
  }

  _syncClockAndNotify() {
    this._syncClockMetrics();
    if (this.onTick) {
      this.onTick(this);
    }
  }

  saveSafetyBuffer() {
    if (this.fase !== 'correndo' && this.fase !== 'pausada' && this.fase !== 'pausa_auto') {
      return;
    }
    this._syncClockMetrics();
    store.salvarBufferCorrida({
      sessaoId: this.sessao.id,
      nome: this.sessao.nome || 'Corrida ao vivo',
      fase: this.fase,
      modo: this.modo,
      meta: this.meta,
      ritmoAlvoSegKm: this.ritmoAlvoSegKm,
      intervalosConfig: this.intervalosConfig,
      movimentoSeg: this.movimentoSeg,
      pausadoSeg: this.pausadoSeg,
      duracaoSeg: this.duracaoSeg,
      distanciaM: Math.round(this.distanciaM),
      ritmoMedioSegKm: this.ritmoMedioSegKm,
      ritmoMelhorSegKm: this.ritmoMelhorSegKm,
      calorias: this.calorias,
      parciais: this.parciais,
      rawPoints: this.rawPoints.slice(-600),
      origem: this.origem,
      semGpsModo: this.semGpsModo
    });
  }

  enterSummaryState() {
    this._syncClockMetrics();
    this._stopLoops();
    this.stopGpsListening();

    const fullKmsClosed = this.parciais.filter((p) => !p.parcialM).length;
    const remM = Math.round(this.distanciaM - fullKmsClosed * 1000);
    if (remM >= 50) {
      const tempoParcial = Math.max(1, this.movimentoSeg - this.lastSplitMovSeg);
      const ritmoParcial = Math.round(tempoParcial / (remM / 1000));
      const existingPartialIdx = this.parciais.findIndex((p) => p.parcialM);
      const tailSplit = {
        km: fullKmsClosed + 1,
        parcialM: remM,
        tempoSeg: tempoParcial,
        ritmoSegKm: ritmoParcial,
        elevDeltaM: 0
      };
      if (existingPartialIdx >= 0) {
        this.parciais[existingPartialIdx] = tailSplit;
      } else {
        this.parciais.push(tailSplit);
      }
    }

    let rotaObj = this.sessao.rota || null;
    if (this.rawPoints.length >= 2) {
      const { points: simplifiedPts, simplified } = capToMaxPoints(this.rawPoints, 3, 4000);
      rotaObj = encodeTrackToRoute(simplifiedPts, simplified, this.rawPoints.length);
    }

    const ganhoElevM = this.pointFilter.hasAltitude
      ? Math.round(this.pointFilter.ganhoElevM)
      : null;
    const perdaElevM = this.pointFilter.hasAltitude
      ? Math.round(this.pointFilter.perdaElevM)
      : null;

    this.sessao = store.atualizarSessao(this.sessao.id, {
      movimentoSeg: Math.max(1, this.movimentoSeg),
      pausadoSeg: this.pausadoSeg,
      duracaoSeg: Math.max(1, this.duracaoSeg),
      distanciaM: Math.round(this.distanciaM),
      ritmoMedioSegKm: this.ritmoMedioSegKm,
      ritmoMelhorSegKm: this.ritmoMelhorSegKm,
      ganhoElevM,
      perdaElevM,
      calorias: this.calorias,
      parciais: this.parciais,
      rota: rotaObj,
      origem: this.semGpsModo ? 'sem_gps' : this.origem
    }) || this.sessao;

    this.transitionTo('resumo');
  }

  destroy() {
    this._stopLoops();
    this.stopGpsListening();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._boundVisChange);
      window.removeEventListener('pagehide', this._boundPageHide);
    }
  }
}
