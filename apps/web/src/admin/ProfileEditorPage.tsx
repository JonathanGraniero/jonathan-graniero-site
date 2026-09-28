import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Profile, UpdateProfileInput } from '@site/shared';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { FormField } from '../components/FormField.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { Button, Container, ErrorState, Skeleton } from '../components/ui.tsx';
import { api } from '../lib/api.ts';
import { queries, useProfile } from '../lib/queries.ts';
import { profileSchema, type ProfileFormValues } from '../lib/schemas.ts';

const toForm = (p: Profile): ProfileFormValues => ({
  name: p.name,
  headline: p.headline,
  bio: p.bio,
  location: p.location,
  avatarUrl: p.avatarUrl ?? '',
  resumeUrl: p.resumeUrl ?? '',
  github: p.social.github ?? '',
  linkedin: p.social.linkedin ?? '',
  website: p.social.website ?? '',
  email: p.social.email ?? '',
});

const toInput = ({
  github,
  linkedin,
  website,
  email,
  ...rest
}: ProfileFormValues): UpdateProfileInput => ({
  ...rest,
  avatarUrl: rest.avatarUrl || null,
  resumeUrl: rest.resumeUrl || null,
  social: {
    github: github || null,
    linkedin: linkedin || null,
    website: website || null,
    email: email || null,
  },
});

export function ProfileEditorPage() {
  const profile = useProfile();
  if (profile.isPending) {
    return (
      <Container className="max-w-3xl py-10">
        <Skeleton className="h-96" />
      </Container>
    );
  }
  if (profile.isError) {
    return (
      <Container className="max-w-3xl py-10">
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      </Container>
    );
  }
  return <ProfileForm profile={profile.data} />;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const [previewBio, setPreviewBio] = useState(false);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toForm(profile),
  });
  const { errors, isDirty } = form.formState;
  const bio = useWatch({ control: form.control, name: 'bio' });

  const save = useMutation({
    mutationFn: (v: ProfileFormValues) => api.admin.updateProfile(toInput(v)),
    onSuccess: (saved) => {
      queryClient.setQueryData(queries.profile().queryKey, saved);
      form.reset(toForm(saved));
    },
  });

  return (
    <Container className="max-w-3xl py-10">
      <form noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Profile
          </h1>
          <div className="flex items-center gap-3">
            {!isDirty && save.isSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
            )}
            <Button type="submit" disabled={!isDirty || save.isPending}>
              {save.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
        {save.isError && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            {save.error.message}
          </p>
        )}

        <fieldset className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900">
          <legend className="px-1 text-sm font-semibold text-zinc-500">Basics</legend>
          <FormField label="Name" error={errors.name?.message}>
            <input {...form.register('name')} />
          </FormField>
          <FormField label="Location" error={errors.location?.message}>
            <input {...form.register('location')} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField
              label="Headline"
              error={errors.headline?.message}
              hint="One line shown on the home page hero."
            >
              <input {...form.register('headline')} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="bio" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Bio (markdown)
              </label>
              <button
                type="button"
                onClick={() => setPreviewBio((p) => !p)}
                className="text-xs font-medium text-accent-700 hover:underline dark:text-accent-400"
              >
                {previewBio ? 'Edit' : 'Preview'}
              </button>
            </div>
            {previewBio ? (
              <div className="min-h-40 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <Markdown>{bio}</Markdown>
              </div>
            ) : (
              <textarea
                id="bio"
                rows={8}
                {...form.register('bio')}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 dark:border-zinc-700 dark:bg-zinc-900"
              />
            )}
          </div>
        </fieldset>

        <fieldset className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900">
          <legend className="px-1 text-sm font-semibold text-zinc-500">Links</legend>
          <FormField label="Public email" error={errors.email?.message}>
            <input type="email" {...form.register('email')} />
          </FormField>
          <FormField label="Website" error={errors.website?.message}>
            <input type="url" {...form.register('website')} />
          </FormField>
          <FormField label="GitHub" error={errors.github?.message}>
            <input type="url" {...form.register('github')} />
          </FormField>
          <FormField label="LinkedIn" error={errors.linkedin?.message}>
            <input type="url" {...form.register('linkedin')} />
          </FormField>
          <FormField label="Résumé URL" error={errors.resumeUrl?.message}>
            <input type="url" {...form.register('resumeUrl')} />
          </FormField>
          <FormField label="Avatar URL" error={errors.avatarUrl?.message}>
            <input type="url" {...form.register('avatarUrl')} />
          </FormField>
        </fieldset>
      </form>
    </Container>
  );
}
