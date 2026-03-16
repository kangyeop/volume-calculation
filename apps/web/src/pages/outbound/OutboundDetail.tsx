import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useInfiniteOutboundBatchOutbounds } from '@/hooks/queries';
import { outboundBatches } from '@/hooks/queries/queryKeys';
import type { OutboundBatch } from '@/lib/api';
import { ArrowLeft, ChevronDown, ChevronRight, Calculator } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Outbound } from '@wms/types';

export const OutboundDetail: React.FC = () => {
  const { id: batchId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const batches = queryClient.getQueryData<OutboundBatch[]>(outboundBatches.all.queryKey);
  const batch = batches?.find((b) => b.id === batchId);
  const {
    data,
    isLoading: outboundsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteOutboundBatchOutbounds(batchId || '');

  const [expandedOrders, setExpandedOrders] = React.useState<Set<string>>(new Set());

  const allOutbounds = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, Outbound[]>();
    allOutbounds.forEach((outbound) => {
      const key = outbound.orderIdentifier || outbound.orderId;
      const existing = groups.get(key) || [];
      existing.push(outbound);
      groups.set(key, existing);
    });
    return Array.from(groups.entries());
  }, [allOutbounds]);

  const unmatchedItems = useMemo(() => allOutbounds.filter((o) => !o.productId), [allOutbounds]);

  const totalOrders = data?.pages[0]?.totalOrders ?? 0;

  const toggleOrder = (key: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };


  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/outbound')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{batch?.name || '출고 배치'}</h1>
          <p className="text-muted-foreground">주문별 출고 데이터를 확인합니다.</p>
        </div>
        <button
          onClick={() => navigate(`/outbound/${batchId}/packing`)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Calculator className="h-4 w-4" />
          패킹 계산
        </button>
      </div>

      {unmatchedItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>미매칭 항목 {unmatchedItems.length}건:</strong> 상품 코드를 찾을 수 없는 데이터가
          있습니다. 상품 그룹을 먼저 등록해주세요.
        </div>
      )}

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <span className="font-medium text-gray-700">
            총 {totalOrders}건
            {groupedOrders.length < totalOrders && ` (${groupedOrders.length}건 표시 중)`}
          </span>
        </div>

        {outboundsLoading ? (
          <div className="px-4 py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : groupedOrders.length > 0 ? (
          <>
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
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t bg-gray-50">
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
                              <TableCell className="font-mono text-gray-700">
                                {outbound.sku}
                              </TableCell>
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

            {hasNextPage && (
              <div className="p-4 border-t text-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-6 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                >
                  {isFetchingNextPage ? '불러오는 중...' : '더 불러오기'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="px-4 py-12 text-center text-gray-400 text-sm">
            출고 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};
