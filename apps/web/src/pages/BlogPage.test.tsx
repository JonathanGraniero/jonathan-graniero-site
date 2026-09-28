import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '../test/render.tsx';

const titles = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

describe('BlogPage', () => {
  it('lists published posts', async () => {
    renderRoute('/blog');
    expect(await screen.findByText('Post number 3')).toBeInTheDocument();
    expect(titles()).toEqual(['Post number 3', 'Post number 2', 'Post number 1']);
  });

  it('filters by tag and syncs the filter to the URL', async () => {
    const { router, user } = renderRoute('/blog');
    const tagFilter = await screen.findByRole('list', { name: 'Filter by tag' });

    await user.click(within(tagFilter).getByRole('link', { name: /#Go/ }));

    await waitFor(() => expect(titles()).toEqual(['Post number 3', 'Post number 1']));
    expect(router.state.location.search).toBe('?tag=go');
    expect(screen.getByText(/2 posts/)).toHaveTextContent('2 posts tagged #Go');
    expect(within(tagFilter).getByRole('link', { name: /#Go/ })).toHaveAttribute(
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
    expect(await screen.findByText('No posts found')).toBeInTheDocument();
  });
});
