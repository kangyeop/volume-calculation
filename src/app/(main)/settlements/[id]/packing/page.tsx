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
  useConfirmSettlement,
  useUnconfirmSettlement,
  useProductGroups,
  useBoxGroups,
} from '@/hooks/queries';
import { usePackingNormalizer } from '@/hooks/usePackingNormalizer';
import { usePackingGroups } from '@/hooks/usePackingGroups';
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
  const { data: productGroups = [] } = useProductGroups();
  const { data: boxGroupList = [] } = useBoxGroups();
  const confirmSettlement = useConfirmSettlement();
  const unconfirmSettlement = useUnconfirmSettlement();

  const isConfirmed = settlement?.status === 'CONFIRMED';

  const [boxSortStrategy, setBoxSortStrategy] = useState<BoxSortStrategy>('volume');

  const result = savedRecommendation ?? null;
  const { normalizedBoxes, unpackedItems } = usePackingNormalizer(result);

  const {
    skuDimensionsMap,
    skuToGroupId,
    groupSections: baseGroupSections,
    unclassifiedBoxes,
    detailView,
    setDetailView,
    detailBoxes,
    detailTitle,
    availableBoxes,
    getShipmentGroupId,
  } = usePackingGroups({ normalizedBoxes, productGroups, boxGroupList, searchParams, router });

  const groupStats = useMemo(() => {
    if (!settlement) return new Map<string, { barcodeCount: number; aircapCount: number }>();
    const stats = new Map<string, { barcodeCount: number; aircapCount: number }>();
    for (const order of settlement.orders) {
      if (order.barcodeCount === 0 && order.aircapCount === 0) continue;
      const groupIds = new Set<string>();
      for (const item of order.items) {
        const gid = skuToGroupId.get(item.sku);
        if (gid) groupIds.add(gid);
      }
      for (const gid of groupIds) {
        const current = stats.get(gid) ?? { barcodeCount: 0, aircapCount: 0 };
        current.barcodeCount += order.barcodeCount;
        current.aircapCount += order.aircapCount;
        stats.set(gid, current);
      }
    }
    return stats;
  }, [settlement, skuToGroupId]);

  const groupSections = useMemo(() => {
    return baseGroupSections.map((section) => {
      const gs = groupStats.get(section.group.id);
      return {
        ...section,
        barcodeCount: gs?.barcodeCount ?? 0,
        aircapCount: gs?.aircapCount ?? 0,
      };
    });
  }, [baseGroupSections, groupStats]);

  const isCalculating = calculatePacking.isPending;
  const pendingCount = useMemo(() => {
    if (!settlement) return 0;
    return settlement.orders.filter((o) => o.status === 'PENDING').length;
  }, [settlement]);

  const handleCalculate = async () => {
    if (!id) return;
    try {
      const data = await calculatePacking.mutateAsync({ id, strategy: boxSortStrategy });
      const parts = [];
      if (data.packed > 0) parts.push(`${data.packed}건 패킹 완료`);
      if (data.failed > 0) parts.push(`${data.failed}건 실패`);
      toast.success('패킹 계산 완료', { description: parts.join(', ') });
      const p = new URLSearchParams(searchParams.toString());
      p.delete('boxId');
      p.delete('groupId');
      router.replace(`?${p.toString()}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '계산에 실패했습니다.';
      toast.error('계산 실패', { description: message });
    }
  };

  const handleBoxOverride = async (
    groupIndices: number[],
    boxIndices: number[],
    newBoxId: string,
  ) => {
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

  const totalBarcodeCount = settlement?.orders.reduce((sum, o) => sum + o.barcodeCount, 0) ?? 0;
  const totalAircapCount = settlement?.orders.reduce((sum, o) => sum + o.aircapCount, 0) ?? 0;

  const handleExport = useCallback(async () => {
    if (!settlement) return;
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Packing Results');

    const fill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });
    const headerFill = fill('FF4472C4');
    const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    const sectionFill = fill('FFD9E2F3');
    const sectionFont = { bold: true, size: 12 };
    const subHeaderFill = fill('FFF2F2F2');

    worksheet.columns = [
      { width: 25 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
    ];

    const addSectionHeader = (title: string, extra?: string) => {
      const row = worksheet.addRow([title, extra ?? '', '', '']);
      row.getCell(1).font = sectionFont;
      row.getCell(1).fill = sectionFill;
      row.getCell(2).fill = sectionFill;
      row.getCell(3).fill = sectionFill;
      row.getCell(4).fill = sectionFill;
      if (extra) row.getCell(2).font = { bold: true, size: 11 };
    };

    const addTableHeader = (cols: string[]) => {
      const row = worksheet.addRow(cols);
      cols.forEach((_, i) => {
        row.getCell(i + 1).font = headerFont;
        row.getCell(i + 1).fill = headerFill;
        row.getCell(i + 1).alignment = { horizontal: 'center' };
      });
    };

    const addBoxRows = (boxes: typeof normalizedBoxes) => {
      addTableHeader(['박스', '수량', 'CBM', '효율(%)']);
      for (const bg of boxes) {
        worksheet.addRow([
          bg.box.name,
          bg.count,
          Math.round(bg.totalCBM * 1000) / 1000,
          Math.round(bg.efficiency * 100) / 100,
        ]);
      }
    };

    addSectionHeader('박스별 사용 현황');
    addBoxRows(normalizedBoxes);

    for (const { group, filteredBoxes, barcodeCount, aircapCount } of groupSections) {
      worksheet.addRow([]);
      const statParts = [];
      if (barcodeCount > 0) statParts.push(`바코드: ${barcodeCount}`);
      if (aircapCount > 0) statParts.push(`에어캡: ${aircapCount}`);
      addSectionHeader(group.name, statParts.join('  '));
      addBoxRows(filteredBoxes);
    }

    if (unclassifiedBoxes.length > 0 || pendingCount > 0) {
      worksheet.addRow([]);
      const extra = pendingCount > 0 ? `${pendingCount}건 미계산` : '';
      addSectionHeader('미분류', extra);
      if (unclassifiedBoxes.length > 0) {
        addBoxRows(unclassifiedBoxes);
      }
    }

    if (totalBarcodeCount > 0 || totalAircapCount > 0) {
      worksheet.addRow([]);
      const summaryRow = worksheet.addRow([
        '전체 합계',
        '',
        `바코드: ${totalBarcodeCount}`,
        `에어캡: ${totalAircapCount}`,
      ]);
      summaryRow.getCell(1).font = { bold: true, size: 11 };
      summaryRow.getCell(1).fill = subHeaderFill;
      summaryRow.getCell(2).fill = subHeaderFill;
      summaryRow.getCell(3).fill = subHeaderFill;
      summaryRow.getCell(3).font = { bold: true };
      summaryRow.getCell(4).fill = subHeaderFill;
      summaryRow.getCell(4).font = { bold: true };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settlement_packing_${id}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [settlement, id, normalizedBoxes, groupSections, unclassifiedBoxes, pendingCount, totalBarcodeCount, totalAircapCount]);

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
            <p className="text-muted-foreground">정산 주문에 대한 최적 박스 구성을 계산합니다.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConfirmed && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg">
              <Lock className="h-3.5 w-3.5" />
              확정됨
            </span>
          )}

          {!isConfirmed && (
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
                {isCalculating ? '계산 중...' : result ? '재계산' : '계산 시작'}
              </button>
            </>
          )}

          {result && (
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Excel 내보내기
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
          <span>
            전체 바코드: <strong className="text-gray-900">{totalBarcodeCount}</strong>
          </span>
          <span>
            전체 에어캡: <strong className="text-gray-900">{totalAircapCount}</strong>
          </span>
        </div>
      )}

      {isLoadingRecommendation && !result && <PackingCalculatorSkeleton />}

      {!isLoadingRecommendation && !result && !isCalculating && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <p className="text-muted-foreground">아직 계산된 패킹 결과가 없습니다.</p>
          {pendingCount > 0 && (
            <p className="text-sm text-muted-foreground">
              미분류 주문 {pendingCount}건이 있습니다. 계산 시작 버튼을 눌러 패킹을 계산하세요.
            </p>
          )}
        </div>
      )}

      {isCalculating && !result && <PackingCalculatorSkeleton />}

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
                  <div>
                    <h2 className="text-lg font-semibold">{group.name}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>바코드: <strong className="text-gray-900">{barcodeCount}</strong></span>
                      <span>에어캡: <strong className="text-gray-900">{aircapCount}</strong></span>
                    </div>
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

              {(unclassifiedBoxes.length > 0 || pendingCount > 0) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">미분류</h2>
                    {pendingCount > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {pendingCount}건 미계산
                      </span>
                    )}
                  </div>
                  {unclassifiedBoxes.length > 0 && (
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
                  )}
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
