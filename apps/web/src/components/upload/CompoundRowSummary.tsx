import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

interface CompoundRowSummaryProps {
  headers: string[];
  data: Record<string, unknown>[];
  totalRowCount: number;
}

const PATTERN_REGEX = /\(\s*([^/]+?)\s*\/\s*(\d+)\s*ea\s*\)/gi;

interface CompoundRow {
  rowIndex: number;
  rawValue: string;
  items: { name: string; qty: number }[];
}

function detectCompoundRows(
  headers: string[],
  data: Record<string, unknown>[],
): CompoundRow[] {
  const results: CompoundRow[] = [];

  data.forEach((row, rowIndex) => {
    for (const header of headers) {
      const value = row[header];
      if (!value) continue;
      const str = String(value);
      const matches = str.match(PATTERN_REGEX);
      if (matches && matches.length >= 2) {
        const items: { name: string; qty: number }[] = [];
        const itemRegex = /\(\s*([^/]+?)\s*\/\s*(\d+)\s*ea\s*\)/gi;
        let m;
        while ((m = itemRegex.exec(str)) !== null) {
          items.push({ name: m[1].trim(), qty: parseInt(m[2], 10) });
        }
        results.push({ rowIndex, rawValue: str, items });
        break;
      }
    }
  });

  return results;
}

export const CompoundRowSummary: React.FC<CompoundRowSummaryProps> = ({
  headers,
  data,
  totalRowCount,
}) => {
  const [expanded, setExpanded] = useState(false);
  const compoundRows = detectCompoundRows(headers, data);

  if (compoundRows.length === 0) return null;

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">
            미리보기 {totalRowCount}행 중 {compoundRows.length}개 복합 상품 행 감지
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-purple-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-purple-500" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-purple-200 px-4 py-3 space-y-3">
          {compoundRows.map((row) => (
            <div key={row.rowIndex} className="bg-white rounded-lg border border-purple-100 p-3 space-y-2">
              <div className="text-xs font-medium text-gray-500">행 {row.rowIndex + 1}</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-1">Before</div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded px-2 py-1.5 whitespace-pre-wrap break-all">
                    {row.rawValue}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-1">After</div>
                  <div className="space-y-1">
                    {row.items.map((item, i) => (
                      <div
                        key={i}
                        className="text-sm bg-purple-50 text-purple-700 rounded px-2 py-1.5 flex justify-between"
                      >
                        <span>{item.name}</span>
                        <span className="font-medium">{item.qty}ea</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
