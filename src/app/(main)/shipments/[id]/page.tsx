'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useConfigurationSummary } from '@/hooks/queries';
import { shipments } from '@/hooks/queries/queryKeys';
import type { Shipment } from '@/lib/api';
import { ArrowLeft, Calculator, Package, Layers } from 'lucide-react';
import { ShipmentDetailSkeleton } from '@/components/skeletons';
import { PageContainer } from '@/components/layout/PageContainer';
import { SummaryStatCard } from '@/components/batch/SummaryStatCard';
import { ConfigurationList } from '@/components/batch/ConfigurationList';

export default function OutboundDetail() {
  const params = useParams<{ id: string }>();
  const batchId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const batches = queryClient.getQueryData<Shipment[]>(shipments.all.queryKey);
  const batch = batches?.find((b) => b.id === batchId);
  const { data: summary, isLoading } = useConfigurationSummary(batchId || '');

  const [expandedConfigs, setExpandedConfigs] = React.useState<Set<string>>(new Set());

  const toggleConfig = (key: string) => {
    setExpandedConfigs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/shipments')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{batch?.name || '출고 배치'}</h1>
          <p className="text-muted-foreground">Configuration별로 그룹화된 출고 데이터입니다.</p>
        </div>
        <button
          onClick={() => router.push(`/shipments/${batchId}/packing`)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Calculator className="h-4 w-4" />
          패킹 계산
        </button>
      </div>

      {isLoading ? (
        <ShipmentDetailSkeleton />
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <SummaryStatCard
              icon={<Package className="h-6 w-6 text-blue-600" />}
              iconBgClassName="bg-blue-100"
              label="총 주문 수"
              value={summary.totalOrders}
            />
            <SummaryStatCard
              icon={<Layers className="h-6 w-6 text-purple-600" />}
              iconBgClassName="bg-purple-100"
              label="고유 Configuration"
              value={summary.configurations.length}
            />
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <span className="font-medium text-gray-700">Configuration 목록</span>
            </div>

            <ConfigurationList
              configurations={summary.configurations}
              expandedConfigs={expandedConfigs}
              onToggleConfig={toggleConfig}
              emptyMessage="출고 데이터가 없습니다."
            />
          </div>
        </>
      ) : (
        <div className="px-4 py-12 text-center text-gray-400 text-sm">
          데이터를 불러올 수 없습니다.
        </div>
      )}
    </PageContainer>
  );
}
