import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { columnMappingTemplates } from './queryKeys';
import type { MappingType, ColumnMapping } from '@/types';

export function useColumnMappingTemplates(type: MappingType) {
  return useQuery({
    ...columnMappingTemplates.byType(type),
    queryFn: () => api.columnMappingTemplates.list(type),
  });
}

export function useSaveColumnMappingTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; type: MappingType; mapping: ColumnMapping; isDefault?: boolean }) =>
      api.columnMappingTemplates.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: columnMappingTemplates.byType(variables.type).queryKey });
    },
  });
}

export function useDeleteColumnMappingTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; type: MappingType }) =>
      api.columnMappingTemplates.delete(id),
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: columnMappingTemplates.byType(type).queryKey });
    },
  });
}
