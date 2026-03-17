import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOutboundBatches, useDeleteOutboundBatch } from '@/hooks/queries';
import { useUploadOutboundBatch } from '@/hooks/queries';
import { Plus, Truck, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExcelUpload } from '@/components/ExcelUpload';

export const OutboundList: React.FC = () => {
  const navigate = useNavigate();
  const { data: batches = [], isLoading } = useOutboundBatches();
  const deleteBatch = useDeleteOutboundBatch();
  const uploadBatch = useUploadOutboundBatch();
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('출고 배치를 삭제하시겠습니까?')) return;
    try {
      await deleteBatch.mutateAsync(id);
      toast.success('삭제 완료', { description: '출고 배치가 삭제되었습니다.' });
    } catch {
      toast.error('삭제 실패', { description: '출고 배치 삭제에 실패했습니다.' });
    }
  };

  const handleUpload = async (file: File) => {
    try {
      const batch = await uploadBatch.mutateAsync(file);
      setShowUploadModal(false);
      toast.success('업로드 완료', { description: '출고 배치가 생성되었습니다.' });
      navigate(`/outbound/${batch.id}`);
    } catch {
      toast.error('업로드 실패', { description: '파일 업로드 중 오류가 발생했습니다.' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">출고</h1>
          <p className="text-muted-foreground mt-1">출고 배치를 관리합니다.</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />새 출고
        </button>
      </div>

      {batches.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed rounded-xl text-gray-400">
          <Truck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">등록된 출고 배치가 없습니다.</p>
          <p className="text-sm mt-1">새 출고를 등록해보세요.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">배치명</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">주문 수</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">생성일</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {batches.map((batch) => (
                <tr
                  key={batch.id}
                  onClick={() => navigate(`/outbound/${batch.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{batch.name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{batch.orderCount ?? '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {new Date(batch.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => handleDelete(e, batch.id)}
                      disabled={deleteBatch.isPending}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !uploadBatch.isPending && setShowUploadModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">새 출고</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploadBatch.isPending}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">엑셀 파일을 업로드하여 출고 데이터를 등록합니다.</p>
            {uploadBatch.isPending ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                <p className="text-sm text-gray-500">데이터를 처리하고 있습니다...</p>
              </div>
            ) : (
              <ExcelUpload
                onUpload={handleUpload}
                title="클릭하거나 엑셀 파일을 여기에 드래그하세요"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
