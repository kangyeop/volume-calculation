'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useCreateGlobalProductGroup,
  useCreateGlobalProductsBulk,
} from '@/hooks/queries';
import type { CreateGlobalProductInput } from '@/hooks/queries/useGlobalProducts';
import { ExcelUpload } from '@/components/ExcelUpload';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';

const COLUMN_SKU = '상품명';
const COLUMN_DIMENSIONS = '체적정보';
const COLUMN_INNER_QUANTITY = '단품수량';

function cellToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const v = value as { richText?: { text?: string }[]; text?: unknown; result?: unknown };
    if (Array.isArray(v.richText)) return v.richText.map((r) => r?.text ?? '').join('');
    if (v.text != null) return cellToString(v.text);
    if (v.result != null) return cellToString(v.result);
  }
  return String(value);
}

function parseDimensions(raw: string): { width: number; length: number; height: number } | null {
  const cleaned = raw.replace(/(cm|mm|m|in|inch)$/i, '').trim();
  const parts = cleaned.split(/[*xX×]/).map((p) => parseFloat(p.trim()));
  if (parts.length === 0 || parts.some((v) => isNaN(v) || v <= 0)) return null;
  const width = parts[0];
  const length = parts[1] ?? 1;
  const height = parts[2] ?? 1;
  return { width, length, height };
}

async function parseExcelClientSide(
  file: File,
): Promise<{ products: CreateGlobalProductInput[]; errors: string[] }> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { products: [], errors: ['시트를 찾을 수 없습니다.'] };

  const headerRow = worksheet.getRow(1);
  const headerMap: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const key = cellToString(cell.value).trim();
    if (key) headerMap[key] = colNumber;
  });

  const skuCol = headerMap[COLUMN_SKU];
  const dimsCol = headerMap[COLUMN_DIMENSIONS];
  const innerCol = headerMap[COLUMN_INNER_QUANTITY];

  if (!skuCol || !dimsCol || !innerCol) {
    return {
      products: [],
      errors: [
        `헤더 누락: ${[
          !skuCol && COLUMN_SKU,
          !dimsCol && COLUMN_DIMENSIONS,
          !innerCol && COLUMN_INNER_QUANTITY,
        ]
          .filter(Boolean)
          .join(', ')}`,
      ],
    };
  }

  const products: CreateGlobalProductInput[] = [];
  const errors: string[] = [];

  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const sku = cellToString(row.getCell(skuCol).value).trim();
    if (!sku) continue;

    const dimsRaw = cellToString(row.getCell(dimsCol).value).trim();
    const dims = dimsRaw ? parseDimensions(dimsRaw) : null;
    if (!dims) {
      errors.push(`행 ${i} (${sku}): 체적정보가 없거나 형식이 올바르지 않습니다.`);
      continue;
    }

    const innerRaw = row.getCell(innerCol).value;
    const innerQuantity =
      typeof innerRaw === 'number' ? innerRaw : parseInt(String(innerRaw ?? '').trim(), 10);
    if (!Number.isFinite(innerQuantity) || innerQuantity < 1) {
      errors.push(`행 ${i} (${sku}): 내입수량이 올바르지 않습니다.`);
      continue;
    }

    products.push({
      sku,
      name: sku,
      width: dims.width,
      length: dims.length,
      height: dims.height,
      innerQuantity,
    });
  }

  return { products, errors };
}

export default function GlobalProductGroupCreate() {
  const router = useRouter();
  const createGroup = useCreateGlobalProductGroup();
  const [groupName, setGroupName] = useState('');
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const createBulk = useCreateGlobalProductsBulk(createdGroupId ?? '');
  const [isUploading, setIsUploading] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      const group = await createGroup.mutateAsync({ name: groupName.trim() });
      setCreatedGroupId(group.id);
      toast.success('글로벌 상품 그룹이 생성되었습니다.');
    } catch {
      toast.error('생성 실패', { description: '글로벌 상품 그룹 생성에 실패했습니다.' });
    }
  };

  const handleUpload = async (file: File) => {
    if (!createdGroupId) return;
    setIsUploading(true);
    try {
      const { products, errors } = await parseExcelClientSide(file);
      if (errors.length > 0) {
        toast.warning('일부 행 오류', { description: `${errors.length}건의 오류가 있습니다.` });
      }
      if (products.length === 0) {
        toast.error('가져올 상품이 없습니다.');
        return;
      }
      router.prefetch(`/global/products/${createdGroupId}`);
      await createBulk.mutateAsync(products);
      toast.success('가져오기 완료', {
        description: `${products.length}개의 상품이 등록되었습니다.`,
      });
      router.replace(`/global/products/${createdGroupId}`);
    } catch {
      toast.error('업로드 실패', { description: '상품 파일 처리에 실패했습니다.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/global/products')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">새 글로벌 상품 그룹</h1>
          <p className="text-muted-foreground">글로벌 상품 그룹을 생성하고 상품을 등록합니다.</p>
        </div>
      </div>

      {!createdGroupId ? (
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">그룹명</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="글로벌 상품 그룹 이름을 입력하세요"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={createGroup.isPending || !groupName.trim()}
              className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createGroup.isPending ? '생성 중...' : '그룹 생성'}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
            글로벌 상품 그룹이 생성되었습니다. 아래에서 상품 파일을 업로드하거나 바로 이동할 수 있습니다.
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">상품 파일 업로드 (선택)</h2>
            {isUploading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                <span className="ml-3 text-sm text-gray-600">처리 중...</span>
              </div>
            ) : (
              <ExcelUpload onUpload={handleUpload} title="엑셀 파일을 업로드하세요" />
            )}
            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <strong>엑셀 컬럼:</strong> 상품명, 체적정보 (예: 10x20x30), 단품수량
            </div>
          </div>

          <button
            onClick={() => router.replace(`/global/products/${createdGroupId}`)}
            className="w-full border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            그룹 상세 페이지로 이동
          </button>
        </div>
      )}
    </PageContainer>
  );
}
