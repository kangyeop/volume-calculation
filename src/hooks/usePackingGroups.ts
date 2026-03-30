import { useMemo, useCallback } from 'react';
import type { NormalizedBoxGroup } from '@/hooks/usePackingNormalizer';
import type { ProductGroup } from '@/lib/api';
import type { Box, BoxGroup } from '@/types';

export interface DetailView {
  type: 'box';
  boxId: string;
  groupId?: string | null;
}

export interface FilteredBoxGroup extends NormalizedBoxGroup {
  count: number;
  totalCBM: number;
}

export interface GroupSection {
  group: ProductGroup;
  filteredBoxes: FilteredBoxGroup[];
  stats: { totalBoxes: number; totalCBM: number; avgEfficiency: number };
}

export function usePackingGroups({
  normalizedBoxes,
  productGroups,
  boxGroupList,
  searchParams,
  router,
}: {
  normalizedBoxes: NormalizedBoxGroup[];
  productGroups: ProductGroup[];
  boxGroupList: BoxGroup[];
  searchParams: URLSearchParams | { get: (key: string) => string | null; toString: () => string };
  router: { push: (url: string) => void };
}) {
  const { skuDimensionsMap, skuToGroupId } = useMemo(() => {
    const dims = new Map<string, { width: number; length: number; height: number; name: string }>();
    const groups = new Map<string, string>();
    for (const group of productGroups) {
      for (const product of group.products ?? []) {
        dims.set(product.id, {
          width: product.width,
          length: product.length,
          height: product.height,
          name: product.name,
        });
        groups.set(product.id, group.id);
        groups.set(product.sku, group.id);
      }
    }
    return { skuDimensionsMap: dims, skuToGroupId: groups };
  }, [productGroups]);

  const activeGroupIds = useMemo(() => {
    const ids = new Set<string>();
    for (const boxGroup of normalizedBoxes) {
      for (const shipment of boxGroup.shipments) {
        for (const sku of shipment.packedSKUs) {
          const gid = skuToGroupId.get(sku.skuId);
          if (gid) ids.add(gid);
        }
      }
    }
    return ids;
  }, [normalizedBoxes, skuToGroupId]);

  const visibleGroups = productGroups.filter((g) => activeGroupIds.has(g.id));

  const getShipmentGroupId = useCallback(
    (packedSKUs: { skuId: string }[]): string | null => {
      const groupIds = new Set<string>();
      for (const sku of packedSKUs) {
        const gid = skuToGroupId.get(sku.skuId);
        if (gid) groupIds.add(gid);
      }
      if (groupIds.size === 1) return [...groupIds][0];
      return null;
    },
    [skuToGroupId],
  );

  const buildBoxGroups = useCallback(
    (
      boxes: NormalizedBoxGroup[],
      shipmentFilter: (groupId: string | null) => boolean,
    ): FilteredBoxGroup[] => {
      return boxes
        .map((bg) => {
          const shipments = bg.shipments.filter((s) =>
            shipmentFilter(getShipmentGroupId(s.packedSKUs)),
          );
          const count = shipments.reduce((sum, s) => sum + s.count, 0);
          const boxCBM = (bg.box.width * bg.box.length * bg.box.height) / 1_000_000_000;
          return { ...bg, shipments, count, totalCBM: boxCBM * count };
        })
        .filter((bg) => bg.shipments.length > 0);
    },
    [getShipmentGroupId],
  );

  const groupSections: GroupSection[] = useMemo(() => {
    return visibleGroups.map((group) => {
      const filtered = buildBoxGroups(normalizedBoxes, (gid) => gid === group.id);
      const totalBoxes = filtered.reduce((sum, bg) => sum + bg.count, 0);
      const totalCBM = filtered.reduce((sum, bg) => sum + bg.totalCBM, 0);
      const avgEfficiency = filtered.length
        ? filtered.reduce((sum, bg) => sum + bg.efficiency, 0) / filtered.length
        : 0;
      return { group, filteredBoxes: filtered, stats: { totalBoxes, totalCBM, avgEfficiency } };
    });
  }, [visibleGroups, normalizedBoxes, buildBoxGroups]);

  const unclassifiedBoxes = useMemo(() => {
    return buildBoxGroups(normalizedBoxes, (gid) => gid === null);
  }, [normalizedBoxes, buildBoxGroups]);

  const detailBoxId = searchParams.get('boxId');
  const detailGroupId = searchParams.get('groupId');
  const detailView = useMemo<DetailView | null>(() => {
    if (!detailBoxId) return null;
    return {
      type: 'box',
      boxId: detailBoxId,
      groupId: detailGroupId === 'unclassified' ? null : detailGroupId ?? undefined,
    };
  }, [detailBoxId, detailGroupId]);

  const setDetailView = useCallback(
    (view: DetailView | null) => {
      const p = new URLSearchParams(searchParams.toString());
      if (view) {
        p.set('boxId', view.boxId);
        if (view.groupId === null) {
          p.set('groupId', 'unclassified');
        } else if (view.groupId !== undefined) {
          p.set('groupId', view.groupId);
        } else {
          p.delete('groupId');
        }
      } else {
        p.delete('boxId');
        p.delete('groupId');
      }
      router.push(`?${p.toString()}`);
    },
    [searchParams, router],
  );

  const detailBoxes = useMemo(() => {
    if (!detailView) return [] as FilteredBoxGroup[];
    const { boxId, groupId } = detailView;
    if (groupId === undefined) {
      return normalizedBoxes.filter((bg) => bg.box.id === boxId) as FilteredBoxGroup[];
    }
    if (groupId === null) {
      return unclassifiedBoxes.filter((bg) => bg.box.id === boxId);
    }
    const section = groupSections.find((s) => s.group.id === groupId);
    return section?.filteredBoxes.filter((bg) => bg.box.id === boxId) ?? [];
  }, [detailView, normalizedBoxes, unclassifiedBoxes, groupSections]);

  const detailTitle = useMemo(() => {
    if (!detailView) return '';
    const bg = normalizedBoxes.find((b) => b.box.id === detailView.boxId);
    const boxName = bg?.box.name ?? detailView.boxId;
    if (detailView.groupId === undefined) return boxName;
    if (detailView.groupId === null) return `미분류 - ${boxName}`;
    const section = groupSections.find((s) => s.group.id === detailView.groupId);
    return `${section?.group.name ?? ''} - ${boxName}`;
  }, [detailView, normalizedBoxes, groupSections]);

  const availableBoxes: Box[] = useMemo(() => {
    return boxGroupList.flatMap((g) => g.boxes ?? []);
  }, [boxGroupList]);

  return {
    skuDimensionsMap,
    skuToGroupId,
    visibleGroups,
    groupSections,
    unclassifiedBoxes,
    detailView,
    setDetailView,
    detailBoxes,
    detailTitle,
    availableBoxes,
    getShipmentGroupId,
    buildBoxGroups,
  };
}
