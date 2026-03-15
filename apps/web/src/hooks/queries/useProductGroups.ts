import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api, type ProductGroup } from '@/lib/api';
import { productGroups } from './queryKeys';

export function useProductGroups() {
  return useQuery({
    ...productGroups.all,
    queryFn: () => api.productGroups.list(),
  });
}

export function useProductGroup(id: string) {
  return useQuery({
    ...productGroups.detail(id),
    queryFn: () => api.productGroups.get(id),
    enabled: !!id,
  });
}

export function useCreateProductGroup(): UseMutationResult<ProductGroup, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => api.productGroups.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productGroups.all.queryKey });
    },
  });
}

export function useDeleteProductGroup(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.productGroups.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productGroups.all.queryKey });
    },
  });
}
