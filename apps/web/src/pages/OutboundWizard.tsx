import React, { useState } from 'react';
import { useAtomValue } from 'jotai';
import { ArrowLeft } from 'lucide-react';
import { useWizardNavigation } from '@/hooks/outbound/useWizardNavigation';
import { stepsAtom } from '@/store/outboundWizardAtoms';
import { WizardStepper } from '@/components/outbound/WizardStepper';
import { UploadStep } from '@/components/outbound/UploadStep';
import { ColumnMappingStep } from '@/components/outbound/ColumnMappingStep';
import { ProductMappingStep } from '@/components/outbound/ProductMappingStep';
import { ResultsStep } from '@/components/outbound/ResultsStep';

export const OutboundWizard: React.FC = () => {
  const { currentStep, handleReset, handleBackToDashboard } = useWizardNavigation();
  const steps = useAtomValue(stepsAtom);

  // sessionId: 서버가 완전 stateless가 되면 제거 예정
  const [sessionId, setSessionId] = useState('');

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
          <UploadStep onSessionCreated={setSessionId} />
        )}

        {currentStep === 'columnMapping' && (
          <ColumnMappingStep sessionId={sessionId} />
        )}

        {currentStep === 'productMapping' && (
          <ProductMappingStep sessionId={sessionId} />
        )}

        {currentStep === 'results' && <ResultsStep />}
      </div>
    </div>
  );
};
