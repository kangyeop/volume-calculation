import React from 'react';
import { CheckCircle } from 'lucide-react';

interface DataPreviewProps {
  headers: string[];
  data: Record<string, unknown>[];
  maxRows?: number;
}

const PATTERN_REGEX = /\(\s*([^/]+?)\s*\/\s*(\d+)\s*ea\s*\)/gi;

const containsPattern = (value: unknown): boolean => {
  if (!value) return false;
  const str = String(value);
  return PATTERN_REGEX.test(str);
};

const getPatternCount = (value: unknown): number => {
  if (!value) return 0;
  const str = String(value);
  const matches = str.match(PATTERN_REGEX);
  return matches ? matches.length : 0;
};

interface DataPreviewProps {
  headers: string[];
  data: Record<string, unknown>[];
  maxRows?: number;
}

export const DataPreview: React.FC<DataPreviewProps> = ({
  headers,
  data,
  maxRows = 5,
}) => {
  const displayData = data.slice(0, maxRows);
  const totalRows = data.length;
  const patternRowIndices = displayData
    .map((_, index) => index)
    .filter(index => displayData[index] && Object.values(displayData[index]).some(v => containsPattern(v)));

  return (
    <div className="border rounded-lg overflow-hidden">
      {patternRowIndices.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-purple-600" />
            <div>
              <div className="font-medium text-purple-700">
                {patternRowIndices.length}개 행에서 패턴 감지됨
              </div>
              <div className="text-sm text-purple-600">
                (상품명 / 개수ea) 형식의 데이터가 자동으로 분할됩니다
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 p-3 border-b">
        <h3 className="text-sm font-medium text-gray-700">
          데이터 미리보기 ({displayData.length} / {totalRows} 행)
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                  style={{ minWidth: '120px' }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayData.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {headers.map((header, colIndex) => {
                  const value = row[header];
                  const hasPattern = containsPattern(value);
                  const patternCount = getPatternCount(value);
                  return (
                    <td
                      key={colIndex}
                      className={`px-4 py-3 text-sm ${
                        hasPattern ? 'bg-purple-50 border-purple-100' : ''
                      }`}
                      style={{ minWidth: '120px' }}
                    >
                      <div className="flex items-start gap-2">
                        <span className={value ? 'text-gray-900' : 'text-gray-400 italic'}>
                          {String(value || '-')}
                        </span>
                        {patternCount > 0 && (
                          <span className="bg-purple-200 text-purple-700 text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                            {patternCount}개 패턴
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalRows > maxRows && (
        <div className="bg-gray-50 p-3 border-t text-center">
          <span className="text-sm text-gray-600">
            + {totalRows - maxRows} 행 더 보기
          </span>
        </div>
      )}
    </div>
  );
};