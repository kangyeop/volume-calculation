import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api } from '@/lib/api';
import { shipments, productGroups, products, boxGroups } from './queries/queryKeys';

export function usePrefetchShipmentDetail() {
  const queryClient = useQueryClient();
  return useCallback(
    (id: string) => {
      queryClient.prefetchQuery({
        ...shipments.configurationSummary(id),
        queryFn: () => api.shipments.configurationSummary(id),
      });
    },
    [queryClient],
  );
}

export function usePrefetchProductGroup() {
  const queryClient = useQueryClient();
  return useCallback(
    (id: string) => {
      queryClient.prefetchQuery({
        ...productGroups.detail(id),
        queryFn: () => api.productGroups.get(id),
      });
      queryClient.prefetchQuery({
        ...products.byGroup(id),
        queryFn: () => api.products.listByGroup(id),
      });
    },
    [queryClient],
  );
}

export function usePrefetchBoxGroup() {
  const queryClient = useQueryClient();
  return useCallback(
    (id: string) => {
      queryClient.prefetchQuery({
        ...boxGroups.detail(id),
        queryFn: () => api.boxGroups.get(id),
      });
    },
    [queryClient],
  );
}
