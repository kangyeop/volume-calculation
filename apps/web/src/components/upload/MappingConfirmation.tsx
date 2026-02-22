import React, { useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { ColumnSelector } from './ColumnSelector';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { DataPreview } from './DataPreview';

interface FieldMapping {
  fieldName: string;
  displayName: string;
  required: boolean;
  aiSuggestion?: { columnName: string; confidence: number } | null;
  userMapping?: string | null;
}

interface OutboundFieldMapping {
  orderId: FieldMapping;
  sku: FieldMapping;
  quantity: FieldMapping;
  recipientName: FieldMapping;
  recipientPhone: FieldMapping;
  zipCode: FieldMapping;
  address: FieldMapping;
  detailAddress: FieldMapping;
  shippingMemo: FieldMapping;
}

interface ProductFieldMapping {
  sku: FieldMapping;
  name: FieldMapping;
  width: FieldMapping;
  length: FieldMapping;
  height: FieldMapping;
}

interface MappingConfirmationProps {
  type: 'outbound' | 'product';
  sessionId: string;
  headers: string[];
  mapping: {
    confidence: number;
    mapping: Record<string, { columnName: string; confidence: number } | null>;
    unmappedColumns: string[];
    notes?: string;
  };
  sampleRows: Record<string, unknown>[];
  onConfirm: (mapping: Record<string, string | null>) => void;
  onFallback?: () => void;
  onCancel: () => void;
}

const outboundFields: OutboundFieldMapping = {
  orderId: { fieldName: 'orderId', displayName: '주문번호', required: true },
  sku: { fieldName: 'sku', displayName: '상품 코드', required: true },
  quantity: { fieldName: 'quantity', displayName: '수량', required: true },
  recipientName: { fieldName: 'recipientName', displayName: '수취인', required: true },
  recipientPhone: { fieldName: 'recipientPhone', displayName: '전화번호', required: false },
  zipCode: { fieldName: 'zipCode', displayName: '우편번호', required: false },
  address: { fieldName: 'address', displayName: '주소', required: true },
  detailAddress: { fieldName: 'detailAddress', displayName: '상세주소', required: false },
  shippingMemo: { fieldName: 'shippingMemo', displayName: '배송메모', required: false },
};

const productFields: ProductFieldMapping = {
  sku: { fieldName: 'sku', displayName: '상품 코드', required: true },
  name: { fieldName: 'name', displayName: '상품명', required: true },
  width: { fieldName: 'width', displayName: '너비(cm)', required: false },
  length: { fieldName: 'length', displayName: '길이(cm)', required: false },
  height: { fieldName: 'height', displayName: '높이(cm)', required: false },
};

export const MappingConfirmation: React.FC<MappingConfirmationProps> = ({
  type,
  sessionId: _sessionId,
  headers,
  mapping,
  sampleRows,
  onConfirm,
  onFallback,
  onCancel,
}) => {
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(() => {
    const fields = type === 'outbound' ? outboundFields : productFields;
    return Object.values(fields).map((field) => ({
      ...field,
      aiSuggestion: mapping.mapping[field.fieldName],
      userMapping: mapping.mapping[field.fieldName]?.columnName || null,
    }));
  });

  const [confirmDisabled, setConfirmDisabled] = useState(false);

  const handleColumnSelect = (fieldName: string, columnName: string | null) => {
    setFieldMappings((prev) =>
      prev.map((field) =>
        field.fieldName === fieldName ? { ...field, userMapping: columnName } : field,
      ),
    );
  };

  const getMappingForSubmit = (): Record<string, string | null> => {
    const result: Record<string, string | null> = {};
    fieldMappings.forEach((field) => {
      result[field.fieldName] = field.userMapping ?? null;
    });
    return result;
  };

  const handleConfirm = () => {
    setConfirmDisabled(true);
    onConfirm(getMappingForSubmit());
  };

  const hasUnmappedRequiredFields = fieldMappings.some(
    (field) => field.required && !field.userMapping,
  );

  const aiConfidence = mapping.confidence;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI 매핑 확인</h2>
            <p className="text-sm text-gray-600 mt-1">
              AI가 분석한 칼럼 매핑을 확인하고 필요 시 수정하세요
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">AI 신뢰도:</span>
            <ConfidenceIndicator confidence={aiConfidence} />
          </div>
        </div>
      </div>

      {mapping.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">AI 분석 참고사항:</p>
              <p className="text-yellow-700 mt-1">{mapping.notes}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Field Mapping Section */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-900">필드 매핑</h3>
          <div className="space-y-3">
            {fieldMappings.map((field) => (
              <div key={field.fieldName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span
                      className={`font-medium ${field.required ? 'text-red-600' : 'text-gray-900'}`}
                    >
                      {field.displayName}
                    </span>
                    {field.required && <span className="text-xs text-red-600 ml-1">* 필수</span>}
                  </div>
                  {field.aiSuggestion && (
                    <ConfidenceIndicator confidence={field.aiSuggestion.confidence} size="small" />
                  )}
                </div>
                <ColumnSelector
                  availableColumns={headers}
                  selectedColumn={field.userMapping || undefined}
                  confidence={field.aiSuggestion?.confidence}
                  placeholder={`${field.displayName} 칼럼 선택`}
                  onColumnSelect={(column) => handleColumnSelect(field.fieldName, column)}
                />
              </div>
            ))}
          </div>

          {mapping.unmappedColumns.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">매핑되지 않은 칼럼</h4>
              <p className="text-sm text-gray-600">{mapping.unmappedColumns.join(', ')}</p>
            </div>
          )}
        </div>

        {/* Data Preview Section */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-900">데이터 미리보기</h3>
          <DataPreview headers={headers} data={sampleRows} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        {onFallback && (
          <button
            onClick={onFallback}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            기존 방식으로 업로드
          </button>
        )}
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmDisabled || hasUnmappedRequiredFields}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${
              confirmDisabled || hasUnmappedRequiredFields
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmDisabled ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                처리 중...
              </span>
            ) : (
              <span className="flex items-center">
                <Check className="h-4 w-4 mr-2" />
                확인하고 저장
              </span>
            )}
          </button>
        </div>
      </div>

      {hasUnmappedRequiredFields && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">모든 필수 필드(*)를 매핑해야 합니다.</p>
        </div>
      )}
    </div>
  );
};
