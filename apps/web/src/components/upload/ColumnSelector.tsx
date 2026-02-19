import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { ConfidenceIndicator } from './ConfidenceIndicator';

interface ColumnSelectorProps {
  availableColumns: string[];
  selectedColumn?: string | null;
  confidence?: number;
  placeholder?: string;
  onColumnSelect: (column: string | null) => void;
  disabled?: boolean;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  availableColumns,
  selectedColumn,
  confidence,
  placeholder = '칼럼을 선택하세요',
  onColumnSelect,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredColumns = useMemo(() => {
    if (!searchTerm) return availableColumns;
    return availableColumns.filter(column =>
      column.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableColumns, searchTerm]);

  const handleColumnClick = (column: string) => {
    onColumnSelect(column);
    setIsDropdownOpen(false);
  };

  const handleClearSelection = () => {
    onColumnSelect(null);
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative">
      <div
        className={`relative min-w-[200px] cursor-pointer border rounded-lg px-3 py-2 ${
          disabled
            ? 'bg-gray-100 cursor-not-allowed'
            : 'bg-white border-gray-300 hover:border-blue-400'
        } transition-colors`}
        onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
      >
        {selectedColumn ? (
          <div className="flex items-center justify-between">
            <span className="text-sm">{selectedColumn}</span>
            {confidence !== undefined && (
              <ConfidenceIndicator confidence={confidence} size="small" showLabel={false} />
            )}
          </div>
        ) : (
          <div className="flex items-center text-gray-500">
            <Search className="h-4 w-4 mr-2" />
            <span className="text-sm">{placeholder}</span>
          </div>
        )}
        {!disabled && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>

      {isDropdownOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="칼럼 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filteredColumns.length > 0 ? (
            <div>
              {filteredColumns.map((column) => (
                <div
                  key={column}
                  className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer transition-colors flex items-center justify-between"
                  onClick={() => handleColumnClick(column)}
                >
                  <span>{column}</span>
                  {selectedColumn === column && confidence !== undefined && (
                    <ConfidenceIndicator confidence={confidence} size="small" showLabel={false} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              일치하는 칼럼이 없습니다
            </div>
          )}
          {selectedColumn && (
            <div className="p-2 border-t">
              <button
                onClick={handleClearSelection}
                className="w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center"
              >
                <X className="h-4 w-4 mr-1" />
                선택 취소
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};