'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProductGroup, useBoxGroups, useUpdateProductGroup } from '@/hooks/queries';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { products as productsKey } from '@/hooks/queries/queryKeys';
import { ExcelUpload } from '@/components/ExcelUpload';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Loader2, AlertCircle, Check, X } from 'lucide-react';
import { ProductDetailSkeleton } from '@/components/skeletons';
import { PageContainer } from '@/components/layout/PageContainer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Product } from '@/types';
import { useUpdateProduct } from '@/hooks/queries';

export default function ProductGroupDetail() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: group, isLoading: groupLoading } = useProductGroup(groupId || '');
  const { data: boxGroupList = [] } = useBoxGroups();
  const updateProductGroup = useUpdateProductGroup();

  const { data: productList = [], isLoading: productsLoading } = useQuery({
    ...productsKey.byGroup(groupId || ''),
    queryFn: () => api.products.listByGroup(groupId || ''),
    enabled: !!groupId,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDims, setEditDims] = useState<{
    width: number;
    length: number;
    height: number;
    barcode: boolean;
    aircap: boolean;
  }>({ width: 0, length: 0, height: 0, barcode: false, aircap: false });
  const updateProduct = useUpdateProduct();

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
      setSelectedIds(new Set(productList.map((p: Product) => p.id)));
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteSelected = async () => {
    if (!groupId || selectedIds.size === 0) return;
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await api.products.deleteBulkByGroup(groupId, Array.from(selectedIds));
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: productsKey.byGroup(groupId).queryKey });
      toast.success('삭제 완료', { description: '선택한 상품이 삭제되었습니다.' });
    } catch {
      toast.error('삭제 실패');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!groupId) return;
    setIsUploading(true);
    try {
      const result = await api.productUpload.parse(file, groupId);
      if (result.errors.length > 0) {
        toast.warning('일부 행 오류', {
          description: `${result.errors.length}건의 오류가 있습니다.`,
        });
      }
      toast.success('가져오기 완료', {
        description: `${result.imported}개의 상품이 등록되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: productsKey.byGroup(groupId).queryKey });
    } catch {
      toast.error('업로드 실패', { description: '상품 파일 처리에 실패했습니다.' });
    } finally {
      setIsUploading(false);
    }
  };

  const startEditing = (p: Product) => {
    setEditingId(p.id);
    setEditDims({ width: p.width, length: p.length, height: p.height, barcode: p.barcode, aircap: p.aircap });
  };

  const cancelEditing = () => setEditingId(null);

  const saveEditing = async () => {
    if (!editingId || !groupId) return;
    try {
      await updateProduct.mutateAsync({ id: editingId, data: editDims, groupId });
      toast.success('상품 정보가 변경되었습니다.');
      setEditingId(null);
    } catch {
      toast.error('치수 변경 실패');
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
        <p className="text-gray-500 font-medium">상품 그룹을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/products')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-muted-foreground">상품을 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">박스 그룹</label>
          <select
            value={group.boxGroupId ?? ''}
            onChange={async (e) => {
              try {
                await updateProductGroup.mutateAsync({ id: groupId!, data: { boxGroupId: e.target.value } });
                toast.success('박스 그룹이 변경되었습니다.');
              } catch {
                toast.error('박스 그룹 변경 실패');
              }
            }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          >
            {boxGroupList.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.boxes?.length ?? 0}개)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          {isUploading ? (
            <div className="bg-white border rounded-xl p-8 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <ExcelUpload onUpload={handleUpload} title="상품 파일 추가" />
          )}
          <div className="p-4 bg-blue-50 rounded-lg text-xs text-blue-700">
            <strong>엑셀 컬럼 매핑:</strong>
            <table className="mt-2 w-full text-left">
              <thead>
                <tr className="border-b border-blue-200">
                  <th className="pb-1 font-semibold">엑셀 컬럼</th>
                  <th className="pb-1 font-semibold">→</th>
                  <th className="pb-1 font-semibold">필드</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-0.5 font-mono">상품명</td>
                  <td className="py-0.5">→</td>
                  <td className="py-0.5">상품명 (SKU)</td>
                </tr>
                <tr>
                  <td className="py-0.5 font-mono">체적정보</td>
                  <td className="py-0.5">→</td>
                  <td className="py-0.5">가로 × 세로 × 높이</td>
                </tr>
                <tr>
                  <td className="py-0.5 font-mono">바코드</td>
                  <td className="py-0.5">→</td>
                  <td className="py-0.5">바코드 여부 (O/true)</td>
                </tr>
                <tr>
                  <td className="py-0.5 font-mono">에어캡</td>
                  <td className="py-0.5">→</td>
                  <td className="py-0.5">o (에어캡 있음)</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-blue-500">예: 체적정보 = 10x20x30 또는 10*20*30</p>
          </div>
        </div>

        <div className="md:col-span-2 border rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <span className="text-sm font-medium text-gray-700">
              총 {productList.length}개 상품
            </span>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedIds.size === 0 || isDeleting}
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
                    <th className="px-4 py-3 text-center">바코드</th>
                    <th className="px-4 py-3">에어캡</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {productList.map((p: Product, i: number) => (
                    <tr key={`${p.sku}-${i}`} className="hover:bg-gray-50 transition-colors">
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
                                setEditDims({ ...editDims, width: parseFloat(e.target.value) || 0 })
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
                            className="cursor-pointer hover:text-indigo-600 hover:bg-indigo-50 px-1 rounded transition-colors"
                            onClick={() => startEditing(p)}
                            title="클릭하여 치수 편집"
                          >
                            {p.width} × {p.length} × {p.height}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingId === p.id ? (
                          <input
                            type="checkbox"
                            checked={editDims.barcode}
                            onChange={(e) =>
                              setEditDims({ ...editDims, barcode: e.target.checked })
                            }
                            className="rounded border-gray-300 cursor-pointer"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={p.barcode}
                            disabled
                            className="rounded border-gray-300"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingId === p.id ? (
                          <input
                            type="checkbox"
                            checked={editDims.aircap}
                            onChange={(e) =>
                              setEditDims({ ...editDims, aircap: e.target.checked })
                            }
                            className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-400"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={p.aircap}
                            disabled
                            className="rounded border-gray-300"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                  {productList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                        등록된 상품이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        title="상품 삭제"
        description={`선택한 ${selectedIds.size}개 상품을 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDeleteSelected}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </PageContainer>
  );
}
