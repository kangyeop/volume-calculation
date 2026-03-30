import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { orderItems } from './queryKeys';
import type { Outbound } from '@/types';

export function useOrderItems(projectId: string) {
  return useQuery({
    ...orderItems.all(projectId),
    queryFn: () => api.orderItems.list(projectId),
    enabled: !!projectId,
  });
}

export function useCreateOrderItem(
  projectId: string,
): UseMutationResult<Outbound, Error, Omit<Outbound, 'id' | 'projectId' | 'createdAt'>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.orderItems.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderItems.all(projectId).queryKey });
    },
  });
}

export function useCreateOrderItems(
  projectId: string,
): UseMutationResult<void, Error, Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.orderItems.createBulk(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderItems.all(projectId).queryKey });
    },
  });
}

export function useCreateOrderItemsWithFile(
  projectId: string,
): UseMutationResult<
  void,
  Error,
  { file: File; createOrderItemDtos: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, createOrderItemDtos }) =>
      api.orderItems.createBulkWithFile(projectId, file, createOrderItemDtos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderItems.all(projectId).queryKey });
    },
  });
}

export function useDeleteOrderItems(projectId: string): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.orderItems.deleteAll(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderItems.all(projectId).queryKey });
    },
  });
}
