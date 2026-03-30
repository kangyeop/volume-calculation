import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { packing } from './queryKeys';
import type { BoxSortStrategy, PackingRecommendation, PackingResult3D } from '@/types';

export function usePackingHistory(batchId: string) {
  return useQuery({
    ...packing.history(batchId),
    queryFn: () => api.packing.history(batchId),
    enabled: !!batchId,
  });
}

export function usePackingRecommendation(batchId: string) {
  return useQuery({
    queryKey: packing.recommendation(batchId).queryKey,
    queryFn: () => api.packing.recommendation(batchId),
    enabled: !!batchId,
  });
}

export function useCalculatePacking(): UseMutationResult<
  PackingRecommendation,
  Error,
  { batchId: string; strategy?: BoxSortStrategy }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, strategy }) =>
      api.packing.calculate(batchId, strategy),
    onSuccess: (_, { batchId }) => {
      queryClient.invalidateQueries({ queryKey: packing.history(batchId).queryKey });
      queryClient.invalidateQueries({ queryKey: packing.recommendation(batchId).queryKey });
    },
  });
}

export function useCalculateOrderPacking(): UseMutationResult<
  PackingResult3D,
  Error,
  { batchId: string; orderId: string; groupLabel?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, orderId, groupLabel }) =>
      api.packing.calculateOrder(batchId, orderId, groupLabel),
    onSuccess: (_, { batchId }) => {
      queryClient.invalidateQueries({ queryKey: packing.historyByBatch(batchId).queryKey });
    },
  });
}

export function useUpdateBoxAssignment(): UseMutationResult<
  PackingRecommendation,
  Error,
  { batchId: string; items: { groupIndex: number; boxIndex: number }[]; newBoxId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, items, newBoxId }) =>
      api.packing.updateBoxAssignment(batchId, { items, newBoxId }),
    onSuccess: (_, { batchId }) => {
      queryClient.invalidateQueries({ queryKey: packing.recommendation(batchId).queryKey });
    },
  });
}

export function useConfirmShipment(): UseMutationResult<{ success: boolean }, Error, { batchId: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId }) => api.shipments.confirm(batchId),
    onSuccess: (_, { batchId }) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: packing.recommendation(batchId).queryKey });
    },
  });
}

export function useUnconfirmShipment(): UseMutationResult<{ success: boolean }, Error, { batchId: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId }) => api.shipments.unconfirm(batchId),
    onSuccess: (_, { batchId }) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: packing.recommendation(batchId).queryKey });
    },
  });
}
