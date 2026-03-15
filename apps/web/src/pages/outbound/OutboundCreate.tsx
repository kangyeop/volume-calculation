import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExcelUpload } from '@/components/ExcelUpload';
import { toast } from 'sonner';
import { ArrowLeft, AlertCircle, CheckCircle, Loader2, PackageX } from 'lucide-react';
import { api, type OutboundBatch } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { outboundBatches } from '@/hooks/queries/queryKeys';

export const OutboundCreate: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [createdBatch, setCreatedBatch] = useState<OutboundBatch | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setCreatedBatch(null);

    try {
      const batch = await api.outboundBatches.upload(file);
      setCreatedBatch(batch);
      toast.success('업로드 완료', {
        description: `출고 배치가 생성되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: outboundBatches.all.queryKey });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '파일 업로드 중 오류가 발생했습니다.';
      setError(errorMessage);
      toast.error('업로드 실패', { description: errorMessage });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/outbound')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">새 출고</h1>
          <p className="text-muted-foreground">엑셀 파일을 업로드하여 출고 데이터를 등록합니다.</p>
        </div>
      </div>

      {!createdBatch ? (
        <div className="bg-white border rounded-xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              {isUploading ? (
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              ) : (
                <div className="text-blue-600 font-bold text-sm">XLS</div>
              )}
            </div>
            <h2 className="text-xl font-bold">파일 업로드</h2>
            <p className="text-muted-foreground text-sm">
              {isUploading
                ? '데이터를 처리하고 있습니다. 잠시만 기다려주세요...'
                : '출고 데이터가 포함된 엑셀 파일을 업로드해주세요.'}
            </p>
          </div>

          {!isUploading && (
            <ExcelUpload
              onUpload={handleUpload}
              title="클릭하거나 엑셀 파일을 여기에 드래그하세요"
            />
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                <AlertCircle className="h-5 w-5" />
                <span>업로드 오류</span>
              </div>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              권장 파일 형식
            </h4>
            <ul className="list-disc ml-5 space-y-1 text-blue-700">
              <li>주문번호 (Order ID)</li>
              <li>상품코드 (SKU) 또는 상품명</li>
              <li>수량 (Quantity)</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="bg-green-100 p-3 rounded-full mb-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-600">배치 생성 완료</h3>
              <p className="text-xl font-bold text-gray-900 mt-1">{createdBatch.name}</p>
            </div>
            <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="bg-blue-100 p-3 rounded-full mb-3">
                <PackageX className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-600">주문 수</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {createdBatch.orderCount ?? '-'}
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => setCreatedBatch(null)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              새 파일 업로드
            </button>
            <button
              onClick={() => navigate(`/outbound/${createdBatch.id}`)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              출고 상세 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
