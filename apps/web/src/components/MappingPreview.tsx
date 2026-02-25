import React, { useState } from 'react';
import { Search, X as XIcon } from 'lucide-react';
import type { ProductMatchResult, Product } from '@wms/types';

interface MappingPreviewProps {
  results: ProductMatchResult[];
  totalItems: number;
  matchedItems: number;
  needsReview: number;
  products: Product[];
  onMappingChange: (index: number, productIds: string[] | null) => void;
  isProcessing?: boolean;
}

export const MappingPreview: React.FC<MappingPreviewProps> = ({
  results,
  totalItems,
  matchedItems,
  products,
  onMappingChange,
  isProcessing = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const filteredProducts = products.filter((product) =>
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleProductSelect = (index: number, productIds: string[] | null) => {
    onMappingChange(index, productIds);
    setEditingIndex(null);
    setSearchTerm('');
  };

  const getMatchedProducts = (result: ProductMatchResult): Product[] => {
    if (!result.productIds || result.productIds.length === 0) return [];
    return products.filter((p) => result.productIds?.includes(p.id));
  };

  const patternCount = results.filter(r => r.isPatternDetected).length;
  const multiplePatternCount = results.filter(r => r.hasMultiplePatterns).length;

  return (
    <div className="space-y-6">
      {patternCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="text-green-600">
              <div className="text-lg font-bold">{patternCount}개 행</div>
              <div className="text-sm">패턴 감지됨</div>
            </div>
            {multiplePatternCount > 0 && (
              <div className="text-green-600">
                <div className="text-lg font-bold">{multiplePatternCount}개 행</div>
                <div className="text-sm">다중 패턴 분할</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
            <div className="text-sm text-blue-700">전체</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{matchedItems}</div>
            <div className="text-sm text-green-700">매핑됨</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{totalItems - matchedItems}</div>
            <div className="text-sm text-red-700">미매핑</div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-24">주문번호</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-16">인덱스</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">매핑된 상품</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-32">원본 값</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">동작</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {results.map((result) => {
              const matchedProducts = getMatchedProducts(result);
              return (
                <tr
                  key={result.outboundItemIndex}
                  className={`hover:bg-gray-50 transition-colors ${
                    editingIndex === result.outboundItemIndex ? 'bg-blue-50' : ''
                  } ${matchedProducts.length === 0 ? 'bg-red-50' : 'bg-green-50'}`}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">{result.orderId || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.outboundItemIndex}</span>
                      {result.isPatternDetected && (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">패턴</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingIndex === result.outboundItemIndex ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="상품 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-8 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            autoFocus
                          />
                          {searchTerm && (
                            <button
                              onClick={() => setSearchTerm('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <XIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="max-h-48 overflow-y-auto border rounded-lg">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                              <button
                                key={product.id}
                                onClick={() => handleProductSelect(result.outboundItemIndex, [product.id])}
                                className="w-full px-3 py-2 text-left hover:bg-blue-50 text-sm flex items-start justify-between gap-4"
                              >
                                <div>
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                                </div>
                                <div className="text-xs text-gray-400 whitespace-nowrap">
                                  {product.width} x {product.length} x {product.height} cm
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-sm text-gray-500 text-center">
                              검색 결과가 없습니다
                            </div>
                          )}
                          <button
                            onClick={() => handleProductSelect(result.outboundItemIndex, null)}
                            className="w-full px-3 py-2 text-left hover:bg-red-50 text-sm text-red-600 border-t"
                          >
                            매핑 제거
                          </button>
                        </div>
                      </div>
                    ) : matchedProducts.length > 0 ? (
                      <div className="space-y-1">
                        {matchedProducts.map((product) => (
                          <div key={product.id} className="border-b border-gray-200 pb-1 last:border-0">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">매핑되지 않음</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {result.rawValue && (
                      <div className="text-gray-400 italic">{result.rawValue}</div>
                    )}
                  </td>
                  {result.expandedPatterns && result.expandedPatterns.length > 0 && (
                    <td className="px-4 py-3" colSpan={4}>
                      <div className="bg-purple-50 border border-purple-200 rounded p-2">
                        <div className="text-xs text-purple-700 font-medium mb-1">
                          분할된 패턴 ({result.expandedPatterns.length}개):
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {result.expandedPatterns.map((pattern, idx) => (
                            <span key={idx} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                              {pattern.productName} / {pattern.quantity}ea
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {editingIndex !== result.outboundItemIndex && (
                      <button
                        onClick={() => {
                          setEditingIndex(result.outboundItemIndex);
                          setSearchTerm('');
                        }}
                        disabled={isProcessing}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                      >
                        변경
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
