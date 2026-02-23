import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useOutbounds, useDeleteOutbounds } from '@/hooks/queries';
import { useUploadParse, useUploadConfirm } from '@/hooks/queries';
import { useOutboundUpload } from '@/hooks/useOutboundUpload';
import { ExcelUpload } from '@/components/ExcelUpload';
import { AlertCircle, Loader2, Trash2, Package, Search, Upload, FileSpreadsheet, ArrowLeft } from 'lucide-react';

const OUTBOUND_FIELDS = ['orderId', 'sku', 'quantity', 'recipientName'];

export const OutboundManager: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { data: outbounds = [] } = useOutbounds(projectId || '');
  const deleteOutbounds = useDeleteOutbounds(projectId || '');
  const uploadParse = useUploadParse();
  const uploadConfirm = useUploadConfirm();
  const uploadState = useOutboundUpload(projectId || '');
  const [isAutoConfirming, setIsAutoConfirming] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const filteredOutbounds = outbounds.filter(
    (o) =>
      o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleUpload = async (file: File) => {
    if (!projectId) return;

    uploadState.setUploadFile(file);
    uploadState.setUploading(true);
    uploadState.setErrors([]);

    try {
      const response = await uploadParse.mutateAsync({
        file,
        type: 'outbound',
        projectId: projectId,
      });

      if (response.success) {
        uploadState.setUploadSession(response.data);
        await autoConfirmOutboundMapping(response.data);
      }
    } catch (error) {
      console.error('AI parsing failed:', error);
      await uploadState.fallbackUpload(file);
    }
  };

  const autoConfirmOutboundMapping = async (uploadSession: {
    sessionId: string;
    mapping: {
      mapping: Record<string, { columnName: string; confidence: number } | null>;
    };
  }) => {
    setIsAutoConfirming(true);
    uploadState.setShowMappingUI(true);

    try {
      const mapping: Record<string, string | null> = {};

      OUTBOUND_FIELDS.forEach((field) => {
        const fieldMapping = uploadSession.mapping.mapping[field];
        mapping[field] = fieldMapping?.columnName || null;
      });

      await uploadConfirm.mutateAsync({
        sessionId: uploadSession.sessionId,
        mapping,
      });

      toast.success('가져오기 완료', { description: '출고가 성공적으로 등록되었습니다.' });
      uploadState.setShowMappingUI(false);
      uploadState.setUploadSession(null);
      setShowUpload(false);
    } catch (error) {
      console.error('Failed to auto-confirm mapping:', error);
      uploadState.setErrors(['매핑 확인 중 오류가 발생했습니다.']);
    } finally {
      setIsAutoConfirming(false);
      uploadState.setUploading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!projectId) return;
    if (!confirm('모든 출고 데이터를 삭제하시겠습니까?')) return;

    try {
      await deleteOutbounds.mutateAsync();
      toast.success('삭제되었습니다.');
    } catch (error) {
      toast.error('삭제에 실패했습니다.');
    }
  };

  if (showUpload) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowUpload(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">엑셀 업로드</h1>
            <p className="text-muted-foreground">Excel 파일로 출고 데이터를 일괄 등록합니다.</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto py-8">
          {(uploadState.isUploading || isAutoConfirming) && !uploadState.showMappingUI ? (
            <div className="bg-white border rounded-xl p-8 shadow-sm space-y-6">
              <div className="text-center space-y-2">
                <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  {(uploadParse.isPending || isAutoConfirming) ? (
                    <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-8 w-8 text-indigo-600" />
                  )}
                </div>
                <h2 className="text-xl font-bold">엑셀 파일 업로드</h2>
                <p className="text-muted-foreground text-sm">
                  {isAutoConfirming ? 'Processing outbounds...' : '주문번호, SKU, 수량이 포함된 Excel 파일을 업로드하세요.'}
                </p>
              </div>

              <ExcelUpload onUpload={handleUpload} title="클릭하거나 파일을 드래그하세요" />

              {uploadParse.isError && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700 font-bold mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <span>AI 분석 실패</span>
                  </div>
                  <p className="text-sm text-yellow-600">
                    AI가 파일을 분석하지 못했습니다. 파일을 다시 시도하거나 기존 방식으로
                    업로드하세요.
                  </p>
                </div>
              )}

              {uploadState.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-red-700 font-bold mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <span>Validation Errors ({uploadState.errors.length})</span>
                  </div>
                  <ul className="text-xs text-red-600 space-y-2 max-h-60 overflow-y-auto">
                    {uploadState.errors.map((err, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="opacity-50">•</span>
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border rounded-xl p-8 shadow-sm space-y-6">
              <div className="text-center space-y-2">
                <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="h-8 w-8 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold">엑셀 파일 업로드</h2>
                <p className="text-muted-foreground text-sm">
                  주문번호, SKU, 수량이 포함된 Excel 파일을 업로드하세요.
                </p>
              </div>

              <ExcelUpload onUpload={handleUpload} title="클릭하거나 파일을 드래그하세요" />
            </div>
          )}

          {!uploadState.isUploading && !isAutoConfirming && uploadState.errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-red-700 font-bold mb-3">
                <AlertCircle className="h-4 w-4" />
                <span>Validation Errors ({uploadState.errors.length})</span>
              </div>
              <ul className="text-xs text-red-600 space-y-2 max-h-60 overflow-y-auto">
                {uploadState.errors.map((err: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="opacity-50">•</span>
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">출고 등록</h1>
          <p className="text-muted-foreground">CBM 계산을 위한 출고 데이터 ({outbounds.length}건)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
          >
            <Upload className="h-4 w-4" />
            엑셀 업로드
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={outbounds.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            전체 삭제
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">등록된 출고</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="검색..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">주문번호</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">SKU</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">수량</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">수취인</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOutbounds.map((o, i) => (
                  <tr key={o.id || i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-indigo-600">{o.orderId}</td>
                    <td className="px-4 py-3 font-mono">{o.sku}</td>
                    <td className="px-4 py-3 text-right">{o.quantity}</td>
                    <td className="px-4 py-3">{o.recipientName || '-'}</td>
                  </tr>
                ))}
                {filteredOutbounds.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      {searchTerm ? '검색 결과가 없습니다.' : '엑셀 파일을 업로드하세요.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
