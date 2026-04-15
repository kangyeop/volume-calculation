'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import type { GlobalMixedPalletRow } from '@/hooks/queries';

const MixedPalletPacking3DView = dynamic(() => import('./MixedPalletPacking3DView'), {
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
  pallet: GlobalMixedPalletRow | null;
}

export function MixedPalletPacking3DModal({ open, onClose, pallet }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !pallet) return null;

  const totalBoxes = pallet.items.length;
  const uniqueSkus = new Set(pallet.items.map((i) => i.sku)).size;

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
            <div className="font-semibold text-gray-900 truncate">
              혼합 팔레트 #{pallet.palletIndex}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              총 <span className="font-semibold">{totalBoxes}</span>박스 ·{' '}
              <span className="font-semibold">{uniqueSkus}</span>개 SKU
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
          <MixedPalletPacking3DView items={pallet.items} />
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg shadow px-3 py-2 text-xs text-gray-600">
            드래그로 회전 · 휠로 확대/축소 · 우클릭 드래그로 이동
          </div>
        </div>
      </div>
    </div>
  );
}
