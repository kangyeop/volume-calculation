'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { FileText, FileDown } from 'lucide-react';
import type { GlobalPackingResultRow } from '@/hooks/queries';
import { flattenPallets } from '@/lib/pdf/flattenPallets';
import { ShipmentPalletListPdf } from './ShipmentPalletListPdf';
import { ShipmentPalletLabelsPdf } from './ShipmentPalletLabelsPdf';

export interface ShipmentPdfDownloadButtonsProps {
  rows: GlobalPackingResultRow[];
  totalPallets: number;
  shipmentLabel: string;
}

export default function ShipmentPdfDownloadButtons({
  rows,
  totalPallets,
  shipmentLabel,
}: ShipmentPdfDownloadButtonsProps) {
  const pallets = flattenPallets(rows);
  const disabled = pallets.length === 0;
  const generatedAt = new Date().toLocaleString('ko-KR');

  const safeLabel = shipmentLabel.replace(/[^\w가-힣.-]+/g, '_').slice(0, 40) || 'shipment';

  if (disabled) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          disabled
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed"
        >
          <FileText className="h-4 w-4" />
          전체 목록 PDF
        </button>
        <button
          disabled
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed"
        >
          <FileDown className="h-4 w-4" />
          파레트 라벨 PDF
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PDFDownloadLink
        document={
          <ShipmentPalletListPdf
            shipmentLabel={shipmentLabel}
            totalPallets={totalPallets}
            pallets={pallets}
            generatedAt={generatedAt}
          />
        }
        fileName={`${safeLabel}_파레트목록.pdf`}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
      >
        {({ loading }) => (
          <>
            <FileText className="h-4 w-4" />
            {loading ? '생성 중...' : '전체 목록 PDF'}
          </>
        )}
      </PDFDownloadLink>

      <PDFDownloadLink
        document={
          <ShipmentPalletLabelsPdf
            shipmentLabel={shipmentLabel}
            totalPallets={totalPallets}
            pallets={pallets}
          />
        }
        fileName={`${safeLabel}_파레트라벨.pdf`}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
      >
        {({ loading }) => (
          <>
            <FileDown className="h-4 w-4" />
            {loading ? '생성 중...' : '파레트 라벨 PDF'}
          </>
        )}
      </PDFDownloadLink>
    </div>
  );
}
