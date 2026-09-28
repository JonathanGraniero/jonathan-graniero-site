import { useId, useMemo } from 'react';
import { createRng, nearestEdges, scatter } from '../../lib/art.ts';
import { usePrefersReducedMotion } from '../../lib/hooks.ts';

const SIZE = 600;

/**
 * Animated "cluster topology": nodes joined to their nearest neighbours, with
 * pulses of light travelling along a handful of edges like reconcile loops.
 * Colours come from the --art-* CSS variables so it follows the theme.
 */
export function HeroArt({
  seed = 'jonathan-graniero',
  className,
}: {
  seed?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const reducedMotion = usePrefersReducedMotion();

  const { nodes, edges, pulses, hubs } = useMemo(() => {
    const rng = createRng(seed);
    const center = SIZE / 2;
    // Keep points inside a circle so the composition reads as one cluster.
    const nodes = scatter(rng, 26, { x: 40, y: 40, w: SIZE - 80, h: SIZE - 80 }, 62).filter(
      (p) => Math.hypot(p.x - center, p.y - center) < SIZE * 0.44,
    );
    const edges = nearestEdges(nodes, 2);
    const hubs = new Set(Array.from({ length: 4 }, () => rng.int(0, nodes.length - 1)));
    const pulses = Array.from({ length: 9 }, () => {
      const [i, j] = rng.pick(edges);
      const forward = rng.next() > 0.5;
      return {
        from: nodes[forward ? i : j]!,
        to: nodes[forward ? j : i]!,
        dur: rng.range(2.4, 5),
        delay: rng.range(0, 4),
      };
    });
    return { nodes, edges, pulses, hubs };
  }, [seed]);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={className}
      role="img"
      aria-label="Abstract illustration of a network of connected nodes"
    >
      <defs>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--art-a)" stopOpacity="0.28" />
          <stop offset="60%" stopColor="var(--art-b)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--art-b)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--art-a)" />
          <stop offset="100%" stopColor="var(--art-b)" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill={`url(#${id}-glow)`} />
      {/* Orbit rings for depth */}
      {[0.28, 0.4].map((r) => (
        <circle
          key={r}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={SIZE * r}
          fill="none"
          stroke="var(--art-line)"
          strokeDasharray="2 8"
          className="origin-center animate-[spin_120s_linear_infinite]"
          style={{ transformBox: 'fill-box' }}
        />
      ))}

      <g stroke={`url(#${id}-edge)`} strokeOpacity="0.45" strokeWidth="1.2">
        {edges.map(([i, j]) => (
          <line
            key={`${i}-${j}`}
            x1={nodes[i]!.x}
            y1={nodes[i]!.y}
            x2={nodes[j]!.x}
            y2={nodes[j]!.y}
          />
        ))}
      </g>

      {!reducedMotion && (
        <g>
          {pulses.map((p, k) => (
            <circle key={k} r="3.5" fill="var(--art-a)" filter={`url(#${id}-blur)`} opacity="0">
              <animateMotion
                dur={`${p.dur}s`}
                begin={`${p.delay}s`}
                repeatCount="indefinite"
                path={`M${p.from.x},${p.from.y} L${p.to.x},${p.to.y}`}
              />
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                dur={`${p.dur}s`}
                begin={`${p.delay}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </g>
      )}

      {nodes.map((n, i) =>
        hubs.has(i) ? (
          <g key={i}>
            <circle
              cx={n.x}
              cy={n.y}
              r="16"
              fill="var(--art-a)"
              opacity="0.15"
              className="animate-pulse"
            />
            <circle
              cx={n.x}
              cy={n.y}
              r="7"
              fill="var(--art-surface)"
              stroke="var(--art-a)"
              strokeWidth="2"
            />
          </g>
        ) : (
          <circle
            key={i}
            cx={n.x}
            cy={n.y}
            r={i % 3 === 0 ? 4 : 3}
            fill="var(--art-surface)"
            stroke="var(--art-b)"
            strokeWidth="1.5"
          />
        ),
      )}
    </svg>
  );
}
