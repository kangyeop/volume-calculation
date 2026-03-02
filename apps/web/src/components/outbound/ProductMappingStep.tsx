import React from 'react';
import { ChevronLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { MappingPreview } from '@/components/MappingPreview';
import type { ProductMatchResult, Product } from '@wms/types';

interface ProductMappingStepProps {
  productMappingData: ProductMatchResult[];
  productMappingStats: {
    totalItems: number;
    matchedItems: number;
    needsReview: number;
  };
  products: Product[];
  onMappingChange: (index: number, productIds: string[] | null) => void;
  onBack: () => void;
  onCalculate: () => void;
  isProcessing: boolean;
}

export const ProductMappingStep: React.FC<ProductMappingStepProps> = ({
  productMappingData,
  productMappingStats,
  products,
  onMappingChange,
  onBack,
  onCalculate,
  isProcessing,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">제품 매핑 확인</h2>
        <div className="text-sm text-gray-600">필수 단계 - 모든 항목이 매핑되어야 합니다</div>
      </div>

      <MappingPreview
        results={productMappingData}
        totalItems={productMappingStats.totalItems}
        matchedItems={productMappingStats.matchedItems}
        needsReview={0}
        products={products}
        onMappingChange={onMappingChange}
        isProcessing={isProcessing}
      />

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
          onClick={onCalculate}
          disabled={
            isProcessing ||
            productMappingData.some(
              (r: ProductMatchResult) => !r.productIds || r.productIds.length === 0,
            )
          }
          className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              계산 중...
            </>
          ) : (
            <>
              계산하기
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
