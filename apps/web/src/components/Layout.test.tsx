import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '../test/render.tsx';

describe('keyboard shortcuts', () => {
  it('navigates with g-prefixed sequences', async () => {
    const { router, user } = renderRoute('/');
    await screen.findByRole('heading', { level: 1 });

    await user.keyboard('gb');
    await waitFor(() => expect(router.state.location.pathname).toBe('/blog'));

    await user.keyboard('gp');
    await waitFor(() => expect(router.state.location.pathname).toBe('/projects'));

    await user.keyboard('gh');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('ignores shortcuts while typing in a field', async () => {
    const { router, user } = renderRoute('/contact');
    await user.type(await screen.findByLabelText('Name'), 'gb');
    expect(router.state.location.pathname).toBe('/contact');
    expect(screen.getByLabelText('Name')).toHaveValue('gb');
  });

  it('toggles the help panel with ? and closes it with Escape', async () => {
    const { user } = renderRoute('/');
    await screen.findByRole('heading', { level: 1 });

    await user.keyboard('?');
    expect(await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('jumps to the blog search with /', async () => {
    const { router, user } = renderRoute('/');
    await screen.findByRole('heading', { level: 1 });

    await user.keyboard('/');
    await waitFor(() => expect(router.state.location.pathname).toBe('/blog'));
    await waitFor(() =>
      expect(screen.getByRole('searchbox', { name: 'Search posts' })).toHaveFocus(),
    );
  });
});
