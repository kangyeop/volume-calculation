import axios from 'axios';
import { Project, Product, Outbound, PackingRecommendation, PackingResult, PackingGroupingOption, Box, PackingResult3D, ConfirmMappingUploadResponse, ApiResponse, ProductMappingData, ProductMatchResult, ParseMappingUploadResponse } from '@wms/types';

const API_BASE = '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'API request failed';
    const apiError = new Error(errorMessage);
    (apiError as unknown as { status: number; details: string }).status = error.response?.status || 500;
    (apiError as unknown as { status: number; details: string }).details = error.response?.data?.error || '';
    throw apiError;
  },
);

async function fetchApi<T>(url: string, options?: { method?: string; data?: unknown; headers?: Record<string, string> }): Promise<T> {
  const response = await apiClient.request<T>({ url, ...options });
  return response;
}

export const api = {
  projects: {
    list: () => fetchApi<Project[]>('/projects'),
    create: (name: string, description?: string) =>
      fetchApi<Project>('/projects', {
        method: 'POST',
        data: { name, description },
      }),
    get: (id: string) => fetchApi<Project>(`/projects/${id}`),
    delete: (id: string) => fetchApi<void>(`/projects/${id}`, { method: 'DELETE' }),
  },
  products: {
    list: (projectId: string) => fetchApi<Product[]>(`/projects/${projectId}/products`),
    createBulk: (projectId: string, products: Omit<Product, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[]) =>
      fetchApi<void>(`/projects/${projectId}/products/bulk`, {
        method: 'POST',
        data: products,
      }),
    delete: (id: string) => fetchApi<void>(`/products/${id}`, { method: 'DELETE' }),
  },
  outbound: {
    list: (projectId: string) => fetchApi<Outbound[]>(`/projects/${projectId}/outbounds`),
    listBatches: (projectId: string) => fetchApi<{ batchId: string; batchName: string; count: number; createdAt: string; originalFilePath?: string }[]>(`/projects/${projectId}/outbounds/batches`),
    create: (projectId: string, outbound: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>) =>
      fetchApi<Outbound>(`/projects/${projectId}/outbounds`, {
        method: 'POST',
        data: outbound,
      }),
    createBulk: (projectId: string, outbounds: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[]) =>
      fetchApi<void>(`/projects/${projectId}/outbounds/bulk`, {
        method: 'POST',
        data: outbounds,
      }),
    createBulkWithFile: (projectId: string, file: File, createOutboundDtos: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[]) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('createOutboundDtos', JSON.stringify(createOutboundDtos));

      return apiClient.post<{ success: boolean; data?: unknown; message?: string }>(
        `/projects/${projectId}/outbounds/bulk-with-file`,
        formData,
      ).then((response) => response.data);
    },
    deleteAll: (projectId: string) => fetchApi<void>(`/projects/${projectId}/outbounds`, { method: 'DELETE' }),
  },
  packing: {
    calculate: (projectId: string, groupingOption: PackingGroupingOption = PackingGroupingOption.ORDER, batchId?: string) =>
      fetchApi<PackingRecommendation>(`/projects/${projectId}/packing/calculate`, {
        method: 'POST',
        data: { groupingOption, batchId },
      }),
    calculateOrder: async (projectId: string, orderId: string, groupLabel?: string) => {
      return fetchApi<PackingResult3D>(`/projects/${projectId}/packing/calculate-order`, {
        method: 'POST',
        data: { orderId, groupLabel },
      });
    },
    history: (projectId: string) => fetchApi<PackingResult[]>(`/projects/${projectId}/packing/results`),
    export: (projectId: string, batchId: string) => {
      return apiClient
        .get(`/projects/${projectId}/packing/export?batchId=${encodeURIComponent(batchId)}`, {
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
    parse: (file: File, type: 'outbound' | 'product', projectId: string) => {
      const formData = new FormData();
      formData.append('file', file);

      return apiClient.post<ApiResponse<{ sessionId: string; headers: string[]; rowCount: number; mapping: unknown; fileName: string }>>(
        `/upload/parse?type=${encodeURIComponent(type)}&projectId=${encodeURIComponent(projectId)}`,
        formData,
      ).then((response) => {
        if (!response.data.success) {
          throw new Error(response.data.message || response.data.error || 'API request failed');
        }
        return response.data.data;
      });
    },
    parseMapping: async (file: File, type: 'outbound' | 'product', projectId: string) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<ApiResponse<ParseMappingUploadResponse['data']>>(
        `/upload/parse-mapping?type=${encodeURIComponent(type)}&projectId=${encodeURIComponent(projectId)}`,
        formData,
      );
      if (!response.data.success) {
        throw new Error(response.data.message || response.data.error || 'API request failed');
      }
      return response.data.data;
    },
    confirm: (sessionId: string, mapping: Record<string, string | null>) => {
      return fetchApi<{ imported: number; batchId?: string }>(`/upload/confirm`, {
        method: 'POST',
        data: { sessionId, mapping },
      });
    },
    confirmMapping: (sessionId: string, columnMapping: Record<string, string | null>, productMapping?: Record<number, string[] | null>) => {
      return fetchApi<ConfirmMappingUploadResponse['data']>(`/upload/confirm-mapping`, {
        method: 'POST',
        data: { sessionId, columnMapping, productMapping },
      });
    },
    updateMapping: async (sessionId: string, columnMapping: Record<string, string | null>) => {
      return fetchApi<{ productMapping: ProductMappingData }>(`/upload/update-mapping`, {
        method: 'POST',
        data: { sessionId, columnMapping },
      });
    },
    deleteSession: (sessionId: string) => {
      return apiClient.delete(`/upload/${sessionId}`);
    },
  },
};
