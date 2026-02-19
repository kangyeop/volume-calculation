import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { upload } from './queryKeys';

// 타입 정의
export interface ParseUploadResponse {
  success: boolean;
  data: {
    sessionId: string;
    headers: string[];
    rowCount: number;
    sampleRows: Record<string, unknown>[];
    mapping: {
      confidence: number;
      mapping: Record<string, { columnName: string; confidence: number } | null>;
      unmappedColumns: string[];
      notes?: string;
    };
    fileName: string;
  };
}

export interface ConfirmUploadResponse {
  success: boolean;
  data: {
    imported: number;
    batchId?: string;
  };
}

export function useUploadParse(): UseMutationResult<ParseUploadResponse, Error, { file: File; type: 'outbound' | 'product'; projectId: string }> {
  return useMutation({
    mutationFn: ({ file, type, projectId }) => api.upload.parse(file, type, projectId),
    mutationKey: upload.parse._def,
  });
}

export function useUploadConfirm(): UseMutationResult<ConfirmUploadResponse, Error, { sessionId: string; mapping: Record<string, string | null> }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, mapping }) => api.upload.confirm(sessionId, mapping),
    mutationKey: upload.confirm._def,
    onSuccess: () => {
      // 세션 데이터 무효화
      queryClient.removeQueries({ queryKey: upload.session._def });
    },
  });
}

export function useDeleteUploadSession(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId) => api.upload.deleteSession(sessionId),
    onSuccess: () => {
      // 세션 데이터 무효화
      queryClient.removeQueries({ queryKey: upload.session._def });
    },
  });
}