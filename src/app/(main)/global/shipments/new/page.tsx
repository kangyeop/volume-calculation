'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExcelUpload } from '@/components/ExcelUpload';
import { PageContainer } from '@/components/layout/PageContainer';
import { useUploadGlobalShipment } from '@/hooks/queries';

export default function GlobalShipmentCreate() {
  const router = useRouter();
  const upload = useUploadGlobalShipment();

  const handleFileSelect = async (file: File) => {
    try {
      const resultPromise = upload.mutateAsync({ file, format: 'globalStandard' });
      router.prefetch('/global/shipments');
      const result = await resultPromise;
      const unmatchedCount = result.unmatched?.length ?? 0;
      toast.success('업로드 완료', {
        description:
          unmatchedCount > 0
            ? `${result.imported}건 등록, 미매칭 ${unmatchedCount}건`
            : `${result.imported}건이 등록되었습니다.`,
      });
      router.replace(`/global/shipments/${result.shipmentId}`);
    } catch {
      toast.error('업로드 실패', { description: '처리 중 오류가 발생했습니다.' });
    }
  };

  const handleCancel = () => {
    if (upload.isPending) return;
    upload.reset();
    router.push('/global/shipments');
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
          <h1 className="text-2xl font-bold tracking-tight">새 글로벌 출고</h1>
          <p className="text-muted-foreground">
            엑셀 파일을 업로드하여 글로벌 출고 데이터를 등록합니다.
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
        {upload.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {upload.error.message}
          </div>
        )}

        {upload.data && upload.data.unmatched.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            매칭되지 않은 SKU {upload.data.unmatched.length}건이 있습니다. 글로벌 상품에 등록된 SKU인지 확인해주세요.
          </div>
        )}

        <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
          <strong>엑셀 컬럼:</strong> 상품명, 출고수량 (유통기한 · 로트번호는 있어도 무시됩니다)
        </div>

        {upload.isPending ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-gray-500">데이터를 처리하고 있습니다...</p>
          </div>
        ) : (
          <ExcelUpload
            onUpload={handleFileSelect}
            title="클릭하거나 엑셀 파일을 여기에 드래그하세요"
          />
        )}
      </div>
    </PageContainer>
  );
}
