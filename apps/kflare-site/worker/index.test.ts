// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import worker, { type Env } from './index.ts';

function setup({ allowed = true, sendFails = false } = {}) {
  const send = vi.fn(async () => {
    if (sendFails) throw new Error('E_RECIPIENT_NOT_ALLOWED');
    return { messageId: 'm1' };
  });
  const env = {
    ASSETS: { fetch: vi.fn(async () => new Response('asset')) },
    CONTACT_EMAIL: { send },
    CONTACT_LIMIT: { limit: vi.fn(async () => ({ success: allowed })) },
    CONTACT_TO: 'inbox@example.com',
  } as unknown as Env;
  const call = (req: Request) => worker.fetch(req as Parameters<typeof worker.fetch>[0], env);
  return { env, send, call };
}

const post = (fields: Record<string, string>) => {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  return new Request('https://kflare.dev/api/contact', { method: 'POST', body });
};

const valid = { name: 'Ada', email: 'ada@example.com', message: 'Hello' };

describe('contact worker', () => {
  it('serves anything else from static assets', async () => {
    const { env, call } = setup();
    expect(await (await call(new Request('https://kflare.dev/api/other'))).text()).toBe('asset');
    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
  });

  it('sends a valid message to the inbox, replying to the sender', async () => {
    const { send, call } = setup();
    const res = await call(post({ ...valid, name: 'Ada\r\nBcc: x@evil.test' }));
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'inbox@example.com',
        replyTo: { name: 'Ada Bcc: x@evil.test', email: 'ada@example.com' },
        subject: 'kflare.dev: message from Ada Bcc: x@evil.test',
      }),
    );
  });

  it('drops honeypot submissions silently', async () => {
    const { send, call } = setup();
    expect((await call(post({ ...valid, website: 'spam.example' }))).status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing name', { ...valid, name: ' ' }],
    ['a bad email', { ...valid, email: 'nope' }],
    ['an overlong message', { ...valid, message: 'x'.repeat(5001) }],
  ])('rejects %s', async (_, fields) => {
    const { send, call } = setup();
    expect((await call(post(fields))).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects GET and rate-limited senders', async () => {
    expect((await setup().call(new Request('https://kflare.dev/api/contact'))).status).toBe(405);
    const limited = setup({ allowed: false });
    expect((await limited.call(post(valid))).status).toBe(429);
    expect(limited.send).not.toHaveBeenCalled();
  });

  it('reports a failed send', async () => {
    const res = await setup({ sendFails: true }).call(post(valid));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: expect.stringContaining('contact@kflare.dev') });
  });
});
