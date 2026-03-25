import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { boxes, boxGroups } from './queryKeys';
import type { Box } from '@/types';

export function useBoxes(options?: { unassigned?: boolean }) {
  const unassigned = options?.unassigned ?? false;
  const allQuery = useQuery({
    ...boxes.all,
    queryFn: () => api.boxes.list(),
    enabled: !unassigned,
  });
  const unassignedQuery = useQuery({
    ...boxes.unassigned,
    queryFn: () => api.boxes.listUnassigned(),
    enabled: unassigned,
  });
  return unassigned ? unassignedQuery : allQuery;
}

export function useUnassignedBoxes() {
  return useQuery({
    ...boxes.unassigned,
    queryFn: () => api.boxes.listUnassigned(),
  });
}

export function useCreateBox(): UseMutationResult<
  Box,
  Error,
  Omit<Box, 'id' | 'boxGroup'> & { boxGroupId?: string | null }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.boxes.create(data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: boxes.all.queryKey });
      queryClient.invalidateQueries({ queryKey: boxes.unassigned.queryKey });
      queryClient.invalidateQueries({ queryKey: boxGroups.all.queryKey });
      if (variables.boxGroupId) {
        queryClient.invalidateQueries({
          queryKey: boxGroups.detail(variables.boxGroupId).queryKey,
        });
      }
    },
  });
}

export function useUpdateBox(): UseMutationResult<
  Box,
  Error,
  { id: string; data: Partial<Omit<Box, 'id' | 'boxGroup'>> }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.boxes.update(id, data),
    onSuccess: (_result, { data: variables }) => {
      queryClient.invalidateQueries({ queryKey: boxes.all.queryKey });
      queryClient.invalidateQueries({ queryKey: boxes.unassigned.queryKey });
      if (variables.boxGroupId) {
        queryClient.invalidateQueries({
          queryKey: boxGroups.detail(variables.boxGroupId).queryKey,
        });
      }
    },
  });
}

export function useDeleteBox(): UseMutationResult<void, Error, { id: string; groupId?: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }) => api.boxes.delete(id),
    onSuccess: (_data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: boxes.all.queryKey });
      queryClient.invalidateQueries({ queryKey: boxes.unassigned.queryKey });
      queryClient.invalidateQueries({ queryKey: boxGroups.all.queryKey });
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: boxGroups.detail(groupId).queryKey });
      }
    },
  });
}

export function useUploadBoxes(): UseMutationResult<
  { imported: number },
  Error,
  { file: File; groupId?: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, groupId }) => api.boxes.uploadExcel(file, groupId),
    onSuccess: (_result, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: boxes.all.queryKey });
      queryClient.invalidateQueries({ queryKey: boxes.unassigned.queryKey });
      queryClient.invalidateQueries({ queryKey: boxGroups.all.queryKey });
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: boxGroups.detail(groupId).queryKey });
      }
    },
  });
}
