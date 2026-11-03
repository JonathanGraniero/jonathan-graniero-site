import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodeBlock } from './Code.tsx';
import { wireCopyButtons } from './copy.ts';

/** A CodeBlock as a docs page has it: server-rendered, never hydrated. */
function staticPage(code: string) {
  const doc = document.implementation.createHTMLDocument();
  doc.body.innerHTML = renderToString(<CodeBlock code={code} lang="yaml" title="zone.yaml" />);
  wireCopyButtons(doc);
  return {
    button: doc.querySelector<HTMLButtonElement>('button[data-copy]')!,
    status: () => doc.querySelector('[data-copy-status]')?.textContent,
  };
}

describe('wireCopyButtons', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("copies a static page's code block, says so, then resets", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { button, status } = staticPage('kind: Zone\nspec:\n  name: example.com');

    button.click();
    await vi.waitFor(() => expect(button.textContent).toBe('Copied'));
    expect(writeText).toHaveBeenCalledWith('kind: Zone\nspec:\n  name: example.com');
    expect(status()).toBe('Copied to the clipboard');

    vi.advanceTimersByTime(2000);
    expect(button.textContent).toBe('Copy');
    expect(status()).toBe('');
  });

  it('does nothing without a clipboard, as outside a secure context', () => {
    vi.stubGlobal('navigator', {});
    const { button } = staticPage('x');
    button.click();
    expect(button.textContent).toBe('Copy');
  });
});
