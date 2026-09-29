import type {
  ApiError as ApiErrorBody,
  AuthUser,
  ContactInput,
  ContactMessage,
  ContactReceipt,
  CreatePostInput,
  Experience,
  LoginInput,
  MessageListQuery,
  MessageStats,
  Paginated,
  PostDetail,
  PostListQuery,
  PostStatus,
  PostSummary,
  Profile,
  Project,
  Skill,
  TagWithCount,
  UpdatePostInput,
  UpdateProfileInput,
} from '@site/shared';

const BASE = '/api';

/** Error thrown for any non-2xx response, carrying the server's message. */
export class ApiError extends Error {
  readonly status: number;
  readonly details: string[];

  constructor(status: number, message: string | string[]) {
    const details = Array.isArray(message) ? message : [message];
    super(details.join('. '));
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as Partial<ApiErrorBody> | null;
    throw new ApiError(res.status, body?.message ?? res.statusText);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const json = (body: unknown) => JSON.stringify(body);

export function toSearch(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export const api = {
  posts: {
    list: (q: PostListQuery = {}, signal?: AbortSignal) =>
      http<Paginated<PostSummary>>(`/posts${toSearch(q)}`, { signal }),
    get: (slug: string, signal?: AbortSignal) =>
      http<PostDetail>(`/posts/${encodeURIComponent(slug)}`, { signal }),
  },
  tags: {
    list: () => http<TagWithCount[]>('/tags'),
  },
  profile: {
    get: () => http<Profile>('/profile'),
    experience: () => http<Experience[]>('/experience'),
    skills: () => http<Skill[]>('/skills'),
    projects: (featured?: boolean) => http<Project[]>(`/projects${toSearch({ featured })}`),
  },
  contact: {
    send: (input: ContactInput) =>
      http<ContactReceipt>('/contact', { method: 'POST', body: json(input) }),
  },
  auth: {
    me: () => http<AuthUser>('/auth/me'),
    login: (input: LoginInput) =>
      http<AuthUser>('/auth/login', { method: 'POST', body: json(input) }),
    logout: () => http<void>('/auth/logout', { method: 'POST' }),
  },
  admin: {
    posts: {
      list: (q: PostListQuery & { status?: PostStatus } = {}) =>
        http<Paginated<PostSummary>>(`/admin/posts${toSearch(q)}`),
      get: (id: string) => http<PostDetail>(`/admin/posts/${id}`),
      create: (input: CreatePostInput) =>
        http<PostDetail>('/admin/posts', { method: 'POST', body: json(input) }),
      update: (id: string, input: UpdatePostInput) =>
        http<PostDetail>(`/admin/posts/${id}`, { method: 'PATCH', body: json(input) }),
      remove: (id: string) => http<void>(`/admin/posts/${id}`, { method: 'DELETE' }),
    },
    messages: {
      list: (q: MessageListQuery = {}) =>
        http<Paginated<ContactMessage>>(`/admin/messages${toSearch(q)}`),
      stats: () => http<MessageStats>('/admin/messages/stats'),
      setRead: (id: string, read: boolean) =>
        http<ContactMessage>(`/admin/messages/${id}`, { method: 'PATCH', body: json({ read }) }),
      remove: (id: string) => http<void>(`/admin/messages/${id}`, { method: 'DELETE' }),
    },
    updateProfile: (input: UpdateProfileInput) =>
      http<Profile>('/admin/profile', { method: 'PATCH', body: json(input) }),
  },
};
