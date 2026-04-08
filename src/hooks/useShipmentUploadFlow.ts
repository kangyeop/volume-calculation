'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Shipment } from '@/lib/api';
import { shipments } from './queries/queryKeys';
import type { ShipmentUploadResult, ColumnMapping } from '@/types';

export function useShipmentUploadFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, mapping }: { file: File; mapping: ColumnMapping }) =>
      api.shipments.upload(file, mapping),
    onSuccess: (result: ShipmentUploadResult) => {
      queryClient.setQueryData<Shipment[]>(shipments.all.queryKey, (old) => [
        ...(old ?? []),
        {
          id: result.shipmentId,
          name: result.shipmentName ?? `출고 ${new Date().toLocaleDateString('ko-KR')}`,
          orderCount: result.imported,
          createdAt: new Date().toISOString(),
        } as Shipment,
      ]);
      queryClient.invalidateQueries({ queryKey: shipments.all.queryKey });
    },
  });
}
