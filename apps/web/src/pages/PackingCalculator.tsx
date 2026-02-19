import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Calculator, Package, History, Settings, AlertTriangle, Layers } from 'lucide-react';
import { useBoxes, useBatches, usePackingHistory, useCalculatePacking } from '@/hooks/queries';
import { PackingGroupingOption, PackingRecommendation } from '@wms/types';

interface PackingCalculationResult {
  boxes: {
    box: { id: string; name: string; width: number; length: number; height: number };
    count: number;
    packedSKUs: { skuId: string; name?: string; quantity: number }[];
  }[];
  unpackedItems: { skuId: string; name?: string; quantity: number; reason?: string }[];
  totalCBM: number;
  totalEfficiency: number;
}

interface NormalizedBoxGroup {
  box: { id: string; name: string; width: number; length: number; height: number };
  count: number;
  totalCBM: number;
  efficiency: number;
  shipments: {
    groupLabel: string;
    count: number;
    packedSKUs: { skuId: string; name?: string; quantity: number }[];
  }[];
}

export const PackingCalculator: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: boxes = [] } = useBoxes();
  const { data: batches = [] } = useBatches(id || '');
  const { data: history = [] } = usePackingHistory(id || '');
  const calculatePacking = useCalculatePacking();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PackingRecommendation | PackingCalculationResult | null>(
    null,
  );
  const [groupingOption, setGroupingOption] = useState<PackingGroupingOption>(
    PackingGroupingOption.ORDER,
  );
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  const normalizedBoxes = useMemo((): NormalizedBoxGroup[] => {
    if (!result) return [];

    const hasGroups = 'groups' in result && Array.isArray((result as PackingRecommendation).groups);

    if (hasGroups) {
      const rec = result as PackingRecommendation;
      const boxMap = new Map<string, NormalizedBoxGroup>();

      for (const group of rec.groups) {
        for (const boxGroup of group.boxes) {
          const boxId = boxGroup.box.id;
          const boxCBM = (boxGroup.box.width * boxGroup.box.length * boxGroup.box.height) / 1000000;

          if (!boxMap.has(boxId)) {
            boxMap.set(boxId, {
              box: boxGroup.box,
              count: boxGroup.count,
              totalCBM: boxCBM * boxGroup.count,
              efficiency: group.totalEfficiency,
              shipments: [],
            });
          } else {
            const existing = boxMap.get(boxId)!;
            existing.count += boxGroup.count;
            existing.totalCBM += boxCBM * boxGroup.count;
          }

          boxMap.get(boxId)!.shipments.push({
            groupLabel: group.groupLabel,
            count: boxGroup.count,
            packedSKUs: boxGroup.packedSKUs,
          });
        }
      }

      return Array.from(boxMap.values());
    } else {
      const calc = result as PackingCalculationResult;
      return calc.boxes.map((boxGroup) => {
        const boxCBM = (boxGroup.box.width * boxGroup.box.length * boxGroup.box.height) / 1000000;
        return {
          box: boxGroup.box,
          count: boxGroup.count,
          totalCBM: boxCBM * boxGroup.count,
          efficiency: calc.totalEfficiency,
          shipments: [
            {
              groupLabel: 'All Items',
              count: boxGroup.count,
              packedSKUs: boxGroup.packedSKUs,
            },
          ],
        };
      });
    }
  }, [result]);

  const unpackedItems = useMemo(() => {
    if (!result) return [];

    if ('unpackedItems' in result && result.unpackedItems) {
      return result.unpackedItems;
    }
    return [];
  }, [result]);

  const handleCalculate = async () => {
    if (!id) return;
    setLoading(true);
    try {
      if (!boxes || boxes.length === 0) {
        alert('등록된 박스가 없습니다. 박스 관리 메뉴에서 박스를 먼저 등록해주세요.');
        setLoading(false);
        return;
      }

      const data = await calculatePacking.mutateAsync({ projectId: id, groupingOption, batchId: selectedBatchId || undefined });
      setResult(data);
    } catch (error: unknown) {
      console.error('Calculation failed:', error);
      const message =
        error instanceof Error
          ? error.message
          : '계산에 실패했습니다. 상품 및 출고 목록이 등록되어 있는지 확인해주세요.';
      alert(message);
    } finally {
      setLoading(false);
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

        <div className="flex items-center gap-4 bg-card p-2 rounded-lg border shadow-sm">
          {batches.length > 0 && (
            <div className="flex items-center gap-2 px-2 border-r pr-4 mr-2">
              <span className="text-sm font-medium">Batch:</span>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch.batchId} value={batch.batchId}>
                    {batch.batchName} ({batch.count} items)
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 px-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Grouping:</span>
          </div>
          <select
            value={groupingOption}
            onChange={(e) => setGroupingOption(e.target.value as PackingGroupingOption)}
            className="h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value={PackingGroupingOption.ORDER}>By Order Number</option>
            <option value={PackingGroupingOption.RECIPIENT}>By Recipient</option>
            <option value={PackingGroupingOption.ORDER_RECIPIENT}>By Order + Recipient</option>
          </select>
          <button
            onClick={handleCalculate}
            disabled={loading || calculatePacking.isPending}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 transition-colors"
          >
            {loading || calculatePacking.isPending ? (
              'Calculating...'
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Calculate
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
              <div className="flex flex-row items-center justify-between pb-2">
                <h3 className="font-semibold text-lg">Total Volume</h3>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-3xl font-bold">{result.totalCBM.toFixed(4)} CBM</div>
                <p className="text-sm text-muted-foreground">Combined volume of all boxes</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
              <div className="flex flex-row items-center justify-between pb-2">
                <h3 className="font-semibold text-lg">Packing Efficiency</h3>
                <div className="text-lg font-bold">
                  {(result.totalEfficiency * 100).toFixed(1)}%
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden bg-gray-100">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-500"
                    style={{ width: `${result.totalEfficiency * 100}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-right">Volume utilization</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <h2 className="text-2xl font-bold border-b pb-2 flex items-center gap-2">
              <Layers className="h-6 w-6" />
              Recommended Packing by Box Type
            </h2>

            {normalizedBoxes.map((boxGroup, idx) => (
              <div
                key={idx}
                className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200 gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {boxGroup.box.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {boxGroup.box.width} x {boxGroup.box.length} x {boxGroup.box.height} cm
                    </p>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                        Total Boxes
                      </p>
                      <p className="font-mono font-bold text-indigo-700 text-xl">
                        {boxGroup.count}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                        Volume
                      </p>
                      <p className="font-mono font-bold text-indigo-700">
                        {boxGroup.totalCBM.toFixed(4)} CBM
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                        Efficiency
                      </p>
                      <p className="font-mono font-bold text-indigo-700">
                        {(boxGroup.efficiency * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {(() => {
                    const groupedShipments = new Map<
                      string,
                      {
                        items: (typeof boxGroup.shipments)[0];
                        totalCount: number;
                        labels: string[];
                      }
                    >();

                    for (const shipment of boxGroup.shipments) {
                      const skuKey = shipment.packedSKUs
                        .map((sku) => `${sku.skuId}:${sku.quantity}`)
                        .sort()
                        .join('|');

                      if (!groupedShipments.has(skuKey)) {
                        groupedShipments.set(skuKey, {
                          items: shipment,
                          totalCount: shipment.count,
                          labels: [shipment.groupLabel],
                        });
                      } else {
                        const existing = groupedShipments.get(skuKey)!;
                        existing.totalCount += shipment.count;
                        existing.labels.push(shipment.groupLabel);
                      }
                    }

                    return Array.from(groupedShipments.values()).map((grouped, gIdx) => {
                      const showLabels = grouped.labels.length === 1;
                      const label =
                        grouped.labels.length === 1 ? grouped.labels[0] : grouped.labels.join(', ');

                      return (
                        <div
                          key={gIdx}
                          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                        >
                          <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                            <span className="font-semibold text-gray-700">
                              {showLabels ? label : 'Configuration * ' + grouped.totalCount}
                            </span>
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium">
                              {grouped.totalCount} box{grouped.totalCount > 1 ? 'es' : ''}
                            </span>
                          </div>
                          <div className="p-3">
                            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                              Contents per box
                            </p>
                            <ul className="space-y-1">
                              {grouped.items.packedSKUs.map((sku, skuIdx) => (
                                <li
                                  key={skuIdx}
                                  className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-0"
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <span
                                      className="font-medium text-gray-900 truncate"
                                      title={sku.name}
                                    >
                                      {sku.name || 'Unknown Product'}
                                    </span>
                                    <span className="font-mono text-xs text-gray-500 flex-shrink-0">
                                      ({sku.skuId})
                                    </span>
                                  </div>
                                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-600 flex-shrink-0">
                                    qty: {sku.quantity}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ))}

            {unpackedItems.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-8">
                <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Items Not Packed (Too Large)</span>
                </div>
                <div className="text-sm text-red-700 mb-2">
                  The following items could not fit into any available box type:
                </div>
                <ul className="space-y-2">
                  {unpackedItems.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between items-center bg-white/50 p-2 rounded border border-red-100"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{item.name || 'Unknown Product'}</span>
                        <span className="text-xs font-mono opacity-75">{item.skuId}</span>
                      </div>
                      <span className="font-bold bg-red-100 px-2 py-0.5 rounded text-red-800">
                        x{item.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {history.length > 0 && !result && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Results
          </h2>
          <div className="rounded-lg border overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Box Type</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Efficiency</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Total CBM</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Packed Count</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-gray-600">
                      {new Date(item.createdAt).toLocaleDateString()}{' '}
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">{item.boxName}</td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${Number(item.efficiency) > 0.8 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                      >
                        {(Number(item.efficiency) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-gray-600">
                      {Number(item.totalCBM).toFixed(4)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-gray-600">
                      {item.packedCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
