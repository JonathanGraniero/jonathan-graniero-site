import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatePostInput, PostDetail } from '@site/shared';
import clsx from 'clsx';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';
import { FormField } from '../components/FormField.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { Button, Container, ErrorState, Skeleton } from '../components/ui.tsx';
import { api } from '../lib/api.ts';
import { queries } from '../lib/queries.ts';
import { postSchema, type PostFormValues } from '../lib/schemas.ts';
import { TagInput } from './TagInput.tsx';

const EMPTY: PostFormValues = {
  title: '',
  slug: '',
  excerpt: '',
  contentMd: '',
  coverImage: '',
  tags: [],
  status: 'DRAFT',
};

const toForm = (p: PostDetail): PostFormValues => ({
  title: p.title,
  slug: p.slug,
  excerpt: p.excerpt,
  contentMd: p.contentMd,
  coverImage: p.coverImage ?? '',
  tags: p.tags.map((t) => t.name),
  status: p.status,
});

const toInput = (v: PostFormValues): CreatePostInput => ({
  ...v,
  slug: v.slug || undefined,
  coverImage: v.coverImage || null,
});

export function PostEditorPage() {
  const { id } = useParams();
  const existing = useQuery({ ...queries.adminPost(id ?? ''), enabled: Boolean(id) });

  if (id && existing.isPending) {
    return (
      <Container className="max-w-6xl space-y-4 py-10">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96" />
      </Container>
    );
  }
  if (id && existing.isError) {
    return (
      <Container className="max-w-6xl py-10">
        <ErrorState error={existing.error} onRetry={() => void existing.refetch()} />
      </Container>
    );
  }
  // Keyed so switching between posts fully resets form state.
  return <PostEditor key={id ?? 'new'} post={existing.data} />;
}

function PostEditor({ post }: { post: PostDetail | undefined }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tags = useQuery(queries.tags());
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: post ? toForm(post) : EMPTY,
  });
  const { errors, isDirty } = form.formState;
  // Set right after a successful save: `isDirty` only clears on the next render,
  // so the blocker below would otherwise trap the post-create redirect.
  const justSaved = useRef(false);

  const save = useMutation({
    mutationFn: (values: PostFormValues) =>
      post
        ? api.admin.posts.update(post.id, toInput(values))
        : api.admin.posts.create(toInput(values)),
    onSuccess: (saved) => {
      queryClient.setQueryData(queries.adminPost(saved.id).queryKey, saved);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
      form.reset(toForm(saved));
      if (!post) {
        justSaved.current = true;
        void navigate(`/admin/posts/${saved.id}`, { replace: true });
      }
    },
  });

  const onSubmit = form.handleSubmit((values) => save.mutate(values));

  // ⌘/Ctrl+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void onSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSubmit]);

  // Guard unsaved changes: in-app navigation and tab close.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !justSaved.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // Rendering markdown is the expensive part; let typing stay responsive.
  const [contentMd, title, status] = useWatch({
    control: form.control,
    name: ['contentMd', 'title', 'status'],
  });
  const content = useDeferredValue(contentMd);

  return (
    <Container className="max-w-6xl py-8">
      <form onSubmit={onSubmit} noValidate>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ← Posts
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {post ? 'Edit post' : 'New post'}
            </h1>
            {isDirty && (
              <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>
            )}
            {!isDirty && save.isSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    role="switch"
                    className="peer sr-only"
                    checked={field.value === 'PUBLISHED'}
                    onChange={(e) => field.onChange(e.target.checked ? 'PUBLISHED' : 'DRAFT')}
                  />
                  <span
                    aria-hidden
                    className="relative h-5 w-9 rounded-full bg-zinc-300 transition peer-checked:bg-accent-600 peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500 after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4 dark:bg-zinc-700"
                  />
                  Published
                </label>
              )}
            />
            {post?.status === 'PUBLISHED' && (
              <Link
                to={`/blog/${post.slug}`}
                className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                View ↗
              </Link>
            )}
            <Button type="submit" disabled={save.isPending} title="Save (⌘S)">
              {save.isPending
                ? 'Saving…'
                : status === 'PUBLISHED'
                  ? post?.status === 'PUBLISHED'
                    ? 'Update'
                    : 'Publish'
                  : 'Save draft'}
            </Button>
          </div>
        </div>

        {save.isError && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            {save.error.message}
          </p>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FormField label="Title" error={errors.title?.message}>
            <input type="text" {...form.register('title')} />
          </FormField>
          <FormField
            label="Slug"
            error={errors.slug?.message}
            hint="Leave blank to generate from the title."
          >
            <input
              type="text"
              className="font-mono"
              placeholder="auto"
              {...form.register('slug')}
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField
              label="Excerpt"
              error={errors.excerpt?.message}
              hint="Shown in post lists, RSS and search results."
            >
              <textarea rows={2} {...form.register('excerpt')} />
            </FormField>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Tags
            </span>
            <Controller
              control={form.control}
              name="tags"
              render={({ field }) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  suggestions={tags.data?.map((t) => t.name)}
                />
              )}
            />
            {errors.tags && <p className="mt-1.5 text-xs text-red-600">{errors.tags.message}</p>}
          </div>
          <FormField label="Cover image URL" error={errors.coverImage?.message}>
            <input type="url" placeholder="https://…" {...form.register('coverImage')} />
          </FormField>
        </div>

        <div className="mt-6">
          <div role="tablist" aria-label="Editor view" className="mb-2 flex gap-1 lg:hidden">
            {(['write', 'preview'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={clsx(
                  'rounded-md px-3 py-1 text-sm font-medium capitalize',
                  tab === t
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-500',
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={clsx(tab === 'preview' && 'hidden lg:block')}>
              <label htmlFor="content" className="sr-only">
                Content (markdown)
              </label>
              <textarea
                id="content"
                {...form.register('contentMd')}
                aria-invalid={errors.contentMd ? true : undefined}
                spellCheck
                placeholder="Write in markdown…"
                className={clsx(
                  'h-[65vh] w-full resize-none rounded-xl border bg-white p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 dark:bg-zinc-900',
                  errors.contentMd
                    ? 'border-red-400 focus:ring-red-500/30'
                    : 'border-zinc-300 focus:border-accent-500 focus:ring-accent-500/30 dark:border-zinc-700',
                )}
              />
              {errors.contentMd && (
                <p className="mt-1 text-xs text-red-600">{errors.contentMd.message}</p>
              )}
            </div>
            <section
              aria-label="Preview"
              className={clsx(
                'h-[65vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950',
                tab === 'write' && 'hidden lg:block',
              )}
            >
              {title && (
                <h1 className="mb-6 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {title}
                </h1>
              )}
              {content ? (
                <Markdown>{content}</Markdown>
              ) : (
                <p className="text-sm text-zinc-400">Nothing to preview yet.</p>
              )}
            </section>
          </div>
        </div>
      </form>

      {blocker.state === 'blocked' && (
        <div
          role="alertdialog"
          aria-labelledby="unsaved-title"
          className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          <p id="unsaved-title" className="text-sm font-medium">
            You have unsaved changes.
          </p>
          <Button variant="secondary" onClick={() => blocker.reset()} autoFocus>
            Stay
          </Button>
          <Button variant="danger" onClick={() => blocker.proceed()}>
            Discard &amp; leave
          </Button>
        </div>
      )}
    </Container>
  );
}
