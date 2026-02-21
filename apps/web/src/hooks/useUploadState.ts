import { useState } from 'react';
import { UploadSession } from '@/types/upload';

interface UploadState {
  isUploading: boolean;
  errors: string[];
  uploadSession: UploadSession | null;
  showMappingUI: boolean;
  uploadFile: File | null;
}

export const useUploadState = () => {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    errors: [],
    uploadSession: null,
    showMappingUI: false,
    uploadFile: null,
  });

  const setUploading = (isUploading: boolean) => {
    setState(prev => ({ ...prev, isUploading }));
  };

  const setErrors = (errors: string[]) => {
    setState(prev => ({ ...prev, errors }));
  };

  const setUploadSession = (session: UploadSession | null) => {
    setState(prev => ({ ...prev, uploadSession: session }));
  };

  const setShowMappingUI = (show: boolean) => {
    setState(prev => ({ ...prev, showMappingUI: show }));
  };

  const setUploadFile = (file: File | null) => {
    setState(prev => ({ ...prev, uploadFile: file }));
  };

  const resetUpload = () => {
    setState({
      isUploading: false,
      errors: [],
      uploadSession: null,
      showMappingUI: false,
      uploadFile: null,
    });
  };

  return {
    ...state,
    setUploading,
    setErrors,
    setUploadSession,
    setShowMappingUI,
    setUploadFile,
    resetUpload,
  };
};