import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ParseOutboundResponse, OutboundUploadResult } from '@wms/types';

type FlowStep = 'idle' | 'parsing' | 'confirming' | 'processing' | 'done' | 'error';

interface FlowState {
  step: FlowStep;
  parseResult: ParseOutboundResponse | null;
  processResult: OutboundUploadResult | null;
  error: string | null;
}

export function useOutboundUploadFlow() {
  const [state, setState] = useState<FlowState>({
    step: 'idle',
    parseResult: null,
    processResult: null,
    error: null,
  });

  const startParse = useCallback(async (file: File) => {
    setState({ step: 'parsing', parseResult: null, processResult: null, error: null });
    try {
      const result = await api.upload.parseOutbound(file);
      setState({ step: 'confirming', parseResult: result, processResult: null, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : '파싱 중 오류가 발생했습니다.';
      setState((prev) => ({ ...prev, step: 'error', error: message }));
    }
  }, []);

  const confirmAndProcess = useCallback(
    async (
      columnMapping: Record<string, string>,
      options?: { saveAsTemplate?: boolean; templateName?: string },
    ) => {
      if (!state.parseResult) return;
      setState((prev) => ({ ...prev, step: 'processing' }));
      try {
        const result = await api.upload.processOutbound({
          sessionId: state.parseResult.sessionId,
          columnMapping,
          saveAsTemplate: options?.saveAsTemplate,
          templateName: options?.templateName,
          matchedTemplateId: state.parseResult.matchedTemplate?.id,
        });
        setState((prev) => ({ ...prev, step: 'done', processResult: result }));
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.';
        setState((prev) => ({ ...prev, step: 'error', error: message }));
        throw err;
      }
    },
    [state.parseResult],
  );

  const reset = useCallback(() => {
    setState({ step: 'idle', parseResult: null, processResult: null, error: null });
  }, []);

  return {
    ...state,
    startParse,
    confirmAndProcess,
    reset,
  };
}
