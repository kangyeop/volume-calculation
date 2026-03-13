import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOutbounds, useCalculatePacking, useBoxes } from '@/hooks/queries';
import { ArrowLeft, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { PackingGroupingOption } from '@wms/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import type { Outbound } from '@wms/types';

export const OutboundList: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: outbounds = [], isLoading } = useOutbounds(projectId || '');
  const { data: boxes = [] } = useBoxes();
  const calculateAll = useCalculatePacking();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrder = (key: string) => {
    const next = new Set(expandedOrders);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpandedOrders(next);
  };

  const handleCalculateAll = async () => {
    if (boxes.length === 0) {
      toast.error('등록된 박스가 없습니다. 먼저 박스를 등록해주세요.');
      return;
    }
    try {
      const result = await calculateAll.mutateAsync({
        projectId: projectId!,
        groupingOption: PackingGroupingOption.ORDER,
      });
      navigate(`/projects/${projectId}/packing/summary`, { state: { recommendation: result } });
    } catch {
      toast.error('계산 중 오류가 발생했습니다.');
    }
  };

  const groupedOrders = useMemo(() => {
    const sorted = [...outbounds].sort((a, b) => {
      const aKey = a.orderIdentifier || a.orderId;
      const bKey = b.orderIdentifier || b.orderId;
      return aKey.localeCompare(bKey);
    });
    const groups: Map<string, Outbound[]> = new Map();
    sorted.forEach((outbound) => {
      const key = outbound.orderIdentifier || outbound.orderId;
      const existing = groups.get(key) || [];
      existing.push(outbound);
      groups.set(key, existing);
    });
    return Array.from(groups.entries());
  }, [outbounds]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">출고 목록</h1>
          <p className="text-muted-foreground">주문별 출고 데이터를 확인합니다.</p>
        </div>
        <button
          onClick={handleCalculateAll}
          disabled={calculateAll.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {calculateAll.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              계산 중
            </>
          ) : (
            '전체 계산하기'
          )}
        </button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <span className="font-medium text-gray-700">총 {groupedOrders.length}건</span>
        </div>

        {isLoading ? (
          <div className="px-4 py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : groupedOrders.length > 0 ? (
          <div className="divide-y">
            {groupedOrders.map(([orderKey, items]) => {
              const isExpanded = expandedOrders.has(orderKey);
              const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <Collapsible
                  key={orderKey}
                  open={isExpanded}
                  onOpenChange={() => toggleOrder(orderKey)}
                >
                  <CollapsibleTrigger className="w-full px-4 py-3 hover:bg-gray-50 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-gray-900">{orderKey}</span>
                      <span className="text-sm text-gray-500">
                        {items.length}개 항목 · 총 {totalQuantity}개
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t bg-gray-50 animate-in fade-in slide-in-from-top-1">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>수량</TableHead>
                          <TableHead>생성일시</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((outbound: Outbound) => (
                          <TableRow key={outbound.id} className="hover:bg-white">
                            <TableCell className="font-mono text-gray-700">{outbound.sku}</TableCell>
                            <TableCell className="text-gray-600">{outbound.quantity}</TableCell>
                            <TableCell className="text-gray-500 text-xs">
                              {new Date(outbound.createdAt).toLocaleString('ko-KR')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-12 text-center text-gray-400 text-sm">
            업로드된 출고 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};
