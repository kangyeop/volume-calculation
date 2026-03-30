import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { products } from './queryKeys';
import type { Product } from '@/types';

type UpdateProductVars = {
  id: string;
  data: Partial<Pick<Product, 'width' | 'length' | 'height' | 'name' | 'barcode' | 'aircap'>>;
  groupId: string;
};

export function useProducts(projectId: string) {
  return useQuery({
    ...products.all(projectId),
    queryFn: () => api.products.list(projectId),
    enabled: !!projectId,
  });
}

export function useAllProducts() {
  return useQuery({
    ...products.listAll,
    queryFn: () => api.products.listAll(),
  });
}

export function useCreateProducts(
  projectId: string,
): UseMutationResult<void, Error, Omit<Product, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.products.createBulk(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: products.all(projectId).queryKey });
    },
  });
}

export function useUpdateProduct(): UseMutationResult<Product, Error, UpdateProductVars> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.products.update(id, data),
    onMutate: async ({ id, data, groupId }) => {
      await queryClient.cancelQueries({ queryKey: products.byGroup(groupId).queryKey });
      const previous = queryClient.getQueryData<Product[]>(products.byGroup(groupId).queryKey);
      queryClient.setQueryData<Product[]>(products.byGroup(groupId).queryKey, (old) =>
        old?.map((p) => (p.id === id ? { ...p, ...data } : p)) ?? []
      );
      return { previous };
    },
    onError: (_err, { groupId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(products.byGroup(groupId).queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: products.byGroup(groupId).queryKey });
    },
  });
}

export function useDeleteProduct(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.products.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: products.listAll.queryKey });
    },
  });
}

export function useDeleteProducts(projectId: string): UseMutationResult<void, Error, string[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => api.products.deleteBulk(projectId, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: products.all(projectId).queryKey });
    },
  });
}
