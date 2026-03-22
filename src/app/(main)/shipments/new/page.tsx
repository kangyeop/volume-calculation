'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExcelUpload } from '@/components/ExcelUpload';
import { useShipmentUploadFlow } from '@/hooks/useShipmentUploadFlow';

type ShipmentFormat = 'adjustment' | 'beforeMapping' | 'afterMapping';

const FORMAT_OPTIONS: { value: ShipmentFormat; label: string }[] = [
  { value: 'adjustment', label: '정산' },
  { value: 'beforeMapping', label: '매핑 전' },
  { value: 'afterMapping', label: '매핑 후' },
];

export default function OutboundCreate() {
  const router = useRouter();
  const flow = useShipmentUploadFlow();
  const [format, setFormat] = useState<ShipmentFormat>('adjustment');

  const handleFileSelect = async (file: File) => {
    try {
      const resultPromise = flow.mutateAsync({ file, format });
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
    <div className="space-y-6 max-w-4xl">
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">양식 선택</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ShipmentFormat)}
            disabled={flow.isPending}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {flow.isPending ? (
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
    </div>
  );
}
