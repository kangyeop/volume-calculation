import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { projects } from './queryKeys';
import type { Project } from '@wms/types';

export function useProjects() {
  return useQuery({
    ...projects.all,
    queryFn: () => api.projects.list(),
  });
}

export function useProject(id: string) {
  return useQuery({
    ...projects.detail(id),
    queryFn: () => api.projects.get(id),
    enabled: !!id,
  });
}

export function useCreateProject(): UseMutationResult<
  Project,
  Error,
  { name: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name }) => api.projects.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projects.all.queryKey });
    },
  });
}

export function useDeleteProject(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projects.all.queryKey });
    },
  });
}
