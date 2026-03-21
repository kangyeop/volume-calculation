import { useState } from 'react';

interface UploadState {
  isUploading: boolean;
  errors: string[];
  showMappingUI: boolean;
  uploadFile: File | null;
}

export const useUploadState = () => {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    errors: [],
    showMappingUI: false,
    uploadFile: null,
  });

  const setUploading = (isUploading: boolean) => {
    setState((prev) => ({ ...prev, isUploading }));
  };

  const setErrors = (errors: string[]) => {
    setState((prev) => ({ ...prev, errors }));
  };

  const setShowMappingUI = (showMappingUI: boolean) => {
    setState((prev) => ({ ...prev, showMappingUI }));
  };

  const setUploadFile = (uploadFile: File | null) => {
    setState((prev) => ({ ...prev, uploadFile }));
  };

  const reset = () => {
    setState({
      isUploading: false,
      errors: [],
      showMappingUI: false,
      uploadFile: null,
    });
  };

  return {
    ...state,
    setUploading,
    setErrors,
    setShowMappingUI,
    setUploadFile,
    reset,
  };
};
