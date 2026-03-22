import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api, type Shipment } from '@/lib/api';
import { shipments } from './queryKeys';
import type { Outbound, ShipmentUploadResult } from '@/types';

export function useShipments() {
  return useQuery({
    ...shipments.all,
    queryFn: () => api.shipments.list(),
  });
}

export function useShipment(id: string) {
  return useQuery({
    ...shipments.detail(id),
    queryFn: () => api.shipments.get(id),
    enabled: !!id,
  });
}

export function useShipmentOrderItems(shipmentId: string) {
  return useQuery({
    ...shipments.orderItems(shipmentId),
    queryFn: () => api.shipments.listOrderItems(shipmentId),
    enabled: !!shipmentId,
  });
}

export function useInfiniteShipmentOrderItems(shipmentId: string) {
  return useInfiniteQuery({
    queryKey: shipments.infiniteOrderItems(shipmentId).queryKey,
    queryFn: ({ pageParam }) =>
      api.shipments.listOrderItemsPaginated(shipmentId, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.limit < lastPage.totalOrders ? lastPage.page + 1 : undefined,
    enabled: !!shipmentId,
  });
}

export function useUploadShipment(): UseMutationResult<ShipmentUploadResult, Error, { file: File; format: 'adjustment' | 'beforeMapping' | 'afterMapping' }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, format }) => api.shipments.upload(file, format),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shipments.all.queryKey });
    },
  });
}

export function useDeleteShipment(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.shipments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shipments.all.queryKey });
    },
  });
}

export function useConfigurationSummary(shipmentId: string) {
  return useQuery({
    ...shipments.configurationSummary(shipmentId),
    queryFn: () => api.shipments.configurationSummary(shipmentId),
    enabled: !!shipmentId,
  });
}

export type { Outbound };
