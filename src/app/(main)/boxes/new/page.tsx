'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateBox, useUploadBoxes } from '@/hooks/queries';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Ruler } from 'lucide-react';
import { ExcelUpload } from '@/components/ExcelUpload';
import { PageContainer } from '@/components/layout/PageContainer';

export default function BoxCreate() {
  const router = useRouter();
  const createBox = useCreateBox();
  const uploadBoxes = useUploadBoxes();

  const [formData, setFormData] = useState({
    name: '',
    width: '',
    length: '',
    height: '',
    price: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.width || !formData.length || !formData.height) return;

    try {
      await createBox.mutateAsync({
        name: formData.name,
        width: Number(formData.width),
        length: Number(formData.length),
        height: Number(formData.height),
        price: formData.price ? Number(formData.price) : undefined,
        boxGroupId: null,
      });
      toast.success('박스 생성 완료', { description: '새로운 박스가 추가되었습니다.' });
      router.push('/boxes');
    } catch {
      toast.error('생성 실패', { description: '박스 생성에 실패했습니다.' });
    }
  };

  const handleExcelUpload = async (file: File) => {
    try {
      const result = await uploadBoxes.mutateAsync({ file });
      toast.success('엑셀 업로드 완료', {
        description: `${result.imported}개의 박스가 등록되었습니다.`,
      });
    } catch {
      toast.error('업로드 실패');
    }
  };

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
          <h1 className="text-2xl font-bold tracking-tight">새 박스</h1>
          <p className="text-muted-foreground">박스를 생성합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">박스 이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Standard Large Box (A-1)"
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
                    placeholder="L"
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
                    placeholder="W"
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
                    placeholder="H"
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

            <button
              type="submit"
              disabled={createBox.isPending}
              className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              {createBox.isPending ? '생성 중...' : '박스 생성'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">엑셀로 일괄 등록</h2>
          </div>
          <div className="p-6">
            <ExcelUpload onUpload={handleExcelUpload} title="박스 엑셀 파일 업로드" />
            {uploadBoxes.isPending && (
              <p className="text-sm text-gray-500 mt-3 text-center">업로드 중...</p>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
