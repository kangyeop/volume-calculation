'use client';

import { Container } from 'lucide-react';
import { useGlobalShipments, useDeleteGlobalShipment } from '@/hooks/queries';
import { BatchListPage } from '@/components/batch/BatchListPage';

export default function GlobalShipmentList() {
  const { data: batches = [], isLoading } = useGlobalShipments();
  const deleteBatch = useDeleteGlobalShipment();

  return (
    <BatchListPage
      title="글로벌 출고"
      subtitle="글로벌 출고 배치를 관리합니다."
      newLabel="새 글로벌 출고"
      newPath="/global/shipments/new"
      emptyIcon={<Container className="h-12 w-12 mx-auto mb-3 text-gray-300" />}
      emptyTitle="등록된 글로벌 출고 배치가 없습니다."
      emptySubtitle="새 글로벌 출고를 등록해보세요."
      items={batches}
      isLoading={isLoading}
      deleteMutation={deleteBatch}
      deleteDialogTitle="글로벌 출고 배치 삭제"
      deleteDialogDescription="글로벌 출고 배치를 삭제하시겠습니까?"
      deleteSuccessMessage="글로벌 출고 배치가 삭제되었습니다."
      deleteErrorMessage="글로벌 출고 배치 삭제에 실패했습니다."
      extraColumns={[
        {
          header: '주문 수',
          align: 'right',
          render: (batch) => batch.orderCount ?? '-',
        },
      ]}
      basePath="/global/shipments"
    />
  );
}
