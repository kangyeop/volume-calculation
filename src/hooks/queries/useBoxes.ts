import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { boxes, boxGroups } from './queryKeys';
import type { Box, BoxGroup } from '@/types';

export function useBoxes() {
  return useQuery({
    ...boxes.all,
    queryFn: () => api.boxes.list(),
  });
}

export function useCreateBox(): UseMutationResult<Box, Error, Omit<Box, 'id' | 'boxGroup'>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.boxes.create(data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: boxes.all.queryKey });
      if (variables.boxGroupId) {
        queryClient.invalidateQueries({ queryKey: boxGroups.detail(variables.boxGroupId).queryKey });
      }
    },
  });
}

export function useDeleteBox(): UseMutationResult<void, Error, { id: string; groupId: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }) => api.boxes.delete(id),
    onMutate: async ({ id, groupId }) => {
      await queryClient.cancelQueries({ queryKey: boxGroups.detail(groupId).queryKey });
      const previous = queryClient.getQueryData<BoxGroup>(boxGroups.detail(groupId).queryKey);
      queryClient.setQueryData<BoxGroup>(boxGroups.detail(groupId).queryKey, (old) =>
        old ? { ...old, boxes: old.boxes?.filter((b) => b.id !== id) ?? [] } : old
      );
      return { previous };
    },
    onError: (_err, { groupId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boxGroups.detail(groupId).queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: boxes.all.queryKey });
      queryClient.invalidateQueries({ queryKey: boxGroups.detail(groupId).queryKey });
    },
  });
}

export function useUploadBoxes(): UseMutationResult<{ imported: number }, Error, { file: File; groupId: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, groupId }) => api.boxes.uploadExcel(file, groupId),
    onSuccess: (_result, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: boxes.all.queryKey });
      queryClient.invalidateQueries({ queryKey: boxGroups.detail(groupId).queryKey });
    },
  });
}
