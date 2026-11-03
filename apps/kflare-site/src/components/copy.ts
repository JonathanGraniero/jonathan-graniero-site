const SHOWN_FOR_MS = 2000;

/**
 * Makes CopyButton work on a page React doesn't hydrate: the docs pages ship
 * only this, and it handles the same markup.
 */
export function wireCopyButtons(doc: Document): void {
  doc.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>('button[data-copy]');
    const code = button?.closest('figure')?.querySelector('pre')?.textContent;
    // The clipboard is undefined outside a secure context.
    if (!button || code == null || !navigator.clipboard) return;
    const status = button.parentElement?.querySelector('[data-copy-status]');
    navigator.clipboard.writeText(code).then(
      () => {
        button.textContent = 'Copied';
        if (status) status.textContent = 'Copied to the clipboard';
        setTimeout(() => {
          button.textContent = 'Copy';
          if (status) status.textContent = '';
        }, SHOWN_FOR_MS);
      },
      () => {},
    );
  });
}
