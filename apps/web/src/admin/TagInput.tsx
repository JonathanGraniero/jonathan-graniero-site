import { useId, useState, type KeyboardEvent } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  max?: number;
}

/** Chip-style tag editor: Enter or comma adds, Backspace on empty removes the last tag. */
export function TagInput({ value, onChange, suggestions = [], max = 10 }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const listId = useId();

  const add = (raw: string) => {
    const tag = raw.trim().replace(/,$/, '');
    if (!tag || value.length >= max) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 focus-within:border-accent-500 focus-within:ring-2 focus-within:ring-accent-500/30 dark:border-zinc-700 dark:bg-zinc-900">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-zinc-100 py-0.5 pl-2 pr-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="rounded px-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
            aria-label={`Remove tag ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        list={listId}
        placeholder={value.length >= max ? `Max ${max} tags` : 'Add tag…'}
        disabled={value.length >= max}
        aria-label="Add tag"
        className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-zinc-400"
      />
      <datalist id={listId}>
        {suggestions
          .filter((s) => !value.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  );
}
