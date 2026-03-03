import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useAtomValue } from 'jotai';
import { useColumnMappingActions } from '@/hooks/outbound/useColumnMappingActions';
import {
  headersAtom,
  rowCountAtom,
  columnMappingAtom,
  isProcessingAtom,
} from '@/store/outboundWizardAtoms';

const OUTBOUND_FIELDS = ['orderId', 'sku', 'quantity', 'orderQty', 'recipientName'];
interface ColumnMappingStepProps {
  sessionId: string;
}

export const ColumnMappingStep: React.FC<ColumnMappingStepProps> = ({ sessionId }) => {
  const headers = useAtomValue(headersAtom);
  const rowCount = useAtomValue(rowCountAtom);
  const columnMapping = useAtomValue(columnMappingAtom);
  const isProcessing = useAtomValue(isProcessingAtom);
  const { handleMappingChange, handleNext } = useColumnMappingActions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">컬럼 매핑 확인</h2>
        <div className="text-sm text-gray-600">
          {rowCount}개 행 • {headers.length}개 컬럼
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          AI가 자동으로 컬럼을 매핑했습니다. 필요한 경우 컬럼을 직접 선택하여 수정할 수
          있습니다. 필수 필드: <span className="font-bold">주문번호, SKU, 수량</span>
        </p>
      </div>

      <div className="grid gap-4">
        {OUTBOUND_FIELDS.map((field) => (
          <div key={field} className="flex items-center gap-4">
            <div className="w-40 text-sm font-medium text-gray-700">{field}</div>
            <select
              value={columnMapping[field] || ''}
              onChange={(e) =>
                handleMappingChange(sessionId, field, e.target.value || null)
              }
              disabled={isProcessing}
              className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            >
              <option value="">선택 안 함</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleNext(sessionId)}
          className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          다음
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
