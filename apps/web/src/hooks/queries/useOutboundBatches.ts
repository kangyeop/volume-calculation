import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api, type OutboundBatch } from '@/lib/api';
import { outboundBatches } from './queryKeys';
import type { Outbound } from '@wms/types';

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

export type { Outbound };
