'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ListTableSkeleton } from '@/components/skeletons';
import { PageContainer } from '@/components/layout/PageContainer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatusBadge } from '@/components/ui/status-badge';

interface BatchListColumn<T> {
  header: string;
  align?: 'left' | 'right';
  render: (item: T) => React.ReactNode;
}

interface BatchListPageProps<T extends { id: string; name: string; status?: string; createdAt: Date | string }> {
  title: string;
  subtitle: string;
  newLabel: string;
  newPath: string;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptySubtitle: string;
  items: T[];
  isLoading: boolean;
  deleteMutation: { isPending: boolean; mutateAsync: (id: string) => Promise<unknown> };
  deleteDialogTitle: string;
  deleteDialogDescription: string;
  deleteSuccessMessage: string;
  deleteErrorMessage: string;
  extraColumns?: BatchListColumn<T>[];
  basePath: string;
  onRowHover?: (id: string) => void;
}

export function BatchListPage<T extends { id: string; name: string; status?: string; createdAt: Date | string }>({
  title,
  subtitle,
  newLabel,
  newPath,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
  items,
  isLoading,
  deleteMutation,
  deleteDialogTitle,
  deleteDialogDescription,
  deleteSuccessMessage,
  deleteErrorMessage,
  extraColumns = [],
  basePath,
  onRowHover,
}: BatchListPageProps<T>) {
  const router = useRouter();
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
      await deleteMutation.mutateAsync(id);
      toast.success('삭제 완료', { description: deleteSuccessMessage });
    } catch {
      toast.error('삭제 실패', { description: deleteErrorMessage });
    }
  };

  if (isLoading) {
    return <ListTableSkeleton />;
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <button
          onClick={() => router.push(newPath)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />{newLabel}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed rounded-xl text-gray-400">
          {emptyIcon}
          <p className="font-medium text-gray-500">{emptyTitle}</p>
          <p className="text-sm mt-1">{emptySubtitle}</p>
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden relative">
          {deleteMutation.isPending && (
            <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-white/80 backdrop-blur-sm border-b px-4 py-2 text-sm text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              삭제 중...
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">배치명</th>
                {extraColumns.map((col, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 font-medium text-gray-600 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {col.header}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-gray-600">생성일</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => router.push(`${basePath}/${item.id}`)}
                  onMouseEnter={onRowHover ? () => onRowHover(item.id) : undefined}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {item.name}
                    {item.status === 'CONFIRMED' && (
                      <span className="ml-2"><StatusBadge variant="confirmed" /></span>
                    )}
                  </td>
                  {extraColumns.map((col, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3 ${col.align === 'right' ? 'text-right text-gray-600' : 'text-gray-600'}`}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-gray-500">
                    {new Date(item.createdAt as string).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => handleDeleteClick(e, item.id)}
                      disabled={deleteMutation.isPending}
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
        title={deleteDialogTitle}
        description={deleteDialogDescription}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  );
}
