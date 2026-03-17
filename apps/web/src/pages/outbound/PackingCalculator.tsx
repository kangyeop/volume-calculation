import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, RefreshCw } from 'lucide-react';
import {
  useCalculatePacking,
  useExportPacking,
  usePackingRecommendation,
  useProductGroups,
} from '@/hooks/queries';
import { usePackingNormalizer } from '@/hooks/usePackingNormalizer';
import type { PackingCalculationResult } from '@/hooks/usePackingNormalizer';
import { PackingSummaryCards } from '@/components/packing/PackingSummaryCards';
import { BoxGroupList } from '@/components/packing/BoxGroupList';
import { UnpackedItemsAlert } from '@/components/packing/UnpackedItemsAlert';
import { PackingGroupingOption, PackingRecommendation } from '@wms/types';

export const PackingCalculator: React.FC = () => {
  const { id: batchId } = useParams<{ id: string }>();
  const { data: savedRecommendation, isLoading: isLoadingRecommendation } =
    usePackingRecommendation(batchId ?? '');
  const calculatePacking = useCalculatePacking();
  const exportPacking = useExportPacking();
  const { data: productGroups = [] } = useProductGroups();

  const [freshResult, setFreshResult] = useState<PackingRecommendation | PackingCalculationResult | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const result = freshResult ?? savedRecommendation ?? null;
  const { normalizedBoxes, unpackedItems } = usePackingNormalizer(result);

  const skuToGroupId = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of productGroups) {
      for (const product of group.products ?? []) {
        map.set(product.sku, group.id);
      }
    }
    return map;
  }, [productGroups]);

  const filteredBoxes = useMemo(() => {
    if (!selectedGroupId) return normalizedBoxes;
    return normalizedBoxes
      .map((boxGroup) => ({
        ...boxGroup,
        shipments: boxGroup.shipments.filter((shipment) =>
          shipment.packedSKUs.some((sku) => skuToGroupId.get(sku.skuId) === selectedGroupId),
        ),
      }))
      .filter((boxGroup) => boxGroup.shipments.length > 0);
  }, [normalizedBoxes, selectedGroupId, skuToGroupId]);

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

  const isCalculating = calculatePacking.isPending;

  const handleCalculate = async () => {
    if (!batchId) return;
    try {
      const data = await calculatePacking.mutateAsync({
        batchId,
        groupingOption: PackingGroupingOption.ORDER,
      });
      setFreshResult(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : '계산에 실패했습니다. 상품 및 출고 목록이 등록되어 있는지 확인해주세요.';
      toast.error('계산 실패', { description: message });
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
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
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
        <div className="space-y-6">
          <PackingSummaryCards
            totalCBM={result.totalCBM}
            totalEfficiency={result.totalEfficiency}
          />

          {visibleGroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedGroupId(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedGroupId === null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              {visibleGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedGroupId === group.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {group.name}
                </button>
              ))}
            </div>
          )}

          <BoxGroupList normalizedBoxes={filteredBoxes} />
          <UnpackedItemsAlert items={unpackedItems} />
        </div>
      )}
    </div>
  );
};
