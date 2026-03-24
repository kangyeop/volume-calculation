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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: shipments.all.queryKey });
      const previous = queryClient.getQueryData<Shipment[]>(shipments.all.queryKey);
      queryClient.setQueryData<Shipment[]>(shipments.all.queryKey, (old) =>
        old?.filter((s) => s.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(shipments.all.queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: shipments.all.queryKey });
    },
  });
}

export function useUpdateShipmentNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string | null }) => api.shipments.updateNote(id, note),
    onSuccess: (_, { id }: { id: string; note: string | null }) => {
      queryClient.invalidateQueries({ queryKey: shipments.all.queryKey });
      queryClient.invalidateQueries({ queryKey: shipments.detail(id).queryKey });
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
