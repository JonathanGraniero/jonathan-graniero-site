import clsx from 'clsx';
import { memo, useId, useMemo, type ReactNode } from 'react';
import { createRng, hashString, nearestEdges, scatter, type Rng } from '../../lib/art.ts';

/**
 * Colours come from the theme, so art is monochrome line work in the site's
 * single signal colour on the panel background, in both light and dark mode.
 */
interface Palette {
  a: string;
  b: string;
  bg: string;
}
const THEME: Palette = { a: 'var(--signal)', b: 'var(--dim)', bg: 'var(--panel)' };

const W = 800;
const H = 400;

type Motif = (rng: Rng, p: Palette, id: string) => ReactNode;

/** Concentric, tilted orbits with bodies travelling on them. */
const orbits: Motif = (rng, p) => {
  const cx = rng.range(W * 0.45, W * 0.75);
  const cy = rng.range(H * 0.35, H * 0.65);
  const tilt = rng.range(-30, 30);
  return (
    <g transform={`rotate(${tilt} ${cx} ${cy})`}>
      {Array.from({ length: 6 }, (_, i) => {
        const rx = 70 + i * 55;
        const ry = rx * rng.range(0.32, 0.45);
        const angle = rng.range(0, Math.PI * 2);
        return (
          <g key={i}>
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill="none"
              stroke={i % 2 ? p.b : p.a}
              strokeOpacity={0.5 - i * 0.06}
              strokeWidth="1.5"
            />
            <circle
              cx={cx + rx * Math.cos(angle)}
              cy={cy + ry * Math.sin(angle)}
              r={rng.range(4, 9)}
              fill={i % 2 ? p.a : p.b}
            />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="26" fill={p.a} opacity="0.9" />
    </g>
  );
};

/** A small cluster graph, echoing the hero artwork. */
const topology: Motif = (rng, p) => {
  const nodes = scatter(rng, 18, { x: 60, y: 40, w: W - 120, h: H - 80 }, 70);
  const edges = nearestEdges(nodes, 2);
  return (
    <g>
      {edges.map(([i, j]) => (
        <line
          key={`${i}-${j}`}
          x1={nodes[i]!.x}
          y1={nodes[i]!.y}
          x2={nodes[j]!.x}
          y2={nodes[j]!.y}
          stroke={p.b}
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
      ))}
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={i % 4 === 0 ? 9 : 5}
          fill={i % 4 === 0 ? p.a : p.bg}
          stroke={p.a}
          strokeWidth="2"
        />
      ))}
    </g>
  );
};

/** Layered sine waves, like a signal on a scope. */
const waves: Motif = (rng, p) => {
  const lines = 9;
  const freq = rng.range(1.2, 2.6);
  const phase = rng.range(0, Math.PI * 2);
  return (
    <g fill="none" strokeWidth="2">
      {Array.from({ length: lines }, (_, i) => {
        const amp = 30 + i * 9;
        const yBase = H / 2 + (i - lines / 2) * 16;
        const d = Array.from({ length: 41 }, (_, s) => {
          const x = (s / 40) * W;
          const y = yBase + amp * Math.sin((s / 40) * Math.PI * 2 * freq + phase + i * 0.35);
          return `${s === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        return (
          <path key={i} d={d} stroke={i % 2 ? p.b : p.a} strokeOpacity={0.25 + (i / lines) * 0.6} />
        );
      })}
    </g>
  );
};

/** A grid of rounded cells lit at random, like pods on nodes. */
const blocks: Motif = (rng, p) => {
  const size = 34;
  const gap = 10;
  const cols = Math.ceil(W / (size + gap));
  const rows = Math.ceil(H / (size + gap));
  const cells: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = rng.next();
      // Fade cells out toward the left so text overlays stay readable.
      const fade = Math.min(1, (c / cols) * 1.6);
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={c * (size + gap) + 6}
          y={r * (size + gap) + 6}
          width={size}
          height={size}
          fill={v > 0.82 ? p.a : v > 0.6 ? p.b : 'none'}
          stroke={v > 0.6 ? 'none' : p.b}
          strokeOpacity="0.25"
          opacity={(v > 0.82 ? 0.9 : 0.55) * fade}
        />,
      );
    }
  }
  return <g>{cells}</g>;
};

/** Radar sweep with blips, like a monitoring display. */
const radar: Motif = (rng, p, id) => {
  const cx = rng.range(W * 0.5, W * 0.72);
  const cy = H / 2;
  const sweep = rng.range(0, 360);
  const blips = Array.from({ length: 7 }, () => {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(40, 170);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), s: rng.range(3, 7) };
  });
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={p.a} stopOpacity="0" />
          <stop offset="100%" stopColor={p.a} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {[50, 100, 150, 200].map((r) => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={p.b}
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
      ))}
      <path
        d={`M${cx - 200},${cy} H${cx + 200} M${cx},${cy - 200} V${cy + 200}`}
        stroke={p.b}
        strokeOpacity="0.2"
      />
      <path
        d={`M${cx},${cy} L${cx + 200},${cy} A200,200 0 0,0 ${cx + 200 * Math.cos(-Math.PI / 4)},${cy + 200 * Math.sin(-Math.PI / 4)} Z`}
        fill={`url(#${id}-sweep)`}
        transform={`rotate(${sweep} ${cx} ${cy})`}
      />
      {blips.map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y} r={b.s * 2.5} fill={p.a} opacity="0.15" />
          <circle cx={b.x} cy={b.y} r={b.s} fill={p.a} />
        </g>
      ))}
    </g>
  );
};

const MOTIFS = [orbits, topology, waves, blocks, radar] as const;

/**
 * Salt mixed into the seed when picking a motif. Chosen (by brute-force search)
 * so the current posts and projects spread across all five motifs, with no two
 * neighbours on the home page sharing one. New content still gets varied art.
 */
const MOTIF_SALT = '#art2088';

interface CoverArtProps {
  /** Seed: usually the post slug or project name. */
  seed: string;
  className?: string;
  /** Optional short label rendered in the corner (e.g. a tag). */
  label?: string;
}

/**
 * Deterministic generative cover image, drawn like a schematic plate:
 * theme-coloured line work over a fine grid with registration marks.
 */
export const CoverArt = memo(function CoverArt({ seed, className, label }: CoverArtProps) {
  const id = useId().replace(/:/g, '');
  const motif = useMemo(
    () => MOTIFS[hashString(`${seed}${MOTIF_SALT}`) % MOTIFS.length]!(createRng(seed), THEME, id),
    [seed, id],
  );
  const mark = (x: number, y: number) => `M${x - 12},${y} H${x + 12} M${x},${y - 12} V${y + 12}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={clsx('block', className)}
      aria-hidden
    >
      <defs>
        <pattern id={`${id}-grid`} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40,0 H0 V40" fill="none" stroke="var(--line)" strokeWidth="1" opacity="0.6" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={THEME.bg} />
      <rect width={W} height={H} fill={`url(#${id}-grid)`} />
      {motif}
      <path
        d={[mark(24, 24), mark(W - 24, 24), mark(24, H - 24), mark(W - 24, H - 24)].join(' ')}
        stroke="var(--faint)"
        strokeWidth="1.5"
      />
      {label && (
        <text
          x="28"
          y={H - 28}
          fill="var(--dim)"
          fontFamily="var(--font-mono)"
          fontSize="22"
          letterSpacing="1"
        >
          {label}
        </text>
      )}
    </svg>
  );
});
