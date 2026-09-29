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
          <h1 className="text-2xl font-bold tracking-tight text-ink">Profile</h1>
          <div className="flex items-center gap-3">
            {!isDirty && save.isSuccess && <span className="text-xs text-ok">Saved</span>}
            <Button type="submit" disabled={!isDirty || save.isPending}>
              {save.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
        {save.isError && (
          <p role="alert" className="bg-err px-4 py-2 text-sm text-err">
            {save.error.message}
          </p>
        )}

        <fieldset className="grid gap-4 border border-line bg-panel p-6 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold text-faint">Basics</legend>
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
              <label htmlFor="bio" className="text-sm font-medium text-ink">
                Bio (markdown)
              </label>
              <button
                type="button"
                onClick={() => setPreviewBio((p) => !p)}
                className="text-xs font-medium text-signal hover:underline"
              >
                {previewBio ? 'Edit' : 'Preview'}
              </button>
            </div>
            {previewBio ? (
              <div className="min-h-40 border border-line p-4">
                <Markdown>{bio}</Markdown>
              </div>
            ) : (
              <textarea
                id="bio"
                rows={8}
                {...form.register('bio')}
                className="w-full border border-line bg-panel px-3 py-2 font-mono text-sm focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/30"
              />
            )}
          </div>
        </fieldset>

        <fieldset className="grid gap-4 border border-line bg-panel p-6 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold text-faint">Links</legend>
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
