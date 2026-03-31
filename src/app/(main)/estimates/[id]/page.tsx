'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, FileText } from 'lucide-react';
import { useEstimateSignedUrl } from '@/hooks/queries';

export default function EstimateViewerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError, refetch, isFetching } = useEstimateSignedUrl(params.id);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 pb-4 border-b mb-4">
        <button
          onClick={() => router.push('/estimates')}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">
            {data?.estimate?.name ?? '견적서'}
          </h1>
          {data?.estimate && (
            <p className="text-xs text-gray-400">{data.estimate.fileName}</p>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="다시 로드"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 rounded-lg border bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-gray-300 animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">PDF를 로딩 중입니다...</p>
            </div>
          </div>
        ) : isError || !data?.url ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">PDF를 불러올 수 없습니다.</p>
              <p className="text-xs text-gray-400 mt-1">파일이 삭제되었거나 접근 권한이 없습니다.</p>
              <button
                onClick={() => refetch()}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                다시 로드
              </button>
            </div>
          </div>
        ) : (
          <object
            data={data.url}
            type="application/pdf"
            className="w-full h-full"
          >
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">브라우저에서 PDF를 표시할 수 없습니다.</p>
                <a
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  PDF 다운로드
                </a>
              </div>
            </div>
          </object>
        )}
      </div>
    </div>
  );
}
