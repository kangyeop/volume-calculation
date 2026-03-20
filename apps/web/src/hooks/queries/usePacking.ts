import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { packing } from './queryKeys';
import type { PackingGroupingOption, PackingRecommendation, PackingResult3D } from '@wms/types';

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
  { batchId: string; groupingOption?: string; boxGroupId?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, groupingOption, boxGroupId }) =>
      api.packing.calculate(batchId, groupingOption as PackingGroupingOption, boxGroupId),
    onSuccess: (_, { batchId }) => {
      queryClient.invalidateQueries({ queryKey: packing.history._def });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packing.history._def });
      queryClient.invalidateQueries({ queryKey: packing.details._def });
    },
  });
}

export function useUpdateBoxAssignment(): UseMutationResult<
  PackingRecommendation,
  Error,
  { batchId: string; groupIndex: number; boxIndex: number; newBoxId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, groupIndex, boxIndex, newBoxId }) =>
      api.packing.updateBoxAssignment(batchId, { groupIndex, boxIndex, newBoxId }),
    onSuccess: (_, { batchId }) => {
      queryClient.invalidateQueries({ queryKey: packing.recommendation(batchId).queryKey });
    },
  });
}

export function useExportPacking(): UseMutationResult<void, Error, { batchId: string }> {
  return useMutation({
    mutationFn: ({ batchId }) => api.packing.export(batchId),
  });
}

export function usePackingDetails(batchId: string) {
  return useQuery({
    ...packing.details(batchId),
    queryFn: () => api.packing.details(batchId),
    enabled: !!batchId,
  });
}
