import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api, type Shipment, type SettlementUploadResult } from '@/lib/api';
import { settlements } from './queryKeys';

export function useSettlements() {
  return useQuery({
    ...settlements.all,
    queryFn: () => api.settlements.list(),
  });
}

export function useSettlementDetail(id: string) {
  return useQuery({
    ...settlements.detail(id),
    queryFn: () => api.settlements.get(id),
    enabled: !!id,
  });
}

export function useUploadSettlement(): UseMutationResult<SettlementUploadResult, Error, File> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => api.settlements.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settlements.all.queryKey });
    },
  });
}

export function useDeleteSettlement(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.settlements.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: settlements.all.queryKey });
      const previous = queryClient.getQueryData<Shipment[]>(settlements.all.queryKey);
      queryClient.setQueryData<Shipment[]>(settlements.all.queryKey, (old) =>
        old?.filter((s) => s.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settlements.all.queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: settlements.all.queryKey });
    },
  });
}

export function useAssignBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ settlementId, orderId, boxId }: { settlementId: string; orderId: string; boxId: string }) =>
      api.settlements.assignBox(settlementId, orderId, boxId),
    onSuccess: (_, { settlementId }) => {
      queryClient.invalidateQueries({ queryKey: settlements.detail(settlementId).queryKey });
    },
  });
}

export function useConfirmSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.settlements.confirm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: settlements.all.queryKey });
      queryClient.invalidateQueries({ queryKey: settlements.detail(id).queryKey });
    },
  });
}

export function useUnconfirmSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.settlements.unconfirm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: settlements.all.queryKey });
      queryClient.invalidateQueries({ queryKey: settlements.detail(id).queryKey });
    },
  });
}

export function useAutoPackUnmatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.settlements.autoPackUnmatched(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: settlements.detail(id).queryKey });
    },
  });
}

export function useSettlementPackingRecommendation(id: string) {
  return useQuery({
    ...settlements.packingRecommendation(id),
    queryFn: () => api.settlements.packing.recommendation(id),
    enabled: !!id,
  });
}

export function useCalculateSettlementPacking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, strategy }: { id: string; strategy?: string }) =>
      api.settlements.packing.calculate(id, strategy),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: settlements.packingRecommendation(id).queryKey });
      queryClient.invalidateQueries({ queryKey: settlements.detail(id).queryKey });
    },
  });
}

export function useUpdateSettlementBoxAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, items, newBoxId }: { id: string; items: { groupIndex: number; boxIndex: number }[]; newBoxId: string }) =>
      api.settlements.packing.updateBoxAssignment(id, { items, newBoxId }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: settlements.packingRecommendation(id).queryKey });
    },
  });
}

export function useExportSettlementPacking() {
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.settlements.packing.export(id),
  });
}
