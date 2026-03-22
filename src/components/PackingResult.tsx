import React from 'react';
import { Package, Box } from 'lucide-react';
import type { PackingResult3D, PackedBox3D, PackedItem3D, Rotation } from '@/types';

interface PackingResultProps {
  result: PackingResult3D;
  onExport?: (orderId: string) => void;
}

const rotationLabels: Record<Rotation, string> = {
  none: '0',
  '90': '90',
  '180': '180',
  '270': '270',
};

export const PackingResult: React.FC<PackingResultProps> = ({ result, onExport }) => {
  const formatCBM = (cbm: number) => {
    return cbm.toFixed(4);
  };

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="bg-indigo-50 px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold text-indigo-900">{result.groupLabel || result.orderId}</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-gray-600">CBM:</span>
            <span className="font-medium text-indigo-700 ml-1">{formatCBM(result.totalCBM)}</span>
          </div>
          <div>
            <span className="text-gray-600">효율:</span>
            <span className="font-medium text-indigo-700 ml-1">
              {(result.totalEfficiency * 100).toFixed(1)}%
            </span>
          </div>
          {onExport && (
            <button
              onClick={() => onExport(result.orderId)}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              엑셀 내보내기
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          {result.boxes.map((packedBox, boxIndex) => (
            <BoxResult key={`${result.orderId}-${boxIndex}`} box={packedBox} />
          ))}
        </div>

        {result.unpackedItems.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h4 className="font-medium text-red-700 mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              포장되지 않은 항목 ({result.unpackedItems.length})
            </h4>
            <div className="bg-red-50 border border-red-200 rounded-lg divide-y">
              {result.unpackedItems.map((item, index) => (
                <div key={index} className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.name || item.skuId}</div>
                    <div className="text-sm text-gray-500">SKU: {item.skuId}</div>
                    <div className="text-sm text-gray-500">수량: {item.quantity}</div>
                  </div>
                  {item.reason && (
                    <div className="text-sm text-red-600 bg-red-100 px-2 py-1 rounded">
                      {item.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface BoxResultProps {
  box: PackedBox3D;
}

const BoxResult: React.FC<BoxResultProps> = ({ box }) => {
  const formatCBM = (width: number, length: number, height: number) => {
    return ((width * length * height) / 1_000_000).toFixed(4);
  };

  return (
    <div className="border rounded-lg bg-gray-50 overflow-hidden">
      <div className="bg-white px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="h-5 w-5 text-gray-600" />
          <h4 className="font-semibold text-gray-900">
            {box.boxName} #{box.boxNumber}
          </h4>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-gray-600">
            {box.width} x {box.length} x {box.height} cm
          </div>
          <div>
            <span className="text-gray-600">CBM:</span>
            <span className="font-medium text-gray-900 ml-1">
              {formatCBM(box.width, box.length, box.height)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white border rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">사용 공간</div>
            <div className="text-lg font-medium text-indigo-600">
              {box.usedVolume ? ((box.usedVolume / box.availableVolume) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div className="bg-white border rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">포장 효율</div>
            <div className="text-lg font-medium text-green-600">{box.efficiency.toFixed(1)}%</div>
          </div>
        </div>

        <div className="space-y-2">
          <h5 className="text-sm font-medium text-gray-700">포장된 상품 ({box.items.length})</h5>
          <div className="bg-white border rounded-lg divide-y max-h-64 overflow-y-auto">
            {box.items.map((item, itemIndex) => (
              <PackedItem key={itemIndex} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface PackedItemProps {
  item: PackedItem3D;
}

const PackedItem: React.FC<PackedItemProps> = ({ item }) => {
  return (
    <div className="px-3 py-2">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="font-medium text-gray-900">{item.name || item.skuId}</div>
          <div className="text-sm text-gray-500">SKU: {item.skuId}</div>
          <div className="text-sm text-gray-500">수량: {item.quantity}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">위치</div>
          {item.placements.map((placement, index) => (
            <div
              key={index}
              className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded"
            >
              X:{placement.x} Y:{placement.y} Z:{placement.z}
              <span className="text-blue-600 ml-1">
                R:{rotationLabels[placement.rotation]}&deg;
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
