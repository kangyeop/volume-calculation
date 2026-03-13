import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { usePackingHistory, usePackingDetails, useExportPacking } from '@/hooks/queries/usePacking';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PackingResultDetail } from '@wms/types';

export const PackingResultHistory: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { data: history = [], isLoading: historyLoading } = usePackingHistory(projectId!);
  const { data: details = [], isLoading: detailsLoading } = usePackingDetails(projectId!);
  const exportPacking = useExportPacking();

  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const isLoading = historyLoading || detailsLoading;
  const summary = history[0];
  const packed = details.filter((d) => !d.unpacked);
  const unpacked = details.filter((d) => d.unpacked);

  const boxNames = useMemo(() => {
    return Array.from(new Set(packed.map((d) => d.boxName))).sort();
  }, [packed]);

  const filteredPacked = useMemo(() => {
    if (!selectedBox) return packed;
    return packed.filter((d) => d.boxName === selectedBox);
  }, [packed, selectedBox]);

  const groupedOrders = useMemo(() => {
    const orderMap = new Map<string, Map<string, PackingResultDetail[]>>();

    for (const item of filteredPacked) {
      if (!orderMap.has(item.orderId)) {
        orderMap.set(item.orderId, new Map());
      }
      const boxKey = `${item.boxName} #${item.boxNumber}`;
      const orderBoxes = orderMap.get(item.orderId)!;
      if (!orderBoxes.has(boxKey)) {
        orderBoxes.set(boxKey, []);
      }
      orderBoxes.get(boxKey)!.push(item);
    }

    return Array.from(orderMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPacked]);

  const boxUsage = packed.reduce<Record<string, Set<string>>>((acc, item) => {
    if (!acc[item.boxName]) acc[item.boxName] = new Set();
    acc[item.boxName].add(`${item.orderId}-${item.boxNumber}`);
    return acc;
  }, {});

  const toggleOrder = (orderId: string) => {
    const next = new Set(expandedOrders);
    if (next.has(orderId)) next.delete(orderId);
    else next.add(orderId);
    setExpandedOrders(next);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg bg-gray-50">
        <Package className="h-12 w-12 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">패킹 결과가 없습니다</p>
        <p className="text-gray-400 text-sm mt-1">패킹 계산을 먼저 실행해주세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">패킹 결과</h1>
        <button
          onClick={() => exportPacking.mutate({ projectId: projectId! })}
          disabled={exportPacking.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="h-4 w-4" />
          엑셀 내보내기
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">계산일시</p>
          <p className="font-medium text-sm">
            {new Date(summary.createdAt).toLocaleDateString('ko-KR')}{' '}
            {new Date(summary.createdAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">총 CBM</p>
          <p className="text-2xl font-bold">{Number(summary.totalCBM).toFixed(4)}</p>
        </div>
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">총 박스 수</p>
          <p className="text-2xl font-bold">
            {Object.values(boxUsage).reduce((acc, nums) => acc + nums.size, 0)}개
          </p>
          {Object.keys(boxUsage).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(boxUsage).map(([boxName, nums]) => (
                <span key={boxName} className="text-xs text-muted-foreground">
                  {boxName} {nums.size}개
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {packed.length > 0 && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center gap-3 flex-wrap">
            <span className="font-medium text-gray-700 text-sm">박스 필터:</span>
            <button
              onClick={() => setSelectedBox(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !selectedBox
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            {boxNames.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedBox(selectedBox === name ? null : name)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedBox === name
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="px-4 py-3 border-b bg-gray-50">
            <span className="text-sm text-gray-600 font-medium">총 {groupedOrders.length}건</span>
          </div>

          <div className="divide-y">
            {groupedOrders.map(([orderId, boxMap]) => {
              const isExpanded = expandedOrders.has(orderId);
              const totalBoxes = boxMap.size;
              const totalItems = Array.from(boxMap.values()).reduce(
                (sum, items) => sum + items.reduce((s, i) => s + i.quantity, 0),
                0,
              );

              return (
                <Collapsible
                  key={orderId}
                  open={isExpanded}
                  onOpenChange={() => toggleOrder(orderId)}
                >
                  <CollapsibleTrigger className="w-full px-4 py-3 hover:bg-gray-50 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-gray-900">{orderId}</span>
                      <span className="text-sm text-gray-500">
                        박스 {totalBoxes}개 · 총 {totalItems}개
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t bg-gray-50 animate-in fade-in slide-in-from-top-1">
                    {Array.from(boxMap.entries()).map(([boxKey, items]) => (
                      <div key={boxKey} className="border-b last:border-b-0">
                        <div className="px-6 py-2 bg-gray-100 text-xs font-medium text-gray-600">
                          {boxKey}
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>SKU</TableHead>
                              <TableHead>상품명</TableHead>
                              <TableHead>수량</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => (
                              <TableRow key={item.id} className="hover:bg-white">
                                <TableCell className="font-mono text-gray-700 text-xs">
                                  {item.sku}
                                </TableCell>
                                <TableCell>{item.productName}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
      )}

      {unpacked.length > 0 && (
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="px-4 py-3 border-b bg-red-50">
            <h2 className="font-medium text-sm text-red-800">미포장 ({unpacked.length}개)</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">주문 ID</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">SKU</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">상품명</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">수량</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">사유</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {unpacked.map((item) => (
                <tr key={item.id} className="hover:bg-red-50">
                  <td className="px-4 py-2 text-gray-600 text-xs">{item.orderId}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-600">{item.sku}</td>
                  <td className="px-4 py-2">{item.productName}</td>
                  <td className="px-4 py-2 text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{item.unpackedReason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
