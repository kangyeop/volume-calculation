import { useState } from 'react';

interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export function useRetry(options: RetryOptions = {}) {
  const { maxRetries = 3, delay = 1000, onRetry } = options;
  const [retryCount, setRetryCount] = useState(0);

  const executeWithRetry = async <T>(
    fn: () => Promise<T>,
    onError?: (error: Error) => void,
  ): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Error && retryCount < maxRetries - 1) {
        setRetryCount((prev) => prev + 1);
        onRetry?.(retryCount + 1, error);

        await new Promise((resolve) => setTimeout(resolve, delay * (retryCount + 1)));
        return executeWithRetry(fn, onError);
      }

      onError?.(error as Error);
      throw error;
    }
  };

  const resetRetry = () => {
    setRetryCount(0);
  };

  return {
    executeWithRetry,
    retryCount,
    canRetry: retryCount < maxRetries,
    resetRetry,
  };
}
