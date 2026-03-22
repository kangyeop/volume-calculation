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

export function useCreateProductGroup(): UseMutationResult<ProductGroup, Error, { name: string; boxGroupId: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, boxGroupId }) => api.productGroups.create(name, boxGroupId),
    onSuccess: (newGroup) => {
      queryClient.setQueryData(productGroups.detail(newGroup.id).queryKey, newGroup);
      queryClient.invalidateQueries({ queryKey: productGroups.all.queryKey });
    },
  });
}

export function useUpdateProductGroup(): UseMutationResult<ProductGroup, Error, { id: string; data: { name?: string; boxGroupId?: string } }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.productGroups.update(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(productGroups.detail(updated.id).queryKey, updated);
      queryClient.invalidateQueries({ queryKey: productGroups.all.queryKey });
    },
  });
}

export function useDeleteProductGroup(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.productGroups.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: productGroups.all.queryKey });
      const previous = queryClient.getQueryData<ProductGroup[]>(productGroups.all.queryKey);
      queryClient.setQueryData<ProductGroup[]>(productGroups.all.queryKey, (old) =>
        old?.filter((g) => g.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(productGroups.all.queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productGroups.all.queryKey });
    },
  });
}
