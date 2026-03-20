import React, { useState } from 'react';
import { Package, Layers, ChevronDown, ChevronRight, Maximize2, Pencil, Check, X } from 'lucide-react';
import type { NormalizedBoxGroup } from '@/hooks/usePackingNormalizer';
import type { Box } from '@wms/types';

interface BoxGroupListProps {
  normalizedBoxes: NormalizedBoxGroup[];
  showFilter?: boolean;
  skuDimensionsMap?: Map<string, { width: number; length: number; height: number; name: string }>;
  availableBoxes?: Box[];
  onBoxOverride?: (groupIndex: number, boxIndex: number, newBoxId: string) => void;
  onUpdateProduct?: (productId: string, dims: { width: number; length: number; height: number }) => Promise<void>;
}

export const BoxGroupList: React.FC<BoxGroupListProps> = ({
  normalizedBoxes,
  showFilter = true,
  skuDimensionsMap,
  availableBoxes,
  onBoxOverride,
  onUpdateProduct,
}) => {
  const [expandedLabels, setExpandedLabels] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editDims, setEditDims] = useState<{ width: number; length: number; height: number }>({ width: 0, length: 0, height: 0 });

  const toggleLabels = (key: string) => {
    setExpandedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const startEditing = (skuId: string) => {
    const dims = skuDimensionsMap?.get(skuId);
    if (!dims) return;
    setEditingSku(skuId);
    setEditDims({ width: dims.width, length: dims.length, height: dims.height });
  };

  const cancelEditing = () => {
    setEditingSku(null);
  };

  const saveEditing = async () => {
    if (!editingSku || !onUpdateProduct) return;
    await onUpdateProduct(editingSku, editDims);
    setEditingSku(null);
  };

  const filteredBoxes = activeFilter
    ? normalizedBoxes.filter((b) => b.box.id === activeFilter)
    : normalizedBoxes;

  return (
    <div className="space-y-6" data-testid="packing-results">
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

      {filteredBoxes.map((boxGroup, idx) => {
        const isUnassigned = boxGroup.box.id === 'unassigned';

        const groupedShipments = new Map<
          string,
          {
            items: (typeof boxGroup.shipments)[0];
            totalCount: number;
            labels: string[];
            groupIndices: number[];
            boxIndices: number[];
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
              groupIndices: [shipment.groupIndex ?? 0],
              boxIndices: [shipment.boxIndex ?? 0],
            });
          } else {
            const existing = groupedShipments.get(skuKey)!;
            existing.totalCount += shipment.count;
            existing.labels.push(shipment.groupLabel);
            existing.groupIndices.push(shipment.groupIndex ?? 0);
            existing.boxIndices.push(shipment.boxIndex ?? 0);
          }
        }

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
                    {boxGroup.box.width} x {boxGroup.box.length} x {boxGroup.box.height} mm
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
              </div>
            </div>

            {isUnassigned && availableBoxes && availableBoxes.length > 0 && onBoxOverride && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-800 mb-2">박스를 선택하여 할당하세요:</p>
                {boxGroup.shipments.map((shipment, sIdx) => {
                  const groupIdx = shipment.groupIndex ?? 0;
                  const boxIdx = shipment.boxIndex ?? 0;
                  return (
                    <div key={sIdx} className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-600 min-w-[120px]">{shipment.groupLabel}:</span>
                      <select
                        className="border border-amber-300 rounded px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            onBoxOverride(groupIdx, boxIdx, e.target.value);
                          }
                        }}
                      >
                        <option value="">박스 선택...</option>
                        {availableBoxes.map((box) => (
                          <option key={box.id} value={box.id}>
                            {box.name} ({box.width}×{box.length}×{box.height} mm)
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-4">
              {Array.from(groupedShipments.entries()).map(([skuKey, grouped], gIdx) => {
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
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-start gap-2">
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
                            최대 아이템: {maxItem.name} ({maxItem.width}×{maxItem.length}×{maxItem.height} mm)
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
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0">
                        {grouped.totalCount} box{grouped.totalCount > 1 ? 'es' : ''}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                        Contents per box
                      </p>
                      <ul className="space-y-1">
                        {sortedSKUs.map((sku, skuIdx) => {
                          const isEditing = editingSku === sku.skuId;
                          const dims = skuDimensionsMap?.get(sku.skuId);

                          return (
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
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={editDims.width}
                                      onChange={(e) => setEditDims({ ...editDims, width: parseFloat(e.target.value) || 0 })}
                                      className="w-16 px-1 py-0.5 border border-indigo-300 rounded text-xs font-mono text-center focus:ring-1 focus:ring-indigo-400 outline-none"
                                      step="0.01"
                                    />
                                    <span className="text-xs text-gray-400">×</span>
                                    <input
                                      type="number"
                                      value={editDims.length}
                                      onChange={(e) => setEditDims({ ...editDims, length: parseFloat(e.target.value) || 0 })}
                                      className="w-16 px-1 py-0.5 border border-indigo-300 rounded text-xs font-mono text-center focus:ring-1 focus:ring-indigo-400 outline-none"
                                      step="0.01"
                                    />
                                    <span className="text-xs text-gray-400">×</span>
                                    <input
                                      type="number"
                                      value={editDims.height}
                                      onChange={(e) => setEditDims({ ...editDims, height: parseFloat(e.target.value) || 0 })}
                                      className="w-16 px-1 py-0.5 border border-indigo-300 rounded text-xs font-mono text-center focus:ring-1 focus:ring-indigo-400 outline-none"
                                      step="0.01"
                                    />
                                    <span className="text-xs text-gray-400">mm</span>
                                    <button
                                      onClick={saveEditing}
                                      className="p-0.5 text-green-600 hover:text-green-800"
                                      title="저장"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="p-0.5 text-red-500 hover:text-red-700"
                                      title="취소"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    {dims && (
                                      <span
                                        className={`font-mono text-xs text-gray-400 ${onUpdateProduct ? 'cursor-pointer hover:text-indigo-600 hover:bg-indigo-50 px-1 rounded transition-colors' : ''}`}
                                        onClick={() => onUpdateProduct && startEditing(sku.skuId)}
                                        title={onUpdateProduct ? '클릭하여 치수 편집' : undefined}
                                      >
                                        {dims.width}×{dims.length}×{dims.height} mm
                                        {onUpdateProduct && <Pencil className="h-2.5 w-2.5 inline ml-1 opacity-0 group-hover:opacity-100" />}
                                      </span>
                                    )}
                                  </>
                                )}
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-600">
                                  qty: {sku.quantity}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
