'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBoxGroup, useBoxes, useUpdateBoxAssignments } from '@/hooks/queries';
import { toast } from 'sonner';
import { ArrowLeft, AlertCircle, Box as BoxIcon, Loader2 } from 'lucide-react';
import { BoxDetailSkeleton } from '@/components/skeletons';
import { PageContainer } from '@/components/layout/PageContainer';

export default function BoxGroupDetail() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const router = useRouter();

  const { data: group, isLoading: isLoadingGroup } = useBoxGroup(groupId || '');
  const { data: allBoxes = [], isLoading: isLoadingBoxes } = useBoxes();
  const updateBoxAssignments = useUpdateBoxAssignments(groupId || '');

  const [selectedBoxIds, setSelectedBoxIds] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (group?.boxes) {
      setSelectedBoxIds(new Set(group.boxes.map((b) => b.id)));
      setIsDirty(false);
    }
  }, [group]);

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
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateBoxAssignments.mutateAsync(Array.from(selectedBoxIds));
      toast.success('박스 할당이 저장되었습니다.');
      setIsDirty(false);
    } catch {
      toast.error('저장 실패', { description: '박스 할당 변경에 실패했습니다.' });
    }
  };

  const assignedToThisGroup = allBoxes.filter((b) => b.boxGroupId === groupId);
  const unassignedBoxes = allBoxes.filter((b) => b.boxGroupId === null);
  const assignedToOtherGroup = allBoxes.filter(
    (b) => b.boxGroupId !== null && b.boxGroupId !== groupId
  );
  const sortedBoxes = [...assignedToThisGroup, ...unassignedBoxes, ...assignedToOtherGroup];

  if (isLoadingGroup) {
    return <BoxDetailSkeleton />;
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">박스 그룹을 찾을 수 없습니다.</p>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-muted-foreground">박스 그룹의 박스를 관리합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">그룹 정보</h2>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">그룹명</span>
                <span className="font-medium text-gray-900">{group.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">박스 수</span>
                <span className="font-medium text-gray-900">{selectedBoxIds.size}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">생성일</span>
                <span className="text-gray-600">
                  {new Date(group.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">박스 관리</h2>
              <div className="flex items-center gap-3">
                {selectedBoxIds.size > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                    {selectedBoxIds.size}개 선택됨
                  </span>
                )}
                {isDirty && (
                  <button
                    onClick={handleSave}
                    disabled={updateBoxAssignments.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {updateBoxAssignments.isPending && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    저장
                  </button>
                )}
              </div>
            </div>

            {isLoadingBoxes ? (
              <div className="p-6 text-center text-sm text-gray-400">불러오는 중...</div>
            ) : sortedBoxes.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                <BoxIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                등록된 박스가 없습니다.
              </div>
            ) : (
              <div className="divide-y max-h-[480px] overflow-y-auto">
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
                        {box.price != null && ` · ₩${box.price.toLocaleString()}`}
                      </p>
                    </div>
                    {box.boxGroupId === null ? (
                      <span className="text-xs font-medium px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full flex-shrink-0">
                        미할당
                      </span>
                    ) : box.boxGroupId === groupId ? (
                      <span className="text-xs font-medium px-2 py-0.5 bg-green-50 text-green-700 rounded-full flex-shrink-0">
                        현재 그룹
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
        </div>
      </div>
    </PageContainer>
  );
}
