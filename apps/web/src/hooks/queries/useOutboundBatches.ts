import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api, type OutboundBatch } from '@/lib/api';
import { outboundBatches } from './queryKeys';
import type { Outbound } from '@/types';

export function useOutboundBatches() {
  return useQuery({
    ...outboundBatches.all,
    queryFn: () => api.outboundBatches.list(),
  });
}

export function useOutboundBatch(id: string) {
  return useQuery({
    ...outboundBatches.detail(id),
    queryFn: () => api.outboundBatches.get(id),
    enabled: !!id,
  });
}

export function useOutboundBatchOutbounds(batchId: string) {
  return useQuery({
    ...outboundBatches.outbounds(batchId),
    queryFn: () => api.outboundBatches.listOutbounds(batchId),
    enabled: !!batchId,
  });
}

export function useInfiniteOutboundBatchOutbounds(batchId: string) {
  return useInfiniteQuery({
    queryKey: outboundBatches.infiniteOutbounds(batchId).queryKey,
    queryFn: ({ pageParam }) =>
      api.outboundBatches.listOutboundsPaginated(batchId, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.limit < lastPage.totalOrders ? lastPage.page + 1 : undefined,
    enabled: !!batchId,
  });
}

export function useUploadOutboundBatch(): UseMutationResult<OutboundBatch, Error, File> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => api.outboundBatches.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outboundBatches.all.queryKey });
    },
  });
}

export function useDeleteOutboundBatch(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.outboundBatches.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outboundBatches.all.queryKey });
    },
  });
}

export function useConfigurationSummary(batchId: string) {
  return useQuery({
    ...outboundBatches.configurationSummary(batchId),
    queryFn: () => api.outboundBatches.configurationSummary(batchId),
    enabled: !!batchId,
  });
}

export type { Outbound };
