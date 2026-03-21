import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProductGroup } from '@/hooks/queries';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { products as productsKey } from '@/hooks/queries/queryKeys';
import { ExcelUpload } from '@/components/ExcelUpload';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Loader2, AlertCircle, Check, X } from 'lucide-react';
import type { Product } from '@/types';
import { useUpdateProduct } from '@/hooks/queries';

export const ProductGroupDetail: React.FC = () => {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: group, isLoading: groupLoading } = useProductGroup(groupId || '');

  const { data: productList = [], isLoading: productsLoading } = useQuery({
    ...productsKey.byGroup(groupId || ''),
    queryFn: () => api.products.listByGroup(groupId || ''),
    enabled: !!groupId,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDims, setEditDims] = useState({ width: 0, length: 0, height: 0 });
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

  const handleDeleteSelected = async () => {
    if (!groupId || selectedIds.size === 0) return;
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
      const parseResult = await api.productUpload.parse(file, groupId);
      toast.info('AI 분석 완료', {
        description: `${parseResult.rowCount}개의 행을 분석했습니다.`,
      });
      const result = await api.productUpload.confirm(
        groupId,
        parseResult.rows,
        parseResult.mapping,
      );
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
    setEditDims({ width: p.width, length: p.length, height: p.height });
  };

  const cancelEditing = () => setEditingId(null);

  const saveEditing = async () => {
    if (!editingId || !groupId) return;
    try {
      await updateProduct.mutateAsync({ id: editingId, data: editDims });
      queryClient.invalidateQueries({ queryKey: productsKey.byGroup(groupId).queryKey });
      toast.success('치수가 변경되었습니다.');
      setEditingId(null);
    } catch {
      toast.error('치수 변경 실패');
    }
  };

  const allSelected = productList.length > 0 && selectedIds.size === productList.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < productList.length;

  if (groupLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
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
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/products')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-muted-foreground">상품을 관리합니다.</p>
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
            <strong>권장 형식:</strong>
            <ul className="list-disc ml-4 mt-1 space-y-0.5">
              <li>SKU (String)</li>
              <li>상품명 (String)</li>
              <li>규격 (예: 10*20*30 또는 10x20x30)</li>
            </ul>
          </div>
        </div>

        <div className="md:col-span-2 border rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <span className="text-sm font-medium text-gray-700">
              총 {productList.length}개 상품
            </span>
            <button
              onClick={handleDeleteSelected}
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
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">상품명</th>
                    <th className="px-4 py-3">규격 (W × L × H cm)</th>
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
                      <td className="px-4 py-3 font-mono">{p.sku}</td>
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {editingId === p.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editDims.width}
                              onChange={(e) => setEditDims({ ...editDims, width: parseFloat(e.target.value) || 0 })}
                              className="w-16 px-1.5 py-1 border border-indigo-300 rounded text-xs font-mono text-center focus:ring-1 focus:ring-indigo-400 outline-none"
                              step="0.01"
                            />
                            <span className="text-gray-400">×</span>
                            <input
                              type="number"
                              value={editDims.length}
                              onChange={(e) => setEditDims({ ...editDims, length: parseFloat(e.target.value) || 0 })}
                              className="w-16 px-1.5 py-1 border border-indigo-300 rounded text-xs font-mono text-center focus:ring-1 focus:ring-indigo-400 outline-none"
                              step="0.01"
                            />
                            <span className="text-gray-400">×</span>
                            <input
                              type="number"
                              value={editDims.height}
                              onChange={(e) => setEditDims({ ...editDims, height: parseFloat(e.target.value) || 0 })}
                              className="w-16 px-1.5 py-1 border border-indigo-300 rounded text-xs font-mono text-center focus:ring-1 focus:ring-indigo-400 outline-none"
                              step="0.01"
                            />
                            <button onClick={saveEditing} className="p-1 text-green-600 hover:text-green-800">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={cancelEditing} className="p-1 text-red-500 hover:text-red-700">
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
      </div>
    </div>
  );
};
