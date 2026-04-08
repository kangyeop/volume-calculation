'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateProductGroup, useBoxGroups } from '@/hooks/queries';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ColumnMappingUpload } from '@/components/upload/ColumnMappingUpload';
import { api } from '@/lib/api';
import type { ColumnMapping } from '@/types';

export default function ProductGroupCreate() {
  const router = useRouter();
  const createGroup = useCreateProductGroup();
  const { data: boxGroupList = [] } = useBoxGroups();
  const [groupName, setGroupName] = useState('');
  const [selectedBoxGroupId, setSelectedBoxGroupId] = useState('');
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !selectedBoxGroupId) return;
    try {
      const group = await createGroup.mutateAsync({ name: groupName.trim(), boxGroupId: selectedBoxGroupId });
      setCreatedGroupId(group.id);
      toast.success('상품 그룹이 생성되었습니다.');
    } catch {
      toast.error('생성 실패', { description: '상품 그룹 생성에 실패했습니다.' });
    }
  };

  const handleConfirm = async (file: File, mapping: ColumnMapping) => {
    if (!createdGroupId) return;
    setIsUploading(true);
    try {
      const resultPromise = api.productUpload.parse(file, createdGroupId, mapping);
      router.prefetch(`/products/${createdGroupId}`);
      const result = await resultPromise;
      if (result.errors.length > 0) {
        toast.warning('일부 행 오류', {
          description: `${result.errors.length}건의 오류가 있습니다.`,
        });
      }
      toast.success('가져오기 완료', {
        description: `${result.imported}개의 상품이 등록되었습니다.`,
      });
      router.replace(`/products/${createdGroupId}`);
    } catch {
      toast.error('업로드 실패', { description: '상품 파일 처리에 실패했습니다.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/products')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">새 상품 그룹</h1>
          <p className="text-muted-foreground">상품 그룹을 생성하고 상품을 등록합니다.</p>
        </div>
      </div>

      {!createdGroupId ? (
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">그룹명</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="상품 그룹 이름을 입력하세요"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">박스 그룹</label>
              <select
                value={selectedBoxGroupId}
                onChange={(e) => setSelectedBoxGroupId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              >
                <option value="">박스 그룹 선택</option>
                {boxGroupList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.boxes?.length ?? 0}개)
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={createGroup.isPending || !groupName.trim() || !selectedBoxGroupId}
              className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createGroup.isPending ? '생성 중...' : '그룹 생성'}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
            상품 그룹이 생성되었습니다. 아래에서 상품 파일을 업로드하거나 바로 이동할 수 있습니다.
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">상품 파일 업로드 (선택)</h2>
            <ColumnMappingUpload
              type="product"
              onConfirm={handleConfirm}
              isPending={isUploading}
            />
          </div>

          <button
            onClick={() => router.replace(`/products/${createdGroupId}`)}
            className="w-full border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            그룹 상세 페이지로 이동
          </button>
        </div>
      )}
    </PageContainer>
  );
}
