import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import axios from 'axios';
import { globalShipments } from './queryKeys';

export interface GlobalShipment {
  id: string;
  userId: string;
  name: string;
  status: 'PACKING' | 'CONFIRMED';
  note?: string | null;
  orderCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalShipmentUnmatchedItem {
  sku?: string;
  rawValue?: string;
  quantity?: number;
  reason?: string;
}

export interface GlobalShipmentUploadResult {
  imported: number;
  unmatched: GlobalShipmentUnmatchedItem[];
  shipmentName: string;
  shipmentId: string;
  totalRows: number;
}

export interface GlobalOrderItem {
  id: string;
  globalOrderId: string;
  sku: string;
  quantity: number;
  globalShipmentId: string;
  globalProductId?: string | null;
  productName?: string;
  width?: number;
  length?: number;
  height?: number;
  innerQuantity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalConfigurationSummaryItem {
  skuKey: string;
  skuItems: { sku: string; productName?: string; quantity: number }[];
  orderCount: number;
  orderIds: string[];
  largestItem: {
    width: number;
    length: number;
    height: number;
    volume: number;
    productName?: string;
  } | null;
  productGroupId: string | null;
}

export interface GlobalConfigurationSummary {
  totalOrders: number;
  configurations: GlobalConfigurationSummaryItem[];
}

export type GlobalShipmentFormat = 'adjustment' | 'beforeMapping' | 'afterMapping';

async function listShipments(): Promise<GlobalShipment[]> {
  const { data } = await axios.get<GlobalShipment[]>('/api/global/shipments');
  return data;
}

async function getShipment(id: string): Promise<GlobalShipment> {
  const { data } = await axios.get<GlobalShipment>(`/api/global/shipments/${id}`);
  return data;
}

async function createShipment(payload: { name: string; note?: string | null }): Promise<GlobalShipment> {
  const { data } = await axios.post<GlobalShipment>('/api/global/shipments', payload);
  return data;
}

async function updateShipment(
  id: string,
  payload: { name?: string; note?: string | null },
): Promise<GlobalShipment> {
  const { data } = await axios.patch<GlobalShipment>(`/api/global/shipments/${id}`, payload);
  return data;
}

async function deleteShipment(id: string): Promise<void> {
  await axios.delete(`/api/global/shipments/${id}`);
}

async function getConfigurationSummary(shipmentId: string): Promise<GlobalConfigurationSummary> {
  const { data } = await axios.get<GlobalConfigurationSummary>(
    `/api/global/shipments/${shipmentId}/order-items/configuration-summary`,
  );
  return data;
}

async function uploadShipment(
  file: File,
  format: GlobalShipmentFormat,
): Promise<GlobalShipmentUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('format', format);
  const { data } = await axios.post<GlobalShipmentUploadResult>(
    '/api/global/upload/shipment',
    formData,
  );
  return data;
}

export function useGlobalShipments() {
  return useQuery({
    ...globalShipments.all,
    queryFn: listShipments,
  });
}

export function useGlobalShipment(id: string) {
  return useQuery({
    ...globalShipments.detail(id),
    queryFn: () => getShipment(id),
    enabled: !!id,
  });
}

export function useGlobalConfigurationSummary(shipmentId: string) {
  return useQuery({
    ...globalShipments.configurationSummary(shipmentId),
    queryFn: () => getConfigurationSummary(shipmentId),
    enabled: !!shipmentId,
  });
}

export function useCreateGlobalShipment(): UseMutationResult<
  GlobalShipment,
  Error,
  { name: string; note?: string | null }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createShipment(payload),
    onSuccess: (created) => {
      queryClient.setQueryData(globalShipments.detail(created.id).queryKey, created);
      queryClient.invalidateQueries({ queryKey: globalShipments.all.queryKey });
    },
  });
}

export function useUpdateGlobalShipment(): UseMutationResult<
  GlobalShipment,
  Error,
  { id: string; data: { name?: string; note?: string | null } }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateShipment(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(globalShipments.detail(updated.id).queryKey, updated);
      queryClient.invalidateQueries({ queryKey: globalShipments.all.queryKey });
    },
  });
}

export function useUpdateGlobalShipmentNote(): UseMutationResult<
  GlobalShipment,
  Error,
  { id: string; note: string | null }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }) => updateShipment(id, { note }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: globalShipments.all.queryKey });
      queryClient.invalidateQueries({ queryKey: globalShipments.detail(id).queryKey });
    },
  });
}

export function useDeleteGlobalShipment(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteShipment(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: globalShipments.all.queryKey });
      const previous = queryClient.getQueryData<GlobalShipment[]>(globalShipments.all.queryKey);
      queryClient.setQueryData<GlobalShipment[]>(
        globalShipments.all.queryKey,
        (old) => old?.filter((s) => s.id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(globalShipments.all.queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: globalShipments.all.queryKey });
    },
  });
}

export function useUploadGlobalShipment(): UseMutationResult<
  GlobalShipmentUploadResult,
  Error,
  { file: File; format: GlobalShipmentFormat }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, format }) => uploadShipment(file, format),
    onSuccess: (result) => {
      queryClient.setQueryData<GlobalShipment[]>(globalShipments.all.queryKey, (old) => [
        ...(old ?? []),
        {
          id: result.shipmentId,
          userId: '',
          name: result.shipmentName ?? `글로벌 출고 ${new Date().toLocaleDateString('ko-KR')}`,
          status: 'PACKING',
          note: null,
          orderCount: result.imported,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as GlobalShipment,
      ]);
      queryClient.invalidateQueries({ queryKey: globalShipments.all.queryKey });
    },
  });
}
