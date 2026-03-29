'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, X, Trash2, Loader2, Package, Layers, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatusBadge } from '@/components/ui/status-badge';
import { SummaryStatCard } from '@/components/batch/SummaryStatCard';
import { ConfigurationList } from '@/components/batch/ConfigurationList';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ShipmentDetailSkeleton } from '@/components/skeletons';
import {
  useSettlementDetail,
  useConfirmSettlement,
  useUnconfirmSettlement,
  useDeleteSettlement,
  useConfigurationSummary,
  useProductGroups,
} from '@/hooks/queries';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  matched: { label: '매칭됨', className: 'bg-green-50 text-green-700 ring-green-600/20' },
  matched_unassigned: { label: '매칭됨-미지정', className: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' },
  auto_packed: { label: '자동패킹', className: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  unmatched: { label: '미매칭', className: 'bg-red-50 text-red-700 ring-red-600/20' },
};

export default function SettlementDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: settlement, isLoading: isLoadingSettlement } = useSettlementDetail(id);
  const { data: summary, isLoading: isLoadingSummary } = useConfigurationSummary(id);
  const confirmSettlement = useConfirmSettlement();
  const unconfirmSettlement = useUnconfirmSettlement();
  const deleteSettlement = useDeleteSettlement();
  const { data: productGroupsData } = useProductGroups();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(new Set());
  const [selectedGroupTab, setSelectedGroupTab] = useState<string | null>(null);

  const statusMap = useMemo(() => {
    if (!settlement) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const order of settlement.orders) {
      map.set(order.orderId, order.status);
    }
    return map;
  }, [settlement]);

  const matchStats = useMemo(() => {
    if (!settlement) return { matched: 0, unmatched: 0, autoPacked: 0, matchedUnassigned: 0 };
    let matched = 0, unmatched = 0, autoPacked = 0, matchedUnassigned = 0;
    for (const order of settlement.orders) {
      if (order.status === 'matched') matched++;
      else if (order.status === 'unmatched') unmatched++;
      else if (order.status === 'auto_packed') autoPacked++;
      else if (order.status === 'matched_unassigned') matchedUnassigned++;
    }
    return { matched, unmatched, autoPacked, matchedUnassigned };
  }, [settlement]);

  const groupTabs = useMemo(() => {
    if (!summary || !productGroupsData) return [];
    const groupIdSet = new Set(summary.configurations.map((c) => c.productGroupId));
    const tabs: { id: string | null; name: string; count: number }[] = [];
    for (const group of productGroupsData) {
      if (!groupIdSet.has(group.id)) continue;
      const count = summary.configurations
        .filter((c) => c.productGroupId === group.id)
        .reduce((sum, c) => sum + c.orderCount, 0);
      tabs.push({ id: group.id, name: group.name, count });
    }
    if (groupIdSet.has(null)) {
      const count = summary.configurations
        .filter((c) => c.productGroupId === null)
        .reduce((sum, c) => sum + c.orderCount, 0);
      tabs.push({ id: null, name: '미분류', count });
    }
    return tabs;
  }, [summary, productGroupsData]);

  const filteredConfigurations = useMemo(() => {
    if (!summary) return [];
    if (selectedGroupTab === null) return summary.configurations;
    return summary.configurations.filter((c) =>
      selectedGroupTab === 'unclassified' ? c.productGroupId === null : c.productGroupId === selectedGroupTab
    );
  }, [summary, selectedGroupTab]);

  const filteredMatchStats = useMemo(() => {
    if (selectedGroupTab === null) return matchStats;
    const filteredOrderIds = new Set(filteredConfigurations.flatMap((c) => c.orderIds));
    let matched = 0, unmatched = 0, autoPacked = 0, matchedUnassigned = 0;
    for (const [orderId, status] of statusMap) {
      if (!filteredOrderIds.has(orderId)) continue;
      if (status === 'matched') matched++;
      else if (status === 'unmatched') unmatched++;
      else if (status === 'auto_packed') autoPacked++;
      else if (status === 'matched_unassigned') matchedUnassigned++;
    }
    return { matched, unmatched, autoPacked, matchedUnassigned };
  }, [selectedGroupTab, filteredConfigurations, statusMap, matchStats]);

  const filteredTotalOrders = useMemo(() => {
    if (selectedGroupTab === null) return summary?.totalOrders ?? 0;
    return filteredConfigurations.reduce((sum, c) => sum + c.orderCount, 0);
  }, [selectedGroupTab, filteredConfigurations, summary]);

  const toggleConfig = (key: string) => {
    setExpandedConfigs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getConfigMatchSummary = (orderIds: string[]) => {
    let matched = 0, unmatched = 0;
    for (const orderId of orderIds) {
      const status = statusMap.get(orderId);
      if (status === 'unmatched') unmatched++;
      else matched++;
    }
    return { matched, unmatched };
  };

  const handleConfirm = async () => {
    try {
      await confirmSettlement.mutateAsync(id);
      toast.success('정산이 확정되었습니다.');
    } catch {
      toast.error('확정에 실패했습니다.');
    }
  };

  const handleUnconfirm = async () => {
    try {
      await unconfirmSettlement.mutateAsync(id);
      toast.success('확정이 해제되었습니다.');
    } catch {
      toast.error('확정 해제에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    setDeleteOpen(false);
    try {
      await deleteSettlement.mutateAsync(id);
      toast.success('정산이 삭제되었습니다.');
      router.replace('/settlements');
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const isLoading = isLoadingSettlement || isLoadingSummary;

  if (isLoading) return <ShipmentDetailSkeleton />;
  if (!settlement) return <div>정산을 찾을 수 없습니다.</div>;

  const isConfirmed = settlement.status === 'CONFIRMED';

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/settlements')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{settlement.name}</h1>
            <StatusBadge variant={isConfirmed ? 'confirmed' : 'packing'} />
          </div>
          <p className="text-muted-foreground">Configuration별로 그룹화된 정산 데이터입니다.</p>
        </div>
        <div className="flex items-center gap-2">
          {isConfirmed ? (
            <button
              onClick={handleUnconfirm}
              disabled={unconfirmSettlement.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {unconfirmSettlement.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              확정 해제
            </button>
          ) : (
            <>
              <button
                onClick={() => router.push(`/settlements/${id}/packing`)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Package className="h-4 w-4" />
                패킹
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirmSettlement.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {confirmSettlement.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                확정
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                disabled={deleteSettlement.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleteSettlement.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <SummaryStatCard
              icon={<Package className="h-6 w-6 text-blue-600" />}
              iconBgClassName="bg-blue-100"
              label="총 주문 수"
              value={filteredTotalOrders}
            />
            <SummaryStatCard
              icon={<Layers className="h-6 w-6 text-purple-600" />}
              iconBgClassName="bg-purple-100"
              label="고유 Configuration"
              value={filteredConfigurations.length}
            />
            <SummaryStatCard
              icon={filteredMatchStats.unmatched > 0
                ? <AlertTriangle className="h-6 w-6 text-red-600" />
                : <Check className="h-6 w-6 text-green-600" />
              }
              iconBgClassName={filteredMatchStats.unmatched > 0 ? 'bg-red-100' : 'bg-green-100'}
              label="매칭 현황"
              value={
                <span className="text-lg">
                  <span className="text-green-700">{filteredMatchStats.matched + filteredMatchStats.matchedUnassigned + filteredMatchStats.autoPacked}건 매칭</span>
                  {filteredMatchStats.unmatched > 0 && (
                    <span className="text-red-700"> / {filteredMatchStats.unmatched}건 미매칭</span>
                  )}
                </span>
              }
            />
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b space-y-3">
              <span className="font-medium text-gray-700">Configuration 목록</span>
              {groupTabs.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setSelectedGroupTab(null)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      selectedGroupTab === null
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    전체
                    <span className={`ml-1.5 text-xs ${selectedGroupTab === null ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {summary.totalOrders}
                    </span>
                  </button>
                  {groupTabs.map((tab) => (
                    <button
                      key={tab.id ?? 'unclassified'}
                      onClick={() => setSelectedGroupTab(tab.id === null ? 'unclassified' : tab.id)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        (tab.id === null ? 'unclassified' : tab.id) === selectedGroupTab
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tab.name}
                      <span className={`ml-1.5 text-xs ${
                        (tab.id === null ? 'unclassified' : tab.id) === selectedGroupTab ? 'text-indigo-200' : 'text-gray-400'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ConfigurationList
              configurations={filteredConfigurations}
              expandedConfigs={expandedConfigs}
              onToggleConfig={toggleConfig}
              emptyMessage="정산 데이터가 없습니다."
              renderConfigBadges={(config) => {
                const configMatch = getConfigMatchSummary(config.orderIds);
                return configMatch.unmatched > 0 ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">
                    {configMatch.matched}건 매칭 · {configMatch.unmatched}건 미매칭
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                    전체 매칭
                  </span>
                );
              }}
              renderOrderId={(orderId) => {
                const status = statusMap.get(orderId);
                const statusInfo = status ? STATUS_LABELS[status] : null;
                return (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-white border text-gray-700">
                    {orderId}
                    {statusInfo && (
                      <span className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium ring-1 ring-inset ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    )}
                  </span>
                );
              }}
            />
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="정산 삭제"
        description="정산을 삭제하시겠습니까? 관련된 주문 데이터도 함께 삭제됩니다."
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </PageContainer>
  );
}
