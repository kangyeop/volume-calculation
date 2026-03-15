import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  useBoxes,
  usePackingHistory,
  useCalculatePacking,
  useExportPacking,
} from '@/hooks/queries';
import { usePackingNormalizer } from '@/hooks/usePackingNormalizer';
import type { PackingCalculationResult } from '@/hooks/usePackingNormalizer';
import { PackingControls } from '@/components/packing/PackingControls';
import { PackingSummaryCards } from '@/components/packing/PackingSummaryCards';
import { BoxGroupList } from '@/components/packing/BoxGroupList';
import { UnpackedItemsAlert } from '@/components/packing/UnpackedItemsAlert';
import { PackingHistory } from '@/components/packing/PackingHistory';
import { PackingGroupingOption, PackingRecommendation } from '@wms/types';

export const PackingCalculator: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: boxes = [] } = useBoxes();
  const { data: history = [] } = usePackingHistory(id || '');
  const calculatePacking = useCalculatePacking();
  const exportPacking = useExportPacking();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PackingRecommendation | PackingCalculationResult | null>(
    null,
  );
  const [groupingOption, setGroupingOption] = useState<PackingGroupingOption>(
    PackingGroupingOption.ORDER,
  );

  const { normalizedBoxes, unpackedItems } = usePackingNormalizer(result);

  const handleCalculate = async () => {
    if (!id) return;
    setLoading(true);
    try {
      if (!boxes || boxes.length === 0) {
        toast.error('박스가 없습니다', {
          description: '박스 관리 메뉴에서 박스를 먼저 등록해주세요.',
        });
        setLoading(false);
        return;
      }

      const data = await calculatePacking.mutateAsync({
        projectId: id,
        groupingOption,
      });
      setResult(data);
    } catch (error: unknown) {
      console.error('Calculation failed:', error);
      const message =
        error instanceof Error
          ? error.message
          : '계산에 실패했습니다. 상품 및 출고 목록이 등록되어 있는지 확인해주세요.';
      toast.error('계산 실패', { description: message });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      await exportPacking.mutateAsync({ projectId: id });
    } catch (error: unknown) {
      console.error('Export failed:', error);
      const message = error instanceof Error ? error.message : '엑셀 다운로드에 실패했습니다.';
      toast.error('내보내기 실패', { description: message });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Packing / CBM Calculator</h1>
          <p className="text-muted-foreground">
            Calculate optimal box configuration for your outbound orders.
          </p>
        </div>

        <PackingControls
          groupingOption={groupingOption}
          loading={loading || calculatePacking.isPending}
          exportPending={exportPacking.isPending}
          onGroupingChange={setGroupingOption}
          onCalculate={handleCalculate}
          onExport={handleExport}
        />
      </div>

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

      {history.length > 0 && !result && <PackingHistory history={history} />}
    </div>
  );
};
