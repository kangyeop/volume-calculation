import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { useCalculatePacking, useExportPacking, useBoxes } from '@/hooks/queries';
import { usePackingNormalizer } from '@/hooks/usePackingNormalizer';
import type { PackingCalculationResult } from '@/hooks/usePackingNormalizer';
import { PackingSummaryCards } from '@/components/packing/PackingSummaryCards';
import { BoxGroupList } from '@/components/packing/BoxGroupList';
import { UnpackedItemsAlert } from '@/components/packing/UnpackedItemsAlert';
import { PackingGroupingOption, PackingRecommendation } from '@wms/types';

export const PackingCalculator: React.FC = () => {
  const { id: batchId } = useParams<{ id: string }>();
  const { data: boxes = [] } = useBoxes();
  const calculatePacking = useCalculatePacking();
  const exportPacking = useExportPacking();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PackingRecommendation | PackingCalculationResult | null>(
    null,
  );
  const hasCalculated = useRef(false);

  const { normalizedBoxes, unpackedItems } = usePackingNormalizer(result);

  useEffect(() => {
    if (!batchId || hasCalculated.current) return;
    if (boxes.length === 0) return;

    hasCalculated.current = true;
    setLoading(true);

    calculatePacking
      .mutateAsync({ batchId, groupingOption: PackingGroupingOption.ORDER })
      .then((data) => {
        setResult(data);
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : '계산에 실패했습니다. 상품 및 출고 목록이 등록되어 있는지 확인해주세요.';
        toast.error('계산 실패', { description: message });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [batchId, boxes]);

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

      {loading && !result && (
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
          <BoxGroupList normalizedBoxes={normalizedBoxes} />
          <UnpackedItemsAlert items={unpackedItems} />
        </div>
      )}
    </div>
  );
};
