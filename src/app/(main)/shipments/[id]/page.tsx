'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useConfigurationSummary } from '@/hooks/queries';
import { shipments } from '@/hooks/queries/queryKeys';
import type { Shipment } from '@/lib/api';
import { ArrowLeft, ChevronDown, ChevronRight, Calculator, Package, Layers } from 'lucide-react';
import { ShipmentDetailSkeleton } from '@/components/skeletons';
import { PageContainer } from '@/components/layout/PageContainer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function OutboundDetail() {
  const params = useParams<{ id: string }>();
  const batchId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const batches = queryClient.getQueryData<Shipment[]>(shipments.all.queryKey);
  const batch = batches?.find((b) => b.id === batchId);
  const { data: summary, isLoading } = useConfigurationSummary(batchId || '');

  const [expandedConfigs, setExpandedConfigs] = React.useState<Set<string>>(new Set());

  const toggleConfig = (key: string) => {
    setExpandedConfigs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/shipments')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{batch?.name || '출고 배치'}</h1>
          <p className="text-muted-foreground">Configuration별로 그룹화된 출고 데이터입니다.</p>
        </div>
        <button
          onClick={() => router.push(`/shipments/${batchId}/packing`)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Calculator className="h-4 w-4" />
          패킹 계산
        </button>
      </div>

      {isLoading ? (
        <ShipmentDetailSkeleton />
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">총 주문 수</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalOrders}</p>
              </div>
            </div>
            <div className="bg-white border rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <Layers className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">고유 Configuration</p>
                <p className="text-2xl font-bold text-gray-900">{summary.configurations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <span className="font-medium text-gray-700">Configuration 목록</span>
            </div>

            {summary.configurations.length > 0 ? (
              <div className="divide-y">
                {summary.configurations.map((config, idx) => {
                  const isExpanded = expandedConfigs.has(config.skuKey);

                  return (
                    <Collapsible
                      key={config.skuKey}
                      open={isExpanded}
                      onOpenChange={() => toggleConfig(config.skuKey)}
                    >
                      <CollapsibleTrigger className="w-full px-4 py-3 hover:bg-gray-50 flex items-center justify-between transition-colors">
                        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                          <span className="text-xs font-mono text-gray-400 flex-shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                            {config.skuItems.map((s, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700 flex-shrink-0 max-w-[200px]"
                                title={`${s.productName || s.sku} ×${s.quantity}`}
                              >
                                <span className="truncate">{s.productName || s.sku}</span>
                                <span className="text-gray-400 flex-shrink-0">×{s.quantity}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {config.largestItem && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200"
                              title={`최대 상품: ${config.largestItem.productName || '-'}`}
                            >
                              <Package className="h-3 w-3" />
                              {config.largestItem.width}×{config.largestItem.length}×
                              {config.largestItem.height}
                            </span>
                          )}
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600 border border-gray-200">
                            {config.skuItems.reduce((sum, s) => sum + s.quantity, 0)}개
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {config.orderCount}건
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="border-t bg-gray-50 px-4 py-3 space-y-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">
                            주문 ID ({config.orderCount}건)
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {config.orderIds.map((orderId) => (
                              <span
                                key={orderId}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-white border text-gray-700"
                              >
                                {orderId}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>SKU</TableHead>
                              <TableHead>상품명</TableHead>
                              <TableHead className="text-right">수량</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {config.skuItems.map((item) => (
                              <TableRow key={item.sku}>
                                <TableCell className="font-mono text-gray-700">
                                  {item.sku}
                                </TableCell>
                                <TableCell className="text-gray-600">
                                  {item.productName || '-'}
                                </TableCell>
                                <TableCell className="text-right text-gray-600">
                                  {item.quantity}
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
                출고 데이터가 없습니다.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="px-4 py-12 text-center text-gray-400 text-sm">
          데이터를 불러올 수 없습니다.
        </div>
      )}
    </PageContainer>
  );
}
