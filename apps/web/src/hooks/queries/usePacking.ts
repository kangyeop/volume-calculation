import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
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

export function useExportPacking(): UseMutationResult<
  void,
  Error,
  { projectId: string }
> {
  return useMutation({
    mutationFn: ({ projectId }) => api.packing.export(projectId),
  });
}
