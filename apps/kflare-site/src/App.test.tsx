import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';
import { AREAS, KFLARE, KIND_COUNT, QUICKSTART } from './content.ts';
import { NotFound } from './NotFound.tsx';

describe('App', () => {
  it('says what kflare is', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Cloudflare, managed from Kubernetes' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View on GitHub/ })).toHaveAttribute(
      'href',
      KFLARE.links.repo,
    );
  });

  it('links only to sections that exist', () => {
    const { container } = render(<App />);
    const anchors = [...container.querySelectorAll<HTMLAnchorElement>('a[href*="#"]')]
      .map((a) => a.getAttribute('href')!)
      .filter((href) => href.startsWith('#') || href.startsWith('/#'));
    expect(anchors.length).toBeGreaterThan(0);
    for (const href of anchors) {
      const id = href.slice(href.indexOf('#') + 1);
      expect(container.querySelector(`#${id}`), href).not.toBeNull();
    }
  });

  it('opens other sites in a new tab without handing them the page', () => {
    const { container } = render(<App />);
    const external = [...container.querySelectorAll('a[href^="http"]')];
    expect(external.length).toBeGreaterThan(0);
    for (const a of external) {
      expect(a).toHaveAttribute('target', '_blank');
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('lists every resource kind once', () => {
    render(<App />);
    const kinds = AREAS.flatMap((a) => a.kinds.map((k) => k.kind));
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(kinds).toHaveLength(KIND_COUNT);
    const section = within(screen.getByRole('region', { name: /One operator/ }));
    for (const kind of kinds) expect(section.getByText(kind)).toBeInTheDocument();
  });

  it('installs the version it advertises', () => {
    render(<App />);
    expect(QUICKSTART.install).toContain(`--version ${KFLARE.version} `);
    expect(QUICKSTART.expose).toContain(`/kflare/v${KFLARE.version}/examples/`);
    expect(screen.getByRole('link', { name: new RegExp(`v${KFLARE.version}`) })).toHaveAttribute(
      'href',
      `${KFLARE.links.repo}/releases/tag/v${KFLARE.version}`,
    );
  });

  it('copies a snippet to the clipboard', async () => {
    const user = userEvent.setup();
    // userEvent installs its own clipboard stub; spy on the one it installed.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    render(<App />);
    const step = within(screen.getByRole('region', { name: /four steps/ }));
    const [first] = step.getAllByRole('button', { name: 'Copy' });
    await user.click(first!);
    expect(writeText).toHaveBeenCalledWith(QUICKSTART.install);
    expect(await step.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    // Each block has its own live region; only the clicked one speaks.
    expect(step.getAllByRole('status').map((s) => s.textContent)).toEqual([
      'Copied to the clipboard',
      '',
      '',
    ]);
  });
});

describe('NotFound', () => {
  it('leads back to the site', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to kflare.dev' })).toHaveAttribute('href', '/');
  });
});
