'use client';

import React from 'react';
import type { ColumnMapping } from '@/types';

interface MappingPreviewTableProps {
  headers: string[];
  sampleRows: Record<string, unknown>[];
  mapping: ColumnMapping;
  type: 'shipment' | 'settlement' | 'product';
}

function getSystemFields(type: 'shipment' | 'settlement' | 'product') {
  if (type === 'product') {
    return [
      { key: 'skuNameColumn' as const, label: '상품명' },
      { key: 'dimensionsColumn' as const, label: '체적정보' },
      { key: 'barcodeColumn' as const, label: '바코드' },
      { key: 'aircapColumn' as const, label: '에어캡' },
    ];
  }
  return [
    { key: 'orderIdColumn' as const, label: '주문번호' },
    { key: 'skuColumn' as const, label: '상품명/SKU' },
    { key: 'quantityColumn' as const, label: '수량' },
  ];
}

export function MappingPreviewTable({ sampleRows, mapping, type }: MappingPreviewTableProps) {
  const fields = getSystemFields(type);

  const getMappedValue = (row: Record<string, unknown>, fieldKey: string) => {
    const col = mapping[fieldKey as keyof ColumnMapping] as string | undefined;
    if (!col) return null;
    const val = row[col];
    return val != null ? String(val) : '';
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b">
        <span className="text-xs font-medium text-gray-500">매핑 결과 미리보기</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {fields.map((f) => (
                <th key={f.key} className="px-3 py-2 text-left font-medium text-gray-600">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sampleRows.map((row, i) => (
              <tr key={i} className="border-b last:border-b-0">
                {fields.map((f) => {
                  const val = getMappedValue(row, f.key);
                  const isEmpty = val === null || val === '';
                  return (
                    <td
                      key={f.key}
                      className={`px-3 py-2 ${isEmpty ? 'text-red-400 italic' : 'text-gray-700'}`}
                    >
                      {isEmpty ? (val === null ? '미지정' : '빈 값') : val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
