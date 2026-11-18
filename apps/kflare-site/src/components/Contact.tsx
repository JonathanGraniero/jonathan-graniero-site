import { useState, type FormEvent } from 'react';
import { KFLARE } from '../content.ts';
import { Section } from './ui.tsx';

const field =
  'mt-1.5 block w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none';

type Status = { state: 'idle' | 'sending' | 'sent' } | { state: 'error'; message: string };

/** The email link, and a form that worker/index.ts mails to the same inbox. */
export function Contact() {
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const mailto = `mailto:${KFLARE.email}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus({ state: 'sending' });
    try {
      const res = await fetch('/api/contact', { method: 'POST', body: new FormData(form) });
      if (res.ok) {
        form.reset();
        setStatus({ state: 'sent' });
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ state: 'error', message: body.error ?? 'Sending failed.' });
    } catch {
      setStatus({ state: 'error', message: 'Sending failed: check your connection.' });
    }
  }

  return (
    <Section
      id="contact"
      eyebrow="Contact"
      title="Get in touch"
      intro={
        <>
          Questions about kflare, or about running it at your company? Email{' '}
          <a href={mailto} className="font-medium text-accent underline-offset-4 hover:underline">
            {KFLARE.email}
          </a>{' '}
          or use the form. Bugs and feature requests are best as GitHub issues.
        </>
      }
    >
      <form onSubmit={submit} className="max-w-xl space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Name
            <input name="name" required maxLength={200} autoComplete="name" className={field} />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              className={field}
            />
          </label>
        </div>
        <label className="block text-sm font-medium">
          Message
          <textarea name="message" required maxLength={5000} rows={5} className={field} />
        </label>
        {/* Honeypot: hidden from people and screen readers; bots fill it. */}
        <div className="hidden" aria-hidden="true">
          <input name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={status.state === 'sending'}
            className="inline-flex items-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:opacity-90 disabled:opacity-60"
          >
            {status.state === 'sending' ? 'Sending…' : 'Send message'}
          </button>
          <p role="status" className="text-sm text-dim">
            {status.state === 'sent' && 'Thanks, your message was sent.'}
            {status.state === 'error' && status.message}
          </p>
        </div>
      </form>
    </Section>
  );
}
