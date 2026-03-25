import React from 'react';
import { Package } from 'lucide-react';

interface BoxTypeCardProps {
  box: { id: string; name: string; width: number; length: number; height: number };
  count: number;
  totalCBM: number;
  efficiency: number;
  stock?: number;
  onClick: () => void;
  disabled?: boolean;
}

export const BoxTypeCard: React.FC<BoxTypeCardProps> = ({ box, count, totalCBM, efficiency, stock, onClick, disabled }) => {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`border rounded-xl p-5 bg-white transition-shadow space-y-4 ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-indigo-600" />
        <h3 className="font-semibold text-base text-gray-900">{box.name}</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {box.width} x {box.length} x {box.height} cm
      </p>
      <div className={`grid ${stock !== undefined ? 'grid-cols-4' : 'grid-cols-3'} gap-2 text-center`}>
        <div>
          <p className="text-xs text-muted-foreground">총 박스 수</p>
          <p className="font-bold text-indigo-700 text-lg font-mono">{count}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">CBM</p>
          <p className="font-bold text-purple-700 text-sm font-mono">{totalCBM.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">효율</p>
          <p className="font-bold text-indigo-700 text-sm font-mono">{(efficiency * 100).toFixed(1)}%</p>
        </div>
        {stock !== undefined && (
          <div>
            <p className="text-xs text-muted-foreground">재고</p>
            <p className={`font-bold text-sm font-mono ${stock < count ? 'text-red-600' : 'text-green-700'}`}>
              {stock}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
