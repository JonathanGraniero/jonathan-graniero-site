import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { FormField } from '../components/FormField.tsx';
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

  return (
    <Container className="py-16 sm:py-20">
      <Seo title="Contact" description="Get in touch." />
      <div className="mx-auto max-w-xl">
        <PageHeader eyebrow="// contact" title="Get in touch">
          Questions about a post, an opportunity, or just want to say hi? Send a note and I&apos;ll
          get back to you.
        </PageHeader>

        {send.isSuccess ? (
          <div
            role="status"
            className="mt-10 rounded-xl border border-accent-500/40 bg-accent-50 p-6 dark:bg-accent-900/20"
          >
            <p className="font-medium text-accent-900 dark:text-accent-300">
              Thanks — your message is on its way.
            </p>
            <p className="mt-1 text-sm text-accent-800/80 dark:text-accent-300/70">
              I usually reply within a couple of days.
            </p>
            <Button variant="secondary" className="mt-4" onClick={() => send.reset()}>
              Send another
            </Button>
          </div>
        ) : (
          <form
            className="mt-10 space-y-5"
            noValidate
            onSubmit={form.handleSubmit((values) => send.mutate(values))}
          >
            <FormField label="Name" error={errors.name?.message}>
              <input type="text" autoComplete="name" {...form.register('name')} />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <input type="email" autoComplete="email" {...form.register('email')} />
            </FormField>
            <FormField
              label="Message"
              error={errors.message?.message}
              hint={`${messageLength}/5000`}
            >
              <textarea rows={6} className="resize-y" {...form.register('message')} />
            </FormField>
            {/* Honeypot: invisible to people, irresistible to bots. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Website
                <input type="text" tabIndex={-1} autoComplete="off" {...form.register('website')} />
              </label>
            </div>

            {send.isError && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              >
                {errorMessage(send.error)}
              </p>
            )}
            <Button type="submit" disabled={send.isPending}>
              {send.isPending ? 'Sending…' : 'Send message'}
            </Button>
          </form>
        )}
      </div>
    </Container>
  );
}
