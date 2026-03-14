import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useProjectStats } from '@/hooks/queries';
import type { ProjectStats } from '@wms/types';

type SortOrder = 'asc' | 'desc';

const ProjectStatCard: React.FC<{ stat: ProjectStats }> = ({ stat }) => (
  <div className="bg-white border rounded-xl shadow-sm p-6">
    <h2 className="text-lg font-semibold mb-4">{stat.projectName}</h2>
    {stat.boxes.length === 0 ? (
      <p className="text-sm text-gray-400">패킹 이력이 없습니다</p>
    ) : (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left pb-2 font-medium text-gray-600">박스명</th>
            <th className="text-right pb-2 font-medium text-gray-600">수량</th>
          </tr>
        </thead>
        <tbody>
          {stat.boxes.map((box) => (
            <tr key={box.boxName} className="border-b last:border-0">
              <td className="py-2 text-gray-700">{box.boxName}</td>
              <td className="py-2 text-right text-gray-700 font-semibold">{box.boxCount}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t font-semibold">
            <td className="pt-2 text-gray-800">합계</td>
            <td className="pt-2 text-right text-gray-800">
              {stat.boxes.reduce((sum, b) => sum + b.boxCount, 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    )}
  </div>
);

export const Dashboard: React.FC = () => {
  const { data: stats = [], isLoading } = useProjectStats();
  const [projectSortOrder, setProjectSortOrder] = useState<SortOrder>('desc');

  const sortedStats = [...stats].sort((a, b) => {
    const dir = projectSortOrder === 'asc' ? 1 : -1;
    return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const SortIcon = ({ active, order }: { active: boolean; order: SortOrder }) =>
    active ? (
      order === 'asc' ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowDown className="h-3 w-3" />
      )
    ) : (
      <ArrowDown className="h-3 w-3 opacity-30" />
    );

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">대시보드</h1>
        <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
          ← 프로젝트 목록
        </Link>
      </div>

      {stats.length > 0 && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setProjectSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm border bg-white border-gray-200 text-gray-600 hover:border-gray-400 transition-colors"
          >
            생성일
            <SortIcon active order={projectSortOrder} />
          </button>
        </div>
      )}

      {stats.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed rounded-xl text-gray-400">
          패킹 이력이 없습니다
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedStats.map((stat) => (
            <ProjectStatCard key={stat.projectId} stat={stat} />
          ))}
        </div>
      )}
    </div>
  );
};
