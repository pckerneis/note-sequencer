
/**
 * Constrain a numeric value between two numeric bounds. The order between the bounds isn't relevant.
 *
 * @param value the value to constrain
 * @param a first bound
 * @param b second bound
 */
export function clamp(value: number, a: number, b: number): number {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return Math.min(Math.max(min, value), max);
}
