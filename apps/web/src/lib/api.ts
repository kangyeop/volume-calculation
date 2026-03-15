import axios from 'axios';
import {
  Product,
  Outbound,
  OutboundUploadResult,
  PackingRecommendation,
  PackingResult,
  PackingGroupingOption,
  Box,
  PackingResult3D,
  ParseUploadData,
  ParseProductUploadData,
  ApiResponse,
  ProductMappingData,
  PackingResultDetail,
  ProjectStats,
} from '@wms/types';

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
  productCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OutboundBatch {
  id: string;
  name: string;
  orderCount?: number;
  itemCount?: number;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface DashboardStats {
  totalBatches: number;
  totalBoxesUsed: number;
  recentBatches: OutboundBatch[];
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
    create: (name: string) =>
      fetchApi<ProductGroup>('/product-groups', {
        method: 'POST',
        data: { name },
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
  outbound: {
    list: (projectId: string) => fetchApi<Outbound[]>(`/projects/${projectId}/outbounds`),
    create: (projectId: string, outbound: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>) =>
      fetchApi<Outbound>(`/projects/${projectId}/outbounds`, {
        method: 'POST',
        data: outbound,
      }),
    createBulk: (
      projectId: string,
      outbounds: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[],
    ) =>
      fetchApi<void>(`/projects/${projectId}/outbounds/bulk`, {
        method: 'POST',
        data: outbounds,
      }),
    createBulkWithFile: (
      projectId: string,
      file: File,
      createOutboundDtos: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[],
    ): Promise<void> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('createOutboundDtos', JSON.stringify(createOutboundDtos));

      return apiClient.post(`/projects/${projectId}/outbounds/bulk-with-file`, formData);
    },
    deleteAll: (projectId: string) =>
      fetchApi<void>(`/projects/${projectId}/outbounds`, { method: 'DELETE' }),
    uploadDirect: (projectId: string, file: File): Promise<OutboundUploadResult> => {
      const formData = new FormData();
      formData.append('file', file);

      return apiClient
        .post<
          ApiResponse<OutboundUploadResult>
        >(`/upload/outbound-direct?projectId=${encodeURIComponent(projectId)}`, formData)
        .then(unwrapResponse);
    },
  },
  outboundBatches: {
    list: () => fetchApi<OutboundBatch[]>('/outbound-batches'),
    get: (id: string) => fetchApi<OutboundBatch>(`/outbound-batches/${id}`),
    delete: (id: string) => fetchApi<void>(`/outbound-batches/${id}`, { method: 'DELETE' }),
    upload: (file: File): Promise<OutboundBatch> => {
      const formData = new FormData();
      formData.append('file', file);

      return apiClient
        .post<ApiResponse<OutboundBatch>>('/outbound-batches/upload', formData)
        .then(unwrapResponse);
    },
    listOutbounds: (batchId: string) =>
      fetchApi<Outbound[]>(`/outbound-batches/${batchId}/outbounds`),
  },
  packing: {
    calculate: (
      projectId: string,
      groupingOption: PackingGroupingOption = PackingGroupingOption.ORDER,
    ) =>
      fetchApi<PackingRecommendation>(`/projects/${projectId}/packing/calculate`, {
        method: 'POST',
        data: { groupingOption },
      }),
    calculateByBatch: (
      batchId: string,
      groupingOption: PackingGroupingOption = PackingGroupingOption.ORDER,
    ) =>
      fetchApi<PackingRecommendation>(`/outbound-batches/${batchId}/packing/calculate`, {
        method: 'POST',
        data: { groupingOption },
      }),
    calculateOrder: async (projectId: string, orderId: string, groupLabel?: string) => {
      return fetchApi<PackingResult3D>(`/projects/${projectId}/packing/calculate-order`, {
        method: 'POST',
        data: { orderId, groupLabel },
      });
    },
    history: (projectId: string) =>
      fetchApi<PackingResult[]>(`/projects/${projectId}/packing/results`),
    historyByBatch: (batchId: string) =>
      fetchApi<PackingResult[]>(`/outbound-batches/${batchId}/packing/results`),
    details: (projectId: string) =>
      fetchApi<PackingResultDetail[]>(`/projects/${projectId}/packing/details`),
    detailsByBatch: (batchId: string) =>
      fetchApi<PackingResultDetail[]>(`/outbound-batches/${batchId}/packing/details`),
    export: (projectId: string) => {
      return apiClient
        .get(`/projects/${projectId}/packing/export`, {
          responseType: 'blob',
        })
        .then((response) => {
          const url = window.URL.createObjectURL(response.data);
          const a = document.createElement('a');
          a.href = url;
          a.download = `packing_results_${projectId}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        });
    },
    exportByBatch: (batchId: string) => {
      return apiClient
        .get(`/outbound-batches/${batchId}/packing/export`, {
          responseType: 'blob',
        })
        .then((response) => {
          const url = window.URL.createObjectURL(response.data);
          const a = document.createElement('a');
          a.href = url;
          a.download = `packing_results_${batchId}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        });
    },
  },
  boxes: {
    list: () => fetchApi<Box[]>('/boxes'),
    create: (data: Omit<Box, 'id'>) =>
      fetchApi<Box>('/boxes', {
        method: 'POST',
        data,
      }),
    delete: (id: string) => fetchApi<void>(`/boxes/${id}`, { method: 'DELETE' }),
  },
  upload: {
    parse: (
      file: File,
      type: 'outbound' | 'product',
      projectId: string,
    ): Promise<ParseUploadData> => {
      const formData = new FormData();
      formData.append('file', file);

      return apiClient
        .post<
          ApiResponse<ParseUploadData>
        >(`/upload/parse?type=${encodeURIComponent(type)}&projectId=${encodeURIComponent(projectId)}`, formData)
        .then((response) => {
          if (!response.data.success) {
            throw new Error(response.data.message || response.data.error || 'API request failed');
          }
          return response.data.data;
        });
    },

    confirm: async (
      projectId: string,
      outbounds: Array<{
        orderId: string;
        sku: string;
        quantity: number;
        productId?: string | null;
      }>,
    ): Promise<{ imported: number }> => {
      const response = await apiClient.post<ApiResponse<{ imported: number }>>(`/upload/confirm`, {
        projectId,
        outbounds,
      });
      return unwrapResponse({ data: response.data });
    },

    mapProducts: async (
      projectId: string,
      columnMapping: Record<string, string | null>,
      rows: Record<string, unknown>[],
    ): Promise<ProductMappingData> => {
      const response = await apiClient.post<ApiResponse<ProductMappingData>>(
        `/upload/map-products`,
        { projectId, columnMapping, rows },
      );
      return unwrapResponse({ data: response.data });
    },
  },
  productUpload: {
    parse: (file: File, projectId: string): Promise<ParseProductUploadData> => {
      const formData = new FormData();
      formData.append('file', file);

      return apiClient
        .post<
          ApiResponse<ParseProductUploadData>
        >(`/product-upload/parse?projectId=${encodeURIComponent(projectId)}`, formData)
        .then((response) => {
          if (!response.data.success) {
            throw new Error(response.data.message || response.data.error || 'API request failed');
          }
          return response.data.data;
        });
    },

    confirm: async (
      projectId: string,
      rows: Record<string, unknown>[],
      mapping: ParseProductUploadData['mapping'],
    ): Promise<{ imported: number }> => {
      const response = await apiClient.post<ApiResponse<{ imported: number }>>(
        `/product-upload/confirm`,
        { projectId, rows, mapping },
      );
      return unwrapResponse({ data: response.data });
    },
  },
  dashboard: {
    stats: () => fetchApi<DashboardStats>('/dashboard/stats'),
  },
};
