'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExcelUpload } from '@/components/ExcelUpload';
import { MappingConfirmation } from '@/components/upload/MappingConfirmation';
import { DataPreview } from '@/components/upload/DataPreview';
import { CompoundRowSummary } from '@/components/upload/CompoundRowSummary';
import { useOutboundUploadFlow } from '@/hooks/useOutboundUploadFlow';

export default function OutboundCreate() {
  const router = useRouter();
  const flow = useOutboundUploadFlow();
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const handleFileSelect = (file: File) => {
    flow.startParse(file);
  };

  const handleConfirmMapping = async (mapping: Record<string, string | null>) => {
    const columnMapping: Record<string, string> = {};
    for (const [key, value] of Object.entries(mapping)) {
      if (value) columnMapping[key] = value;
    }
    try {
      const result = await flow.confirmAndProcess(columnMapping, {
        saveAsTemplate: saveAsTemplate && templateName.trim() !== '',
        templateName: templateName.trim(),
      });
      if (result) {
        toast.success('업로드 완료', { description: `${result.imported}건이 등록되었습니다.` });
        router.push(`/outbound/${result.batchId}`);
      }
    } catch {
      toast.error('업로드 실패', { description: '처리 중 오류가 발생했습니다.' });
    }
  };

  const handleCancel = () => {
    if (flow.step === 'parsing' || flow.step === 'processing') return;
    flow.reset();
    router.push('/outbound');
  };

  const renderContent = () => {
    if (flow.step === 'idle' || flow.step === 'error') {
      return (
        <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
          {flow.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {flow.error}
            </div>
          )}
          <ExcelUpload
            onUpload={handleFileSelect}
            title="클릭하거나 엑셀 파일을 여기에 드래그하세요"
          />
        </div>
      );
    }

    if (flow.step === 'parsing') {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-500">파일을 분석하고 있습니다...</p>
        </div>
      );
    }

    if (flow.step === 'confirming' && flow.parseResult) {
      const mappingForConfirmation = {
        confidence: flow.parseResult.source === 'template' ? 1 : 0.8,
        mapping: Object.fromEntries(
          Object.entries(flow.parseResult.suggestedMapping.mapping).map(([key, val]) => [
            key,
            val
              ? {
                  columnName: val.columnName,
                  confidence: flow.parseResult!.source === 'template' ? 1 : 0.7,
                }
              : null,
          ]),
        ),
        unmappedColumns: flow.parseResult.suggestedMapping.unmappedColumns,
        notes: flow.parseResult.suggestedMapping.notes,
      };

      return (
        <div className="space-y-4">
          {flow.parseResult.matchedTemplate && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700">
              템플릿 &ldquo;{flow.parseResult.matchedTemplate.name}&rdquo; 매칭됨 (유사도:{' '}
              {Math.round(flow.parseResult.matchedTemplate.similarity * 100)}%)
            </div>
          )}

          <CompoundRowSummary
            headers={flow.parseResult.headers}
            data={flow.parseResult.sampleRows}
            totalRowCount={flow.parseResult.sampleRows.length}
          />

          <DataPreview
            headers={flow.parseResult.headers}
            data={flow.parseResult.sampleRows}
            maxRows={3}
          />

          <MappingConfirmation
            type="outbound"
            sessionId={flow.parseResult.sessionId}
            headers={flow.parseResult.headers}
            mapping={mappingForConfirmation}
            source={flow.parseResult.source}
            templateName={flow.parseResult.matchedTemplate?.name}
            onConfirm={handleConfirmMapping}
            onCancel={handleCancel}
          />

          {!flow.parseResult.matchedTemplate && (
            <div className="border rounded-lg p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="rounded border-gray-300"
                />
                이 매핑을 템플릿으로 저장
              </label>
              {saveAsTemplate && (
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="템플릿 이름 (예: 쿠팡 출고양식)"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
          )}
        </div>
      );
    }

    if (flow.step === 'processing') {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-500">데이터를 처리하고 있습니다...</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button
          onClick={handleCancel}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">새 출고</h1>
          <p className="text-muted-foreground">엑셀 파일을 업로드하여 출고 데이터를 등록합니다.</p>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
