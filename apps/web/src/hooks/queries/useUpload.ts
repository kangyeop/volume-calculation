import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

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

export function useUploadParse() {
  return useMutation({
    mutationFn: ({ file, type, projectId }: { file: File; type: 'outbound' | 'product'; projectId: string }) => {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('파일 크기는 10MB를 초과할 수 없습니다.');
      }

      const allowedExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error(`허용되지 않는 파일 형식입니다. ${allowedExtensions.join(', ')}만 업로드 가능합니다.`);
      }

      return api.upload.parse(file, type, projectId);
    },
    onSuccess: (data) => {
      toast.success('분석 완료', { description: `AI가 ${data.data.rowCount}개의 데이터를 분석했습니다.` });
    },
    onError: (error) => {
      let errorMessage = '파일 처리 중 오류가 발생했습니다.';

      if (error instanceof Error) {
        if (error.message.includes('파일 크기') || error.message.includes('파일 형식')) {
          errorMessage = error.message;
        } else if (error.message.includes('AI')) {
          errorMessage = 'AI가 파일을 분석하지 못했습니다. 파일 형식을 확인하고 다시 시도해주세요.';
        }
      }

      toast.error('오류', { description: errorMessage });
    },
  });
}

export function useUploadConfirm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, mapping }: { sessionId: string; mapping: Record<string, string | null> }) =>
      api.upload.confirm(sessionId, mapping) as Promise<ConfirmUploadResponse>,
    onSuccess: (data) => {
      toast.success('가져오기 완료', { description: `${data.data.imported}개의 데이터가 등록되었습니다.` });
      queryClient.invalidateQueries({ queryKey: ['outbounds'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : '매핑 확인 중 오류가 발생했습니다.';
      toast.error('오류', { description: errorMessage });
    },
  });
}

export function useDeleteUploadSession() {
  return useMutation({
    mutationFn: (sessionId: string) => api.upload.deleteSession(sessionId),
  });
}
