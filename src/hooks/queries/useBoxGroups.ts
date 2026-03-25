import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { boxes, boxGroups } from './queryKeys';
import type { BoxGroup } from '@/types';

export function useBoxGroups() {
  return useQuery({
    ...boxGroups.all,
    queryFn: () => api.boxGroups.list(),
  });
}

export function useBoxGroup(id: string) {
  return useQuery({
    ...boxGroups.detail(id),
    queryFn: () => api.boxGroups.get(id),
    enabled: !!id,
  });
}

export function useCreateBoxGroup(): UseMutationResult<
  BoxGroup,
  Error,
  { name: string; boxIds?: string[] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, boxIds }) => api.boxGroups.create(name, boxIds),
    onSuccess: (newGroup) => {
      queryClient.setQueryData(boxGroups.detail(newGroup.id).queryKey, {
        ...newGroup,
        boxes: newGroup.boxes ?? [],
      });
      queryClient.invalidateQueries({ queryKey: boxGroups.all.queryKey });
      queryClient.invalidateQueries({ queryKey: boxes.all.queryKey });
      queryClient.invalidateQueries({ queryKey: boxes.unassigned.queryKey });
    },
  });
}

export function useDeleteBoxGroup(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.boxGroups.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: boxGroups.all.queryKey });
      const previous = queryClient.getQueryData<BoxGroup[]>(boxGroups.all.queryKey);
      queryClient.setQueryData<BoxGroup[]>(boxGroups.all.queryKey, (old) =>
        old?.filter((g) => g.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boxGroups.all.queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boxGroups.all.queryKey });
      queryClient.invalidateQueries({ queryKey: boxes.all.queryKey });
      queryClient.invalidateQueries({ queryKey: boxes.unassigned.queryKey });
    },
  });
}

export function useUpdateBoxAssignments(
  groupId: string
): UseMutationResult<BoxGroup, Error, string[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (boxIds: string[]) => api.boxGroups.updateBoxes(groupId, boxIds),
    onSuccess: (updatedGroup) => {
      queryClient.setQueryData(boxGroups.detail(groupId).queryKey, updatedGroup);
      queryClient.invalidateQueries({ queryKey: boxGroups.all.queryKey });
      queryClient.invalidateQueries({ queryKey: boxes.all.queryKey });
      queryClient.invalidateQueries({ queryKey: boxes.unassigned.queryKey });
    },
  });
}
