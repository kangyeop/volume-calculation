import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { boxes } from './queryKeys';
import type { Box } from '@wms/types';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boxes.all.queryKey });
    },
  });
}

export function useDeleteBox(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.boxes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boxes.all.queryKey });
    },
  });
}

export function useUploadBoxes(): UseMutationResult<{ imported: number }, Error, { file: File; groupId: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, groupId }) => api.boxes.uploadExcel(file, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boxes.all.queryKey });
    },
  });
}
