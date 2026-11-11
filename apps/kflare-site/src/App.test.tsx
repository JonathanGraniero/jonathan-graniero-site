import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App, RoadmapList } from './App.tsx';
import {
  AREAS,
  KFLARE,
  KIND_COUNT,
  NEXT_RELEASE,
  QUICKSTART,
  ROADMAP,
  headlines,
  kindPath,
} from './content.ts';
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
    for (const kind of kinds) {
      expect(section.getByRole('link', { name: kind })).toHaveAttribute('href', kindPath(kind));
    }
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

  it("lists what has merged since the release, and the roadmap's next", () => {
    render(<App />);
    const section = screen.getByRole('region', { name: /Where it's going/ });
    expect(within(section).getByText(`Merged since v${KFLARE.version}`)).toBeInTheDocument();
    const items = [...NEXT_RELEASE.flatMap((i) => [i.label ?? '', i.text]), ...ROADMAP];
    for (const item of items) expect(section).toHaveTextContent(item.replace(/`/g, ''));
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

describe('RoadmapList', () => {
  const card = { title: 'In the next release', note: 'Merged since v1.2.3' };
  const more = { href: 'https://example.com/', label: 'Changelog' };

  it('says so when there is nothing to list, as right after a release', () => {
    render(<RoadmapList {...card} items={[]} empty="Nothing yet" more={more} />);
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('labels a line that has a label', () => {
    const items = [
      { label: 'Scoping an installation', text: 'A `CloudflareAccount` can limit namespaces' },
      { text: 'Tagged, not yet published' },
    ];
    render(<RoadmapList {...card} items={items} more={more} />);
    const [labelled, plain] = screen.getAllByRole('listitem');
    expect(labelled).toHaveTextContent(
      'Scoping an installationA CloudflareAccount can limit namespaces',
    );
    expect(plain).toHaveTextContent('Tagged, not yet published');
    expect(screen.getByText('CloudflareAccount').tagName).toBe('CODE');
  });
});

describe('headlines', () => {
  it('gives a heading one line, its first change, and each change under no heading its own', () => {
    expect(
      headlines([
        {
          heading: 'Scoping an installation',
          items: ['An installation can be limited to some namespaces', 'Or to some labels'],
        },
        { items: ['Tagged', 'Not yet published'] },
      ]),
    ).toEqual([
      {
        label: 'Scoping an installation',
        text: 'An installation can be limited to some namespaces',
      },
      { text: 'Tagged' },
      { text: 'Not yet published' },
    ]);
    expect(headlines([])).toEqual([]);
  });
});

describe('NotFound', () => {
  it('leads back to the site', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to kflare.dev' })).toHaveAttribute('href', '/');
  });
});
