'use client';

import React, { useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { ExcelUpload } from '@/components/ExcelUpload';
import { ColumnMappingForm } from './ColumnMappingForm';
import { useExcelPreview, useColumnMappingTemplates, useSaveColumnMappingTemplate } from '@/hooks/queries';
import type { ColumnMapping, MappingType } from '@/types';

type UploadStep = 'file' | 'mapping';

interface ColumnMappingUploadProps {
  type: MappingType;
  onConfirm: (file: File, mapping: ColumnMapping) => void;
  isPending: boolean;
}

export function ColumnMappingUpload({ type, onConfirm, isPending }: ColumnMappingUploadProps) {
  const [step, setStep] = useState<UploadStep>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const preview = useExcelPreview();
  const { data: templates = [] } = useColumnMappingTemplates(type);
  const saveTemplate = useSaveColumnMappingTemplate();

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    preview.mutate(file, {
      onSuccess: () => setStep('mapping'),
    });
  };

  const handleConfirm = (mapping: ColumnMapping) => {
    if (!selectedFile) return;
    onConfirm(selectedFile, mapping);
  };

  const handleSaveTemplate = (name: string, mapping: ColumnMapping, isDefault: boolean) => {
    saveTemplate.mutate({ name, type, mapping, isDefault });
  };

  const handleBack = () => {
    setStep('file');
    setSelectedFile(null);
    preview.reset();
  };

  if (preview.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-gray-500">파일을 분석하고 있습니다...</p>
      </div>
    );
  }

  if (step === 'mapping' && preview.data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </button>
          <div>
            <span className="text-sm font-medium text-gray-700">
              {selectedFile?.name}
            </span>
            <span className="text-xs text-gray-400 ml-2">
              {preview.data.totalRows}행
            </span>
          </div>
        </div>

        <ColumnMappingForm
          headers={preview.data.headers}
          sampleRows={preview.data.sampleRows}
          type={type}
          savedTemplates={templates}
          onSubmit={handleConfirm}
          onSaveTemplate={handleSaveTemplate}
          isPending={isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {preview.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {preview.error.message}
        </div>
      )}
      <ExcelUpload
        onUpload={handleFileSelect}
        title="클릭하거나 엑셀 파일을 여기에 드래그하세요"
      />
    </div>
  );
}
