import React from 'react';
import { Tag } from 'lucide-react';

interface ProductGroupCardProps {
  groupName: string;
  totalBoxes: number;
  totalCBM: number;
  avgEfficiency: number;
  onClick: () => void;
}

export const ProductGroupCard: React.FC<ProductGroupCardProps> = ({
  groupName,
  totalBoxes,
  totalCBM,
  avgEfficiency,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer border rounded-xl p-5 bg-white hover:shadow-md transition-shadow space-y-4"
    >
      <div className="flex items-center gap-2">
        <Tag className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-base text-gray-900">{groupName}</h3>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">총 박스 수</p>
          <p className="font-bold text-emerald-700 text-lg font-mono">{totalBoxes}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">CBM</p>
          <p className="font-bold text-green-700 text-sm font-mono">{totalCBM.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">효율</p>
          <p className="font-bold text-emerald-700 text-sm font-mono">{(avgEfficiency * 100).toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
};
