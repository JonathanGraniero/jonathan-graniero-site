import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiError, server } from '../test/server.ts';
import { renderRoute } from '../test/render.tsx';

describe('ContactPage', () => {
  it('validates fields before submitting', async () => {
    let submitted = false;
    server.use(http.post('/api/contact', () => ((submitted = true), HttpResponse.json({}))));
    const { user } = renderRoute('/contact');

    await user.click(await screen.findByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Please enter your name')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(submitted).toBe(false);
  });

  it('submits and shows a confirmation', async () => {
    let body: unknown;
    server.use(
      http.post('/api/contact', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'c1', receivedAt: '' }, { status: 201 });
      }),
    );
    const { user } = renderRoute('/contact');

    await user.type(await screen.findByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Message'), 'Loved the post on reconcile loops!');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('status')).toHaveTextContent('your message is on its way');
    expect(body).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com', website: '' });
  });

  it('explains rate limiting', async () => {
    server.use(
      http.post('/api/contact', () => apiError(429, 'ThrottlerException: Too Many Requests')),
    );
    const { user } = renderRoute('/contact');

    await user.type(await screen.findByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Message'), 'Hello there again!');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/try again in a little while/);
  });
});
