'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateBoxGroup } from '@/hooks/queries';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';

export default function BoxGroupCreate() {
  const router = useRouter();
  const createGroup = useCreateBoxGroup();
  const [groupName, setGroupName] = useState('');

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      const groupPromise = createGroup.mutateAsync(groupName.trim());
      router.prefetch('/boxes');
      const group = await groupPromise;
      toast.success('박스 그룹이 생성되었습니다.');
      router.replace(`/boxes/${group.id}`);
    } catch {
      toast.error('생성 실패', { description: '박스 그룹 생성에 실패했습니다.' });
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
          <h1 className="text-2xl font-bold tracking-tight">새 박스 그룹</h1>
          <p className="text-muted-foreground">박스 그룹을 생성합니다.</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-6">
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">그룹명</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="박스 그룹 이름을 입력하세요"
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
    </PageContainer>
  );
}
