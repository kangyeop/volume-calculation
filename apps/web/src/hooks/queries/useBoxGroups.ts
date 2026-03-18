import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { boxGroups } from './queryKeys';
import type { BoxGroup } from '@wms/types';

export function useBoxGroups() {
  return useQuery({
    ...boxGroups.all,
    queryFn: () => api.boxGroups.list(),
  });
}

export function useBoxGroup(id: string) {
  return useQuery({
    ...boxGroups.detail(id),
    queryFn: () => api.boxGroups.get(id),
    enabled: !!id,
  });
}

export function useCreateBoxGroup(): UseMutationResult<BoxGroup, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => api.boxGroups.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boxGroups.all.queryKey });
    },
  });
}

export function useDeleteBoxGroup(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.boxGroups.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boxGroups.all.queryKey });
    },
  });
}
