'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/PageContainer';
import { ColumnMappingUpload } from '@/components/upload/ColumnMappingUpload';
import { useShipmentUploadFlow } from '@/hooks/useShipmentUploadFlow';
import type { ColumnMapping } from '@/types';

export default function OutboundCreate() {
  const router = useRouter();
  const flow = useShipmentUploadFlow();

  const handleConfirm = async (file: File, mapping: ColumnMapping) => {
    try {
      const resultPromise = flow.mutateAsync({ file, mapping });
      router.prefetch('/shipments');
      const result = await resultPromise;
      toast.success('업로드 완료', { description: `${result.imported}건이 등록되었습니다.` });
      router.replace(`/shipments/${result.shipmentId}`);
    } catch {
      toast.error('업로드 실패', { description: '처리 중 오류가 발생했습니다.' });
    }
  };

  const handleCancel = () => {
    if (flow.isPending) return;
    flow.reset();
    router.push('/shipments');
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <button
          onClick={handleCancel}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">새 출고</h1>
          <p className="text-muted-foreground">엑셀 파일을 업로드하여 출고 데이터를 등록합니다.</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
        {flow.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {flow.error.message}
          </div>
        )}

        <ColumnMappingUpload
          type="shipment"
          onConfirm={handleConfirm}
          isPending={flow.isPending}
        />
      </div>
    </PageContainer>
  );
}
