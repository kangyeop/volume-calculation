import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import axios from 'axios';
import { globalProductGroups } from './queryKeys';
import type { GlobalProduct } from './useGlobalProducts';

export interface GlobalProductGroup {
  id: string;
  userId: string;
  name: string;
  products?: GlobalProduct[];
  createdAt: string;
  updatedAt: string;
}

export interface GlobalProductGroupWithCount extends GlobalProductGroup {
  productCount: number;
}

async function listGroups(): Promise<GlobalProductGroupWithCount[]> {
  const { data } = await axios.get<GlobalProductGroup[]>('/api/global/product-groups');
  return data.map((g) => ({ ...g, productCount: g.products?.length ?? 0 }));
}

async function getGroup(id: string): Promise<GlobalProductGroup> {
  const { data } = await axios.get<GlobalProductGroup>(`/api/global/product-groups/${id}`);
  return data;
}

async function createGroup(name: string): Promise<GlobalProductGroup> {
  const { data } = await axios.post<GlobalProductGroup>('/api/global/product-groups', { name });
  return data;
}

async function updateGroup(id: string, payload: { name?: string }): Promise<GlobalProductGroup> {
  const { data } = await axios.patch<GlobalProductGroup>(`/api/global/product-groups/${id}`, payload);
  return data;
}

async function deleteGroup(id: string): Promise<void> {
  await axios.delete(`/api/global/product-groups/${id}`);
}

export function useGlobalProductGroups() {
  return useQuery({
    ...globalProductGroups.all,
    queryFn: listGroups,
  });
}

export function useGlobalProductGroup(id: string) {
  return useQuery({
    ...globalProductGroups.detail(id),
    queryFn: () => getGroup(id),
    enabled: !!id,
  });
}

export function useCreateGlobalProductGroup(): UseMutationResult<
  GlobalProductGroup,
  Error,
  { name: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name }) => createGroup(name),
    onSuccess: (newGroup) => {
      queryClient.setQueryData(globalProductGroups.detail(newGroup.id).queryKey, newGroup);
      queryClient.invalidateQueries({ queryKey: globalProductGroups.all.queryKey });
    },
  });
}

export function useUpdateGlobalProductGroup(): UseMutationResult<
  GlobalProductGroup,
  Error,
  { id: string; data: { name?: string } }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateGroup(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(globalProductGroups.detail(updated.id).queryKey, updated);
      queryClient.invalidateQueries({ queryKey: globalProductGroups.all.queryKey });
    },
  });
}

export function useDeleteGlobalProductGroup(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: globalProductGroups.all.queryKey });
      const previous = queryClient.getQueryData<GlobalProductGroupWithCount[]>(
        globalProductGroups.all.queryKey,
      );
      queryClient.setQueryData<GlobalProductGroupWithCount[]>(
        globalProductGroups.all.queryKey,
        (old) => old?.filter((g) => g.id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(globalProductGroups.all.queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: globalProductGroups.all.queryKey });
    },
  });
}
