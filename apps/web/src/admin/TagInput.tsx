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
    <div className="flex flex-wrap items-center gap-1.5 border border-line bg-panel px-2 py-1.5 focus-within:border-signal focus-within:ring-2 focus-within:ring-signal/30">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 bg-line/40 py-0.5 pl-2 pr-1 text-xs font-medium text-dim"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="px-1 text-faint hover:bg-line/40 hover:text-dim"
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
        className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-faint"
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
