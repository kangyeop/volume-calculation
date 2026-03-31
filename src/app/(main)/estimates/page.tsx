'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { FileText, Upload, Trash2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useEstimates, useUploadEstimate, useDeleteEstimate } from '@/hooks/queries';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EstimatesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: estimatesList = [], isLoading } = useEstimates(debouncedSearch || undefined);
  const uploadEstimate = useUploadEstimate();
  const deleteEstimate = useDeleteEstimate();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith('.pdf')) {
      toast.error('PDF 파일만 업로드할 수 있습니다.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      toast.error('파일 크기는 10MB를 초과할 수 없습니다.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFile(selected);
  }

  async function handleUpload() {
    if (!name.trim() || !file) return;

    try {
      await uploadEstimate.mutateAsync({ name: name.trim(), file });
      toast.success('견적서가 업로드되었습니다.');
      setName('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      toast.error('견적서 업로드에 실패했습니다.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteEstimate.mutateAsync(deleteTarget);
      toast.success('견적서가 삭제되었습니다.');
    } catch {
      toast.error('견적서 삭제에 실패했습니다.');
    }
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">견적서</h1>
        <p className="text-muted-foreground mt-1">견적서 PDF를 업로드하고 관리합니다.</p>
      </div>

      <div className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">견적서 업로드</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">견적서 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="견적서 이름을 입력하세요"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">PDF 파일</label>
            <div
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 text-gray-400" />
              <span className={file ? 'text-gray-900' : 'text-gray-400'}>
                {file ? file.name : 'PDF 파일 선택'}
              </span>
              {file && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={!name.trim() || !file || uploadEstimate.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploadEstimate.isPending ? '업로드 중...' : '업로드'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="견적서 이름으로 검색..."
              className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">로딩 중...</div>
        ) : estimatesList.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">
              {debouncedSearch ? '검색 결과가 없습니다.' : '등록된 견적서가 없습니다.'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {debouncedSearch ? '다른 검색어를 입력해보세요.' : '위에서 견적서를 업로드해보세요.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {estimatesList.map((estimate) => (
              <li key={estimate.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                <Link
                  href={`/estimates/${estimate.id}`}
                  className="flex-1 flex items-center gap-3 min-w-0"
                >
                  <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{estimate.name}</p>
                    <p className="text-xs text-gray-400">
                      {estimate.fileName} · {formatFileSize(estimate.fileSize)} · {new Date(estimate.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => setDeleteTarget(estimate.id)}
                  className="rounded-lg p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="견적서 삭제"
        description="이 견적서를 삭제하시겠습니까? PDF 파일도 함께 삭제됩니다."
        variant="danger"
        confirmLabel="삭제"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
