import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Search, X as XIcon } from 'lucide-react';
import type { ProductMatchResult, Product } from '@wms/types';

interface MappingPreviewProps {
  results: ProductMatchResult[];
  totalItems: number;
  matchedItems: number;
  needsReview: number;
  products: Product[];
  onMappingChange: (index: number, productId: string | null, confidence?: number) => void;
  isProcessing?: boolean;
}

export const MappingPreview: React.FC<MappingPreviewProps> = ({
  results,
  totalItems,
  matchedItems,
  needsReview,
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

  const handleProductSelect = (index: number, productId: string | null) => {
    onMappingChange(index, productId, productId ? 1.0 : 0);
    setEditingIndex(null);
    setSearchTerm('');
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBg = (confidence: number): string => {
    if (confidence >= 0.9) return 'bg-green-50 border-green-200';
    if (confidence >= 0.7) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getStatusIcon = (result: ProductMatchResult) => {
    if (!result.matchedProduct) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (result.needsReview) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
            <div className="text-sm text-blue-700">전체</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{matchedItems}</div>
            <div className="text-sm text-green-700">매핑됨</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{needsReview}</div>
            <div className="text-sm text-yellow-700">검토 필요</div>
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
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-10">상태</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-1/4">출고 SKU</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-1/3">매핑된 상품</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-24">신뢰도</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">사유</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {results.map((result) => (
              <React.Fragment key={result.outboundItemIndex}>
                <tr
                  className={`hover:bg-gray-50 transition-colors ${
                    editingIndex === result.outboundItemIndex ? 'bg-blue-50' : ''
                  } ${getConfidenceBg(result.confidence)}`}
                >
                  <td className="px-4 py-3">
                    {getStatusIcon(result)}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{result.outboundSku}</div>
                      {result.outboundName && (
                        <div className="text-xs text-gray-500">{result.outboundName}</div>
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
                                onClick={() => handleProductSelect(result.outboundItemIndex, product.id)}
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
                    ) : result.matchedProduct ? (
                      <div>
                        <div className="font-medium">{result.matchedProduct.name}</div>
                        <div className="text-xs text-gray-500">SKU: {result.matchedProduct.sku}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">매핑되지 않음</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${getConfidenceColor(result.confidence)}`}>
                      {(result.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{result.matchReason}</span>
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
                    </div>
                  </td>
                </tr>
                {result.alternativeMatches && result.alternativeMatches.length > 0 && (
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-700 uppercase">대안 매칭:</div>
                        <div className="grid grid-cols-2 gap-2">
                          {result.alternativeMatches.map((alt, altIndex) => (
                            <button
                              key={`${result.outboundItemIndex}-${altIndex}`}
                              onClick={() => handleProductSelect(result.outboundItemIndex, alt.id)}
                              disabled={isProcessing}
                              className="flex items-start justify-between gap-2 px-3 py-2 bg-white border rounded-lg hover:bg-blue-50 text-sm text-left disabled:opacity-50"
                            >
                              <div>
                                <div className="font-medium">{alt.name}</div>
                                <div className="text-xs text-gray-500">SKU: {alt.sku}</div>
                              </div>
                              <div className="text-xs font-medium text-gray-600">
                                {(alt.confidence * 100).toFixed(0)}%
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {results.filter((r) => r.needsReview).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800">검토가 필요한 항목이 있습니다</h4>
            <p className="text-sm text-yellow-700 mt-1">
              {results.filter((r) => r.needsReview).length}개 항목의 매핑을 확인하고 필요한 경우 수정하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
