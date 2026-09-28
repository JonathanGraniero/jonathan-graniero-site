import { useTheme, type ThemePreference } from '../lib/theme-context.ts';

const order: ThemePreference[] = ['system', 'light', 'dark'];
const labels: Record<ThemePreference, string> = {
  system: 'System theme',
  light: 'Light theme',
  dark: 'Dark theme',
};

const icons: Record<ThemePreference, React.ReactNode> = {
  light: (
    <path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.36 6.36-1.41-1.41M7.05 7.05 5.64 5.64m12.72 0-1.41 1.41M7.05 16.95l-1.41 1.41M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
  ),
  dark: <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />,
  system: <path d="M4 5h16v11H4zM8 20h8M12 16v4" />,
};

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const next = order[(order.indexOf(preference) + 1) % order.length]!;
  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      aria-label={`${labels[preference]} (switch to ${labels[next].toLowerCase()})`}
      title={labels[preference]}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {icons[preference]}
      </svg>
    </button>
  );
}
