import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface UnpackedItem {
  skuId: string;
  name?: string;
  quantity: number;
  reason?: string;
}

interface UnpackedItemsAlertProps {
  items: UnpackedItem[];
}

export const UnpackedItemsAlert: React.FC<UnpackedItemsAlertProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-8">
      <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
        <AlertTriangle className="h-5 w-5" />
        <span>Items Not Packed (Too Large)</span>
      </div>
      <div className="text-sm text-red-700 mb-2">
        The following items could not fit into any available box type:
      </div>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="flex justify-between items-center bg-white/50 p-2 rounded border border-red-100"
          >
            <div className="flex flex-col">
              <span className="font-medium">{item.name || 'Unknown Product'}</span>
              <span className="text-xs font-mono opacity-75">{item.skuId}</span>
            </div>
            <span className="font-bold bg-red-100 px-2 py-0.5 rounded text-red-800">
              x{item.quantity}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
