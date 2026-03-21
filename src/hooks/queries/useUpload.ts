import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { outbounds, products } from './queryKeys';
import type { ConfirmUploadResponse, ProductMappingData } from '@/types';

export function useUploadParse() {
}

export function useUploadConfirm() {
  const queryClient = useQueryClient();

  return useMutation<
    ConfirmUploadResponse['data'],
    Error,
    {
      outboundBatchId: string;
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
    mutationFn: ({ outboundBatchId, orders }) => api.upload.confirm(outboundBatchId, orders),
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
      columnMapping: Record<string, string | null>;
      rows: Record<string, unknown>[];
    }
  >({
    mutationFn: ({ columnMapping, rows }) =>
      api.upload.mapProducts(columnMapping, rows),
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : '제품 매핑 중 오류가 발생했습니다.';
      toast.error('오류', { description: errorMessage });
    },
  });
}
