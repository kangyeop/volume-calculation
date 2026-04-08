'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Save } from 'lucide-react';
import type { ColumnMapping, ColumnMappingTemplate, MappingType } from '@/types';
import { MappingPreviewTable } from './MappingPreviewTable';

interface ColumnMappingFormProps {
  headers: string[];
  sampleRows: Record<string, unknown>[];
  type: MappingType;
  savedTemplates: ColumnMappingTemplate[];
  onSubmit: (mapping: ColumnMapping) => void;
  onSaveTemplate: (name: string, mapping: ColumnMapping, isDefault: boolean) => void;
  isPending: boolean;
}

const SHIPMENT_FIELDS = [
  { key: 'orderIdColumn', label: '주문번호', required: true },
  { key: 'skuColumn', label: '상품명/SKU', required: true },
  { key: 'quantityColumn', label: '수량', required: false },
] as const;

const PRODUCT_FIELDS = [
  { key: 'skuNameColumn', label: '상품명', required: true },
  { key: 'dimensionsColumn', label: '체적정보 (예: 10x20x30)', required: true },
  { key: 'barcodeColumn', label: '바코드', required: false },
  { key: 'aircapColumn', label: '에어캡', required: false },
] as const;

export function ColumnMappingForm({
  headers,
  sampleRows,
  type,
  savedTemplates,
  onSubmit,
  onSaveTemplate,
  isPending,
}: ColumnMappingFormProps) {
  const fields = useMemo(() => type === 'product' ? PRODUCT_FIELDS : SHIPMENT_FIELDS, [type]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  useEffect(() => {
    const defaultTemplate = savedTemplates.find((t) => t.isDefault);
    if (defaultTemplate) {
      const allColsExist = Object.values(defaultTemplate.mapping).every(
        (col) => !col || headers.includes(col as string),
      );
      if (allColsExist) {
        setMapping(defaultTemplate.mapping);
        setSelectedTemplateId(defaultTemplate.id);
        return;
      }
    }

    const autoMapping: ColumnMapping = {};
    for (const field of fields) {
      const match = headers.find((h) => h.toLowerCase().includes(field.label.split(' ')[0].toLowerCase()));
      if (match) {
        (autoMapping as Record<string, string>)[field.key] = match;
      }
    }
    setMapping(autoMapping);
  }, [headers, savedTemplates, fields]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = savedTemplates.find((t) => t.id === templateId);
    if (template) setMapping(template.mapping);
  };

  const updateMapping = (key: string, value: string) => {
    setMapping((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const isValid = fields.filter((f) => f.required).every((f) => mapping[f.key as keyof ColumnMapping]);

  const handleSubmit = () => {
    if (saveAsTemplate && templateName.trim()) {
      onSaveTemplate(templateName.trim(), mapping, isDefault);
    }
    onSubmit(mapping);
  };

  return (
    <div className="space-y-4">
      {savedTemplates.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">저장된 템플릿</label>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">직접 매핑</option>
            {savedTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isDefault ? '(기본)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={(mapping[field.key as keyof ColumnMapping] as string) ?? ''}
              onChange={(e) => updateMapping(field.key, e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">선택 안 함</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {type !== 'product' && (
        <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
          <span className="text-sm font-medium text-gray-700">복합 상품 옵션</span>
          <div>
            <label className="block text-xs text-gray-500 mb-1">분리 방식</label>
            <select
              value={mapping.compoundMode ?? 'none'}
              onChange={(e) => setMapping((prev) => ({ ...prev, compoundMode: e.target.value as ColumnMapping['compoundMode'] }))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="none">없음 (1행 = 1상품)</option>
              <option value="slash_separated">슬래시(/) 구분</option>
              <option value="newline_separated">줄바꿈 구분</option>
            </select>
          </div>
          {mapping.compoundMode && mapping.compoundMode !== 'none' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">수량 표기 방식</label>
              <select
                value={mapping.compoundQuantityPattern ?? 'none'}
                onChange={(e) => setMapping((prev) => ({ ...prev, compoundQuantityPattern: e.target.value as ColumnMapping['compoundQuantityPattern'] }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="none">없음 (각 1개)</option>
                <option value="bracket">대괄호 — 상품명[수량]</option>
                <option value="slash_ea">슬래시+ea — 상품명 / 수량 ea</option>
              </select>
            </div>
          )}
        </div>
      )}

      <MappingPreviewTable
        headers={headers}
        sampleRows={sampleRows}
        mapping={mapping}
        type={type}
      />

      <div className="border rounded-lg p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={saveAsTemplate}
            onChange={(e) => setSaveAsTemplate(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Save className="h-4 w-4 text-gray-400" />
          이 매핑을 템플릿으로 저장
        </label>
        {saveAsTemplate && (
          <div className="space-y-2 pl-6">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="템플릿 이름"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-gray-300"
              />
              기본 템플릿으로 설정
            </label>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid || isPending}
        className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? '처리 중...' : '업로드 확인'}
      </button>
    </div>
  );
}
