'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBoxes, useUpdateBox, useDeleteBox } from '@/hooks/queries';
import { toast } from 'sonner';
import { ArrowLeft, AlertCircle, Ruler } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function BoxDetail() {
  const params = useParams<{ id: string }>();
  const boxId = params.id;
  const router = useRouter();

  const { data: allBoxes = [], isLoading } = useBoxes();
  const updateBox = useUpdateBox();
  const deleteBox = useDeleteBox();

  const box = allBoxes.find((b) => b.id === boxId);

  const [formData, setFormData] = useState({
    name: '',
    width: '',
    length: '',
    height: '',
    price: '',
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
