import React from 'react';

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
                {headers.map((header, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-4 py-3 text-sm text-gray-900"
                    style={{ minWidth: '120px' }}
                  >
                    <span
                      className={row[header] ? 'text-gray-900' : 'text-gray-400 italic'}
                    >
                      {String(row[header] || '-')}
                    </span>
                  </td>
                ))}
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