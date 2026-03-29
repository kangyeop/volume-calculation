'use client';

import { Calculator } from 'lucide-react';
import { useSettlements, useDeleteSettlement } from '@/hooks/queries';
import { BatchListPage } from '@/components/batch/BatchListPage';

export default function SettlementList() {
  const { data: settlements = [], isLoading } = useSettlements();
  const deleteSettlement = useDeleteSettlement();

  return (
    <BatchListPage
      title="정산"
      subtitle="정산 배치를 관리합니다."
      newLabel="새 정산"
      newPath="/settlements/new"
      emptyIcon={<Calculator className="h-12 w-12 mx-auto mb-3 text-gray-300" />}
      emptyTitle="등록된 정산이 없습니다."
      emptySubtitle="새 정산을 등록해보세요."
      items={settlements}
      isLoading={isLoading}
      deleteMutation={deleteSettlement}
      deleteDialogTitle="정산 삭제"
      deleteDialogDescription="정산을 삭제하시겠습니까? 관련된 주문 데이터도 함께 삭제됩니다."
      deleteSuccessMessage="정산이 삭제되었습니다."
      deleteErrorMessage="정산 삭제에 실패했습니다."
      basePath="/settlements"
    />
  );
}
