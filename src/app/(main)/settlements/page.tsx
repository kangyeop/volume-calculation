'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calculator, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ListTableSkeleton } from '@/components/skeletons';
import { PageContainer } from '@/components/layout/PageContainer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useSettlements, useDeleteSettlement } from '@/hooks/queries';

export default function SettlementList() {
  const router = useRouter();
  const { data: settlements = [], isLoading } = useSettlements();
  const deleteSettlement = useDeleteSettlement();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteTarget(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteSettlement.mutateAsync(id);
      toast.success('삭제 완료', { description: '정산이 삭제되었습니다.' });
    } catch {
      toast.error('삭제 실패', { description: '정산 삭제에 실패했습니다.' });
    }
  };

  if (isLoading) {
    return <ListTableSkeleton />;
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">정산</h1>
          <p className="text-muted-foreground mt-1">정산 배치를 관리합니다.</p>
        </div>
        <button
          onClick={() => router.push('/settlements/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />새 정산
        </button>
      </div>

      {settlements.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed rounded-xl text-gray-400">
          <Calculator className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">등록된 정산이 없습니다.</p>
          <p className="text-sm mt-1">새 정산을 등록해보세요.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden relative">
          {deleteSettlement.isPending && (
            <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-white/80 backdrop-blur-sm border-b px-4 py-2 text-sm text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              삭제 중...
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">배치명</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">생성일</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {settlements.map((settlement) => (
                <tr
                  key={settlement.id}
                  onClick={() => router.push(`/settlements/${settlement.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {settlement.name}
                    {settlement.status === 'CONFIRMED' && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        확정
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {new Date(settlement.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => handleDeleteClick(e, settlement.id)}
                      disabled={deleteSettlement.isPending}
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
      <ConfirmDialog
        open={!!deleteTarget}
        title="정산 삭제"
        description="정산을 삭제하시겠습니까? 관련된 주문 데이터도 함께 삭제됩니다."
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  );
}
