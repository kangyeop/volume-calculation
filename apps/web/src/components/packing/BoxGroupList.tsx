import React, { useState } from 'react';
import { Package, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import type { NormalizedBoxGroup } from '@/hooks/usePackingNormalizer';

interface BoxGroupListProps {
  normalizedBoxes: NormalizedBoxGroup[];
  showFilter?: boolean;
}

export const BoxGroupList: React.FC<BoxGroupListProps> = ({ normalizedBoxes, showFilter = true }) => {
  const [expandedLabels, setExpandedLabels] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

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

        return (
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
                  {boxGroup.box.width} x {boxGroup.box.length} x {boxGroup.box.height} mm
                </p>
              </div>
              <div className="flex gap-6">
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    Total Boxes
                  </p>
                  <p className="font-mono font-bold text-indigo-700 text-xl">{boxGroup.count}</p>
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
              {Array.from(groupedShipments.entries()).map(([skuKey, grouped], gIdx) => {
                const labelKey = `${idx}-${gIdx}-${skuKey}`;
                const isExpanded = expandedLabels.has(labelKey);
                const sortedSKUs = [...grouped.items.packedSKUs].sort((a, b) =>
                  (a.name || a.skuId).localeCompare(b.name || b.skuId),
                );

                return (
                  <div
                    key={gIdx}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-start gap-2">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        {grouped.labels.length > 1 && (
                          <span className="font-semibold text-gray-700">
                            Configuration × {grouped.totalCount}
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
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-600 flex-shrink-0">
                              qty: {sku.quantity}
                            </span>
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
    </div>
  );
};
