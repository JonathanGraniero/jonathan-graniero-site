import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '../test/render.tsx';

describe('PostPage', () => {
  it('renders markdown with a table of contents', async () => {
    renderRoute('/blog/post-2');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Post number 2' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Intro' })).toHaveAttribute('id', 'intro');
    const toc = screen.getByRole('navigation', { name: 'Table of contents' });
    expect(toc).toHaveTextContent('Intro');
    expect(toc).toHaveTextContent('Details');
    expect(document.title).toBe('Post number 2 · Jonathan Graniero');
  });

  it('shows a friendly 404 for unknown posts', async () => {
    renderRoute('/blog/missing');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByText(/doesn't exist or hasn't been published/)).toBeInTheDocument();
  });
});
