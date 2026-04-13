'use client';

import React, { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { buildPalletLayout3D } from '@/lib/algorithms/pallet-layout';

const PalletPacking3DView = dynamic(() => import('./PalletPacking3DView'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
      3D 뷰 로딩 중...
    </div>
  ),
});

interface Props {
  open: boolean;
  onClose: () => void;
  sku: {
    sku: string;
    productName: string;
    width: number;
    length: number;
    height: number;
    innerQuantity: number;
  } | null;
}

export function PalletPacking3DModal({ open, onClose, sku }: Props) {
  const layout = useMemo(() => {
    if (!sku) return null;
    return buildPalletLayout3D({
      width: sku.width,
      length: sku.length,
      height: sku.height,
      innerQuantity: sku.innerQuantity,
    });
  }, [sku]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !sku) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b">
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 truncate">{sku.productName}</div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5">{sku.sku}</div>
            <div className="text-xs text-gray-600 mt-1">
              박스 체적{' '}
              <span className="font-mono">
                {sku.width} × {sku.length} × {sku.height}
              </span>
              {layout && (
                <>
                  <span className="mx-2 text-gray-300">|</span>
                  한 층 <span className="font-semibold">{layout.itemsPerLayer}</span>칸 ×{' '}
                  <span className="font-semibold">{layout.layerCount}</span>단 ={' '}
                  <span className="font-semibold">{layout.cartonsPerPallet}</span>칸
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            aria-label="닫기"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 bg-gradient-to-b from-slate-50 to-slate-100 relative">
          {layout ? (
            <PalletPacking3DView layout={layout} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              레이아웃을 계산할 수 없습니다.
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg shadow px-3 py-2 text-xs text-gray-600">
            드래그로 회전 · 휠로 확대/축소 · 우클릭 드래그로 이동
          </div>
        </div>
      </div>
    </div>
  );
}
