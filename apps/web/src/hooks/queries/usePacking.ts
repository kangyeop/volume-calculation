import { useMutation, useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { packing } from './queryKeys';
import type { PackingGroupingOption, PackingRecommendation } from '@wms/types';

export function usePackingHistory(projectId: string) {
  return useQuery({
    ...packing.history(projectId),
    queryFn: () => api.packing.history(projectId),
    enabled: !!projectId,
  });
}

export function useCalculatePacking(): UseMutationResult<PackingRecommendation, Error, { projectId: string; groupingOption?: string; batchId?: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, groupingOption, batchId }) => api.packing.calculate(projectId, groupingOption as PackingGroupingOption, batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packing.history._def });
    },
  });
}

export function useExportPacking(): UseMutationResult<void, Error, { projectId: string; batchId?: string }> {
  return useMutation({
    mutationFn: ({ projectId, batchId }) => api.packing.export(projectId, batchId!),
  });
}
