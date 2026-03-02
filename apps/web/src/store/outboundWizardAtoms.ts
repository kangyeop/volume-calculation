import { atom } from 'jotai';
import type { ProductMatchResult, PackingResult3D } from '@wms/types';

// --- Wizard Step ---
export type WizardStep = 'upload' | 'columnMapping' | 'productMapping' | 'results';

export const currentStepAtom = atom<WizardStep>('upload');

// --- Upload / Parse ---
export const headersAtom = atom<string[]>([]);
export const rowCountAtom = atom<number>(0);
export const parsedRowsAtom = atom<Record<string, unknown>[]>([]);

// --- Column Mapping ---
export const columnMappingAtom = atom<Record<string, string | null>>({});

// --- Product Mapping ---
export const productMappingDataAtom = atom<ProductMatchResult[]>([]);
export const productMappingStatsAtom = atom({
  totalItems: 0,
  matchedItems: 0,
  needsReview: 0,
});

// --- Results ---
export const packingResultsAtom = atom<PackingResult3D[]>([]);

// --- Processing ---
export const isProcessingAtom = atom(false);

// --- Derived: step definitions ---
export const stepsAtom = atom((get) => {
  const currentStep = get(currentStepAtom);
  return [
    { id: 'upload' as const, label: '엑셀 업로드', completed: currentStep !== 'upload' },
    {
      id: 'columnMapping' as const,
      label: '컬럼 매핑',
      completed: currentStep === 'productMapping' || currentStep === 'results',
    },
    { id: 'productMapping' as const, label: '제품 매핑', completed: currentStep === 'results' },
    { id: 'results' as const, label: '계산 결과', completed: false },
  ];
});

// --- Reset (write-only atom) ---
export const resetWizardAtom = atom(null, (_get, set) => {
  set(currentStepAtom, 'upload');
  set(headersAtom, []);
  set(rowCountAtom, 0);
  set(parsedRowsAtom, []);
  set(columnMappingAtom, {});
  set(productMappingDataAtom, []);
  set(productMappingStatsAtom, { totalItems: 0, matchedItems: 0, needsReview: 0 });
  set(packingResultsAtom, []);
  set(isProcessingAtom, false);
});
