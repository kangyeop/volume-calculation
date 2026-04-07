'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProductGroups, useDeleteProductGroup } from '@/hooks/queries';
import { Plus, Package, Trash2, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { usePrefetchProductGroup } from '@/hooks/usePrefetch';
import { ListTableSkeleton } from '@/components/skeletons';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProductSearchTab } from '@/components/products/ProductSearchTab';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function ProductGroupList() {
  const router = useRouter();
  const { data: groups = [], isLoading } = useProductGroups();
  const deleteGroup = useDeleteProductGroup();
  const prefetch = usePrefetchProductGroup();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  type SortKey = 'name' | 'productCount' | 'createdAt';
  type SortDirection = 'asc' | 'desc';
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sorted = useMemo(() => {
    return [...groups].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      const valA = a[sortKey] ?? '';
      const valB = b[sortKey] ?? '';
      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
  }, [groups, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
    );
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteTarget(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteGroup.mutateAsync(id);
      toast.success('삭제 완료', { description: '상품 그룹이 삭제되었습니다.' });
    } catch {
      toast.error('삭제 실패', { description: '상품 그룹 삭제에 실패했습니다.' });
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">상품 관리</h1>
          <p className="text-muted-foreground mt-1">상품 그룹과 개별 상품을 관리합니다.</p>
        </div>
        <button
          onClick={() => router.push('/products/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />새 상품 그룹
        </button>
      </div>

      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups">상품 그룹</TabsTrigger>
          <TabsTrigger value="search">상품 검색</TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          {isLoading ? (
            <ListTableSkeleton />
          ) : groups.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed rounded-xl text-gray-400">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">등록된 상품 그룹이 없습니다.</p>
              <p className="text-sm mt-1">새 상품 그룹을 만들어보세요.</p>
            </div>
          ) : (
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden relative">
              {deleteGroup.isPending && (
                <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-white/80 backdrop-blur-sm border-b px-4 py-2 text-sm text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  삭제 중...
                </div>
              )}
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th
                      className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                      onClick={() => handleSort('name')}
                    >
                      <span className="inline-flex items-center gap-1">그룹명 <SortIcon column="name" /></span>
                    </th>
                    <th
                      className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                      onClick={() => handleSort('productCount')}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">상품 수 <SortIcon column="productCount" /></span>
                    </th>
                    <th
                      className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                      onClick={() => handleSort('createdAt')}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">생성일 <SortIcon column="createdAt" /></span>
                    </th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sorted.map((group) => (
                    <tr
                      key={group.id}
                      onClick={() => router.push(`/products/${group.id}`)}
                      onMouseEnter={() => prefetch(group.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{group.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {group.productCount ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {new Date(group.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => handleDeleteClick(e, group.id)}
                          disabled={deleteGroup.isPending}
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
        </TabsContent>

        <TabsContent value="search">
          <ProductSearchTab />
        </TabsContent>
      </Tabs>
      <ConfirmDialog
        open={!!deleteTarget}
        title="상품 그룹 삭제"
        description="상품 그룹을 삭제하시겠습니까?"
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  );
}
