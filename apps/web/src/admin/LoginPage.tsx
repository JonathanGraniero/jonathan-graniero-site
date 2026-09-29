import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { FormField } from '../components/FormField.tsx';
import { Button } from '../components/ui.tsx';
import { api, ApiError } from '../lib/api.ts';
import { queries } from '../lib/queries.ts';
import { loginSchema, type LoginValues } from '../lib/schemas.ts';
import { useCurrentUser } from './useAuth.ts';

/** Only allow redirects back into the admin area (prevents open redirects). */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/admin') && !raw.startsWith('//') ? raw : '/admin';
}

export function LoginPage() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useCurrentUser();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const login = useMutation({
    mutationFn: api.auth.login,
    onSuccess: (user) => {
      queryClient.setQueryData(queries.me().queryKey, user);
      void navigate(next, { replace: true });
    },
  });

  if (me.data) return <Navigate to={next} replace />;

  const { errors } = form.formState;
  return (
    <div className="mx-auto max-w-sm px-5 py-20">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Sign in</h1>
      <p className="mt-2 text-sm text-faint">Admin access for managing posts and profile.</p>
      <form
        className="mt-8 space-y-4"
        noValidate
        onSubmit={form.handleSubmit((v) => login.mutate(v))}
      >
        <FormField label="Email" error={errors.email?.message}>
          <input type="email" autoComplete="username" autoFocus {...form.register('email')} />
        </FormField>
        <FormField label="Password" error={errors.password?.message}>
          <input type="password" autoComplete="current-password" {...form.register('password')} />
        </FormField>
        {login.isError && (
          <p role="alert" className="bg-err px-3 py-2 text-sm text-err">
            {login.error instanceof ApiError && login.error.status === 429
              ? 'Too many attempts. Wait a minute and try again.'
              : login.error.message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
