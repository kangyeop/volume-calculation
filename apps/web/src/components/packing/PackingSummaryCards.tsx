import React from 'react';
import { Package } from 'lucide-react';

interface PackingSummaryCardsProps {
  totalCBM: number;
  totalEfficiency: number;
}

export const PackingSummaryCards: React.FC<PackingSummaryCardsProps> = ({
  totalCBM,
  totalEfficiency,
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border bg-card text-card-foreground shadow p-6" data-testid="total-info">
        <div className="flex flex-row items-center justify-between pb-2">
          <h3 className="font-semibold text-lg">Total Volume</h3>
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <div className="text-3xl font-bold" data-testid="total-cbm">{totalCBM.toFixed(4)} CBM</div>
          <p className="text-sm text-muted-foreground">Combined volume of all boxes</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow p-6" data-testid="efficiency-summary">
        <div className="flex flex-row items-center justify-between pb-2">
          <h3 className="font-semibold text-lg">Packing Efficiency</h3>
          <div className="text-lg font-bold">
            {(totalEfficiency * 100).toFixed(1)}%
          </div>
        </div>
        <div className="space-y-2">
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden bg-gray-100">
            <div
              className="bg-indigo-600 h-full transition-all duration-500"
              style={{ width: `${totalEfficiency * 100}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground text-right">Volume utilization</p>
        </div>
      </div>
    </div>
  );
};
