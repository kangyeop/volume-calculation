import React from 'react';
import type { NormalizedBoxGroup } from '@/hooks/usePackingNormalizer';
import { BoxGroupList } from './BoxGroupList';

interface ProductGroupSectionProps {
  groupName: string;
  filteredBoxes: NormalizedBoxGroup[];
  stats: { totalBoxes: number; totalCBM: number; avgEfficiency: number };
}

export const ProductGroupSection: React.FC<ProductGroupSectionProps> = ({
  groupName,
  filteredBoxes,
  stats,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 rounded-xl p-4">
        <h2 className="text-lg font-bold text-gray-800">{groupName}</h2>
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              총 박스
            </p>
            <p className="font-mono font-bold text-gray-700 text-xl">{stats.totalBoxes}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Volume
            </p>
            <p className="font-mono font-bold text-gray-700">{stats.totalCBM.toFixed(4)} CBM</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Efficiency
            </p>
            <p className="font-mono font-bold text-gray-700">
              {(stats.avgEfficiency * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
      <BoxGroupList normalizedBoxes={filteredBoxes} showFilter={false} />
    </div>
  );
};
