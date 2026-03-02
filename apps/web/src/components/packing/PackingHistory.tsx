import React from 'react';
import { History } from 'lucide-react';

interface PackingHistoryItem {
  createdAt: string | Date;
  boxName: string;
  efficiency: number | string;
  totalCBM: number | string;
  packedCount: number;
}

interface PackingHistoryProps {
  history: PackingHistoryItem[];
}

export const PackingHistory: React.FC<PackingHistoryProps> = ({ history }) => {
  if (history.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <History className="h-5 w-5" />
        Recent Results
      </h2>
      <div className="rounded-lg border overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Date</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Box Type</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">Efficiency</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">Total CBM</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">Packed Count</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {history.slice(0, 10).map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 text-gray-600">
                  {new Date(item.createdAt).toLocaleDateString()}{' '}
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-6 py-3 font-medium text-gray-900">{item.boxName}</td>
                <td className="px-6 py-3 text-right">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${Number(item.efficiency) > 0.8 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                  >
                    {(Number(item.efficiency) * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-3 text-right font-mono text-gray-600">
                  {Number(item.totalCBM).toFixed(4)}
                </td>
                <td className="px-6 py-3 text-right font-mono text-gray-600">
                  {item.packedCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
