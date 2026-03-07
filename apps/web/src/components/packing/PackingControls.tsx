import React from 'react';
import {
  Calculator,
  Settings,
  Download,
} from 'lucide-react';
import { PackingGroupingOption } from '@wms/types';

interface PackingControlsProps {
  groupingOption: PackingGroupingOption;
  loading: boolean;
  exportPending: boolean;
  onGroupingChange: (option: PackingGroupingOption) => void;
  onCalculate: () => void;
  onExport: () => void;
}

export const PackingControls: React.FC<PackingControlsProps> = ({
  groupingOption,
  loading,
  exportPending,
  onGroupingChange,
  onCalculate,
  onExport,
}) => {
  return (
    <div className="flex items-center gap-4 bg-card p-2 rounded-lg border shadow-sm">
      <div className="flex items-center gap-2 px-2">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Grouping:</span>
      </div>
      <select
        value={groupingOption}
        onChange={(e) => onGroupingChange(e.target.value as PackingGroupingOption)}
        className="h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value={PackingGroupingOption.ORDER}>By Order Number</option>
        <option value={PackingGroupingOption.RECIPIENT}>By Recipient</option>
        <option value={PackingGroupingOption.ORDER_RECIPIENT}>By Order + Recipient</option>
      </select>
      <button
        onClick={onCalculate}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 transition-colors"
      >
        {loading ? (
          'Calculating...'
        ) : (
          <>
            <Calculator className="mr-2 h-4 w-4" />
            Calculate
          </>
        )}
      </button>
      <button
        onClick={onExport}
        disabled={exportPending}
        className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500 disabled:pointer-events-none disabled:opacity-50 transition-colors"
      >
        {exportPending ? (
          'Downloading...'
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Download Excel
          </>
        )}
      </button>
    </div>
  );
};
