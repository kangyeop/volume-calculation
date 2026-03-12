import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ExcelUpload } from '@/components/ExcelUpload';
import { AlertCircle, CheckCircle, Loader2, ArrowLeft, PackageX } from 'lucide-react';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { OutboundUploadResult } from '@wms/types';

export const OutboundUpload: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<OutboundUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (!projectId) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const uploadResult = await api.outbound.uploadDirect(projectId, file);
      setResult(uploadResult);

      if (uploadResult.imported > 0) {
        toast.success('업로드 완료', {
          description: `${uploadResult.imported}건의 출고 데이터가 저장되었습니다.`,
        });
        queryClient.invalidateQueries({ queryKey: ['outbounds', projectId] });
      } else {
        toast.warning('저장된 데이터 없음', {
          description: '유효한 출고 데이터를 찾지 못했습니다.',
        });
      }
    } catch (err) {
      console.error('Upload failed:', err);
      const errorMessage =
        err instanceof Error ? err.message : '파일 업로드 중 오류가 발생했습니다.';
      setError(errorMessage);
      toast.error('업로드 실패', {
        description: errorMessage,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBackToDashboard}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">출고 데이터 업로드</h1>
          <p className="text-muted-foreground">
            엑셀 파일을 업로드하여 출고 데이터를 일괄 등록합니다.
          </p>
        </div>
      </div>

      {!result ? (
        <div className="bg-white border rounded-xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              {isUploading ? (
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              ) : (
                <div className="text-blue-600 font-bold">XLS</div>
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
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                <AlertCircle className="h-5 w-5" />
                <span>업로드 오류</span>
              </div>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              권장 파일 형식
            </h4>
            <ul className="list-disc ml-5 space-y-1 text-blue-700">
              <li>주문번호 (Order ID)</li>
              <li>상품코드 (SKU) 또는 상품명</li>
              <li>수량 (Quantity)</li>
            </ul>
            <p className="mt-3 text-xs opacity-80">
              * 시스템에 등록된 상품코드(SKU)와 일치하는 데이터만 정상적으로 저장됩니다.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="bg-green-100 p-3 rounded-full mb-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-600">저장 완료</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{result.imported}건</p>
            </div>

            <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="bg-amber-100 p-3 rounded-full mb-3">
                <PackageX className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-600">미매칭 데이터</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{result.unmatched.length}건</p>
            </div>

            <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="bg-blue-100 p-3 rounded-full mb-3">
                <div className="h-8 w-8 flex items-center justify-center text-blue-600 font-bold text-xl">
                  Σ
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-600">총 처리 행수</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{result.totalRows}행</p>
            </div>
          </div>

          {result.unmatched.length > 0 && (
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-amber-50 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <h3 className="font-bold text-amber-800">
                  상품을 찾을 수 없는 데이터 ({result.unmatched.length}건)
                </h3>
              </div>
              <div className="p-4 bg-amber-50/50 text-sm text-amber-700 border-b">
                아래 데이터는 시스템에 등록된 상품과 매칭되지 않아 저장되지 않았습니다. 상품 관리
                메뉴에서 상품을 먼저 등록하거나 SKU를 확인해주세요.
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-700 font-medium border-b sticky top-0">
                    <tr>
                      <th className="px-4 py-3">입력된 SKU/상품명</th>
                      <th className="px-4 py-3">수량</th>
                      <th className="px-4 py-3">사유</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.unmatched.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {item.sku || item.rawValue || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-amber-600 text-xs">
                          {item.reason || '상품을 찾을 수 없음'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => setResult(null)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              새 파일 업로드
            </button>
            <button
              onClick={handleBackToDashboard}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              대시보드로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
