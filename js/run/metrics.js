/**
 * ============================================================================
 * CLAY FIT — MÉTRICAS DE CORRIDA: RITMO, PARCIAIS, CALORIAS E RECORDES (C2, B4)
 * /js/run/metrics.js
 *
 * Especificações Prompt 4 e Prompt 4.1 (Itens 2 e 4):
 * - Item 4 (Ritmo atual):
 *   • Janela rolante máxima de 15 s de movimento contínuo.
 *   • Exclui qualquer segmento que cruze uma lacuna de sinal > 3 s ou uma pausa
 *     (a distância continua no total da corrida, mas não entra no ritmo atual).
 *   • Exibe o ritmo atual assim que houver pelo menos 10 m e 6 s de pontos
 *     aceitos em movimento contínuo (com histerese de 1 s).
 * - Item 2 (Recordes de corrida e invariantes):
 *   • (a) O melhor 1 km nunca pode ser mais rápido que o melhor ritmo de 100 m.
 *   • (b) O melhor 5 km nunca pode ser mais rápido que 5 × melhor 1 km.
 *   • (c) O melhor 5 km nunca pode ser menor que a menor janela de 5 km da corrida.
 *   • (d) Corridas com menos de 1 km (ou < alvo) nunca geram recorde daquela distância.
 * ============================================================================
 */

import { haversineMeters } from './geo.js';

/**
 * Calcula estimativa de calorias em kcal (C2).
 */
export function computeRunCalories(distanciaM = 0, pesoKg = 70, ganhoElevM = 0) {
  const km = Math.max(0, Number(distanciaM || 0)) / 1000;
  const peso = Math.max(35, Number(pesoKg || 70));
  const elev = Math.max(0, Number(ganhoElevM || 0));
  const kcal = 1.0 * peso * km + 0.02 * peso * (elev / 10);
  return Math.max(0, Math.round(kcal));
}

export function estimateRunCalories(distanciaM = 0, pesoKg = 70, ganhoElevM = 0) {
  return computeRunCalories(distanciaM, pesoKg, ganhoElevM);
}

/**
 * Item 4 — Calcula o ritmo atual nos últimos 15 s de pontos em movimento contínuo:
 * - Corta a janela em qualquer lacuna > 3 s (`dt > 3200 ms`) ou marcação `isGapReset`.
 * - Exibe assim que houver pelo menos 10 m e 6 s (`>= 5.8 s` em ticks de 1 s) contínuos.
 * - Arredondado a 1 s com histerese de 1 s.
 */
export function computeRollingCurrentPace(recentWindow = [], prevPaceSegKm = null) {
  if (!Array.isArray(recentWindow) || recentWindow.length < 2) return null;
  const latest = recentWindow[recentWindow.length - 1];
  const latestT = Number(latest.t);
  const cutoffMs = latestT - 15000;

  // Percorre de trás para frente parando na primeira lacuna > 3s ou reset de pausa
  let startIndex = recentWindow.length - 1;
  for (let i = recentWindow.length - 1; i > 0; i--) {
    const cur = recentWindow[i];
    const prev = recentWindow[i - 1];
    if (cur.isGapReset) {
      startIndex = i;
      break;
    }
    const stepDtMs = Number(cur.t) - Number(prev.t);
    if (stepDtMs > 3200) {
      startIndex = i;
      break;
    }
    if (Number(prev.t) < cutoffMs) {
      startIndex = i;
      break;
    }
    startIndex = i - 1;
  }

  let totalDistM = 0;
  const firstTimeMs = Number(recentWindow[startIndex].t);
  for (let i = startIndex + 1; i < recentWindow.length; i++) {
    totalDistM += Number(recentWindow[i].deltaDistM || 0);
  }

  const dtSec = (latestT - firstTimeMs) / 1000;
  // Exige pelo menos 10 m e 6 s (5.8 s para tolerar jitter de timer de 1 s)
  if (totalDistM < 10 || dtSec < 5.8) {
    return null;
  }

  const rawPaceSegKm = (dtSec / totalDistM) * 1000;
  if (!Number.isFinite(rawPaceSegKm) || rawPaceSegKm < 120 || rawPaceSegKm > 1800) {
    return null;
  }

  const rounded = Math.round(rawPaceSegKm);
  if (prevPaceSegKm !== null && Math.abs(rounded - prevPaceSegKm) <= 1) {
    return prevPaceSegKm;
  }
  return rounded;
}

/**
 * Gera a frase de insight acima da lista de parciais no Resumo (C3.6 item 5).
 */
export function buildSplitsInsight(parciais = []) {
  const fullSplits = (parciais || []).filter((p) => !p.parcial && !p.parcialM && Number(p.ritmoSegKm) > 0);
  if (fullSplits.length < 2) {
    return 'Ritmo bem constante. Isso é controle.';
  }

  const mid = Math.floor(fullSplits.length / 2);
  const firstHalf = fullSplits.slice(0, mid);
  const secondHalf = fullSplits.slice(mid);

  const avgFirst =
    firstHalf.reduce((acc, p) => acc + Number(p.ritmoSegKm), 0) / firstHalf.length;
  const avgSecond =
    secondHalf.reduce((acc, p) => acc + Number(p.ritmoSegKm), 0) / secondHalf.length;

  const diff = avgSecond - avgFirst;
  if (diff <= -4) {
    return 'Você acelerou na segunda metade. Ótimo ritmo negativo.';
  }
  if (diff >= 6) {
    return 'Você começou rápido e segurou bem.';
  }
  return 'Ritmo bem constante. Isso é controle.';
}

export function computeSplitInsight(parciais = []) {
  return buildSplitsInsight(parciais);
}

/**
 * Calcula o melhor ritmo (s/km) em qualquer segmento contínuo >= 100 m da trilha.
 */
export function computeBest100mPaceFromPoints(points = []) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const cumDist = [0];
  const timesSec = [0];
  const t0 = Number(points[0].t ?? 0);

  for (let i = 1; i < points.length; i++) {
    const d = haversineMeters(points[i - 1], points[i]);
    cumDist.push(cumDist[i - 1] + d);
    const tSec =
      points[i].offsetSeg !== undefined
        ? Number(points[i].offsetSeg)
        : Math.max(0, (Number(points[i].t || t0) - t0) / 1000);
    timesSec.push(tSec);
  }

  if (cumDist[cumDist.length - 1] < 100) return null;

  let bestPace = Infinity;
  let left = 0;
  for (let right = 1; right < cumDist.length; right++) {
    while (left + 1 < right && cumDist[right] - cumDist[left + 1] >= 100) {
      left += 1;
    }
    const spanD = cumDist[right] - cumDist[left];
    if (spanD >= 100) {
      const neededFromLeft = cumDist[right] - 100 - cumDist[left];
      const segD = Math.max(0.001, cumDist[left + 1] - cumDist[left]);
      const frac = Math.max(0, Math.min(1, neededFromLeft / segD));
      const tStart = timesSec[left] + frac * (timesSec[left + 1] - timesSec[left]);
      const dt = timesSec[right] - tStart;
      const pace = (dt / 100) * 1000;
      if (pace >= 140 && pace < bestPace) {
        bestPace = pace;
      }
    }
  }

  return Number.isFinite(bestPace) ? Math.round(bestPace) : null;
}

/**
 * Item 2 — Calcula o menor tempo (em segundos) para percorrer exatamente `targetMeters`
 * (ex.: 1000, 5000, 10000) usando janela deslizante com interpolação linear exata na borda.
 * Se a distância total for menor que `targetMeters`, devolve `null` (invariante d).
 */
export function computeBestWindowSeconds(points = [], parciais = [], targetMeters = 1000) {
  const targetKm = Math.round(targetMeters / 1000);

  if (Array.isArray(points) && points.length >= 2) {
    const cumDist = [0];
    const timesSec = [0];
    const t0 = Number(points[0].t ?? 0);

    for (let i = 1; i < points.length; i++) {
      const d = haversineMeters(points[i - 1], points[i]);
      cumDist.push(cumDist[i - 1] + d);
      const tSec =
        points[i].offsetSeg !== undefined
          ? Number(points[i].offsetSeg)
          : Math.max(0, (Number(points[i].t || t0) - t0) / 1000);
      timesSec.push(tSec);
    }

    const totalD = cumDist[cumDist.length - 1];
    // Invariante (d): se a trilha tem menos de targetMeters, nunca gera recorde dessa distância
    if (totalD < targetMeters) {
      return null;
    }

    let bestSec = Infinity;
    let left = 0;
    for (let right = 1; right < cumDist.length; right++) {
      while (left + 1 < right && cumDist[right] - cumDist[left + 1] >= targetMeters) {
        left += 1;
      }
      const spanDist = cumDist[right] - cumDist[left];
      if (spanDist >= targetMeters) {
        // Interpola o instante exato dentro do segmento [left, left + 1]
        const neededFromLeft = cumDist[right] - targetMeters - cumDist[left];
        const segLen = Math.max(0.001, cumDist[left + 1] - cumDist[left]);
        const frac = Math.max(0, Math.min(1, neededFromLeft / segLen));
        const tLeftExact = timesSec[left] + frac * (timesSec[left + 1] - timesSec[left]);
        const exactWindowSec = timesSec[right] - tLeftExact;
        if (exactWindowSec > 0 && exactWindowSec < bestSec) {
          bestSec = exactWindowSec;
        }
      }
    }

    if (Number.isFinite(bestSec)) {
      return Math.round(bestSec);
    }
  }

  // Fallback pelas parciais completas de 1 km
  const fullSplits = (parciais || []).filter(
    (p) => !p.parcial && !p.parcialM && Number(p.tempoSeg || p.seg || p.ritmoSegKm) > 0
  );
  if (fullSplits.length >= targetKm && targetKm > 0) {
    let bestSec = Infinity;
    for (let i = 0; i <= fullSplits.length - targetKm; i++) {
      let sumSec = 0;
      for (let j = 0; j < targetKm; j++) {
        sumSec += Number(
          fullSplits[i + j].tempoSeg || fullSplits[i + j].seg || fullSplits[i + j].ritmoSegKm || 0
        );
      }
      if (sumSec > 0 && sumSec < bestSec) {
        bestSec = sumSec;
      }
    }
    if (Number.isFinite(bestSec)) {
      return Math.round(bestSec);
    }
  }

  return null;
}

/**
 * Item 2 — Calcula os melhores tempos em janela deslizante para 1 km, 5 km e 10 km,
 * garantindo as invariantes (a), (b), (c) e (d).
 */
export function computeSlidingWindowBestTimes(points = [], parciais = [], sessionBest100mPace = null) {
  const best100m = computeBest100mPaceFromPoints(points) || sessionBest100mPace || null;
  let best1kSeg = computeBestWindowSeconds(points, parciais, 1000);
  let best5kSeg = computeBestWindowSeconds(points, parciais, 5000);
  let best10kSeg = computeBestWindowSeconds(points, parciais, 10000);

  // Invariante (a): o melhor 1 km nunca pode ser mais rápido que o melhor ritmo de 100 m
  if (best1kSeg !== null && best100m !== null && best1kSeg < best100m) {
    best1kSeg = best100m;
  }

  // Invariante (b): o melhor 5 km nunca pode ser mais rápido que 5 × melhor 1 km
  if (best5kSeg !== null && best1kSeg !== null && best5kSeg < best1kSeg * 5) {
    best5kSeg = best1kSeg * 5;
  }

  // Invariante para 10 km: nunca mais rápido que 2 × melhor 5 km ou 10 × melhor 1 km
  if (best10kSeg !== null) {
    if (best5kSeg !== null && best10kSeg < best5kSeg * 2) {
      best10kSeg = best5kSeg * 2;
    }
    if (best1kSeg !== null && best10kSeg < best1kSeg * 10) {
      best10kSeg = best1kSeg * 10;
    }
  }

  return {
    best100mSegKm: best100m,
    best1kSeg,
    best5kSeg,
    best10kSeg
  };
}

/**
 * Calcula posição da agulha (-1 a +1) e zona ("acelere" | "no_ritmo" | "segure") no modo Ritmo (C4.3).
 */
export function computeTargetPaceBand(ritmoAtualSegKm, ritmoAlvoSegKm = 330) {
  const alvo = Number(ritmoAlvoSegKm || 330);
  const atual = Number(ritmoAtualSegKm || 0);
  if (!atual || atual <= 60) {
    return { zona: 'no_ritmo', needlePos: 0, label: 'Aguardando ritmo…' };
  }
  const diff = atual - alvo;
  const clamped = Math.max(-45, Math.min(45, -diff));
  const needlePos = clamped / 45;

  if (diff > 15) {
    return { zona: 'acelere', needlePos, label: 'Acelere um pouco' };
  }
  if (diff < -15) {
    return { zona: 'segure', needlePos, label: 'Segure o ritmo' };
  }
  return { zona: 'no_ritmo', needlePos, label: 'No ritmo' };
}

/**
 * Item 4 — Calculador de ritmo rolante de 15s e melhor segmento de 100m em tempo real.
 * Isola lacunas de sinal > 3s e pausas para nunca contaminar o ritmo atual com saltos de reconexão.
 */
export class RollingPaceCalculator {
  constructor() {
    this.samples = [];
    this.ritmoAtualSegKm = null;
    this.ritmoMelhorSegKm = null;
    this.pendingGapReset = false;
  }

  notifyGapOrPause() {
    this.pendingGapReset = true;
    this.ritmoAtualSegKm = null;
  }

  addPoint({ t, cumDistM, isGapReset = false }) {
    const nowT = Number(t || Date.now());
    const curCumDist = Number(cumDistM || 0);
    const lastSample =
      this.samples.length > 0 ? this.samples[this.samples.length - 1] : null;

    const dtMs = lastSample ? nowT - lastSample.t : 0;
    const crossedSignalGap = Boolean(
      this.pendingGapReset || isGapReset || (lastSample && dtMs > 3200)
    );

    if (crossedSignalGap) {
      // Reinicia âncora do ritmo atual após queda > 3s ou pausa sem somar o salto na janela de ritmo
      this.pendingGapReset = false;
      this.samples = [
        {
          t: nowT,
          cumDistM: curCumDist,
          deltaDistM: 0,
          isGapReset: true
        }
      ];
      this.ritmoAtualSegKm = null;
      return {
        ritmoAtualSegKm: null,
        ritmoMelhorSegKm: this.ritmoMelhorSegKm
      };
    }

    const prevDist = lastSample ? lastSample.cumDistM : curCumDist;
    const deltaDistM = Math.max(0, curCumDist - prevDist);

    this.samples.push({
      t: nowT,
      cumDistM: curCumDist,
      deltaDistM,
      isGapReset: false
    });
    if (this.samples.length > 120) {
      this.samples.shift();
    }

    this.ritmoAtualSegKm = computeRollingCurrentPace(this.samples, this.ritmoAtualSegKm);

    // Avalia melhor segmento contínuo de >= 100 m (sem cruzar lacuna)
    for (let i = this.samples.length - 2; i >= 0; i--) {
      if (this.samples[i + 1]?.isGapReset) break;
      const spanM = curCumDist - this.samples[i].cumDistM;
      if (spanM >= 100) {
        const dtSec = Math.max(1, (nowT - this.samples[i].t) / 1000);
        const pace100 = Math.round((dtSec / spanM) * 1000);
        if (
          pace100 >= 150 &&
          pace100 <= 1200 &&
          (!this.ritmoMelhorSegKm || pace100 < this.ritmoMelhorSegKm)
        ) {
          this.ritmoMelhorSegKm = pace100;
        }
        break;
      }
    }

    return {
      ritmoAtualSegKm: this.ritmoAtualSegKm,
      ritmoMelhorSegKm: this.ritmoMelhorSegKm
    };
  }
}
