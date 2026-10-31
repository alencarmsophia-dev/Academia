/**
 * ============================================================================
 * CLAY FIT — SIMULADOR DETERMINÍSTICO DE GPS E MODOS DE TESTE (C10 & 4.1)
 * /js/run/simulator.js
 *
 * Especificação Prompt 4 (C10) e Prompt 4.1 (Item 5.3):
 * - Ativado apenas por parâmetros de URL (ou override em testes):
 *   • `?gps=sim`: gera pontos de GPS num circuito em curva suave com:
 *     - ruído gaussiano de ~3 m (Box-Muller determinístico),
 *     - accuracy variando de 5 a 20 m,
 *     - UM salto isolado de 80 m aos 40 s (virtuais) — descartado pelo filtro de salto,
 *     - uma PARADA de 12 s aos 90 s (90 s..102 s virtuais),
 *     - uma QUEDA de sinal de 20 s aos 150 s (150 s..170 s virtuais).
 *   • `?speed=10`: acelera o relógio e o gerador de pontos em 10×.
 *   • `?gps=denied`: simula permissão negada (`PERMISSION_DENIED`, code 1).
 *   • `?gps=none`: simula navegador SEM geolocalização (sem `navigator.geolocation`).
 *   • `?gps=weak`: simula accuracy ruim (48 m) pelos primeiros 25 s e depois boa (8 m).
 * - NUNCA exibe botão, texto ou banner de simulador na interface.
 * ============================================================================
 */

export function getGpsQueryConfig() {
  try {
    if (typeof window === 'undefined') {
      return { mode: 'real', speedMultiplier: 1 };
    }
    const params = new URLSearchParams(window.location.search || '');
    const override = window.__clayGpsOverride || {};
    const gpsMode = override.mode || params.get('gps') || 'real';
    const rawSpeed = Number(override.speed || params.get('speed') || 1);
    const speedMultiplier =
      Number.isFinite(rawSpeed) && rawSpeed >= 1 ? Math.min(60, rawSpeed) : 1;
    return {
      mode: gpsMode, // 'real' | 'sim' | 'denied' | 'none' | 'weak'
      speedMultiplier,
      constantSpeedMps: override.constantSpeedMps ? Number(override.constantSpeedMps) : null,
      disableAnomalies: Boolean(override.disableAnomalies),
      customDropWindow: override.customDropWindow || null, // [startSec, endSec]
      customStopWindow: override.customStopWindow || null // [startSec, endSec]
    };
  } catch (_) {
    return { mode: 'real', speedMultiplier: 1 };
  }
}

/**
 * Gerador pseudo-aleatório determinístico + Box-Muller para ruído gaussiano (~3 m).
 */
function deterministicGaussianMeters(stepIdx, channel = 1, stdDevMeters = 1.6) {
  const s1 = Math.sin(stepIdx * 12.9898 + channel * 78.233) * 43758.5453;
  const s2 = Math.sin(stepIdx * 93.9898 + channel * 47.113) * 24634.6345;
  const u1 = Math.max(0.0001, Math.min(0.9999, s1 - Math.floor(s1)));
  const u2 = Math.max(0.0001, Math.min(0.9999, s2 - Math.floor(s2)));
  // Box-Muller limitado a ±1.8 desvios para manter ruído realista em torno de ~3 m
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const clampedZ = Math.max(-1.8, Math.min(1.8, z));
  return clampedZ * stdDevMeters;
}

export class GpsSimulatorWatch {
  constructor({
    mode = 'sim',
    speedMultiplier = 1,
    constantSpeedMps = null,
    disableAnomalies = false,
    customDropWindow = null,
    customStopWindow = null,
    onPosition,
    onError
  } = {}) {
    this.mode = mode;
    this.speedMultiplier = Math.max(1, Number(speedMultiplier || 1));
    this.constantSpeedMps = constantSpeedMps;
    this.disableAnomalies = Boolean(disableAnomalies);
    this.customDropWindow = customDropWindow;
    this.customStopWindow = customStopWindow;
    this.onPosition = onPosition;
    this.onError = onError;

    this.timerId = null;
    this.stepIndex = 0;
    this.elapsedVirtualSec = 0;
    this.virtualTimeMs = Date.now();
    this.cumDistM = 0;
    this.outlierInjected = false;

    // Ponto base (Parque Ibirapuera)
    this.baseLat = -23.58741;
    this.baseLng = -46.65762;
    this.curLat = this.baseLat;
    this.curLng = this.baseLng;
  }

  start() {
    if (this.mode === 'denied') {
      this.timerId = setTimeout(() => {
        if (this.onError) {
          this.onError({ code: 1, message: 'Permissão de localização negada.' });
        }
      }, 120);
      return;
    }

    // Item 5.3: `?gps=none` simula navegador SEM geolocalização
    if (this.mode === 'none') {
      this.timerId = setTimeout(() => {
        if (this.onError) {
          this.onError({
            code: 2,
            noGeolocationSupport: true,
            message: 'Este navegador não possui suporte a geolocalização.'
          });
        }
      }, 150);
      return;
    }

    const tickIntervalMs = Math.max(100, Math.round(1000 / Math.min(10, this.speedMultiplier)));

    const emitNext = () => {
      const virtualDeltaSec =
        this.stepIndex === 0 ? 0 : (tickIntervalMs / 1000) * this.speedMultiplier;
      this.stepIndex += 1;
      this.elapsedVirtualSec += virtualDeltaSec;
      this.virtualTimeMs += Math.round(virtualDeltaSec * 1000);

      const vSec = this.elapsedVirtualSec;

      // Janelas de parada (padrão C10: 90 s a 102 s) e queda de sinal (padrão C10: 150 s a 170 s)
      const stopWin = this.customStopWindow || (this.disableAnomalies ? null : [90, 102]);
      const dropWin = this.customDropWindow || (this.disableAnomalies ? null : [150, 170]);

      const isStopped = Boolean(stopWin && vSec >= stopWin[0] && vSec < stopWin[1]);
      const isSignalDropped = Boolean(dropWin && vSec >= dropWin[0] && vSec < dropWin[1]);

      // Velocidade verdadeira do corredor (0 m/s durante a parada)
      let trueSpeedMps = 0;
      if (!isStopped) {
        if (this.constantSpeedMps) {
          trueSpeedMps = this.constantSpeedMps;
        } else {
          const kmProgress = this.cumDistM / 1000;
          const targetSpeedMps =
            kmProgress < 0.7 ? 2.98 : kmProgress < 1.5 ? 3.22 : 3.38;
          trueSpeedMps = targetSpeedMps + Math.sin(this.stepIndex * 0.16) * 0.05;
        }
      }

      const stepMeters = trueSpeedMps * virtualDeltaSec;
      this.cumDistM += stepMeters;

      // Avança a posição verdadeira ao longo da curva mesmo durante queda de sinal
      // (para que ao reconectar aos 170 s o corredor esteja na posição física correta)
      if (stepMeters > 0) {
        const headingRad =
          this.cumDistM / 480 + Math.sin(this.cumDistM / 220) * 0.25;
        const dLat = (stepMeters * Math.cos(headingRad)) / 111320;
        const dLng =
          (stepMeters * Math.sin(headingRad)) /
          (111320 * Math.cos((this.curLat * Math.PI) / 180));
        this.curLat += dLat;
        this.curLng += dLng;
      }

      // Durante a queda de sinal (ex.: 150 s a 170 s), não emite callbacks de GPS
      if (isSignalDropped) {
        return;
      }

      // Ruído gaussiano de ~3 m (média zero em diferenças consecutivas)
      const noiseLatM = isStopped
        ? deterministicGaussianMeters(this.stepIndex, 1, 0.6)
        : deterministicGaussianMeters(this.stepIndex, 1, 1.1);
      const noiseLngM = isStopped
        ? deterministicGaussianMeters(this.stepIndex, 2, 0.6)
        : deterministicGaussianMeters(this.stepIndex, 2, 1.1);

      let reportedLat = this.curLat + noiseLatM / 111320;
      let reportedLng =
        this.curLng +
        noiseLngM / (111320 * Math.cos((this.curLat * Math.PI) / 180));

      // Item 5.3: UM salto isolado de 80 m aos ~40 s virtuais (descartado pelo filtro de salto > 12 m/s)
      if (!this.disableAnomalies && !this.outlierInjected && vSec >= 40 && vSec < 43) {
        this.outlierInjected = true;
        reportedLat += 80 / 111320;
      }

      // Altitude suave (+42m / -38m ao longo do circuito)
      const altitude =
        754 +
        Math.sin(this.cumDistM / 260) * 14 +
        Math.cos(this.cumDistM / 520) * 8;

      // Accuracy:
      // - No modo `weak`: 48 m pelos primeiros 25 s (reais ou virtuais) e depois 8 m.
      // - No modo `sim`: varia entre 5 m e 20 m.
      let accuracy = 8;
      if (this.mode === 'weak') {
        accuracy = vSec < 25 ? 48 : 8;
      } else {
        accuracy = Math.round(5 + ((Math.sin(this.stepIndex * 0.43) + 1) * 0.5) * 15);
      }

      if (this.onPosition) {
        this.onPosition({
          coords: {
            latitude: reportedLat,
            longitude: reportedLng,
            accuracy,
            altitude,
            speed: trueSpeedMps
          },
          timestamp: this.virtualTimeMs
        });
      }
    };

    emitNext();
    this.timerId = setInterval(emitNext, tickIntervalMs);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}
