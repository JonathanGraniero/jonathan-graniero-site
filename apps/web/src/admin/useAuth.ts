import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api } from '../lib/api.ts';
import { queries } from '../lib/queries.ts';

export function useCurrentUser() {
  return useQuery(queries.me());
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: api.auth.logout,
    onSettled: () => {
      queryClient.removeQueries({ queryKey: ['auth'] });
      queryClient.removeQueries({ queryKey: ['admin'] });
      void navigate('/admin/login', { replace: true });
    },
  });
}
