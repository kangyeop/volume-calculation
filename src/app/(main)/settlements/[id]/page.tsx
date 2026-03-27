'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Check, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/PageContainer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ListTableSkeleton } from '@/components/skeletons';
import {
  useSettlementDetail,
  useAssignBox,
  useConfirmSettlement,
  useUnconfirmSettlement,
  useDeleteSettlement,
  useBoxes,
} from '@/hooks/queries';

export default function SettlementDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: settlement, isLoading } = useSettlementDetail(id);
  const { data: boxes = [] } = useBoxes();
  const assignBox = useAssignBox();
  const confirmSettlement = useConfirmSettlement();
  const unconfirmSettlement = useUnconfirmSettlement();
  const deleteSettlement = useDeleteSettlement();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleAssignBox = async (orderUuid: string, boxId: string) => {
    try {
      await assignBox.mutateAsync({ settlementId: id, orderId: orderUuid, boxId });
      toast.success('박스가 지정되었습니다.');
    } catch {
      toast.error('박스 지정에 실패했습니다.');
    }
  };

  const handleConfirm = async () => {
    try {
      await confirmSettlement.mutateAsync(id);
      toast.success('정산이 확정되었습니다.');
    } catch {
      toast.error('확정에 실패했습니다.');
    }
  };

  const handleUnconfirm = async () => {
    try {
      await unconfirmSettlement.mutateAsync(id);
      toast.success('확정이 해제되었습니다.');
    } catch {
      toast.error('확정 해제에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    setDeleteOpen(false);
    try {
      await deleteSettlement.mutateAsync(id);
      toast.success('정산이 삭제되었습니다.');
      router.replace('/settlements');
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  if (isLoading) return <ListTableSkeleton />;
  if (!settlement) return <div>정산을 찾을 수 없습니다.</div>;

  const isConfirmed = settlement.status === 'CONFIRMED';

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/settlements')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{settlement.name}</h1>
            {isConfirmed ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                확정
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                패킹중
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConfirmed ? (
            <button
              onClick={handleUnconfirm}
              disabled={unconfirmSettlement.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {unconfirmSettlement.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              확정 해제
            </button>
          ) : (
            <>
              <button
                onClick={handleConfirm}
                disabled={confirmSettlement.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {confirmSettlement.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                확정
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                disabled={deleteSettlement.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleteSettlement.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">주문번호</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">상품</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">상태</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">바코드</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">에어캡</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">박스</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">박스 지정</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {settlement.orders.map((order) => (
              <tr key={order.orderUuid} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{order.orderId}</td>
                <td className="px-4 py-3 text-gray-600">
                  {order.items.map((item) => `${item.sku} × ${item.quantity}`).join(', ')}
                </td>
                <td className="px-4 py-3">
                  {order.status === 'matched' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                      매칭됨
                    </span>
                  )}
                  {order.status === 'matched_unassigned' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                      매칭됨-미지정
                    </span>
                  )}
                  {order.status === 'auto_packed' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                      자동패킹
                    </span>
                  )}
                  {order.status === 'unmatched' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">
                      미매칭
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{order.barcodeCount}</td>
                <td className="px-4 py-3 text-right text-gray-600">{order.aircapCount}</td>
                <td className="px-4 py-3 text-gray-600">
                  {order.boxId ? (boxes.find((b) => b.id === order.boxId)?.name ?? '-') : '-'}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={order.boxId ?? ''}
                    onChange={(e) => handleAssignBox(order.orderUuid, e.target.value)}
                    disabled={isConfirmed || assignBox.isPending}
                    className="w-full px-2 py-1.5 text-sm border rounded-lg bg-white disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">박스 선택</option>
                    {boxes.map((box) => (
                      <option key={box.id} value={box.id}>
                        {box.name} ({box.width}×{box.length}×{box.height})
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
              <td className="px-4 py-3 text-gray-900">합계</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right text-gray-900">
                {settlement.orders.reduce((sum, o) => sum + o.barcodeCount, 0)}
              </td>
              <td className="px-4 py-3 text-right text-gray-900">
                {settlement.orders.reduce((sum, o) => sum + o.aircapCount, 0)}
              </td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
            </tr>
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="정산 삭제"
        description="정산을 삭제하시겠습니까? 관련된 주문 데이터도 함께 삭제됩니다."
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </PageContainer>
  );
}
