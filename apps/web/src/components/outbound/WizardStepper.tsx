import React from 'react';
import { CheckCircle, ChevronRight, RefreshCw } from 'lucide-react';
import type { WizardStep } from '@/store/outboundWizardAtoms';

interface StepDef {
  id: WizardStep;
  label: string;
  completed: boolean;
}

interface WizardStepperProps {
  steps: StepDef[];
  currentStep: WizardStep;
  onReset: () => void;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({ steps, currentStep, onReset }) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2">
              <div
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full font-medium text-sm
                  ${step.completed ? 'bg-green-500 text-white' : ''}
                  ${currentStep === step.id ? 'bg-indigo-600 text-white' : ''}
                  ${!step.completed && currentStep !== step.id ? 'bg-gray-200 text-gray-600' : ''}
                `}
              >
                {step.completed ? <CheckCircle className="h-5 w-5" /> : index + 1}
              </div>
              <span
                className={`
                  text-sm font-medium
                  ${currentStep === step.id ? 'text-indigo-600' : 'text-gray-600'}
                `}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && <ChevronRight className="h-5 w-5 text-gray-400" />}
          </React.Fragment>
        ))}
      </div>
      {currentStep !== 'upload' && (
        <button
          onClick={onReset}
          className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          처음부터 다시
        </button>
      )}
    </div>
  );
};
