import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export function useUploadWithErrorHandling() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadParse = useMutation({
    mutationFn: ({ file, type, projectId }: { file: File; type: 'outbound' | 'product'; projectId: string }) => {
      // 파일 크기 검증 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('파일 크기는 10MB를 초과할 수 없습니다.');
      }

      // 파일 확장자 검증
      const allowedExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error(`허용되지 않는 파일 형식입니다. ${allowedExtensions.join(', ')}만 업로드 가능합니다.`);
      }

      return api.upload.parse(file, type, projectId);
    },
    onMutate: () => {
      toast({
        title: '파일 분석 중...',
        description: 'AI가 엑셀 파일을 분석하고 있습니다.',
      });
    },
    onSuccess: (data) => {
      toast({
        title: '분석 완료',
        description: `AI가 ${data.data.rowCount}개의 데이터를 분석했습니다.`,
        variant: 'default',
      });
    },
    onError: (error, variables) => {
      let errorMessage = '파일 처리 중 오류가 발생했습니다.';

      if (error instanceof Error) {
        if (error.message.includes('파일 크기')) {
          errorMessage = error.message;
        } else if (error.message.includes('파일 형식')) {
          errorMessage = error.message;
        } else if (error.message.includes('AI 분석 실패')) {
          errorMessage = 'AI가 파일을 분석하지 못했습니다. 파일 형식을 확인하고 다시 시도해주세요.';
        }
      }

      toast({
        title: '오류',
        description: errorMessage,
        variant: 'destructive',
        action: (
          <button
            onClick={() => {
              // 재시도 로직
              uploadParse.mutate(variables);
            }}
            className="text-sm underline"
          >
            재시도
          </button>
        ),
      });

      throw error;
    },
  });

  const uploadConfirm = useMutation({
    mutationFn: ({ sessionId, mapping }: { sessionId: string; mapping: Record<string, string | null> }) => {
      return api.upload.confirm(sessionId, mapping);
    },
    onMutate: () => {
      toast({
        title: '데이터 저장 중...',
        description: '매핑된 데이터를 저장하고 있습니다.',
      });
    },
    onSuccess: (data, variables) => {
      // 세션 데이터 무효화
      queryClient.removeQueries({ queryKey: ['upload', 'session', variables.sessionId] });

      if (data.data.batchId) {
        toast({
          title: '저장 완료',
          description: `성공적으로 ${data.data.imported}개의 데이터를 저장했습니다.`,
          variant: 'default',
        });
      }
    },
    onError: (error, variables) => {
      let errorMessage = '데이터 저장 중 오류가 발생했습니다.';

      if (error instanceof Error) {
        if (error.message.includes('세션 만료')) {
          errorMessage = '세션이 만료되었습니다. 파일을 다시 업로드해주세요.';
        } else if (error.message.includes('유효하지 않은 데이터')) {
          errorMessage = '데이터 유효성 검사에 실패했습니다. 매핑을 확인해주세요.';
        }
      }

      toast({
        title: '오류',
        description: errorMessage,
        variant: 'destructive',
      });

      throw error;
    },
  });

  const deleteSession = useMutation({
    mutationFn: (sessionId: string) => {
      return api.upload.deleteSession(sessionId);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['upload'] });
      toast({
        title: '세션 삭제',
        description: '업로드 세션이 삭제되었습니다.',
      });
    },
    onError: () => {
      toast({
        title: '오류',
        description: '세션 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // 세션 만료 체크
  const checkSessionExpiry = (sessionId: string, ttl: number = 30 * 60 * 1000) => {
    const createdAt = localStorage.getItem(`upload_session_${sessionId}_created`);
    if (!createdAt) return true;

    const sessionAge = Date.now() - parseInt(createdAt);
    return sessionAge > ttl;
  };

  // 세션 초기화
  const initializeSession = (sessionId: string) => {
    localStorage.setItem(`upload_session_${sessionId}_created`, Date.now().toString());
    localStorage.setItem(`upload_session_${sessionId}_data`, JSON.stringify({}));
  };

  return {
    uploadParse,
    uploadConfirm,
    deleteSession,
    checkSessionExpiry,
    initializeSession,
  };
}