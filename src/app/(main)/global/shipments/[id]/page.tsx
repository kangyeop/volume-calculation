'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useGlobalOrderItems } from '@/hooks/queries';
import { globalShipments as globalShipmentsKey } from '@/hooks/queries/queryKeys';
import type { GlobalShipment } from '@/hooks/queries/useGlobalShipments';
import { ArrowLeft, Calculator, Package, Boxes } from 'lucide-react';
import { ShipmentDetailSkeleton } from '@/components/skeletons';
import { PageContainer } from '@/components/layout/PageContainer';
import { SummaryStatCard } from '@/components/batch/SummaryStatCard';

export default function GlobalShipmentDetail() {
  const params = useParams<{ id: string }>();
  const batchId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const batches = queryClient.getQueryData<GlobalShipment[]>(globalShipmentsKey.all.queryKey);
  const batch = batches?.find((b) => b.id === batchId);
  const { data: items, isLoading } = useGlobalOrderItems(batchId || '');

  const rows = React.useMemo(() => {
    if (!items) return [];
    const map = new Map<string, { sku: string; name: string; quantity: number; matched: boolean }>();
    for (const item of items) {
      const key = item.sku;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        map.set(key, {
          sku: item.sku,
          name: item.product?.name ?? item.sku,
          quantity: item.quantity,
          matched: !!item.product,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.quantity - a.quantity);
  }, [items]);

  const totalQuantity = rows.reduce((acc, r) => acc + r.quantity, 0);

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/global/shipments')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{batch?.name || '글로벌 출고 배치'}</h1>
          <p className="text-muted-foreground">업로드된 글로벌 출고 SKU 목록입니다.</p>
        </div>
        <button
          onClick={() => router.push(`/global/shipments/${batchId}/packing`)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Calculator className="h-4 w-4" />
          팔레트 계산
        </button>
      </div>

      {isLoading ? (
        <ShipmentDetailSkeleton />
      ) : rows.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <SummaryStatCard
              icon={<Package className="h-6 w-6 text-blue-600" />}
              iconBgClassName="bg-blue-100"
              label="총 SKU 수"
              value={rows.length}
            />
            <SummaryStatCard
              icon={<Boxes className="h-6 w-6 text-purple-600" />}
              iconBgClassName="bg-purple-100"
              label="총 수량"
              value={totalQuantity.toLocaleString()}
            />
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <span className="font-medium text-gray-700">SKU 목록</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">상품명</th>
                  <th className="px-4 py-2 text-right">수량</th>
                  <th className="px-4 py-2 text-center">매칭</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.sku} className="border-t">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{row.name}</div>
                      {row.name !== row.sku && (
                        <div className="text-xs text-gray-500 font-mono">{row.sku}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {row.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {row.matched ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          매칭
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                          미매칭
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="px-4 py-12 text-center text-gray-400 text-sm">
          글로벌 출고 데이터가 없습니다.
        </div>
      )}
    </PageContainer>
  );
}
