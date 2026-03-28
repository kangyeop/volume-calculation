'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Download, RefreshCw, Lock, LockOpen, Check, ArrowLeft } from 'lucide-react';
import {
  useSettlementDetail,
  useSettlementPackingRecommendation,
  useCalculateSettlementPacking,
  useUpdateSettlementBoxAssignment,
  useExportSettlementPacking,
  useConfirmSettlement,
  useUnconfirmSettlement,
  useProductGroups,
  useBoxGroups,
} from '@/hooks/queries';
import { usePackingNormalizer } from '@/hooks/usePackingNormalizer';
import { BoxTypeCard } from '@/components/packing/BoxTypeCard';
import { PackingDetailPanel } from '@/components/packing/PackingDetailPanel';
import { UnpackedItemsAlert } from '@/components/packing/UnpackedItemsAlert';
import type { BoxSortStrategy } from '@/types';
import { PackingCalculatorSkeleton } from '@/components/skeletons';
import { PageContainer } from '@/components/layout/PageContainer';

export default function SettlementPackingPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const searchParams = useSearchParams();
  const router = useRouter();

  const { data: settlement } = useSettlementDetail(id ?? '');
  const { data: savedRecommendation, isLoading: isLoadingRecommendation } =
    useSettlementPackingRecommendation(id ?? '');
  const calculatePacking = useCalculateSettlementPacking();
  const updateBoxAssignment = useUpdateSettlementBoxAssignment();
  const exportPacking = useExportSettlementPacking();
  const { data: productGroups = [] } = useProductGroups();
  const { data: boxGroupList = [] } = useBoxGroups();
  const confirmSettlement = useConfirmSettlement();
  const unconfirmSettlement = useUnconfirmSettlement();

  const isConfirmed = settlement?.status === 'CONFIRMED';

  const [boxSortStrategy, setBoxSortStrategy] = useState<BoxSortStrategy>('volume');

  const result = savedRecommendation ?? null;
  const { normalizedBoxes, unpackedItems } = usePackingNormalizer(result);

  const detailBoxId = searchParams.get('boxId');
  const detailGroupId = searchParams.get('groupId');
  const detailView = detailBoxId
    ? { type: 'box' as const, boxId: detailBoxId, groupId: detailGroupId === 'unclassified' ? null : detailGroupId ?? undefined }
    : null;

  const setDetailView = useCallback(
    (view: { type: 'box'; boxId: string; groupId?: string | null } | null) => {
      const p = new URLSearchParams(searchParams.toString());
      if (view) {
        p.set('boxId', view.boxId);
        if (view.groupId === null) {
          p.set('groupId', 'unclassified');
        } else if (view.groupId !== undefined) {
          p.set('groupId', view.groupId);
        } else {
          p.delete('groupId');
        }
      } else {
        p.delete('boxId');
        p.delete('groupId');
      }
      router.push(`?${p.toString()}`);
    },
    [searchParams, router],
  );

  const skuDimensionsMap = useMemo(() => {
    const map = new Map<string, { width: number; length: number; height: number; name: string }>();
    for (const group of productGroups) {
      for (const product of group.products ?? []) {
        map.set(product.id, {
          width: product.width,
          length: product.length,
          height: product.height,
          name: product.name,
        });
      }
    }
    return map;
  }, [productGroups]);

  const skuToGroupId = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of productGroups) {
      for (const product of group.products ?? []) {
        map.set(product.id, group.id);
        map.set(product.sku, group.id);
      }
    }
    return map;
  }, [productGroups]);

  const activeGroupIds = useMemo(() => {
    const ids = new Set<string>();
    for (const boxGroup of normalizedBoxes) {
      for (const shipment of boxGroup.shipments) {
        for (const sku of shipment.packedSKUs) {
          const gid = skuToGroupId.get(sku.skuId);
          if (gid) ids.add(gid);
        }
      }
    }
    return ids;
  }, [normalizedBoxes, skuToGroupId]);

  const visibleGroups = productGroups.filter((g) => activeGroupIds.has(g.id));

  const getShipmentGroupId = (packedSKUs: { skuId: string }[]): string | null => {
    const groupIds = new Set<string>();
    for (const sku of packedSKUs) {
      const gid = skuToGroupId.get(sku.skuId);
      if (gid) groupIds.add(gid);
    }
    if (groupIds.size === 1) return [...groupIds][0];
    return null;
  };

  const buildBoxGroups = (
    boxes: typeof normalizedBoxes,
    shipmentFilter: (groupId: string | null) => boolean,
  ) => {
    return boxes
      .map((bg) => {
        const shipments = bg.shipments.filter((s) =>
          shipmentFilter(getShipmentGroupId(s.packedSKUs)),
        );
        const count = shipments.reduce((sum, s) => sum + s.count, 0);
        const boxCBM = (bg.box.width * bg.box.length * bg.box.height) / 1_000_000_000;
        return { ...bg, shipments, count, totalCBM: boxCBM * count };
      })
      .filter((bg) => bg.shipments.length > 0);
  };

  const orderStatusMap = useMemo(() => {
    if (!settlement) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const order of settlement.orders) {
      map.set(order.orderId, order.status);
    }
    return map;
  }, [settlement]);

  const orderStatsMap = useMemo(() => {
    if (!settlement) return new Map<string, { barcodeCount: number; aircapCount: number }>();
    const map = new Map<string, { barcodeCount: number; aircapCount: number }>();
    for (const order of settlement.orders) {
      map.set(order.orderId, { barcodeCount: order.barcodeCount, aircapCount: order.aircapCount });
    }
    return map;
  }, [settlement]);

  const groupStats = useMemo(() => {
    const stats = new Map<string, { barcodeCount: number; aircapCount: number; orderCount: number }>();
    for (const boxGroup of normalizedBoxes) {
      for (const shipment of boxGroup.shipments) {
        const gid = getShipmentGroupId(shipment.packedSKUs);
        if (!gid) continue;
        const orderId = shipment.groupLabel.replace('Order: ', '');
        const orderStats = orderStatsMap.get(orderId);
        if (!orderStats) continue;
        const current = stats.get(gid) ?? { barcodeCount: 0, aircapCount: 0, orderCount: 0 };
        current.barcodeCount += orderStats.barcodeCount;
        current.aircapCount += orderStats.aircapCount;
        current.orderCount += shipment.count;
        stats.set(gid, current);
      }
    }
    return stats;
  }, [normalizedBoxes, orderStatsMap, skuToGroupId]);

  const groupSections = useMemo(() => {
    return visibleGroups.map((group) => {
      const filtered = buildBoxGroups(normalizedBoxes, (gid) => gid === group.id);
      const totalBoxes = filtered.reduce((sum, bg) => sum + bg.count, 0);
      const totalCBM = filtered.reduce((sum, bg) => sum + bg.totalCBM, 0);
      const avgEfficiency = filtered.length
        ? filtered.reduce((sum, bg) => sum + bg.efficiency, 0) / filtered.length
        : 0;
      const gs = groupStats.get(group.id);
      return {
        group,
        filteredBoxes: filtered,
        stats: { totalBoxes, totalCBM, avgEfficiency },
        barcodeCount: gs?.barcodeCount ?? 0,
        aircapCount: gs?.aircapCount ?? 0,
      };
    });
  }, [visibleGroups, normalizedBoxes, skuToGroupId, groupStats]);

  const unclassifiedBoxes = useMemo(() => {
    return buildBoxGroups(normalizedBoxes, (gid) => gid === null);
  }, [normalizedBoxes, skuToGroupId]);

  const detailBoxes = useMemo(() => {
    if (!detailView) return [];
    const { boxId, groupId } = detailView;
    if (groupId === undefined) {
      return normalizedBoxes.filter((bg) => bg.box.id === boxId);
    }
    if (groupId === null) {
      return unclassifiedBoxes.filter((bg) => bg.box.id === boxId);
    }
    const section = groupSections.find((s) => s.group.id === groupId);
    return section?.filteredBoxes.filter((bg) => bg.box.id === boxId) ?? [];
  }, [detailView, normalizedBoxes, unclassifiedBoxes, groupSections]);

  const detailTitle = useMemo(() => {
    if (!detailView) return '';
    const bg = normalizedBoxes.find((b) => b.box.id === detailView.boxId);
    const boxName = bg?.box.name ?? detailView.boxId;
    if (detailView.groupId === undefined) return boxName;
    if (detailView.groupId === null) return `미분류 - ${boxName}`;
    const section = groupSections.find((s) => s.group.id === detailView.groupId);
    return `${section?.group.name ?? ''} - ${boxName}`;
  }, [detailView, normalizedBoxes, groupSections]);

  const isCalculating = calculatePacking.isPending;
  const hasUnmatched = settlement?.orders.some((o) => o.status === 'unmatched') ?? false;

  const handleCalculate = async () => {
    if (!id) return;
    try {
      const data = await calculatePacking.mutateAsync({ id, strategy: boxSortStrategy });
      const parts = [];
      if (data.packed > 0) parts.push(`${data.packed}건 패킹 완료`);
      if (data.failed > 0) parts.push(`${data.failed}건 실패`);
      toast.success('미매칭 패킹 계산 완료', { description: parts.join(', ') });
      const p = new URLSearchParams(searchParams.toString());
      p.delete('boxId');
      p.delete('groupId');
      router.replace(`?${p.toString()}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : '계산에 실패했습니다.';
      toast.error('계산 실패', { description: message });
    }
  };

  const availableBoxes = useMemo(() => {
    return boxGroupList.flatMap((g) => g.boxes ?? []);
  }, [boxGroupList]);

  const handleBoxOverride = async (groupIndices: number[], boxIndices: number[], newBoxId: string) => {
    if (!id) return;
    try {
      await updateBoxAssignment.mutateAsync({
        id,
        items: groupIndices.map((gi, i) => ({ groupIndex: gi, boxIndex: boxIndices[i] })),
        newBoxId,
      });
      toast.success('박스가 변경되었습니다.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '박스 변경에 실패했습니다.';
      toast.error('박스 변경 실패', { description: message });
    }
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      await exportPacking.mutateAsync({ id });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '엑셀 다운로드에 실패했습니다.';
      toast.error('내보내기 실패', { description: message });
    }
  };

  const handleConfirm = async () => {
    if (!id) return;
    try {
      await confirmSettlement.mutateAsync(id);
      toast.success('정산이 확정되었습니다.');
    } catch {
      toast.error('확정 실패');
    }
  };

  const handleUnconfirm = async () => {
    if (!id) return;
    try {
      await unconfirmSettlement.mutateAsync(id);
      toast.success('확정이 해제되었습니다.');
    } catch {
      toast.error('확정 해제 실패');
    }
  };

  const totalBarcodeCount = settlement?.orders.reduce((sum, o) => sum + o.barcodeCount, 0) ?? 0;
  const totalAircapCount = settlement?.orders.reduce((sum, o) => sum + o.aircapCount, 0) ?? 0;

  return (
    <PageContainer>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/settlements/${id}`)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">정산 패킹</h1>
            <p className="text-muted-foreground">미매칭 주문에 대한 최적 박스 구성을 계산합니다.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConfirmed && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg">
              <Lock className="h-3.5 w-3.5" />
              확정됨
            </span>
          )}

          {!isConfirmed && hasUnmatched && (
            <>
              <select
                value={boxSortStrategy}
                onChange={(e) => setBoxSortStrategy(e.target.value as BoxSortStrategy)}
                disabled={isCalculating}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:opacity-50"
              >
                <option value="volume">부피 기준</option>
                <option value="longest-side">최장변 기준</option>
              </select>
              <button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`} />
                {isCalculating ? '계산 중...' : '미매칭 패킹 계산'}
              </button>
            </>
          )}

          {result && (
            <button
              onClick={handleExport}
              disabled={exportPacking.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              {exportPacking.isPending ? '다운로드 중...' : 'Excel 내보내기'}
            </button>
          )}

          {result && !isConfirmed && (
            <button
              onClick={handleConfirm}
              disabled={confirmSettlement.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Check className="h-4 w-4" />
              {confirmSettlement.isPending ? '확정 중...' : '확정'}
            </button>
          )}

          {isConfirmed && (
            <button
              onClick={handleUnconfirm}
              disabled={unconfirmSettlement.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <LockOpen className="h-4 w-4" />
              {unconfirmSettlement.isPending ? '해제 중...' : '확정 해제'}
            </button>
          )}
        </div>
      </div>

      {(totalBarcodeCount > 0 || totalAircapCount > 0) && (
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>전체 바코드: <strong className="text-gray-900">{totalBarcodeCount}</strong></span>
          <span>전체 에어캡: <strong className="text-gray-900">{totalAircapCount}</strong></span>
        </div>
      )}

      {isLoadingRecommendation && !result && (
        <PackingCalculatorSkeleton />
      )}

      {!isLoadingRecommendation && !result && !isCalculating && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <p className="text-muted-foreground">아직 계산된 패킹 결과가 없습니다.</p>
          {hasUnmatched && (
            <p className="text-sm text-muted-foreground">미매칭 패킹 계산 버튼을 눌러 패킹을 계산하세요.</p>
          )}
        </div>
      )}

      {isCalculating && !result && (
        <PackingCalculatorSkeleton />
      )}

      {result && (
        <div className="space-y-8">
          {detailView ? (
            <PackingDetailPanel
              title={detailTitle}
              filteredBoxes={detailBoxes}
              onBack={() => router.back()}
              skuDimensionsMap={skuDimensionsMap}
              availableBoxes={availableBoxes}
              onBoxOverride={isConfirmed ? undefined : handleBoxOverride}
            />
          ) : (
            <>
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">박스별 사용 현황</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {normalizedBoxes.map((bg) => (
                    <BoxTypeCard
                      key={bg.box.id}
                      box={bg.box}
                      count={bg.count}
                      totalCBM={bg.totalCBM}
                      efficiency={bg.efficiency}
                      stock={availableBoxes.find((b) => b.id === bg.box.id)?.stock}
                      disabled={isCalculating}
                      onClick={() => setDetailView({ type: 'box', boxId: bg.box.id })}
                    />
                  ))}
                </div>
              </div>

              {groupSections.map(({ group, filteredBoxes, barcodeCount, aircapCount }) => (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{group.name}</h2>
                    {(barcodeCount > 0 || aircapCount > 0) && (
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {barcodeCount > 0 && (
                          <span>바코드 <strong className="text-gray-700">{barcodeCount}</strong></span>
                        )}
                        {aircapCount > 0 && (
                          <span>에어캡 <strong className="text-gray-700">{aircapCount}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBoxes.map((bg) => (
                      <BoxTypeCard
                        key={bg.box.id}
                        box={bg.box}
                        count={bg.count}
                        totalCBM={bg.totalCBM}
                        efficiency={bg.efficiency}
                        disabled={isCalculating}
                        onClick={() =>
                          setDetailView({ type: 'box', boxId: bg.box.id, groupId: group.id })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}

              {unclassifiedBoxes.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">미분류</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unclassifiedBoxes.map((bg) => (
                      <BoxTypeCard
                        key={bg.box.id}
                        box={bg.box}
                        count={bg.count}
                        totalCBM={bg.totalCBM}
                        efficiency={bg.efficiency}
                        disabled={isCalculating}
                        onClick={() =>
                          setDetailView({ type: 'box', boxId: bg.box.id, groupId: null })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              <UnpackedItemsAlert items={unpackedItems} />
            </>
          )}
        </div>
      )}
    </PageContainer>
  );
}
