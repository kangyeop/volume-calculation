'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExcelUpload } from '@/components/ExcelUpload';
import { PageContainer } from '@/components/layout/PageContainer';
import { useUploadSettlement } from '@/hooks/queries';

export default function SettlementCreate() {
  const router = useRouter();
  const upload = useUploadSettlement();

  const handleFileSelect = async (file: File) => {
    try {
      const resultPromise = upload.mutateAsync(file);
      router.prefetch('/settlements');
      const result = await resultPromise;
      toast.success('업로드 완료', { description: `${result.imported}건 처리 완료` });
      router.replace(`/settlements/${result.shipmentId}`);
    } catch {
      toast.error('업로드 실패', { description: '처리 중 오류가 발생했습니다.' });
    }
  };

  const handleCancel = () => {
    if (upload.isPending) return;
    upload.reset();
    router.push('/settlements');
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
          <h1 className="text-2xl font-bold tracking-tight">새 정산</h1>
          <p className="text-muted-foreground">정산 엑셀 파일을 업로드하여 기존 출고 데이터와 매칭합니다.</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
        {upload.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {upload.error.message}
          </div>
        )}

        {upload.isPending ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-gray-500">데이터를 처리하고 있습니다...</p>
          </div>
        ) : (
          <ExcelUpload
            onUpload={handleFileSelect}
            title="클릭하거나 정산 엑셀 파일을 여기에 드래그하세요"
          />
        )}
      </div>
    </PageContainer>
  );
}
