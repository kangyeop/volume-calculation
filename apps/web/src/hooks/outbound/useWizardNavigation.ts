import { useSetAtom, useAtomValue } from 'jotai';
import { useNavigate, useParams } from 'react-router-dom';
import {
  currentStepAtom,
  resetWizardAtom,
  type WizardStep,
} from '@/store/outboundWizardAtoms';

/** 위자드 네비게이션: 뒤로가기, 리셋, 대시보드 이동 */
export const useWizardNavigation = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentStep = useAtomValue(currentStepAtom);
  const setCurrentStep = useSetAtom(currentStepAtom);
  const resetWizard = useSetAtom(resetWizardAtom);

  const handleBack = () => {
    const stepOrder: Record<WizardStep, WizardStep | null> = {
      upload: null,
      columnMapping: 'upload',
      productMapping: 'columnMapping',
      results: 'productMapping',
    };
    const prev = stepOrder[currentStep];
    if (prev) setCurrentStep(prev);
  };

  const handleReset = () => resetWizard();

  const handleBackToDashboard = () => navigate(`/projects/${projectId}`);

  return { currentStep, handleBack, handleReset, handleBackToDashboard };
};
