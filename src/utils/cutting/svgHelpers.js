import { CORES_AMBIENTES } from '../../constants/colors';

/**
 * Helpers compartilhados entre componentes SVG do plano de corte.
 * Mantém constantes e funções puras agnósticas de React.
 */

export const ESCALA = 0.3;         // mm → px (consistente com o canvas)
export const OFFSET = 50;          // espaço para réguas/cotas em volta da chapa
export const PADDING_FIT = 80;     // folga ao dar "fit" na chapa
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 20;

/** Retorna a cor base do ambiente de uma peça (CORES_AMBIENTES). */
export function corDaPeca(pecaId, ambienteIdxPorPecaId) {
  const idx = ambienteIdxPorPecaId[pecaId] ?? 0;
  return CORES_AMBIENTES[idx % CORES_AMBIENTES.length];
}

/** Clareia uma cor hex em direção ao branco. `fator` 0..1 (1 = branco). */
export function clarear(hex, fator) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r + (255 - r) * fator);
  const ng = Math.round(g + (255 - g) * fator);
  const nb = Math.round(b + (255 - b) * fator);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

/** Escurece uma cor hex subtraindo `delta` de cada canal (mínimo 0). */
export function escurecer(hex, delta = 40) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0, r - delta)}, ${Math.max(0, g - delta)}, ${Math.max(0, b - delta)})`;
}

/** Sanitiza um id arbitrário pra uso em IDs de elementos SVG/HTML (sem `.`). */
export function sanitizarIdSvg(id) {
  return String(id).replace(/\./g, '-');
}
