import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOutboundBatches, useDeleteOutboundBatch } from '@/hooks/queries';
import { Plus, Truck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const OutboundList: React.FC = () => {
  const navigate = useNavigate();
  const { data: batches = [], isLoading } = useOutboundBatches();
  const deleteBatch = useDeleteOutboundBatch();

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
          onClick={() => navigate('/outbound/new')}
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
    </div>
  );
};
