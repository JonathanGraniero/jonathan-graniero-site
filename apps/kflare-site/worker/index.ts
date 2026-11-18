// kflare.dev's only dynamic route: the contact form. wrangler.jsonc runs this
// script for /api/* alone; every other request is a static asset.

export interface Env {
  ASSETS: Fetcher;
  /** Email Routing send binding. It can only deliver to a verified destination address. */
  CONTACT_EMAIL: SendEmail;
  /** Per-IP limit on submissions (Workers rate limiting, not a zone ruleset). */
  CONTACT_LIMIT: RateLimit;
  /** The verified inbox contact@kflare.dev forwards to: a secret, kept out of the repo. */
  CONTACT_TO: string;
}

const FROM = 'contact@kflare.dev';
const LIMITS = { name: 200, email: 254, message: 5000 };
// Deliberately loose: the reply goes to whatever they typed; this only rejects junk.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (status: number, body: object) => Response.json(body, { status });

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/api/contact') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return json(400, { error: 'Send the form as form data.' });
    }
    const field = (key: string) => String(form.get(key) ?? '').trim();
    // One line: the name goes into the Subject and Reply-To headers.
    const name = field('name').replace(/\s+/g, ' ');
    const email = field('email');
    const message = field('message');

    // Honeypot: a hidden field people never fill. Answer as if it worked so bots learn nothing.
    if (field('website')) return json(200, { ok: true });

    if (!name || !message || !EMAIL.test(email)) {
      return json(400, { error: 'Fill in your name, a valid email address and a message.' });
    }
    if (
      name.length > LIMITS.name ||
      email.length > LIMITS.email ||
      message.length > LIMITS.message
    ) {
      return json(400, { error: 'That message is too long.' });
    }

    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const { success } = await env.CONTACT_LIMIT.limit({ key: ip });
    if (!success) return json(429, { error: 'Too many messages. Try again in a minute.' });

    try {
      await env.CONTACT_EMAIL.send({
        from: { name: 'kflare.dev contact form', email: FROM },
        to: env.CONTACT_TO,
        replyTo: { name, email },
        subject: `kflare.dev: message from ${name}`,
        text: `From: ${name} <${email}>\n\n${message}\n`,
      });
    } catch (err) {
      console.error('contact form send failed', err);
      return json(502, { error: `Sending failed. Email ${FROM} instead.` });
    }
    return json(200, { ok: true });
  },
} satisfies ExportedHandler<Env>;
