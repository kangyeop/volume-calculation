import React from 'react';
import {
  ChevronLeft,
  CheckCircle,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { PackingResult } from '@/components/PackingResult';
import type { PackingResult3D } from '@wms/types';

interface ResultsStepProps {
  packingResults: PackingResult3D[];
  onRecalculate: () => void;
  onBack: () => void;
  onComplete: () => void;
  isProcessing: boolean;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({
  packingResults,
  onRecalculate,
  onBack,
  onComplete,
  isProcessing,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">계산 결과</h2>
        <button
          onClick={onRecalculate}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
          재계산
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="font-semibold text-lg">전체 주문</h3>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">{packingResults.length}</div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="font-semibold text-lg">전체 CBM</h3>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">
            {packingResults.reduce((sum, r) => sum + r.totalCBM, 0).toFixed(4)}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {packingResults.map((result, index) => (
          <PackingResult key={`${result.orderId}-${index}`} result={result} />
        ))}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 px-6 py-2 border rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          이전
        </button>
        <button
          onClick={onComplete}
          className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
        >
          완료
          <CheckCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
