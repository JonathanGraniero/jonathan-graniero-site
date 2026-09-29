import { useTheme, type ThemePreference } from '../lib/theme-context.ts';

const order: ThemePreference[] = ['system', 'light', 'dark'];
const labels: Record<ThemePreference, string> = { system: 'auto', light: 'light', dark: 'dark' };

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const next = order[(order.indexOf(preference) + 1) % order.length]!;
  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      className="px-2 py-1 text-xs text-dim transition hover:text-signal"
      aria-label={`Theme: ${labels[preference]} (switch to ${labels[next]})`}
      title="Cycle theme (t)"
    >
      theme:<span className="text-ink">{labels[preference]}</span>
    </button>
  );
}
