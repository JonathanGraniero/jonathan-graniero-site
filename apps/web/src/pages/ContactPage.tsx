import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { Seo } from '../components/Seo.tsx';
import { Button, Container, PageHeader } from '../components/ui.tsx';
import { api, ApiError } from '../lib/api.ts';
import { contactSchema, type ContactValues } from '../lib/schemas.ts';

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    return "You've sent a few messages already — please try again in a little while.";
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function ContactPage() {
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', message: '', website: '' },
  });
  const send = useMutation({ mutationFn: api.contact.send, onSuccess: () => form.reset() });
  const { errors } = form.formState;
  const messageLength = useWatch({ control: form.control, name: 'message' }).length;

  const field = (name: 'name' | 'email' | 'message') => ({
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  });
  const inputClass =
    'min-w-0 flex-1 border-b border-dashed border-line bg-transparent px-1 py-0.5 text-ink placeholder:text-faint focus:border-signal focus:outline-none aria-invalid:border-err';
  const fieldError = (name: 'name' | 'email' | 'message') =>
    errors[name] ? (
      <div id={`${name}-error`} className="pl-[2ch] text-err">
        # error: {errors[name]?.message}
      </div>
    ) : null;

  return (
    <Container className="py-14 sm:py-20">
      <Seo title="Contact" description="Get in touch." />
      <div className="max-w-2xl">
        <PageHeader command="kubectl apply -f message.yaml" title="Get in touch">
          Questions about a post, an opportunity, or just want to say hi? Fill in the manifest below
          and I&apos;ll get back to you.
        </PageHeader>

        {send.isSuccess ? (
          <div role="status" className="mt-10 border border-line bg-panel p-5 font-code text-sm">
            <p>
              <span className="text-signal">$</span> kubectl apply -f message.yaml
            </p>
            <p className="mt-2 text-ok">message.contact/{send.data.id.slice(0, 8)} created</p>
            <p className="mt-4 font-serif text-base text-dim">
              Thanks — your message is on its way. I usually reply within a couple of days.
            </p>
            <Button variant="secondary" className="mt-5" onClick={() => send.reset()}>
              Send another
            </Button>
          </div>
        ) : (
          <form
            className="mt-10"
            noValidate
            onSubmit={form.handleSubmit((values) => send.mutate(values))}
          >
            <div className="border border-line bg-panel">
              <div className="flex justify-between border-b border-line px-4 py-2 text-[11px] text-faint">
                <span>message.yaml</span>
                <span>{messageLength}/5000</span>
              </div>
              <div className="space-y-1.5 px-4 py-4 font-code text-[13px] leading-7">
                <div className="text-faint">
                  <span className="text-key">apiVersion</span>: v1
                </div>
                <div className="text-faint">
                  <span className="text-key">kind</span>: Message
                </div>
                <div>
                  <span className="text-key">spec</span>
                  <span className="text-faint">:</span>
                </div>
                <div className="flex items-baseline gap-2 pl-[2ch]">
                  <span className="text-key">name</span>
                  <span className="-ml-2 text-faint">:</span>
                  <input
                    type="text"
                    autoComplete="name"
                    aria-label="Name"
                    placeholder="Ada Lovelace"
                    className={inputClass}
                    {...field('name')}
                    {...form.register('name')}
                  />
                </div>
                {fieldError('name')}
                <div className="flex items-baseline gap-2 pl-[2ch]">
                  <span className="text-key">email</span>
                  <span className="-ml-2 text-faint">:</span>
                  <input
                    type="email"
                    autoComplete="email"
                    aria-label="Email"
                    placeholder="ada@example.com"
                    className={inputClass}
                    {...field('email')}
                    {...form.register('email')}
                  />
                </div>
                {fieldError('email')}
                <div className="pl-[2ch]">
                  <span className="text-key">message</span>
                  <span className="text-faint">: |</span>
                </div>
                <div className="pl-[4ch]">
                  <textarea
                    rows={6}
                    aria-label="Message"
                    placeholder="Hi Jonathan, …"
                    className={`${inputClass} w-full resize-y border border-dashed px-2 py-1`}
                    {...field('message')}
                    {...form.register('message')}
                  />
                </div>
                {fieldError('message')}
              </div>
            </div>
            {/* Honeypot: invisible to people, irresistible to bots. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Website
                <input type="text" tabIndex={-1} autoComplete="off" {...form.register('website')} />
              </label>
            </div>

            {send.isError && (
              <p role="alert" className="mt-4 border border-err/50 px-4 py-3 text-sm text-err">
                Error from server: {errorMessage(send.error)}
              </p>
            )}
            <Button
              type="submit"
              className="mt-5 normal-case! tracking-normal!"
              disabled={send.isPending}
            >
              {send.isPending ? 'applying…' : '$ kubectl apply -f message.yaml'}
            </Button>
          </form>
        )}
      </div>
    </Container>
  );
}
