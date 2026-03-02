import React from 'react';
import { Package, Layers } from 'lucide-react';
import type { NormalizedBoxGroup } from '@/hooks/usePackingNormalizer';

interface BoxGroupListProps {
  normalizedBoxes: NormalizedBoxGroup[];
}

export const BoxGroupList: React.FC<BoxGroupListProps> = ({ normalizedBoxes }) => {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold border-b pb-2 flex items-center gap-2">
        <Layers className="h-6 w-6" />
        Recommended Packing by Box Type
      </h2>

      {normalizedBoxes.map((boxGroup, idx) => {
        // Group shipments by packed SKU composition
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
              {Array.from(groupedShipments.values()).map((grouped, gIdx) => {
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
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
