/**
 * ============================================================================
 * CLAY FIT — FILTROS DE RUÍDO DE GPS, KALMAN 1D COM VELOCIDADE, SALTOS E ALTITUDE
 * /js/run/filters.js
 *
 * Especificações Prompt 4 (C2) e Prompt 4.1 (Itens 4 e 5.3):
 * - Descarta pontos com accuracy > 25 m (aceita até 40 m apenas nos 20 primeiros
 *   segundos da sessão para "fixar" o sinal).
 * - Descarta pontos com timestamp igual ou anterior ao último ponto aceito.
 * - Filtro de salto: se a velocidade implícita entre dois pontos aceitos for
 *   > 12 m/s (43 km/h), ou > 11 m/s em modo intervalos, descarta o outlier
 *   (ex.: salto isolado de 80 m aos 40 s no simulador).
 * - Suavização: filtro de Kalman 1D com predição de velocidade (elimina atraso
 *   sistemático em movimento constante enquanto amortece o ruído gaussiano de ~3 m).
 * - Lacuna de sinal (> 3,2 s) ou retomada de pausa: reancora posição e reinicia
 *   velocidade no primeiro passo pós-lacuna, sinalizando `crossedGap: true` para
 *   que o salto de reconexão nunca entre na janela do ritmo atual.
 * - Altitude: mediana de 5 amostras + histerese de 3 m para somar ganho e perda.
 * ============================================================================
 */

import { haversineMeters } from './geo.js';

export class GpsPointFilter {
  constructor({ isIntervalMode = false, sessionStartTimeMs = Date.now() } = {}) {
    this.isIntervalMode = Boolean(isIntervalMode);
    this.sessionStartTimeMs = Number(sessionStartTimeMs || Date.now());
    this.lastAcceptedRawTimeMs = 0;
    this.lastSmoothedPoint = null;
    this.pendingPauseReset = false;

    // Estado do filtro de Kalman 1D com predição de velocidade (lat/lng e deg/s)
    this.kalmanLat = null;
    this.kalmanLng = null;
    this.velLatPerSec = 0;
    this.velLngPerSec = 0;
    this.hasVelocitySeed = false;
    this.variance = -1;
    this.processNoiseQ = 1.6;

    // Altitude: janela de 5 amostras para mediana + histerese de 3 m
    this.altWindow = [];
    this.lastCommittedAlt = null;
    this.ganhoElevM = 0;
    this.perdaElevM = 0;
    this.hasValidAltitude = false;
  }

  reset(sessionStartTimeMs = Date.now()) {
    this.sessionStartTimeMs = Number(sessionStartTimeMs);
    this.lastAcceptedRawTimeMs = 0;
    this.lastSmoothedPoint = null;
    this.pendingPauseReset = false;
    this.kalmanLat = null;
    this.kalmanLng = null;
    this.velLatPerSec = 0;
    this.velLngPerSec = 0;
    this.hasVelocitySeed = false;
    this.variance = -1;
    this.altWindow = [];
    this.lastCommittedAlt = null;
    this.ganhoElevM = 0;
    this.perdaElevM = 0;
    this.hasValidAltitude = false;
  }

  setIntervalMode(isInterval) {
    this.isIntervalMode = Boolean(isInterval);
  }

  notifyResumeFromPause() {
    this.pendingPauseReset = true;
    this.velLatPerSec = 0;
    this.velLngPerSec = 0;
    this.hasVelocitySeed = false;
  }

  get hasAltitude() {
    return Boolean(this.hasValidAltitude);
  }

  static classifySignal(accuracy) {
    const acc = Number(accuracy);
    if (!Number.isFinite(acc) || acc <= 0) return 'procurando';
    if (acc <= 18) return 'bom';
    if (acc <= 45) return 'fraco';
    return 'procurando';
  }

  processSample(rawSample) {
    if (!rawSample) {
      return {
        accepted: false,
        reason: 'empty',
        deltaDistM: 0,
        speedMs: 0,
        ganhoDeltaM: 0,
        crossedGap: false
      };
    }

    const lat = Number(rawSample.lat ?? rawSample.latitude);
    const lng = Number(rawSample.lng ?? rawSample.longitude);
    const accuracy = Math.max(1, Number(rawSample.accuracy ?? 10));
    const t = Number(rawSample.timestamp ?? rawSample.t ?? Date.now());
    const alt =
      rawSample.altitude !== undefined && rawSample.altitude !== null
        ? Number(rawSample.altitude)
        : rawSample.alt !== undefined && rawSample.alt !== null
        ? Number(rawSample.alt)
        : null;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return {
        accepted: false,
        reason: 'invalid_coords',
        deltaDistM: 0,
        speedMs: 0,
        ganhoDeltaM: 0,
        crossedGap: false
      };
    }

    // 1. Descarta timestamp igual ou anterior ao último aceito
    if (this.lastAcceptedRawTimeMs > 0 && t <= this.lastAcceptedRawTimeMs) {
      return {
        accepted: false,
        reason: 'stale_timestamp',
        deltaDistM: 0,
        speedMs: 0,
        ganhoDeltaM: 0,
        crossedGap: false
      };
    }

    // 2. Descarta accuracy > 25m (aceita até 40m apenas nos primeiros 20s)
    const elapsedSinceStartSec = (t - this.sessionStartTimeMs) / 1000;
    const maxAllowedAccuracy = elapsedSinceStartSec <= 20 ? 40 : 25;
    if (accuracy > maxAllowedAccuracy) {
      return {
        accepted: false,
        reason: 'poor_accuracy',
        accuracy,
        deltaDistM: 0,
        speedMs: 0,
        ganhoDeltaM: 0,
        crossedGap: false
      };
    }

    const dtSec =
      this.lastAcceptedRawTimeMs > 0
        ? Math.max(0.1, (t - this.lastAcceptedRawTimeMs) / 1000)
        : 0;
    const isSignalGap = this.lastAcceptedRawTimeMs > 0 && dtSec > 3.2;
    const isPostPause = Boolean(this.pendingPauseReset);

    // 3. Filtro de salto (outlier): velocidade implícita > 12 m/s (ou > 11 m/s em intervalos)
    const maxSpeedMs = this.isIntervalMode ? 11.0 : 12.0;
    if (this.lastSmoothedPoint && !isPostPause && dtSec > 0) {
      const rawDistM = haversineMeters(this.lastSmoothedPoint, { lat, lng });
      const impliedSpeedMs = rawDistM / dtSec;
      if (impliedSpeedMs > maxSpeedMs) {
        return {
          accepted: false,
          reason: 'speed_outlier',
          impliedSpeedMs,
          deltaDistM: 0,
          speedMs: 0,
          ganhoDeltaM: 0,
          crossedGap: false
        };
      }
    }

    // 4. Filtro de Kalman 1D com predição de velocidade
    let smoothLat = lat;
    let smoothLng = lng;
    if (
      this.variance < 0 ||
      this.kalmanLat === null ||
      this.kalmanLng === null ||
      isSignalGap ||
      isPostPause
    ) {
      this.kalmanLat = lat;
      this.kalmanLng = lng;
      this.velLatPerSec = 0;
      this.velLngPerSec = 0;
      this.hasVelocitySeed = false;
      this.variance = accuracy * accuracy;
      smoothLat = lat;
      smoothLng = lng;
    } else if (!this.hasVelocitySeed && dtSec > 0) {
      // Primeiro passo após âncora inicial/lacuna/pausa: semeia a velocidade real sem atraso
      this.velLatPerSec = (lat - this.kalmanLat) / dtSec;
      this.velLngPerSec = (lng - this.kalmanLng) / dtSec;
      this.hasVelocitySeed = true;
      this.kalmanLat = lat;
      this.kalmanLng = lng;
      smoothLat = lat;
      smoothLng = lng;
    } else {
      const predLat = this.kalmanLat + this.velLatPerSec * dtSec;
      const predLng = this.kalmanLng + this.velLngPerSec * dtSec;
      this.variance += dtSec * this.processNoiseQ * this.processNoiseQ;
      const measurementNoiseR = Math.max(16, accuracy * accuracy);
      const kGain = Math.min(0.65, Math.max(0.25, this.variance / (this.variance + measurementNoiseR)));

      smoothLat = predLat + kGain * (lat - predLat);
      smoothLng = predLng + kGain * (lng - predLng);

      const instVelLat = (smoothLat - this.kalmanLat) / dtSec;
      const instVelLng = (smoothLng - this.kalmanLng) / dtSec;
      this.velLatPerSec = 0.65 * this.velLatPerSec + 0.35 * instVelLat;
      this.velLngPerSec = 0.65 * this.velLngPerSec + 0.35 * instVelLng;
      this.kalmanLat = smoothLat;
      this.kalmanLng = smoothLng;
      this.variance = (1 - kGain) * this.variance;
    }

    // 5. Altitude: mediana de 5 amostras + histerese de 3 m
    let ganhoDeltaM = 0;
    let filteredAlt = null;
    if (alt !== null && Number.isFinite(alt)) {
      this.hasValidAltitude = true;
      this.altWindow.push(alt);
      if (this.altWindow.length > 5) this.altWindow.shift();
      const sorted = [...this.altWindow].sort((a, b) => a - b);
      filteredAlt = sorted[Math.floor(sorted.length / 2)];

      if (this.lastCommittedAlt === null) {
        this.lastCommittedAlt = filteredAlt;
      } else {
        const diffAlt = filteredAlt - this.lastCommittedAlt;
        if (Math.abs(diffAlt) >= 3.0) {
          if (diffAlt > 0) {
            this.ganhoElevM += diffAlt;
            ganhoDeltaM = diffAlt;
          } else {
            this.perdaElevM += Math.abs(diffAlt);
          }
          this.lastCommittedAlt = filteredAlt;
        }
      }
    }

    // 6. Acumula distância evitando tremor parado
    const candidatePoint = {
      lat: smoothLat,
      lng: smoothLng,
      t,
      alt: filteredAlt,
      accuracy
    };

    if (!this.lastSmoothedPoint || isPostPause) {
      this.lastSmoothedPoint = candidatePoint;
      this.lastAcceptedRawTimeMs = t;
      this.pendingPauseReset = false;
      return {
        accepted: true,
        point: candidatePoint,
        deltaDistM: 0,
        speedMs: 0,
        ganhoDeltaM,
        crossedGap: true
      };
    }

    const segDistM = haversineMeters(this.lastSmoothedPoint, candidatePoint);
    const segDtSec = Math.max(0.2, (t - this.lastAcceptedRawTimeMs) / 1000);
    const impliedSegSpeed = segDistM / segDtSec;

    const minMoveThreshold =
      impliedSegSpeed >= 1.0 ? 1.2 : Math.max(3.0, Math.min(6.0, 0.45 * accuracy));

    if (segDistM >= minMoveThreshold) {
      this.lastSmoothedPoint = candidatePoint;
      this.lastAcceptedRawTimeMs = t;
      return {
        accepted: true,
        point: candidatePoint,
        deltaDistM: segDistM,
        speedMs: impliedSegSpeed,
        ganhoDeltaM,
        crossedGap: isSignalGap
      };
    }

    this.lastAcceptedRawTimeMs = t;
    this.velLatPerSec = 0;
    this.velLngPerSec = 0;
    this.hasVelocitySeed = false;
    return {
      accepted: false,
      reason: 'stationary_jitter',
      point: this.lastSmoothedPoint,
      deltaDistM: 0,
      speedMs: 0,
      ganhoDeltaM: 0,
      crossedGap: false
    };
  }

  process(rawSample) {
    const res = this.processSample(rawSample);
    return {
      ...res,
      deltaM: res.deltaDistM || 0,
      speedMps: res.speedMs || 0,
      ganhoElevM: this.ganhoElevM,
      perdaElevM: this.perdaElevM
    };
  }
}
