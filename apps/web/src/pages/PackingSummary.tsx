import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePackingHistory, useBoxes } from '@/hooks/queries';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PackingRecommendation, PackingGroup } from '@wms/types';

interface BoxSummaryEntry {
  groupLabel: string;
  count: number;
  efficiency: number;
}

interface BoxSummary {
  boxId: string;
  boxName: string;
  totalCount: number;
  orders: BoxSummaryEntry[];
}

function buildBoxSummary(groups: PackingGroup[]): BoxSummary[] {
  const map = new Map<string, BoxSummary>();
  for (const group of groups) {
    for (const { box, count } of group.boxes) {
      const existing = map.get(box.id);
      const entry: BoxSummaryEntry = {
        groupLabel: group.groupLabel,
        count,
        efficiency: Math.round(group.totalEfficiency),
      };
      if (existing) {
        existing.totalCount += count;
        existing.orders.push(entry);
      } else {
        map.set(box.id, {
          boxId: box.id,
          boxName: box.name,
          totalCount: count,
          orders: [entry],
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount);
}

export const PackingSummary: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: boxes = [] } = useBoxes();
  const { data: history } = usePackingHistory(projectId || '');

  const recommendation: PackingRecommendation | undefined =
    (location.state as { recommendation?: PackingRecommendation })?.recommendation ??
    (history?.[0] as PackingRecommendation | undefined);

  const boxSummaries = useMemo(() => {
    if (!recommendation) return [];
    return buildBoxSummary(recommendation.groups);
  }, [recommendation]);

  const [expandedBoxes, setExpandedBoxes] = useState<Set<string>>(new Set());

  const toggleBox = (boxId: string) => {
    const next = new Set(expandedBoxes);
    if (next.has(boxId)) {
      next.delete(boxId);
    } else {
      next.add(boxId);
    }
    setExpandedBoxes(next);
  };

  const getBoxDimensions = (boxId: string) => {
    const box = boxes.find((b) => b.id === boxId);
    if (!box) return '';
    return `${box.width}×${box.length}×${box.height}`;
  };

  const totalBoxCount = boxSummaries.reduce((sum, b) => sum + b.totalCount, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">박스 요약</h1>
          <p className="text-muted-foreground">박스별 사용 현황을 확인합니다.</p>
        </div>
      </div>

      {!recommendation ? (
        <div className="bg-white border rounded-xl shadow-sm px-4 py-12 text-center text-gray-400 text-sm">
          계산된 패킹 결과가 없습니다.
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-500">
            총 <span className="font-semibold text-gray-900">{totalBoxCount}개</span> 박스 사용 (
            {boxSummaries.length}종류)
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y">
              {boxSummaries.map((summary) => {
                const isExpanded = expandedBoxes.has(summary.boxId);
                const dims = getBoxDimensions(summary.boxId);
                return (
                  <Collapsible
                    key={summary.boxId}
                    open={isExpanded}
                    onOpenChange={() => toggleBox(summary.boxId)}
                  >
                    <CollapsibleTrigger className="w-full px-4 py-3 hover:bg-gray-50 flex items-center justify-between transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">
                          {summary.boxName}
                          {dims && (
                            <span className="text-gray-400 font-normal ml-1">({dims})</span>
                          )}
                        </span>
                        <span className="text-sm text-gray-500">
                          총 {summary.totalCount}개 사용 · {summary.orders.length}건 주문
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t bg-gray-50 animate-in fade-in slide-in-from-top-1">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>주문</TableHead>
                            <TableHead>박스 수</TableHead>
                            <TableHead>효율</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.orders.map((order) => (
                            <TableRow key={order.groupLabel} className="hover:bg-white">
                              <TableCell className="font-mono text-gray-700">
                                {order.groupLabel}
                              </TableCell>
                              <TableCell className="text-gray-600">{order.count}개</TableCell>
                              <TableCell className="text-gray-600">{order.efficiency}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
