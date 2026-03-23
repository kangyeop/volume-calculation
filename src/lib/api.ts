import axios from 'axios';
import {
  Product,
  Outbound,
  ShipmentUploadResult,
  PackingRecommendation,
  PackingResult,
  Box,
  BoxGroup,
  PackingResult3D,
  ApiResponse,
  PackingResultDetail,
  ProjectStats,
} from '@/types';

const API_BASE = '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
});

async function fetchApi<T>(
  url: string,
  options?: { method?: string; data?: unknown; headers?: Record<string, string> },
): Promise<T> {
  const response = await apiClient.request<T>({ url, ...options });
  return response.data;
}

async function unwrapResponse<T>(response: { data: ApiResponse<T> }): Promise<T> {
  if (!response.data.success) {
    throw new Error(response.data.message || response.data.error || 'API request failed');
  }
  return response.data.data;
}

export interface ProductGroup {
  id: string;
  name: string;
  boxGroupId: string;
  productCount?: number;
  products?: Product[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Shipment {
  id: string;
  name: string;
  orderCount?: number;
  itemCount?: number;
  lastBoxGroupId?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface DashboardStats {
  totalBatches: number;
  totalBoxesUsed: number;
  recentBatches: Shipment[];
}

export const api = {
  projects: {
    list: () =>
      fetchApi<{ id: string; name: string; createdAt: string; updatedAt: string }[]>('/projects'),
    create: (name: string) =>
      fetchApi<{ id: string; name: string; createdAt: string; updatedAt: string }>('/projects', {
        method: 'POST',
        data: { name },
      }),
    get: (id: string) =>
      fetchApi<{ id: string; name: string; createdAt: string; updatedAt: string }>(
        `/projects/${id}`,
      ),
    delete: (id: string) => fetchApi<void>(`/projects/${id}`, { method: 'DELETE' }),
    stats: () => fetchApi<ProjectStats[]>('/projects/stats'),
  },
  productGroups: {
    list: () => fetchApi<ProductGroup[]>('/product-groups'),
    get: (id: string) => fetchApi<ProductGroup>(`/product-groups/${id}`),
    create: (name: string, boxGroupId: string) =>
      fetchApi<ProductGroup>('/product-groups', {
        method: 'POST',
        data: { name, boxGroupId },
      }),
    update: (id: string, data: { name?: string; boxGroupId?: string }) =>
      fetchApi<ProductGroup>(`/product-groups/${id}`, {
        method: 'PATCH',
        data,
      }),
    delete: (id: string) => fetchApi<void>(`/product-groups/${id}`, { method: 'DELETE' }),
  },
  products: {
    list: (projectId: string) => fetchApi<Product[]>(`/projects/${projectId}/products`),
    listByGroup: (groupId: string) => fetchApi<Product[]>(`/product-groups/${groupId}/products`),
    createBulk: (
      projectId: string,
      products: Omit<Product, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[],
    ) =>
      fetchApi<void>(`/projects/${projectId}/products/bulk`, {
        method: 'POST',
        data: products,
      }),
    update: (id: string, data: Partial<Pick<Product, 'width' | 'length' | 'height' | 'name'>>) =>
      fetchApi<Product>(`/products/${id}`, { method: 'PATCH', data }),
    delete: (id: string) => fetchApi<void>(`/products/${id}`, { method: 'DELETE' }),
    deleteBulk: (projectId: string, ids: string[]) =>
      fetchApi<void>(`/projects/${projectId}/products`, {
        method: 'DELETE',
        data: { ids },
      }),
    deleteBulkByGroup: (groupId: string, ids: string[]) =>
      fetchApi<void>(`/product-groups/${groupId}/products`, {
        method: 'DELETE',
        data: { ids },
      }),
  },
  orderItems: {
    list: (shipmentId: string) => fetchApi<Outbound[]>(`/shipments/${shipmentId}/order-items`),
    create: (shipmentId: string, orderItem: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>) =>
      fetchApi<Outbound>(`/shipments/${shipmentId}/order-items`, {
        method: 'POST',
        data: orderItem,
      }),
    createBulk: (
      shipmentId: string,
      orderItems: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[],
    ) =>
      fetchApi<void>(`/shipments/${shipmentId}/order-items/bulk`, {
        method: 'POST',
        data: orderItems,
      }),
    createBulkWithFile: (
      shipmentId: string,
      file: File,
      createOrderItemDtos: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[],
    ): Promise<void> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('createOrderItemDtos', JSON.stringify(createOrderItemDtos));

      return apiClient.post(`/shipments/${shipmentId}/order-items/bulk-with-file`, formData);
    },
    deleteAll: (shipmentId: string) =>
      fetchApi<void>(`/shipments/${shipmentId}/order-items`, { method: 'DELETE' }),
  },
  shipments: {
    list: () => fetchApi<Shipment[]>('/shipments'),
    get: (id: string) => fetchApi<Shipment>(`/shipments/${id}`),
    delete: (id: string) => fetchApi<void>(`/shipments/${id}`, { method: 'DELETE' }),
    upload: (file: File, format: 'adjustment' | 'beforeMapping' | 'afterMapping'): Promise<ShipmentUploadResult> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);
      return apiClient
        .post<ApiResponse<ShipmentUploadResult>>('/upload/shipment', formData)
        .then(unwrapResponse);
    },
    listOrderItems: (shipmentId: string) =>
      fetchApi<Outbound[]>(`/shipments/${shipmentId}/order-items`),
    listOrderItemsPaginated: (shipmentId: string, page: number, limit = 50) =>
      fetchApi<{ items: Outbound[]; totalOrders: number; page: number; limit: number }>(
        `/shipments/${shipmentId}/order-items?page=${page}&limit=${limit}`,
      ),
    configurationSummary: (shipmentId: string) =>
      fetchApi<{
        totalOrders: number;
        configurations: {
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
        }[];
      }>(`/shipments/${shipmentId}/order-items/configuration-summary`),
  },
  boxGroups: {
    list: () => fetchApi<BoxGroup[]>('/box-groups'),
    get: (id: string) => fetchApi<BoxGroup>(`/box-groups/${id}`),
    create: (name: string) =>
      fetchApi<BoxGroup>('/box-groups', {
        method: 'POST',
        data: { name },
      }),
    delete: (id: string) => fetchApi<void>(`/box-groups/${id}`, { method: 'DELETE' }),
  },
  packing: {
    calculate: (shipmentId: string) =>
      fetchApi<PackingRecommendation>(`/shipments/${shipmentId}/packing/calculate`, {
        method: 'POST',
      }),
    calculateOrder: async (shipmentId: string, orderId: string, groupLabel?: string) => {
      return fetchApi<PackingResult3D>(`/shipments/${shipmentId}/packing/calculate-order`, {
        method: 'POST',
        data: { orderId, groupLabel },
      });
    },
    updateBoxAssignment: (shipmentId: string, data: { items: { groupIndex: number; boxIndex: number }[]; newBoxId: string }) =>
      fetchApi<PackingRecommendation>(`/shipments/${shipmentId}/packing/recommendation`, {
        method: 'PATCH',
        data,
      }),
    recommendation: (shipmentId: string) =>
      fetchApi<PackingRecommendation | null>(`/shipments/${shipmentId}/packing/recommendation`),
    history: (shipmentId: string) =>
      fetchApi<PackingResult[]>(`/shipments/${shipmentId}/packing/results`),
    details: (shipmentId: string) =>
      fetchApi<PackingResultDetail[]>(`/shipments/${shipmentId}/packing/details`),
    export: (shipmentId: string) => {
      return apiClient
        .get(`/shipments/${shipmentId}/packing/export`, {
          responseType: 'blob',
        })
        .then((response) => {
          const url = window.URL.createObjectURL(response.data);
          const a = document.createElement('a');
          a.href = url;
          a.download = `packing_results_${shipmentId}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        });
    },
  },
  boxes: {
    list: () => fetchApi<Box[]>('/boxes'),
    create: (data: Omit<Box, 'id' | 'boxGroup'>) =>
      fetchApi<Box>('/boxes', {
        method: 'POST',
        data,
      }),
    delete: (id: string) => fetchApi<void>(`/boxes/${id}`, { method: 'DELETE' }),
    uploadExcel: (file: File, groupId: string): Promise<{ imported: number }> => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient
        .post<ApiResponse<{ imported: number }>>(`/boxes/upload?groupId=${encodeURIComponent(groupId)}`, formData)
        .then(unwrapResponse);
    },
  },
  productUpload: {
    parse: async (
      file: File,
      groupId: string,
    ): Promise<{ imported: number; rowCount: number; errors: string[]; fileName: string }> => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<
        ApiResponse<{ imported: number; rowCount: number; errors: string[]; fileName: string }>
      >(`/product-upload/parse?groupId=${encodeURIComponent(groupId)}`, formData);

      if (!response.data.success) {
        throw new Error(response.data.message || response.data.error || 'API request failed');
      }
      return response.data.data;
    },
  },
  dashboard: {
    stats: () => fetchApi<DashboardStats>('/dashboard/stats'),
  },
};
