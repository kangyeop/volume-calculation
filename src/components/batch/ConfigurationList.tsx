'use client';

import React from 'react';
import { Package, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SkuItem {
  sku: string;
  productName?: string;
  quantity: number;
}

interface LargestItem {
  width: number;
  length: number;
  height: number;
  volume: number;
  productName?: string;
}

export interface ConfigurationItem {
  skuKey: string;
  skuItems: SkuItem[];
  orderCount: number;
  orderIds: string[];
  largestItem: LargestItem | null;
  productGroupId: string | null;
}

interface ConfigurationListProps {
  configurations: ConfigurationItem[];
  expandedConfigs: Set<string>;
  onToggleConfig: (key: string) => void;
  emptyMessage: string;
  renderOrderId?: (orderId: string) => React.ReactNode;
  renderConfigBadges?: (config: ConfigurationItem) => React.ReactNode;
}

function DefaultOrderId({ orderId }: { orderId: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-white border text-gray-700">
      {orderId}
    </span>
  );
}

export function ConfigurationList({
  configurations,
  expandedConfigs,
  onToggleConfig,
  emptyMessage,
  renderOrderId,
  renderConfigBadges,
}: ConfigurationListProps) {
  if (configurations.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-gray-400 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="divide-y">
      {configurations.map((config, idx) => {
        const isExpanded = expandedConfigs.has(config.skuKey);

        return (
          <Collapsible
            key={config.skuKey}
            open={isExpanded}
            onOpenChange={() => onToggleConfig(config.skuKey)}
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
                {renderConfigBadges?.(config)}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200">
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
                  {config.orderIds.map((orderId) =>
                    renderOrderId ? (
                      <React.Fragment key={orderId}>{renderOrderId(orderId)}</React.Fragment>
                    ) : (
                      <DefaultOrderId key={orderId} orderId={orderId} />
                    )
                  )}
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
  );
}
