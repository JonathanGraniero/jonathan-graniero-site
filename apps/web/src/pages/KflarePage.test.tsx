import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { KFLARE } from '../lib/kflare.ts';
import { projects } from '../test/fixtures.ts';
import { server } from '../test/server.ts';
import { renderRoute } from '../test/render.tsx';

describe('KflarePage', () => {
  it('lists every resource kind, grouped by area', async () => {
    renderRoute('/projects/kflare');
    expect(await screen.findByRole('heading', { level: 1, name: 'kflare' })).toBeInTheDocument();
    expect(document.title).toBe('kflare · Jonathan Graniero');

    const table = screen.getByRole('table', { name: 'kflare resource kinds' });
    // One header row, then one row per area.
    expect(within(table).getAllByRole('row')).toHaveLength(KFLARE.areas.length + 1);
    for (const kind of KFLARE.areas.flatMap((a) => a.kinds)) {
      expect(within(table).getByText(kind)).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { name: '19 resource kinds' })).toBeInTheDocument();
  });

  it('links to the source, the chart and the release', async () => {
    renderRoute('/projects/kflare');
    expect(await screen.findByRole('link', { name: 'source ↗' })).toHaveAttribute(
      'href',
      'https://github.com/JonathanGraniero/kflare',
    );
    expect(screen.getByRole('link', { name: 'artifact hub ↗' })).toHaveAttribute(
      'href',
      'https://artifacthub.io/packages/helm/kflare/kflare',
    );
    expect(screen.getByRole('link', { name: 'release notes ↗' })).toHaveAttribute(
      'href',
      'https://github.com/JonathanGraniero/kflare/releases/tag/v0.1.0',
    );
    expect(screen.getByText(/--version 0\.1\.0/)).toBeInTheDocument();
  });
});

describe('kflare across the site', () => {
  it('spotlights kflare on the home page', async () => {
    renderRoute('/');
    const heading = await screen.findByRole('heading', {
      name: 'kflare: Cloudflare, managed from Kubernetes',
    });
    const section = heading.closest('section')!;
    expect(within(section).getByRole('link', { name: 'the details →' })).toHaveAttribute(
      'href',
      '/projects/kflare',
    );
  });

  it('links the kflare project card to its page', async () => {
    server.use(
      http.get('/api/projects', () =>
        HttpResponse.json([
          { ...projects[0], id: 'k1', name: 'kflare', url: KFLARE.links.artifactHub },
          ...projects,
        ]),
      ),
    );
    const { router, user } = renderRoute('/projects');
    // Only the kflare card has a case study.
    const details = await screen.findAllByRole('link', { name: 'details →' });
    expect(details).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'helm-chart ↗' })).toBeInTheDocument();

    await user.click(details[0]!);
    expect(router.state.location.pathname).toBe('/projects/kflare');
    expect(await screen.findByRole('heading', { level: 1, name: 'kflare' })).toBeInTheDocument();
  });
});
