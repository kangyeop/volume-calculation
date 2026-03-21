'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateProductGroup } from '@/hooks/queries';
import { ExcelUpload } from '@/components/ExcelUpload';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function ProductGroupCreate() {
  const router = useRouter();
  const createGroup = useCreateProductGroup();
  const [groupName, setGroupName] = useState('');
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      const group = await createGroup.mutateAsync(groupName.trim());
      setCreatedGroupId(group.id);
      toast.success('상품 그룹이 생성되었습니다.');
    } catch {
      toast.error('생성 실패', { description: '상품 그룹 생성에 실패했습니다.' });
    }
  };

  const handleUpload = async (file: File) => {
    if (!createdGroupId) return;
    setIsUploading(true);
    try {
      const result = await api.productUpload.parse(file, createdGroupId);
      if (result.errors.length > 0) {
        toast.warning('일부 행 오류', {
          description: `${result.errors.length}건의 오류가 있습니다.`,
        });
      }
      toast.success('가져오기 완료', {
        description: `${result.imported}개의 상품이 등록되었습니다.`,
      });
      router.push(`/products/${createdGroupId}`);
    } catch {
      toast.error('업로드 실패', { description: '상품 파일 처리에 실패했습니다.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
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
            <button
              type="submit"
              disabled={createGroup.isPending || !groupName.trim()}
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
            {isUploading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                <span className="ml-3 text-sm text-gray-600">처리 중...</span>
              </div>
            ) : (
              <ExcelUpload onUpload={handleUpload} title="엑셀 파일을 업로드하세요" />
            )}
            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <strong>엑셀 컬럼:</strong> 상품명, 체적정보 (예: 10x20x30)
            </div>
          </div>

          <button
            onClick={() => router.push(`/products/${createdGroupId}`)}
            className="w-full border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            그룹 상세 페이지로 이동
          </button>
        </div>
      )}
    </div>
  );
}
