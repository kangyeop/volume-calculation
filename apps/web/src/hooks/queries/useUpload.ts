import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { outbounds, products } from './queryKeys';
import type { ParseUploadResponse, ConfirmUploadResponse, ProductMappingData } from '@wms/types';

export function useUploadParse() {
  return useMutation<
    ParseUploadResponse['data'],
    Error,
    { file: File; type: 'outbound' | 'product'; projectId: string }
  >({
    mutationFn: ({ file, type, projectId }) => {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('파일 크기는 10MB를 초과할 수 없습니다.');
      }

      const allowedExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error(
          `허용되지 않는 파일 형식입니다. ${allowedExtensions.join(', ')}만 업로드 가능합니다.`,
        );
      }

      return api.upload.parse(file, type, projectId);
    },
    onSuccess: (data) => {
      toast.success('분석 완료', {
        description: `AI가 ${data.rowCount}개의 데이터를 분석했습니다.`,
      });
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

  return useMutation<
    ConfirmUploadResponse['data'],
    Error,
    {
      projectId: string;
      orders: Array<{
        orderId: string;
        sku: string;
        quantity: number;
        recipientName?: string;
        address?: string;
        productId?: string | null;
      }>;
    }
  >({
    mutationFn: ({ projectId, orders }) => api.upload.confirm(projectId, orders),
    onSuccess: (data) => {
      toast.success('가져오기 완료', {
        description: `${data.imported}개의 데이터가 등록되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: outbounds.all._def });
      queryClient.invalidateQueries({ queryKey: products.all._def });
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : '매핑 확인 중 오류가 발생했습니다.';
      toast.error('오류', { description: errorMessage });
    },
  });
}

export function useUploadMapProducts() {
  return useMutation<
    ProductMappingData,
    Error,
    {
      projectId: string;
      columnMapping: Record<string, string | null>;
      rows: Record<string, unknown>[];
    }
  >({
    mutationFn: ({ projectId, columnMapping, rows }) =>
      api.upload.mapProducts(projectId, columnMapping, rows),
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : '제품 매핑 중 오류가 발생했습니다.';
      toast.error('오류', { description: errorMessage });
    },
  });
}
