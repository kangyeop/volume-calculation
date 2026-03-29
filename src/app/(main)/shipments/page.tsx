'use client';

import { Truck } from 'lucide-react';
import { useShipments, useDeleteShipment } from '@/hooks/queries';
import { usePrefetchShipmentDetail } from '@/hooks/usePrefetch';
import { BatchListPage } from '@/components/batch/BatchListPage';

export default function OutboundList() {
  const { data: batches = [], isLoading } = useShipments();
  const deleteBatch = useDeleteShipment();
  const prefetch = usePrefetchShipmentDetail();

  return (
    <BatchListPage
      title="출고"
      subtitle="출고 배치를 관리합니다."
      newLabel="새 출고"
      newPath="/shipments/new"
      emptyIcon={<Truck className="h-12 w-12 mx-auto mb-3 text-gray-300" />}
      emptyTitle="등록된 출고 배치가 없습니다."
      emptySubtitle="새 출고를 등록해보세요."
      items={batches}
      isLoading={isLoading}
      deleteMutation={deleteBatch}
      deleteDialogTitle="출고 배치 삭제"
      deleteDialogDescription="출고 배치를 삭제하시겠습니까?"
      deleteSuccessMessage="출고 배치가 삭제되었습니다."
      deleteErrorMessage="출고 배치 삭제에 실패했습니다."
      extraColumns={[
        {
          header: '주문 수',
          align: 'right',
          render: (batch) => batch.orderCount ?? '-',
        },
      ]}
      basePath="/shipments"
      onRowHover={(id) => prefetch(id)}
    />
  );
}
