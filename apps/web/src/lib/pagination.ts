/** Page numbers with ellipses: 1 … 4 5 6 … 10 */
export function pageWindow(page: number, total: number): (number | '…')[] {
  const pages = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1]! > 1 ? (['…', p] as const) : [p]));
}
