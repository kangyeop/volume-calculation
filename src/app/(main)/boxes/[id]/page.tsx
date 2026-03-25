'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useBoxes,
  useUpdateBox,
  useDeleteBox,
  useBoxStockHistories,
  useCreateStockHistory,
} from '@/hooks/queries';
import { toast } from 'sonner';
import { ArrowLeft, AlertCircle, Ruler, Plus, Package } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { StockChangeType } from '@/types';

const STOCK_TYPE_CONFIG: Record<StockChangeType, { label: string; bgColor: string; textColor: string }> = {
  INBOUND: { label: '입고', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  OUTBOUND: { label: '출고', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  INITIAL: { label: '초기 등록', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  ADJUSTMENT: { label: '수정', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
};

export default function BoxDetail() {
  const params = useParams<{ id: string }>();
  const boxId = params.id;
  const router = useRouter();

  const { data: allBoxes = [], isLoading } = useBoxes();
  const updateBox = useUpdateBox();
  const deleteBox = useDeleteBox();
  const { data: stockHistories = [] } = useBoxStockHistories(boxId);
  const createStockHistory = useCreateStockHistory();

  const box = allBoxes.find((b) => b.id === boxId);

  const [formData, setFormData] = useState({
    name: '',
    width: '',
    length: '',
    height: '',
    price: '',
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStockForm, setShowStockForm] = useState(false);
  const [stockFormData, setStockFormData] = useState({
    type: 'INBOUND' as StockChangeType,
    quantity: '',
    note: '',
  });

  useEffect(() => {
    if (box) {
      setFormData({
        name: box.name,
        width: String(box.width),
        length: String(box.length),
        height: String(box.height),
        price: box.price != null ? String(box.price) : '',
      });
    }
  }, [box]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.width || !formData.length || !formData.height) return;

    try {
      await updateBox.mutateAsync({
        id: boxId,
        data: {
          name: formData.name,
          width: Number(formData.width),
          length: Number(formData.length),
          height: Number(formData.height),
          price: formData.price ? Number(formData.price) : undefined,
        },
      });
      toast.success('박스 수정 완료');
      router.push('/boxes');
    } catch {
      toast.error('수정 실패', { description: '박스 수정에 실패했습니다.' });
    }
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockFormData.quantity) return;

    try {
      await createStockHistory.mutateAsync({
        boxId,
        data: {
          type: stockFormData.type,
          quantity: Number(stockFormData.quantity),
          note: stockFormData.note || undefined,
        },
      });
      toast.success('재고 변경 완료');
      setShowStockForm(false);
      setStockFormData({ type: 'INBOUND', quantity: '', note: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '재고 변경에 실패했습니다.';
      toast.error('재고 변경 실패', { description: message });
    }
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteDialog(false);
    try {
      await deleteBox.mutateAsync({ id: boxId, groupId: box?.boxGroupId ?? undefined });
      toast.success('삭제 완료', { description: '박스가 삭제되었습니다.' });
      router.push('/boxes');
    } catch {
      toast.error('삭제 실패', { description: '박스 삭제에 실패했습니다.' });
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (!box) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">박스를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/boxes')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{box.name}</h1>
          <p className="text-muted-foreground">박스 정보를 수정합니다.</p>
        </div>
      </div>

      <div className="max-w-lg">
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">박스 이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Dimensions (cm)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pl-8 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                    required
                    min="0"
                  />
                  <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">L</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pl-8 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                    required
                    min="0"
                  />
                  <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">W</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pl-8 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    required
                    min="0"
                  />
                  <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">H</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">Length x Width x Height</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Price (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 text-sm">₩</span>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pl-7 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={updateBox.isPending}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateBox.isPending ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleteBox.isPending}
                className="px-4 py-2.5 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </form>
        </div>

        {box.boxGroupId && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            이 박스는{' '}
            <span className="font-semibold">{box.boxGroup?.name ?? box.boxGroupId}</span> 그룹에
            속해 있습니다.
          </div>
        )}

        <div className="mt-6 bg-white border rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold">재고 이력</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-indigo-600">{box.stock}</span>
              <button
                type="button"
                onClick={() => setShowStockForm(!showStockForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                재고 변경
              </button>
            </div>
          </div>

          {showStockForm && (
            <form onSubmit={handleStockSubmit} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                  <select
                    value={stockFormData.type}
                    onChange={(e) => setStockFormData({ ...stockFormData, type: e.target.value as StockChangeType })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="INBOUND">입고</option>
                    <option value="OUTBOUND">출고</option>
                    <option value="INITIAL">초기 등록</option>
                    <option value="ADJUSTMENT">수정</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">수량</label>
                  <input
                    type="number"
                    value={stockFormData.quantity}
                    onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    min="0"
                    step="1"
                    required
                    placeholder={stockFormData.type === 'INITIAL' || stockFormData.type === 'ADJUSTMENT' ? '목표 재고' : '수량'}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모 (선택)</label>
                <input
                  type="text"
                  value={stockFormData.note}
                  onChange={(e) => setStockFormData({ ...stockFormData, note: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="변경 사유"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createStockHistory.isPending}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {createStockHistory.isPending ? '처리 중...' : '등록'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowStockForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  취소
                </button>
              </div>
            </form>
          )}

          {stockHistories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">재고 이력이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">날짜</th>
                    <th className="pb-2 font-medium">유형</th>
                    <th className="pb-2 font-medium text-right">변동</th>
                    <th className="pb-2 font-medium text-right">결과</th>
                    <th className="pb-2 font-medium">메모</th>
                  </tr>
                </thead>
                <tbody>
                  {stockHistories.map((h) => {
                    const config = STOCK_TYPE_CONFIG[h.type];
                    return (
                      <tr key={h.id} className="border-b last:border-0">
                        <td className="py-2.5 text-gray-600">
                          {new Date(h.createdAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                            {config.label}
                          </span>
                        </td>
                        <td className={`py-2.5 text-right font-medium ${h.quantity > 0 ? 'text-blue-600' : h.quantity < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {h.quantity > 0 ? `+${h.quantity}` : h.quantity}
                        </td>
                        <td className="py-2.5 text-right font-semibold">{h.resultStock}</td>
                        <td className="py-2.5 text-gray-500 truncate max-w-[120px]">{h.note ?? '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title="박스 삭제"
        description="이 박스를 삭제하시겠습니까?"
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </PageContainer>
  );
}
