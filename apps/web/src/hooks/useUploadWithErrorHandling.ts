import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function useUploadWithErrorHandling() {
  const queryClient = useQueryClient();

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
      toast.loading('파일 분석 중...', {
        description: 'AI가 엑셀 파일을 분석하고 있습니다.',
      });
    },
    onSuccess: (data) => {
      toast.success('분석 완료', {
        description: `AI가 ${data.data.rowCount}개의 데이터를 분석했습니다.`,
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

      toast.error('오류', {
        description: errorMessage,
        action: {
          label: '재시도',
          onClick: () => {
            uploadParse.mutate(variables);
          },
        },
      });

      throw error;
    },
  });

  return {
    uploadParse,
  };
}