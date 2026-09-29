import { useEffect, useLayoutEffect, useRef } from 'react';

/** Fired by the `/` shortcut when already on the blog page. */
export const FOCUS_SEARCH_EVENT = 'site:focus-search';

export type HotkeyMap = Record<string, () => void>;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Vim-style keyboard shortcuts. Keys are single characters ("/", "?") or
 * two-key sequences starting with "g" ("g b"). Ignored while typing in a field
 * or when a modifier is held, so browser shortcuts keep working.
 */
export function useHotkeys(map: HotkeyMap): void {
  const mapRef = useRef(map);
  useLayoutEffect(() => {
    mapRef.current = map;
  });

  useEffect(() => {
    let pending: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const key = e.key;
      const combo = pending ? `${pending} ${key}` : key;
      clearTimeout(timer);

      const action = mapRef.current[combo];
      if (action) {
        e.preventDefault();
        pending = null;
        action();
        return;
      }
      if (!pending && key === 'g') {
        pending = 'g';
        timer = setTimeout(() => (pending = null), 1000);
        return;
      }
      pending = null;
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, []);
}
