import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { packing } from './queryKeys';
import type { PackingGroupingOption, PackingRecommendation, PackingResult3D } from '@wms/types';

export function usePackingHistory(projectId: string) {
  return useQuery({
    ...packing.history(projectId),
    queryFn: () => api.packing.history(projectId),
    enabled: !!projectId,
  });
}

export function usePackingHistoryByBatch(batchId: string) {
  return useQuery({
    ...packing.historyByBatch(batchId),
    queryFn: () => api.packing.historyByBatch(batchId),
    enabled: !!batchId,
  });
}

export function useCalculatePacking(): UseMutationResult<
  PackingRecommendation,
  Error,
  { projectId: string; groupingOption?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, groupingOption }) =>
      api.packing.calculate(projectId, groupingOption as PackingGroupingOption),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packing.history._def });
    },
  });
}

export function useCalculatePackingByBatch(): UseMutationResult<
  PackingRecommendation,
  Error,
  { batchId: string; groupingOption?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, groupingOption }) =>
      api.packing.calculateByBatch(batchId, groupingOption as PackingGroupingOption),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packing.historyByBatch._def });
    },
  });
}

export function useCalculateOrderPacking(): UseMutationResult<
  PackingResult3D,
  Error,
  { projectId: string; orderId: string; groupLabel?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, orderId, groupLabel }) =>
      api.packing.calculateOrder(projectId, orderId, groupLabel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packing.history._def });
      queryClient.invalidateQueries({ queryKey: packing.details._def });
    },
  });
}

export function useExportPacking(): UseMutationResult<void, Error, { projectId: string }> {
  return useMutation({
    mutationFn: ({ projectId }) => api.packing.export(projectId),
  });
}

export function useExportPackingByBatch(): UseMutationResult<void, Error, { batchId: string }> {
  return useMutation({
    mutationFn: ({ batchId }) => api.packing.exportByBatch(batchId),
  });
}

export function usePackingDetails(projectId: string) {
  return useQuery({
    ...packing.details(projectId),
    queryFn: () => api.packing.details(projectId),
    enabled: !!projectId,
  });
}

export function usePackingDetailsByBatch(batchId: string) {
  return useQuery({
    ...packing.detailsByBatch(batchId),
    queryFn: () => api.packing.detailsByBatch(batchId),
    enabled: !!batchId,
  });
}
