import React from 'react';
import { ChevronLeft } from 'lucide-react';
import type { NormalizedBoxGroup } from '@/hooks/usePackingNormalizer';
import type { Box } from '@/types';
import { BoxGroupList } from './BoxGroupList';

interface PackingDetailPanelProps {
  title: string;
  filteredBoxes: NormalizedBoxGroup[];
  onBack: () => void;
  skuDimensionsMap?: Map<string, { width: number; length: number; height: number; name: string }>;
  availableBoxes?: Box[];
  onBoxOverride?: (groupIndices: number[], boxIndices: number[], newBoxId: string) => void;
}

export const PackingDetailPanel: React.FC<PackingDetailPanelProps> = ({
  title,
  filteredBoxes,
  onBack,
  skuDimensionsMap,
  availableBoxes,
  onBoxOverride,
}) => {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
      >
        <ChevronLeft className="h-4 w-4" />
        대시보드로
      </button>
      <h2 className="text-xl font-semibold">{title}</h2>
      <BoxGroupList
        normalizedBoxes={filteredBoxes}
        showFilter={true}
        skuDimensionsMap={skuDimensionsMap}
        availableBoxes={availableBoxes}
        onBoxOverride={onBoxOverride}
      />
    </div>
  );
};
