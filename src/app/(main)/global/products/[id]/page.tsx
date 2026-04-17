'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useGlobalProductGroup,
  useUpdateGlobalProductGroup,
  useGlobalProductsByGroup,
  useUpdateGlobalProduct,
  useDeleteGlobalProductsBulk,
} from '@/hooks/queries';
import type { GlobalProduct } from '@/hooks/queries/useGlobalProducts';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, AlertCircle, Check, X } from 'lucide-react';
import { ProductDetailSkeleton } from '@/components/skeletons';
import { PageContainer } from '@/components/layout/PageContainer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EditableTitle } from '@/components/ui/EditableTitle';

type EditDims = {
  width: number;
  length: number;
  height: number;
  innerQuantity: number;
};

export default function GlobalProductGroupDetail() {
  const params = useParams<{ id: string }>();
  const groupId = params.id ?? '';
  const router = useRouter();
  const { data: group, isLoading: groupLoading } = useGlobalProductGroup(groupId);
  const updateProductGroup = useUpdateGlobalProductGroup();
  const { data: productList = [], isLoading: productsLoading } =
    useGlobalProductsByGroup(groupId);
  const updateProduct = useUpdateGlobalProduct();
  const deleteBulk = useDeleteGlobalProductsBulk(groupId);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDims, setEditDims] = useState<EditDims>({
    width: 0,
    length: 0,
    height: 0,
    innerQuantity: 1,
  });

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedIds.size === productList.length && productList.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(productList.map((p: GlobalProduct) => p.id)));
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteSelected = async () => {
    if (!groupId || selectedIds.size === 0) return;
    setShowDeleteConfirm(false);
    try {
      await deleteBulk.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
      toast.success('삭제 완료', { description: '선택한 글로벌 상품이 삭제되었습니다.' });
    } catch {
      toast.error('삭제 실패');
    }
  };

  const startEditing = (p: GlobalProduct) => {
    setEditingId(p.id);
    setEditDims({
      width: p.width,
      length: p.length,
      height: p.height,
      innerQuantity: p.innerQuantity,
    });
  };

  const cancelEditing = () => setEditingId(null);

  const saveEditing = async () => {
    if (!editingId || !groupId) return;
    try {
      await updateProduct.mutateAsync({ id: editingId, data: editDims, groupId });
      toast.success('상품 정보가 변경되었습니다.');
      setEditingId(null);
    } catch {
      toast.error('상품 정보 변경 실패');
    }
  };

  const allSelected = productList.length > 0 && selectedIds.size === productList.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < productList.length;

  if (groupLoading) {
    return <ProductDetailSkeleton />;
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">글로벌 상품 그룹을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/global/products')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <EditableTitle
            value={group.name}
            onSave={async (next) => {
              try {
                await updateProductGroup.mutateAsync({ id: groupId, data: { name: next } });
                toast.success('그룹명이 변경되었습니다.');
              } catch {
                toast.error('그룹명 변경 실패');
                throw new Error();
              }
            }}
          />
          <p className="text-muted-foreground">글로벌 상품(내입 수량 포함)을 관리합니다.</p>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <span className="text-sm font-medium text-gray-700">
            총 {productList.length}개 상품
          </span>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={selectedIds.size === 0 || deleteBulk.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            선택 삭제
          </button>
        </div>
        <div className="overflow-x-auto">
          {productsLoading ? (
            <div className="px-4 py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={handleToggleAll}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">상품명</th>
                  <th className="px-4 py-3">규격 (W × L × H cm)</th>
                  <th className="px-4 py-3 text-right">내입 수량</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {productList.map((p: GlobalProduct) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => handleToggleRow(p.id)}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">{p.sku}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {editingId === p.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editDims.width}
                            onChange={(e) =>
                              setEditDims({
                                ...editDims,
                                width: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 px-1.5 py-1 border border-indigo-300 rounded text-xs font-mono text-center focus:ring-1 focus:ring-indigo-400 outline-none"
                            step="0.01"
                          />
                          <span className="text-gray-400">×</span>
                          <input
                            type="number"
                            value={editDims.length}
                            onChange={(e) =>
                              setEditDims({
                                ...editDims,
                                length: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 px-1.5 py-1 border border-indigo-300 rounded text-xs font-mono text-center focus:ring-1 focus:ring-indigo-400 outline-none"
                            step="0.01"
                          />
                          <span className="text-gray-400">×</span>
                          <input
                            type="number"
                            value={editDims.height}
                            onChange={(e) =>
                              setEditDims({
                                ...editDims,
                                height: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 px-1.5 py-1 border border-indigo-300 rounded text-xs font-mono text-center focus:ring-1 focus:ring-indigo-400 outline-none"
                            step="0.01"
                          />
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:text-indigo-600 hover:bg-indigo-50 px-1 rounded transition-colors"
                          onClick={() => startEditing(p)}
                          title="클릭하여 치수 편집"
                        >
                          {p.width} × {p.length} × {p.height}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === p.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={editDims.innerQuantity}
                            onChange={(e) =>
                              setEditDims({
                                ...editDims,
                                innerQuantity: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="w-20 px-1.5 py-1 border border-indigo-300 rounded text-xs font-mono text-center focus:ring-1 focus:ring-indigo-400 outline-none"
                            min={1}
                            step={1}
                          />
                          <button
                            onClick={saveEditing}
                            className="p-1 text-green-600 hover:text-green-800"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:text-indigo-600 hover:bg-indigo-50 px-1 rounded transition-colors font-mono"
                          onClick={() => startEditing(p)}
                          title="클릭하여 내입 수량 편집"
                        >
                          {p.innerQuantity}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {productList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                      등록된 상품이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="글로벌 상품 삭제"
        description={`선택한 ${selectedIds.size}개 상품을 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDeleteSelected}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </PageContainer>
  );
}
