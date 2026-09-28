/**
 * Deterministic generative-art helpers. Every piece of artwork on the site is
 * derived from a seed string (a post slug, a project name), so the same item
 * always gets the same art and no image files need to be stored or served.
 */

/** 32-bit FNV-1a hash of a string. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max]. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
}

/** Mulberry32: tiny, fast, good-enough PRNG for visuals. */
export function createRng(seed: string | number): Rng {
  let a = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)]!,
  };
}

export interface Palette {
  /** Primary glow / stroke colour. */
  a: string;
  /** Secondary colour for gradients and accents. */
  b: string;
  /** Deep background tint. */
  bg: string;
}

/** Hand-tuned pairs that read well on the dark cover background. */
export const PALETTES: readonly Palette[] = [
  { a: 'oklch(0.80 0.14 182)', b: 'oklch(0.70 0.16 250)', bg: 'oklch(0.20 0.04 220)' }, // teal → blue
  { a: 'oklch(0.75 0.17 300)', b: 'oklch(0.72 0.15 250)', bg: 'oklch(0.19 0.05 285)' }, // violet → indigo
  { a: 'oklch(0.82 0.15 75)', b: 'oklch(0.70 0.19 25)', bg: 'oklch(0.20 0.04 40)' }, // amber → rose
  { a: 'oklch(0.84 0.17 145)', b: 'oklch(0.78 0.14 190)', bg: 'oklch(0.19 0.04 170)' }, // green → cyan
  { a: 'oklch(0.78 0.13 230)', b: 'oklch(0.76 0.16 320)', bg: 'oklch(0.19 0.05 265)' }, // sky → magenta
];

export const paletteFor = (seed: string): Palette => PALETTES[hashString(seed) % PALETTES.length]!;

export interface Point {
  x: number;
  y: number;
}

/**
 * Scatters `count` points inside a box, rejecting any that land too close to
 * an existing point so the result looks evenly spread rather than clumpy.
 */
export function scatter(
  rng: Rng,
  count: number,
  box: { x: number; y: number; w: number; h: number },
  minDist: number,
): Point[] {
  const points: Point[] = [];
  for (let attempts = 0; points.length < count && attempts < count * 60; attempts++) {
    const p = { x: box.x + rng.next() * box.w, y: box.y + rng.next() * box.h };
    if (points.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= minDist)) points.push(p);
  }
  return points;
}

/** Connects each point to its `k` nearest neighbours, without duplicate edges. */
export function nearestEdges(points: Point[], k: number): [number, number][] {
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  points.forEach((p, i) => {
    points
      .map((q, j) => ({ j, d: Math.hypot(p.x - q.x, p.y - q.y) }))
      .filter(({ j }) => j !== i)
      .sort((m, n) => m.d - n.d)
      .slice(0, k)
      .forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push(i < j ? [i, j] : [j, i]);
        }
      });
  });
  return edges;
}
