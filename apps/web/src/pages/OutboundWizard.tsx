import React, { useState } from 'react';
import { useAtomValue } from 'jotai';
import { ArrowLeft } from 'lucide-react';
import { useOutboundWizard } from '@/hooks/useOutboundWizard';
import {
  stepsAtom,
  productMappingStatsAtom,
} from '@/store/outboundWizardAtoms';
import { WizardStepper } from '@/components/outbound/WizardStepper';
import { UploadStep } from '@/components/outbound/UploadStep';
import { ColumnMappingStep } from '@/components/outbound/ColumnMappingStep';
import { ProductMappingStep } from '@/components/outbound/ProductMappingStep';
import { ResultsStep } from '@/components/outbound/ResultsStep';

export const OutboundWizard: React.FC = () => {
  const {
    currentStep,
    headers,
    rowCount,
    columnMapping,
    productMappingData,
    packingResults,
    isProcessing,
    products,
    handleUpload,
    handleColumnMappingNext,
    handleColumnMappingChange,
    handleProductMappingChange,
    handleCalculate,
    handleRecalculate,
    handleBack,
    handleReset,
    handleBackToDashboard,
  } = useOutboundWizard();

  const steps = useAtomValue(stepsAtom);
  const productMappingStats = useAtomValue(productMappingStatsAtom);

  // Session ID: managed locally as it's transitional (will be removed with Stateless API)
  const [sessionId, setSessionId] = useState('');

  const onUpload = async (file: File) => {
    const newSessionId = await handleUpload(file);
    if (newSessionId) {
      setSessionId(newSessionId);
    }
  };

  const onColumnMappingNext = () => handleColumnMappingNext(sessionId);

  const onColumnMappingChange = (field: string, value: string | null) => {
    handleColumnMappingChange(sessionId, field, value);
  };

  const onCalculate = () => handleCalculate(sessionId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBackToDashboard}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">출고 등록 마법사</h1>
          <p className="text-muted-foreground">엑셀 업로드부터 계산까지 단계별로 진행합니다.</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <WizardStepper steps={steps} currentStep={currentStep} onReset={handleReset} />

        {currentStep === 'upload' && (
          <UploadStep onUpload={onUpload} isProcessing={isProcessing} />
        )}

        {currentStep === 'columnMapping' && (
          <ColumnMappingStep
            headers={headers}
            rowCount={rowCount}
            columnMapping={columnMapping}
            onMappingChange={onColumnMappingChange}
            onNext={onColumnMappingNext}
            isProcessing={isProcessing}
          />
        )}

        {currentStep === 'productMapping' && (
          <ProductMappingStep
            productMappingData={productMappingData}
            productMappingStats={productMappingStats}
            products={products}
            onMappingChange={handleProductMappingChange}
            onBack={handleBack}
            onCalculate={onCalculate}
            isProcessing={isProcessing}
          />
        )}

        {currentStep === 'results' && (
          <ResultsStep
            packingResults={packingResults}
            onRecalculate={handleRecalculate}
            onBack={handleBack}
            onComplete={handleBackToDashboard}
            isProcessing={isProcessing}
          />
        )}
      </div>
    </div>
  );
};
