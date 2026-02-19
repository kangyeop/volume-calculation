import { Project, Product, Outbound, PackingRecommendation, PackingResult, PackingGroupingOption, Box } from '@wms/types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.statusText}`);
  }
  return response.json();
}

export const api = {
  projects: {
    list: () => fetchJson<Project[]>('/projects'),
    create: (name: string, description?: string) =>
      fetchJson<Project>('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      }),
    get: (id: string) => fetchJson<Project>(`/projects/${id}`),
    delete: (id: string) => fetchJson<void>(`/projects/${id}`, { method: 'DELETE' }),
  },
  products: {
    list: (projectId: string) => fetchJson<Product[]>(`/projects/${projectId}/products`),
    createBulk: (projectId: string, products: Omit<Product, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[]) =>
      fetchJson<void>(`/projects/${projectId}/products/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(products),
      }),
    delete: (id: string) => fetchJson<void>(`/products/${id}`, { method: 'DELETE' }),
  },
  outbound: {
    list: (projectId: string) => fetchJson<Outbound[]>(`/projects/${projectId}/outbounds`),
    listBatches: (projectId: string) => fetchJson<{ batchId: string; batchName: string; count: number; createdAt: string; originalFilePath?: string }[]>(`/projects/${projectId}/outbounds/batches`),
    createBulk: (projectId: string, outbounds: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[]) =>
      fetchJson<void>(`/projects/${projectId}/outbounds/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outbounds),
      }),
    createBulkWithFile: (projectId: string, file: File, createOutboundDtos: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[]) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('createOutboundDtos', JSON.stringify(createOutboundDtos));

      return fetch(`${API_BASE}/projects/${projectId}/outbounds/bulk-with-file`, {
        method: 'POST',
        body: formData,
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `API Error: ${response.statusText}`);
        }
        return response.json();
      });
    },
    deleteAll: (projectId: string) => fetchJson<void>(`/projects/${projectId}/outbounds`, { method: 'DELETE' }),
  },
  packing: {
    calculate: (projectId: string, groupingOption: PackingGroupingOption = PackingGroupingOption.ORDER, batchId?: string) =>
      fetchJson<PackingRecommendation>(`/projects/${projectId}/packing/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupingOption, batchId }),
      }),
    history: (projectId: string) => fetchJson<PackingResult[]>(`/projects/${projectId}/packing/results`),
    export: (projectId: string, batchId: string) => {
      return fetch(`${API_BASE}/projects/${projectId}/packing/export?batchId=${encodeURIComponent(batchId)}`, {
        method: 'GET',
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `API Error: ${response.statusText}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
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
    list: () => fetchJson<Box[]>('/boxes'),
    create: (data: Omit<Box, 'id'>) =>
      fetchJson<Box>('/boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    delete: (id: string) => fetchJson<void>(`/boxes/${id}`, { method: 'DELETE' }),
  },
};
