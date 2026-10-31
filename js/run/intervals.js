/**
 * ============================================================================
 * CLAY FIT — MÁQUINA DE INTERVALOS DA CORRIDA (C4.4)
 * /js/run/intervals.js
 *
 * Estrutura da sessão de intervalos:
 * - Aquecimento (ex.: 180s)
 * - N rodadas alternando TIRO (por tempo `tiroSeg` ou distância `tiroM`) e
 *   TROTE (`troteSeg`)
 * - Volta à calma (ex.: 180s)
 * ============================================================================
 */

import { formatRunClock } from './geo.js';

export class RunIntervalsEngine {
  constructor(config = {}) {
    this.aquecimentoSeg = Number(config.aquecimentoSeg ?? 180);
    this.tiroSeg = config.tiroSeg ? Number(config.tiroSeg) : null;
    this.tiroM = config.tiroM ? Number(config.tiroM) : null;
    if (!this.tiroSeg && !this.tiroM) {
      this.tiroSeg = 60;
    }
    this.troteSeg = Number(config.troteSeg ?? 90);
    this.rodadas = Math.max(1, Number(config.rodadas ?? 6));
    this.voltaCalmaSeg = Number(config.voltaCalmaSeg ?? 180);

    this.phases = this._buildPhases();
    this.currentPhaseIdx = 0;
    this.phaseStartMovSeg = 0;
    this.phaseStartDistM = 0;
    this.lastAnnouncedCountdown = null;
  }

  _buildPhases() {
    const list = [];
    if (this.aquecimentoSeg > 0) {
      list.push({
        tipo: 'aquecimento',
        titulo: 'Aquecimento',
        alvoSeg: this.aquecimentoSeg,
        alvoM: null,
        rodada: 0
      });
    }
    for (let r = 1; r <= this.rodadas; r++) {
      list.push({
        tipo: 'tiro',
        titulo: `TIRO · Rodada ${r} de ${this.rodadas}`,
        alvoSeg: this.tiroSeg,
        alvoM: this.tiroM,
        rodada: r
      });
      list.push({
        tipo: 'trote',
        titulo: `TROTE · Rodada ${r} de ${this.rodadas}`,
        alvoSeg: this.troteSeg,
        alvoM: null,
        rodada: r
      });
    }
    if (this.voltaCalmaSeg > 0) {
      list.push({
        tipo: 'volta_calma',
        titulo: 'Volta à calma',
        alvoSeg: this.voltaCalmaSeg,
        alvoM: null,
        rodada: this.rodadas
      });
    }
    return list;
  }

  update(movimentoSeg = 0, distanciaM = 0) {
    let phaseChanged = null;
    let countdownTick = null;

    while (this.currentPhaseIdx < this.phases.length) {
      const cur = this.phases[this.currentPhaseIdx];
      const elapsedSeg = Math.max(0, movimentoSeg - this.phaseStartMovSeg);
      const elapsedM = Math.max(0, distanciaM - this.phaseStartDistM);

      const doneByTime = cur.alvoSeg !== null && elapsedSeg >= cur.alvoSeg;
      const doneByDist = cur.alvoM !== null && elapsedM >= cur.alvoM;

      if (doneByTime || doneByDist) {
        if (cur.alvoSeg !== null) {
          this.phaseStartMovSeg += cur.alvoSeg;
          this.phaseStartDistM = distanciaM;
        } else {
          this.phaseStartMovSeg = movimentoSeg;
          this.phaseStartDistM += cur.alvoM;
        }
        this.currentPhaseIdx += 1;
        this.lastAnnouncedCountdown = null;
        if (this.currentPhaseIdx < this.phases.length) {
          phaseChanged = this.phases[this.currentPhaseIdx];
        } else {
          phaseChanged = { tipo: 'concluido', titulo: 'Intervalos concluídos' };
        }
      } else {
        break;
      }
    }

    if (this.currentPhaseIdx >= this.phases.length) {
      return {
        concluido: true,
        fase: 'concluido',
        titulo: 'Intervalos concluídos',
        rodada: this.rodadas,
        totalRodadas: this.rodadas,
        restanteTexto: '0:00',
        progresso: 1,
        proximaTexto: 'Percurso livre até encerrar',
        phaseChanged,
        countdownTick: null
      };
    }

    const cur = this.phases[this.currentPhaseIdx];
    const next = this.phases[this.currentPhaseIdx + 1] || null;
    const elapsedSeg = Math.max(0, movimentoSeg - this.phaseStartMovSeg);
    const elapsedM = Math.max(0, distanciaM - this.phaseStartDistM);

    let restanteTexto = '0:00';
    let progresso = 0;

    if (cur.alvoSeg !== null) {
      const remSeg = Math.max(0, Math.ceil(cur.alvoSeg - elapsedSeg));
      restanteTexto = formatRunClock(remSeg);
      progresso = Math.min(1, elapsedSeg / Math.max(1, cur.alvoSeg));
      if (remSeg <= 3 && remSeg >= 1 && this.lastAnnouncedCountdown !== remSeg) {
        this.lastAnnouncedCountdown = remSeg;
        countdownTick = remSeg;
      }
    } else if (cur.alvoM !== null) {
      const remM = Math.max(0, Math.round(cur.alvoM - elapsedM));
      restanteTexto = `${remM} m`;
      progresso = Math.min(1, elapsedM / Math.max(1, cur.alvoM));
      if (remM <= 30 && remM > 0 && Math.floor(remM / 10) !== this.lastAnnouncedCountdown) {
        this.lastAnnouncedCountdown = Math.floor(remM / 10);
        countdownTick = this.lastAnnouncedCountdown;
      }
    }

    let proximaTexto = 'Último bloco';
    if (next) {
      const durLabel = next.alvoSeg
        ? formatRunClock(next.alvoSeg)
        : `${next.alvoM} m`;
      const tipoNome =
        next.tipo === 'tiro'
          ? 'Tiro'
          : next.tipo === 'trote'
          ? 'Trote'
          : next.tipo === 'volta_calma'
          ? 'Volta à calma'
          : 'Aquecimento';
      proximaTexto = `Próximo: ${tipoNome} ${durLabel}`;
    }

    return {
      concluido: false,
      fase: cur.tipo,
      titulo: cur.titulo,
      rodada: cur.rodada || 1,
      totalRodadas: this.rodadas,
      restanteTexto,
      progresso,
      proximaTexto,
      isTiro: cur.tipo === 'tiro',
      phaseChanged,
      countdownTick
    };
  }
}
