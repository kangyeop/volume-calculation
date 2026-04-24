import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import axios from 'axios';
import { globalProducts as globalProductsKey } from './queryKeys';

export interface GlobalProduct {
  id: string;
  userId: string;
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
  innerQuantity: number;
  globalProductGroupId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalProductWithGroup {
  id: string;
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
  innerQuantity: number;
  globalProductGroupId: string;
  globalProductGroupName: string | null;
  createdAt: string;
}

export type CreateGlobalProductInput = {
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
  innerQuantity: number;
};

export type UpdateGlobalProductInput = Partial<
  Pick<GlobalProduct, 'name' | 'width' | 'length' | 'height' | 'innerQuantity'>
>;

type UpdateGlobalProductVars = {
  id: string;
  data: UpdateGlobalProductInput;
  groupId: string;
};

async function listByGroup(groupId: string): Promise<GlobalProduct[]> {
  const { data } = await axios.get<GlobalProduct[]>(
    `/api/global/product-groups/${groupId}/products`,
  );
  return data;
}

async function listAll(): Promise<GlobalProductWithGroup[]> {
  const { data } = await axios.get<GlobalProductWithGroup[]>('/api/global/products');
  return data;
}

async function createOne(
  groupId: string,
  payload: CreateGlobalProductInput,
): Promise<GlobalProduct> {
  const { data } = await axios.post<GlobalProduct>(
    `/api/global/product-groups/${groupId}/products`,
    payload,
  );
  return data;
}

async function createBulk(
  groupId: string,
  payload: CreateGlobalProductInput[],
): Promise<void> {
  await axios.post(`/api/global/product-groups/${groupId}/products/bulk`, payload);
}

async function updateOne(id: string, payload: UpdateGlobalProductInput): Promise<GlobalProduct> {
  const { data } = await axios.patch<GlobalProduct>(`/api/global/products/${id}`, payload);
  return data;
}

async function deleteOne(id: string): Promise<void> {
  await axios.delete(`/api/global/products/${id}`);
}

async function deleteBulk(groupId: string, ids: string[]): Promise<void> {
  await axios.delete(`/api/global/product-groups/${groupId}/products`, { data: { ids } });
}

export function useGlobalProductsByGroup(groupId: string) {
  return useQuery({
    ...globalProductsKey.byGroup(groupId),
    queryFn: () => listByGroup(groupId),
    enabled: !!groupId,
  });
}

export function useAllGlobalProducts() {
  return useQuery({
    ...globalProductsKey.listAll,
    queryFn: () => listAll(),
  });
}

export function useCreateGlobalProduct(
  groupId: string,
): UseMutationResult<GlobalProduct, Error, CreateGlobalProductInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createOne(groupId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: globalProductsKey.byGroup(groupId).queryKey });
    },
  });
}

export function useCreateGlobalProductsBulk(
  groupId: string,
): UseMutationResult<void, Error, CreateGlobalProductInput[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createBulk(groupId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: globalProductsKey.byGroup(groupId).queryKey });
    },
  });
}

export function useUpdateGlobalProduct(): UseMutationResult<
  GlobalProduct,
  Error,
  UpdateGlobalProductVars
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateOne(id, data),
    onMutate: async ({ id, data, groupId }) => {
      await queryClient.cancelQueries({ queryKey: globalProductsKey.byGroup(groupId).queryKey });
      const previous = queryClient.getQueryData<GlobalProduct[]>(
        globalProductsKey.byGroup(groupId).queryKey,
      );
      queryClient.setQueryData<GlobalProduct[]>(
        globalProductsKey.byGroup(groupId).queryKey,
        (old) => old?.map((p) => (p.id === id ? { ...p, ...data } : p)) ?? [],
      );
      return { previous };
    },
    onError: (_err, { groupId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(globalProductsKey.byGroup(groupId).queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: globalProductsKey.byGroup(groupId).queryKey });
    },
  });
}

export function useDeleteGlobalProduct(): UseMutationResult<void, Error, string> {
  return useMutation({
    mutationFn: (id: string) => deleteOne(id),
  });
}

export function useDeleteGlobalProductsBulk(
  groupId: string,
): UseMutationResult<void, Error, string[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => deleteBulk(groupId, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: globalProductsKey.byGroup(groupId).queryKey });
    },
  });
}
