'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBoxes, useDeleteBox } from '@/hooks/queries';
import { Plus, Box as BoxIcon, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ListTableSkeleton } from '@/components/skeletons';
import { PageContainer } from '@/components/layout/PageContainer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type FilterMode = 'all' | 'unassigned';

export default function BoxList() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterMode>('all');
  const { data: allBoxes = [], isLoading: isLoadingAll } = useBoxes();
  const { data: unassignedBoxes = [], isLoading: isLoadingUnassigned } = useBoxes({
    unassigned: true,
  });
  const deleteBox = useDeleteBox();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const isLoading = filter === 'all' ? isLoadingAll : isLoadingUnassigned;
  const boxes = filter === 'all' ? allBoxes : unassignedBoxes;

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteTarget(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteBox.mutateAsync({ id });
      toast.success('삭제 완료', { description: '박스가 삭제되었습니다.' });
    } catch {
      toast.error('삭제 실패', { description: '박스 삭제에 실패했습니다.' });
    }
  };

  if (isLoading) {
    return <ListTableSkeleton />;
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">박스 관리</h1>
          <p className="text-muted-foreground mt-1">박스를 관리합니다.</p>
        </div>
        <button
          onClick={() => router.push('/boxes/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />새 박스
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setFilter('unassigned')}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            filter === 'unassigned'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}
        >
          미할당
        </button>
      </div>

      {boxes.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed rounded-xl text-gray-400">
          <BoxIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">
            {filter === 'unassigned' ? '미할당 박스가 없습니다.' : '등록된 박스가 없습니다.'}
          </p>
          <p className="text-sm mt-1">새 박스를 만들어보세요.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden relative">
          {deleteBox.isPending && (
            <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-white/80 backdrop-blur-sm border-b px-4 py-2 text-sm text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              삭제 중...
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">박스명</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">크기 (cm)</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">CBM</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">가격</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">소속 그룹</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {boxes.map((box) => (
                <tr
                  key={box.id}
                  onClick={() => router.push(`/boxes/${box.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{box.name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {box.length} x {box.width} x {box.height}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 font-mono">
                    {((box.length * box.width * box.height) / 1_000_000).toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {box.price != null ? `₩${box.price.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {box.boxGroupId ? (
                      <span className="text-gray-600">{box.boxGroup?.name ?? box.boxGroupId}</span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                        미할당
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => handleDeleteClick(e, box.id)}
                      disabled={deleteBox.isPending}
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
        title="박스 삭제"
        description="이 박스를 삭제하시겠습니까?"
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  );
}
