import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '../test/render.tsx';

/** Post titles in table order (tag links inside rows are excluded). */
const titles = () =>
  within(screen.getByRole('table', { name: 'Posts' }))
    .getAllByRole('link')
    .filter((a) => a.getAttribute('href')?.startsWith('/blog/'))
    .map((a) => a.textContent);

describe('BlogPage', () => {
  it('lists published posts', async () => {
    renderRoute('/blog');
    expect(await screen.findByText('Post number 3')).toBeInTheDocument();
    expect(titles()).toEqual(['Post number 3', 'Post number 2', 'Post number 1']);
  });

  it('filters by tag and syncs the filter to the URL', async () => {
    const { router, user } = renderRoute('/blog');
    const tagFilter = await screen.findByRole('list', { name: 'Filter by tag' });

    await user.click(within(tagFilter).getByRole('link', { name: /tag=go/ }));

    await waitFor(() => expect(titles()).toEqual(['Post number 3', 'Post number 1']));
    expect(router.state.location.search).toBe('?tag=go');
    expect(screen.getByText(/2 resources/)).toHaveTextContent('2 resources with label tag=go');
    expect(within(tagFilter).getByRole('link', { name: /tag=go/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('debounces search input into the query string', async () => {
    const { router, user } = renderRoute('/blog');
    await screen.findByText('Post number 3');

    await user.type(screen.getByRole('searchbox', { name: 'Search posts' }), 'number 2');

    await waitFor(() => expect(router.state.location.search).toBe('?q=number+2'));
    await waitFor(() => expect(titles()).toEqual(['Post number 2']));
  });

  it('shows an empty state when nothing matches', async () => {
    renderRoute('/blog?q=zzz');
    expect(await screen.findByText(/No posts found/)).toBeInTheDocument();
  });
});
