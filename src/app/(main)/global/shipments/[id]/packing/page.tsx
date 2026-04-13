'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCw, AlertTriangle, AlertCircle, Package, Box } from 'lucide-react';
import {
  useGlobalPackingRecommendation,
  useCalculateGlobalPacking,
  useGlobalShipment,
  type GlobalPackingResultRow,
} from '@/hooks/queries';
import { PageContainer } from '@/components/layout/PageContainer';
import { PalletPacking3DModal } from '@/components/global/PalletPacking3DModal';

const ShipmentPdfDownloadButtons = dynamic(
  () => import('@/components/global/ShipmentPdfDownloadButtons'),
  { ssr: false },
);

export default function GlobalPackingCalculator() {
  const params = useParams<{ id: string }>();
  const shipmentId = params.id ?? '';
  const router = useRouter();

  const { data: recommendation, isLoading } = useGlobalPackingRecommendation(shipmentId);
  const { data: shipment } = useGlobalShipment(shipmentId);
  const calculateMutation = useCalculateGlobalPacking(shipmentId);
  const [view3dRow, setView3dRow] = useState<GlobalPackingResultRow | null>(null);

  const isCalculating = calculateMutation.isPending;
  const result = recommendation ?? null;

  const handleCalculate = async () => {
    if (!shipmentId) return;
    try {
      await calculateMutation.mutateAsync();
      toast.success('팔레트 계산이 완료되었습니다.');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '계산에 실패했습니다. 다시 시도해주세요.';
      toast.error('계산 실패', { description: message });
    }
  };

  const hasResult = !!result && (result.rows?.length ?? 0) > 0;
  const unpackableRows: GlobalPackingResultRow[] = result?.unpackableSkus ?? [];
  const unmatched: string[] = result?.unmatched ?? [];
  const allRows: GlobalPackingResultRow[] = result?.rows ?? [];
  const packableRows = allRows.filter((r) => !r.unpackable);
  const totalPallets = result?.totalPallets ?? 0;
  const totalSkus = packableRows.length;

  return (
    <PageContainer>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/global/shipments/${shipmentId}`)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">팔레트 계산</h1>
            <p className="text-muted-foreground">글로벌 출고에 대한 팔레트 적재 수량을 계산합니다.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasResult && (
            <ShipmentPdfDownloadButtons
              rows={packableRows}
              totalPallets={totalPallets}
              shipmentLabel={shipment?.name ?? `글로벌 출고 ${shipmentId}`}
            />
          )}
          <button
            onClick={handleCalculate}
            disabled={isCalculating || !shipmentId}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`} />
            {isCalculating ? '계산 중...' : hasResult ? '재계산' : '계산하기'}
          </button>
        </div>
      </div>

      {hasResult && (
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Package className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">총 팔레트 수</div>
              <div className="text-2xl font-bold">
                {totalPallets} <span className="text-base font-medium">pallets</span>
                <span className="ml-2 text-sm text-muted-foreground">({totalSkus} SKUs)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {unpackableRows.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-900">
                적재 불가 SKU ({unpackableRows.length}개)
              </div>
              <div className="text-sm text-red-800 mt-1">
                박스 치수가 팔레트 규격을 초과하여 적재할 수 없습니다.
              </div>
              <ul className="mt-3 space-y-1.5">
                {unpackableRows.map((row) => (
                  <li key={row.id} className="text-sm text-red-900 flex items-center gap-2">
                    <span className="font-mono font-semibold">{row.sku}</span>
                    <span className="text-red-700">·</span>
                    <span>{row.productName}</span>
                    <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                      cartonsPerPallet = 0
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-amber-900">
                매칭 실패 SKU ({unmatched.length}개)
              </div>
              <div className="text-sm text-amber-800 mt-1">
                글로벌 상품 마스터에 등록되지 않아 계산에서 제외되었습니다.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {unmatched.map((sku) => (
                  <span
                    key={sku}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-mono font-semibold bg-amber-100 text-amber-900 rounded"
                  >
                    {sku}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && !result && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          불러오는 중...
        </div>
      )}

      {!isLoading && !hasResult && !isCalculating && unpackableRows.length === 0 && unmatched.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4 bg-white border rounded-xl shadow-sm">
          <Package className="h-12 w-12 text-gray-300" />
          <div>
            <p className="font-medium text-gray-700">아직 계산되지 않았습니다</p>
            <p className="text-sm text-muted-foreground mt-1">
              계산하기 버튼을 눌러 팔레트 적재 수량을 계산하세요.
            </p>
          </div>
          <button
            onClick={handleCalculate}
            disabled={isCalculating || !shipmentId}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`} />
            계산하기
          </button>
        </div>
      )}

      {packableRows.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">SKU별 적재 계획</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packableRows.map((row) => {
              const hasPartialLast =
                row.palletCount > 0 &&
                row.lastPalletCartons > 0 &&
                row.lastPalletCartons !== row.cartonsPerPallet;
              return (
                <div
                  key={row.id}
                  className="bg-white border rounded-xl shadow-sm p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate">{row.productName}</div>
                      <div className="text-xs font-mono text-muted-foreground mt-0.5">{row.sku}</div>
                      {row.width != null && row.length != null && row.height != null && (
                        <div className="text-xs text-gray-600 mt-1">
                          박스 체적 <span className="font-mono">{row.width} × {row.length} × {row.height}</span>
                        </div>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded">
                      {row.palletCount} pallets
                    </span>
                  </div>

                  {row.width != null && row.length != null && row.height != null && (
                    <button
                      onClick={() => setView3dRow(row)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <Box className="h-3.5 w-3.5" />
                      3D로 보기
                    </button>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-muted-foreground">총 수량</div>
                      <div className="text-sm font-semibold">{row.totalUnits.toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-muted-foreground">박스 수</div>
                      <div className="text-sm font-semibold">{row.cartonCount.toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-muted-foreground">박스당 수량</div>
                      <div className="text-sm font-semibold">{row.innerQuantity}</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">한 층 적재 수량</span>
                      <span className="font-medium">{row.itemsPerLayer} 칸</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">한 팔레트 적재 수량</span>
                      <span className="font-medium">{row.cartonsPerPallet} 칸</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">팔레트 수</span>
                      <span className="font-medium">{row.palletCount} pallets</span>
                    </div>
                    {hasPartialLast && (
                      <div className="flex justify-between items-center pt-1 border-t">
                        <span className="text-muted-foreground">마지막 팔레트</span>
                        <span className="font-bold text-indigo-700">
                          {row.lastPalletCartons}/{row.cartonsPerPallet} 칸
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PalletPacking3DModal
        open={view3dRow !== null}
        onClose={() => setView3dRow(null)}
        sku={
          view3dRow &&
          view3dRow.width != null &&
          view3dRow.length != null &&
          view3dRow.height != null
            ? {
                sku: view3dRow.sku,
                productName: view3dRow.productName,
                width: view3dRow.width,
                length: view3dRow.length,
                height: view3dRow.height,
                innerQuantity: view3dRow.innerQuantity,
              }
            : null
        }
      />
    </PageContainer>
  );
}
