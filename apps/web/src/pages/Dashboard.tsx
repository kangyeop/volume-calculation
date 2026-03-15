import React from 'react';
import { Link } from 'react-router-dom';
import { useDashboardStats } from '@/hooks/queries';
import { Truck, Package, Plus } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <p className="text-muted-foreground mt-1">출고 현황을 한눈에 확인합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card shadow p-6 flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-lg">
            <Truck className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">총 출고 배치</p>
            <p className="text-3xl font-bold">{stats?.totalBatches ?? 0}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card shadow p-6 flex items-center gap-4">
          <div className="bg-green-50 p-3 rounded-lg">
            <Package className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">총 박스 사용</p>
            <p className="text-3xl font-bold">{stats?.totalBoxesUsed ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">최근 출고 배치</h2>
          <Link
            to="/outbound/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />새 출고
          </Link>
        </div>

        {!stats?.recentBatches?.length ? (
          <div className="px-4 py-12 text-center text-gray-400 text-sm">출고 배치가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">배치명</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">주문 수</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">생성일</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.recentBatches.map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      to={`/outbound/${batch.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {batch.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{batch.orderCount ?? '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {new Date(batch.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
