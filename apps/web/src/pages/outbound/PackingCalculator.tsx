import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, RefreshCw } from 'lucide-react';
import {
  useCalculatePacking,
  useExportPacking,
  usePackingRecommendation,
  useUpdateBoxAssignment,
  useProductGroups,
  useBoxGroups,
  useOutboundBatch,
} from '@/hooks/queries';
import { usePackingNormalizer } from '@/hooks/usePackingNormalizer';
import type { PackingCalculationResult } from '@/hooks/usePackingNormalizer';
import { BoxTypeCard } from '@/components/packing/BoxTypeCard';
import { PackingDetailPanel } from '@/components/packing/PackingDetailPanel';
import { UnpackedItemsAlert } from '@/components/packing/UnpackedItemsAlert';
import { PackingGroupingOption, PackingRecommendation } from '@wms/types';

type DetailView =
  | { type: 'box'; boxId: string; groupId?: string | null }
  | null;

export const PackingCalculator: React.FC = () => {
  const { id: batchId } = useParams<{ id: string }>();
  const { data: savedRecommendation, isLoading: isLoadingRecommendation } =
    usePackingRecommendation(batchId ?? '');
  const { data: batch } = useOutboundBatch(batchId ?? '');
  const calculatePacking = useCalculatePacking();
  const exportPacking = useExportPacking();
  const updateBoxAssignment = useUpdateBoxAssignment();
  const { data: productGroups = [] } = useProductGroups();
  const { data: boxGroupList = [] } = useBoxGroups();

  const [freshResult, setFreshResult] = useState<PackingRecommendation | PackingCalculationResult | null>(null);
  const [detailView, setDetailView] = useState<DetailView>(null);
  const [selectedBoxGroupId, setSelectedBoxGroupId] = useState<string>('');

  useEffect(() => {
    if (batch?.lastBoxGroupId && !selectedBoxGroupId) {
      setSelectedBoxGroupId(batch.lastBoxGroupId);
    }
  }, [batch?.lastBoxGroupId]);

  const result = freshResult ?? savedRecommendation ?? null;
  const { normalizedBoxes, unpackedItems } = usePackingNormalizer(result);

  const skuDimensionsMap = useMemo(() => {
    const map = new Map<string, { width: number; length: number; height: number; name: string }>();
    for (const group of productGroups) {
      for (const product of group.products ?? []) {
        map.set(product.id, { width: product.width, length: product.length, height: product.height, name: product.name });
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

  const groupSections = useMemo(() => {
    return visibleGroups.map((group) => {
      const filtered = buildBoxGroups(normalizedBoxes, (gid) => gid === group.id);
      const totalBoxes = filtered.reduce((sum, bg) => sum + bg.count, 0);
      const totalCBM = filtered.reduce((sum, bg) => sum + bg.totalCBM, 0);
      const avgEfficiency = filtered.length
        ? filtered.reduce((sum, bg) => sum + bg.efficiency, 0) / filtered.length
        : 0;
      return { group, filteredBoxes: filtered, stats: { totalBoxes, totalCBM, avgEfficiency } };
    });
  }, [visibleGroups, normalizedBoxes, skuToGroupId]);

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

  const handleCalculate = async () => {
    if (!batchId || !selectedBoxGroupId) return;
    try {
      const data = await calculatePacking.mutateAsync({
        batchId,
        groupingOption: PackingGroupingOption.ORDER,
        boxGroupId: selectedBoxGroupId,
      });
      setFreshResult(data);
      setDetailView(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : '계산에 실패했습니다. 상품 및 출고 목록이 등록되어 있는지 확인해주세요.';
      toast.error('계산 실패', { description: message });
    }
  };

  const availableBoxes = useMemo(() => {
    if (!selectedBoxGroupId) return [];
    const group = boxGroupList.find((g) => g.id === selectedBoxGroupId);
    return group?.boxes ?? [];
  }, [selectedBoxGroupId, boxGroupList]);

  const handleBoxOverride = async (groupIndex: number, boxIndex: number, newBoxId: string) => {
    if (!batchId) return;
    try {
      const updated = await updateBoxAssignment.mutateAsync({
        batchId,
        groupIndex,
        boxIndex,
        newBoxId,
      });
      setFreshResult(updated);
      toast.success('박스가 변경되었습니다.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '박스 변경에 실패했습니다.';
      toast.error('박스 변경 실패', { description: message });
    }
  };

  const handleExport = async () => {
    if (!batchId) return;
    try {
      await exportPacking.mutateAsync({ batchId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '엑셀 다운로드에 실패했습니다.';
      toast.error('내보내기 실패', { description: message });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">패킹 계산</h1>
          <p className="text-muted-foreground">출고 주문에 대한 최적 박스 구성을 계산합니다.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedBoxGroupId}
            onChange={(e) => setSelectedBoxGroupId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          >
            <option value="">박스 그룹 선택</option>
            {boxGroupList.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.boxes?.length ?? 0}개)
              </option>
            ))}
          </select>

          <button
            onClick={handleCalculate}
            disabled={isCalculating || !selectedBoxGroupId}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`} />
            {isCalculating ? '계산 중...' : result ? '재계산' : '계산 시작'}
          </button>

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
        </div>
      </div>

      {isLoadingRecommendation && !result && (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      )}

      {!isLoadingRecommendation && !result && !isCalculating && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <p className="text-muted-foreground">아직 계산된 결과가 없습니다.</p>
          <p className="text-sm text-muted-foreground">계산 시작 버튼을 눌러 패킹을 계산하세요.</p>
        </div>
      )}

      {isCalculating && !result && (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      )}

      {result && (
        <div className="space-y-8">
          {detailView ? (
            <PackingDetailPanel
              title={detailTitle}
              filteredBoxes={detailBoxes}
              onBack={() => setDetailView(null)}
              skuDimensionsMap={skuDimensionsMap}
              availableBoxes={availableBoxes}
              onBoxOverride={handleBoxOverride}
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
                      onClick={() => setDetailView({ type: 'box', boxId: bg.box.id })}
                    />
                  ))}
                </div>
              </div>

              {groupSections.map(({ group, filteredBoxes }) => (
                <div key={group.id} className="space-y-3">
                  <h2 className="text-lg font-semibold">{group.name}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBoxes.map((bg) => (
                      <BoxTypeCard
                        key={bg.box.id}
                        box={bg.box}
                        count={bg.count}
                        totalCBM={bg.totalCBM}
                        efficiency={bg.efficiency}
                        onClick={() => setDetailView({ type: 'box', boxId: bg.box.id, groupId: group.id })}
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
                        onClick={() => setDetailView({ type: 'box', boxId: bg.box.id, groupId: null })}
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
    </div>
  );
};
