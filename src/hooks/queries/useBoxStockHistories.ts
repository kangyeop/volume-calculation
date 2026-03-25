import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { boxes } from './queryKeys';
import type { StockChangeType } from '@/types';

export function useBoxStockHistories(boxId: string) {
  return useQuery({
    ...boxes.stockHistories(boxId),
    queryFn: () => api.boxes.stockHistories(boxId),
  });
}

export function useCreateStockHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boxId, data }: { boxId: string; data: { type: StockChangeType; quantity: number; note?: string } }) =>
      api.boxes.createStockHistory(boxId, data),
    onSuccess: (_result, { boxId }) => {
      queryClient.invalidateQueries({ queryKey: boxes.stockHistories(boxId).queryKey });
      queryClient.invalidateQueries({ queryKey: boxes.all.queryKey });
      queryClient.invalidateQueries({ queryKey: boxes.unassigned.queryKey });
    },
  });
}
