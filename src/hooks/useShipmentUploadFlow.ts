import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ShipmentUploadResult } from '@/types';

type ShipmentFormat = 'adjustment' | 'beforeMapping' | 'afterMapping';
type FlowStep = 'idle' | 'uploading' | 'done' | 'error';

interface FlowState {
  step: FlowStep;
  result: ShipmentUploadResult | null;
  error: string | null;
}

export function useShipmentUploadFlow() {
  const [state, setState] = useState<FlowState>({
    step: 'idle',
    result: null,
    error: null,
  });

  const upload = useCallback(async (file: File, format: ShipmentFormat) => {
    setState({ step: 'uploading', result: null, error: null });
    try {
      const result = await api.shipments.upload(file, format);
      setState({ step: 'done', result, error: null });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.';
      setState({ step: 'error', result: null, error: message });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ step: 'idle', result: null, error: null });
  }, []);

  return { ...state, upload, reset };
}
