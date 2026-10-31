/**
 * ============================================================================
 * CLAY FIT — EXERCÍCIOS POPULARES DA BIBLIOTECA (14 IDs: 5 LOTE 1 + 5 LOTE 2 + 4 LOTE 3)
 * /js/data/exercicios/populares.js
 *
 * Especificação C4 (Prompt 8):
 * - 5 populares do Lote 1 (Peito, Costas, Ombros)
 * - 5 populares do Lote 2 (Agachamento livre, Leg press 45°, Cadeira extensora,
 *   Elevação pélvica com barra, Rosca direta com barra reta)
 * - 4 populares do Lote 3 (Prancha frontal, Abdominal supra, Corrida na esteira,
 *   Alongamento de posterior)
 * Total: 14 exercícios (<= 14).
 * ============================================================================
 */

export const POPULARES_IDS = [
  // Lote 1 (5)
  'peito-supino-reto',
  'peito-supino-inclinado-halteres',
  'costas-puxada-alta',
  'costas-remada-baixa-cabo',
  'ombros-elevacao-lateral',
  // Lote 2 (5)
  'pernas-agachamento-livre',
  'pernas-leg-press-45',
  'pernas-cadeira-extensora',
  'pernas-elevacao-pelvica',
  'bracos-rosca-direta-barra',
  // Lote 3 (4)
  'core-prancha-firme',
  'core-abdominal-supra',
  'cardio-corrida-esteira',
  'mobilidade-alongamento-mundo'
];

export const POPULARES_SET = new Set(POPULARES_IDS);
