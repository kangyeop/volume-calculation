'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Package, Layers, ChevronDown, ChevronRight, Maximize2, X } from 'lucide-react';
import type { NormalizedBoxGroup } from '@/hooks/usePackingNormalizer';
import type { Box } from '@/types';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface GroupedShipment {
  items: NormalizedBoxGroup['shipments'][0];
  totalCount: number;
  labels: string[];
  groupIndices: number[];
  boxIndices: number[];
}

interface BoxGroupListProps {
  normalizedBoxes: NormalizedBoxGroup[];
  showFilter?: boolean;
  skuDimensionsMap?: Map<string, { width: number; length: number; height: number; name: string }>;
  availableBoxes?: Box[];
  onBoxOverride?: (groupIndices: number[], boxIndices: number[], newBoxId: string) => void;
}

export const BoxGroupList: React.FC<BoxGroupListProps> = ({
  normalizedBoxes,
  showFilter = true,
  skuDimensionsMap,
  availableBoxes,
  onBoxOverride,
}) => {
  const [expandedLabels, setExpandedLabels] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [pendingOverride, setPendingOverride] = useState<{
    groupIndices: number[];
    boxIndices: number[];
    newBoxId: string;
    newBoxName: string;
    isBulk: boolean;
  } | null>(null);

  const toggleLabels = (key: string) => {
    setExpandedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredBoxes = activeFilter
    ? normalizedBoxes.filter((b) => b.box.id === activeFilter)
    : normalizedBoxes;

  const groupedByBox = useMemo(() => {
    return filteredBoxes.map((boxGroup) => {
      const grouped = new Map<string, GroupedShipment>();
      for (const shipment of boxGroup.shipments) {
        const skuKey = shipment.packedSKUs
          .map((sku) => `${sku.skuId}:${sku.quantity}`)
          .sort()
          .join('|');

        if (!grouped.has(skuKey)) {
          grouped.set(skuKey, {
            items: shipment,
            totalCount: shipment.count,
            labels: [shipment.groupLabel],
            groupIndices: [shipment.groupIndex ?? 0],
            boxIndices: [shipment.boxIndex ?? 0],
          });
        } else {
          const existing = grouped.get(skuKey)!;
          existing.totalCount += shipment.count;
          existing.labels.push(shipment.groupLabel);
          existing.groupIndices.push(shipment.groupIndex ?? 0);
          existing.boxIndices.push(shipment.boxIndex ?? 0);
        }
      }
      return grouped;
    });
  }, [filteredBoxes]);

  const allVisibleKeys = useMemo(() => {
    const keys: string[] = [];
    groupedByBox.forEach((grouped, idx) => {
      for (const skuKey of grouped.keys()) {
        keys.push(`${idx}::${skuKey}`);
      }
    });
    return keys;
  }, [groupedByBox]);

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [activeFilter]);

  const toggleSelection = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedKeys((prev) =>
      prev.size === allVisibleKeys.length ? new Set() : new Set(allVisibleKeys),
    );
  }, [allVisibleKeys]);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  const handleBulkChange = useCallback(
    (newBoxId: string, newBoxName: string) => {
      if (!onBoxOverride) return;
      const allGroupIndices: number[] = [];
      const allBoxIndices: number[] = [];
      for (const key of selectedKeys) {
        const sepIdx = key.indexOf('::');
        const idxStr = key.substring(0, sepIdx);
        const skuKey = key.substring(sepIdx + 2);
        const grouped = groupedByBox[Number(idxStr)]?.get(skuKey);
        if (grouped) {
          allGroupIndices.push(...grouped.groupIndices);
          allBoxIndices.push(...grouped.boxIndices);
        }
      }
      setPendingOverride({
        groupIndices: allGroupIndices,
        boxIndices: allBoxIndices,
        newBoxId,
        newBoxName,
        isBulk: true,
      });
    },
    [onBoxOverride, selectedKeys, groupedByBox],
  );

  const confirmOverride = useCallback(() => {
    if (!pendingOverride || !onBoxOverride) return;
    onBoxOverride(pendingOverride.groupIndices, pendingOverride.boxIndices, pendingOverride.newBoxId);
    if (pendingOverride.isBulk) clearSelection();
    setPendingOverride(null);
  }, [pendingOverride, onBoxOverride, clearSelection]);

  const cancelOverride = useCallback(() => setPendingOverride(null), []);

  const hasSelection = selectedKeys.size > 0;
  const isAllSelected = allVisibleKeys.length > 0 && selectedKeys.size === allVisibleKeys.length;
  const isIndeterminate = hasSelection && !isAllSelected;

  return (
    <div className={`space-y-6 ${hasSelection ? 'pb-20' : ''}`} data-testid="packing-results">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-6 w-6" />
          Recommended Packing by Box Type
        </h2>
        {showFilter && normalizedBoxes.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveFilter(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeFilter === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              전체 ({normalizedBoxes.length})
            </button>
            {normalizedBoxes.map((b) => (
              <button
                key={b.box.id}
                onClick={() => setActiveFilter(b.box.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeFilter === b.box.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {b.box.name} ({b.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {onBoxOverride && allVisibleKeys.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isIndeterminate;
            }}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <span className="text-sm text-gray-600">
            {hasSelection ? `${selectedKeys.size}개 선택됨` : '전체 선택'}
          </span>
        </div>
      )}

      {filteredBoxes.map((boxGroup, idx) => {
        const isUnassigned = boxGroup.box.id === 'unassigned';
        const groupedShipments = groupedByBox[idx];

        return (
          <div
            key={idx}
            className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-lg border gap-4 ${
              isUnassigned
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200'
            }`}>
              <div>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${
                  isUnassigned ? 'text-amber-900' : 'text-indigo-900'
                }`}>
                  <Package className="h-5 w-5" />
                  {boxGroup.box.name}
                  {isUnassigned && (
                    <span className="text-xs font-normal bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                      박스 미지정
                    </span>
                  )}
                </h3>
                {!isUnassigned && (
                  <p className="text-sm text-muted-foreground">
                    {boxGroup.box.width} x {boxGroup.box.length} x {boxGroup.box.height} cm
                  </p>
                )}
              </div>
              <div className="flex gap-6">
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    Total Boxes
                  </p>
                  <p className={`font-mono font-bold text-xl ${isUnassigned ? 'text-amber-700' : 'text-indigo-700'}`}>
                    {boxGroup.count}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    Volume
                  </p>
                  <p className={`font-mono font-bold ${isUnassigned ? 'text-amber-700' : 'text-indigo-700'}`}>
                    {boxGroup.totalCBM.toFixed(4)} CBM
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    Efficiency
                  </p>
                  <p className={`font-mono font-bold ${isUnassigned ? 'text-amber-700' : 'text-indigo-700'}`}>
                    {(boxGroup.efficiency * 100).toFixed(1)}%
                  </p>
                </div>
                {(() => {
                  const matchedBox = availableBoxes?.find((b) => b.id === boxGroup.box.id);
                  if (matchedBox?.stock === undefined) return null;
                  const isLow = matchedBox.stock < boxGroup.count;
                  return (
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                        재고
                      </p>
                      <p className={`font-mono font-bold ${isLow ? 'text-red-600' : 'text-green-700'}`}>
                        {matchedBox.stock}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="space-y-4">
              {Array.from(groupedShipments.entries()).map(([skuKey, grouped], gIdx) => {
                const selectionKey = `${idx}::${skuKey}`;
                const isSelected = selectedKeys.has(selectionKey);
                const labelKey = `${idx}-${gIdx}-${skuKey}`;
                const isExpanded = expandedLabels.has(labelKey);
                const sortedSKUs = [...grouped.items.packedSKUs].sort((a, b) =>
                  (a.name || a.skuId).localeCompare(b.name || b.skuId),
                );

                const maxItem = skuDimensionsMap
                  ? grouped.items.packedSKUs.reduce<{ name: string; width: number; length: number; height: number; volume: number } | null>(
                      (max, sku) => {
                        const dims = skuDimensionsMap.get(sku.skuId);
                        if (!dims) return max;
                        const vol = dims.width * dims.length * dims.height;
                        return !max || vol > max.volume
                          ? { name: dims.name, width: dims.width, length: dims.length, height: dims.height, volume: vol }
                          : max;
                      },
                      null,
                    )
                  : null;

                const occupancyPct = skuDimensionsMap
                  ? (() => {
                      const itemsVolume = grouped.items.packedSKUs.reduce((sum, sku) => {
                        const dims = skuDimensionsMap.get(sku.skuId);
                        if (!dims) return sum;
                        return sum + dims.width * dims.length * dims.height * sku.quantity;
                      }, 0);
                      const boxVolume = boxGroup.box.width * boxGroup.box.length * boxGroup.box.height;
                      return boxVolume > 0 ? (itemsVolume / boxVolume) * 100 : 0;
                    })()
                  : null;

                return (
                  <div
                    key={gIdx}
                    className={`bg-white rounded-lg border overflow-hidden transition-colors ${
                      isSelected ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-gray-200'
                    }`}
                  >
                    <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-start gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        {onBoxOverride && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(selectionKey)}
                            className="h-4 w-4 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                          />
                        )}
                        <div className="flex flex-col gap-1.5 min-w-0">
                          {grouped.labels.length > 1 && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">
                                Configuration × {grouped.totalCount}
                              </span>
                              {occupancyPct !== null && (
                                <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  {occupancyPct.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          )}
                          {grouped.labels.length <= 1 && occupancyPct !== null && (
                            <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit">
                              {occupancyPct.toFixed(1)}%
                            </span>
                          )}
                          {maxItem && (
                            <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md w-fit">
                              <Maximize2 className="h-3 w-3 flex-shrink-0" />
                              최대 아이템: {maxItem.name} ({maxItem.width}×{maxItem.length}×{maxItem.height} cm)
                            </span>
                          )}
                          <button
                            onClick={() => toggleLabels(labelKey)}
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                            )}
                            {grouped.labels.length}개 주문
                          </button>
                          {isExpanded && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {grouped.labels.map((l, i) => (
                                <span
                                  key={i}
                                  className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium"
                                >
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {availableBoxes && availableBoxes.length > 0 && onBoxOverride && (
                          <select
                            className={`border rounded px-2 py-1 text-xs bg-white focus:ring-2 outline-none ${
                              isUnassigned
                                ? 'border-amber-300 focus:ring-amber-400 focus:border-amber-400'
                                : 'border-gray-300 focus:ring-indigo-400 focus:border-indigo-400'
                            }`}
                            defaultValue={isUnassigned ? '' : boxGroup.box.id}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                const box = availableBoxes?.find((b) => b.id === val);
                                setPendingOverride({
                                  groupIndices: grouped.groupIndices,
                                  boxIndices: grouped.boxIndices,
                                  newBoxId: val,
                                  newBoxName: box?.name ?? val,
                                  isBulk: false,
                                });
                                e.target.value = isUnassigned ? '' : boxGroup.box.id;
                              }
                            }}
                          >
                            {isUnassigned && <option value="">박스 선택...</option>}
                            {availableBoxes.map((box) => (
                              <option key={box.id} value={box.id}>
                                {box.name} ({box.width}×{box.length}×{box.height})
                              </option>
                            ))}
                          </select>
                        )}
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium">
                          {grouped.totalCount} box{grouped.totalCount > 1 ? 'es' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                        Contents per box
                      </p>
                      <ul className="space-y-1">
                        {sortedSKUs.map((sku, skuIdx) => (
                          <li
                            key={skuIdx}
                            className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-0"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="font-medium text-gray-900 truncate" title={sku.name}>
                                {sku.name || 'Unknown Product'}
                              </span>
                              <span className="font-mono text-xs text-gray-500 flex-shrink-0">
                                ({sku.skuId})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {skuDimensionsMap?.get(sku.skuId) && (
                                <span className="font-mono text-xs text-gray-400">
                                  {skuDimensionsMap.get(sku.skuId)!.width}×{skuDimensionsMap.get(sku.skuId)!.length}×{skuDimensionsMap.get(sku.skuId)!.height} cm
                                </span>
                              )}
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-600">
                                qty: {sku.quantity}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={!!pendingOverride}
        title="박스 변경"
        description={
          pendingOverride
            ? `선택한 ${pendingOverride.isBulk ? `${selectedKeys.size}개 구성을` : '구성을'} "${pendingOverride.newBoxName}" 박스로 변경하시겠습니까?`
            : ''
        }
        confirmLabel="변경"
        onConfirm={confirmOverride}
        onCancel={cancelOverride}
      />

      {onBoxOverride && hasSelection && availableBoxes && availableBoxes.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedKeys.size}개 구성 선택됨
            </span>
            <div className="flex items-center gap-3">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    const box = availableBoxes?.find((b) => b.id === e.target.value);
                    handleBulkChange(e.target.value, box?.name ?? e.target.value);
                    e.target.value = '';
                  }
                }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
              >
                <option value="">박스 일괄 변경...</option>
                {availableBoxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.name} ({box.width}×{box.length}×{box.height})
                  </option>
                ))}
              </select>
              <button
                onClick={clearSelection}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                선택 해제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
