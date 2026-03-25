'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateBoxGroup, useBoxes } from '@/hooks/queries';
import { toast } from 'sonner';
import { ArrowLeft, Box as BoxIcon } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';

export default function BoxGroupCreate() {
  const router = useRouter();
  const createGroup = useCreateBoxGroup();
  const { data: allBoxes = [], isLoading: isLoadingBoxes } = useBoxes();

  const [groupName, setGroupName] = useState('');
  const [selectedBoxIds, setSelectedBoxIds] = useState<Set<string>>(new Set());

  const unassignedBoxes = allBoxes.filter((b) => b.boxGroupId === null);
  const assignedBoxes = allBoxes.filter((b) => b.boxGroupId !== null);
  const sortedBoxes = [...unassignedBoxes, ...assignedBoxes];

  const toggleBox = (id: string) => {
    setSelectedBoxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      const group = await createGroup.mutateAsync({
        name: groupName.trim(),
        boxIds: selectedBoxIds.size > 0 ? Array.from(selectedBoxIds) : undefined,
      });
      toast.success('박스 그룹이 생성되었습니다.');
      router.replace(`/box-groups/${group.id}`);
    } catch {
      toast.error('생성 실패', { description: '박스 그룹 생성에 실패했습니다.' });
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/box-groups')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">새 박스 그룹</h1>
          <p className="text-muted-foreground">박스 그룹을 생성합니다.</p>
        </div>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border rounded-xl shadow-sm p-6">
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

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">박스 선택 (선택사항)</h2>
              {selectedBoxIds.size > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                  {selectedBoxIds.size}개 선택됨
                </span>
              )}
            </div>

            {isLoadingBoxes ? (
              <div className="p-6 text-center text-sm text-gray-400">불러오는 중...</div>
            ) : sortedBoxes.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                <BoxIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                등록된 박스가 없습니다.
              </div>
            ) : (
              <div className="divide-y max-h-80 overflow-y-auto">
                {sortedBoxes.map((box) => (
                  <label
                    key={box.id}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBoxIds.has(box.id)}
                      onChange={() => toggleBox(box.id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{box.name}</p>
                      <p className="text-xs text-gray-500">
                        {box.length} x {box.width} x {box.height} cm
                      </p>
                    </div>
                    {box.boxGroupId === null ? (
                      <span className="text-xs font-medium px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full flex-shrink-0">
                        미할당
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 flex-shrink-0 truncate max-w-24">
                        {box.boxGroup?.name ?? '다른 그룹'}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
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
