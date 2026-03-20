import React from 'react';

interface DataPreviewProps {
  headers: string[];
  data: Record<string, unknown>[];
  maxRows?: number;
}

const PATTERN_REGEX = /\(\s*([^/]+?)\s*\/\s*(\d+)\s*ea\s*\)/i;

const containsPattern = (value: unknown): boolean => {
  if (!value) return false;
  const str = String(value);
  return PATTERN_REGEX.test(str);
};

const getPatternCount = (value: unknown): number => {
  if (!value) return 0;
  const str = String(value);
  const matches = str.match(/\(\s*([^/]+?)\s*\/\s*(\d+)\s*ea\s*\)/gi);
  return matches ? matches.length : 0;
};

export const DataPreview: React.FC<DataPreviewProps> = ({ headers, data, maxRows = 5 }) => {
  const displayData = data.slice(0, maxRows);
  const totalRows = data.length;

  return (
    <div className="border rounded-lg overflow-hidden">
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
          <span className="text-sm text-gray-600">+ {totalRows - maxRows} 행 더 보기</span>
        </div>
      )}
    </div>
  );
};
