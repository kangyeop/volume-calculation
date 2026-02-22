import { useMutation, useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { outbounds } from './queryKeys';
import type { Outbound } from '@wms/types';

export function useOutbounds(projectId: string) {
  return useQuery({
    ...outbounds.all(projectId),
    queryFn: () => api.outbound.list(projectId),
    enabled: !!projectId,
  });
}

export function useBatches(projectId: string) {
  return useQuery({
    ...outbounds.batches(projectId),
    queryFn: () => api.outbound.listBatches(projectId),
    enabled: !!projectId,
  });
}

export function useCreateOutbound(projectId: string): UseMutationResult<Outbound, Error, Omit<Outbound, 'id' | 'projectId' | 'createdAt'>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.outbound.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outbounds.all._def });
    },
  });
}

export function useCreateOutbounds(projectId: string): UseMutationResult<void, Error, Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.outbound.createBulk(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outbounds.all._def });
      queryClient.invalidateQueries({ queryKey: outbounds.batches._def });
    },
  });
}

export function useCreateOutboundsWithFile(projectId: string): UseMutationResult<void, Error, { file: File; createOutboundDtos: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[] }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, createOutboundDtos }) => api.outbound.createBulkWithFile(projectId, file, createOutboundDtos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outbounds.all._def });
      queryClient.invalidateQueries({ queryKey: outbounds.batches._def });
    },
  });
}

export function useDeleteOutbounds(projectId: string): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.outbound.deleteAll(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outbounds.all._def });
      queryClient.invalidateQueries({ queryKey: outbounds.batches._def });
    },
  });
}
