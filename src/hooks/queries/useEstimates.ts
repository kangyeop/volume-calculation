import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { estimates } from './queryKeys';
import type { Estimate } from '@/types';

export function useEstimates(search?: string) {
  return useQuery({
    ...estimates.search(search ?? ''),
    queryFn: () => api.estimates.list(search),
  });
}

export function useUploadEstimate(): UseMutationResult<Estimate, Error, { name: string; file: File }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, file }) => api.estimates.upload(name, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estimates._def });
    },
  });
}

export function useDeleteEstimate(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.estimates.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estimates._def });
    },
  });
}

export function useEstimateSignedUrl(id: string) {
  return useQuery({
    ...estimates.signedUrl(id),
    queryFn: () => api.estimates.getSignedUrl(id),
    enabled: !!id,
    staleTime: 4 * 60 * 1000,
  });
}
