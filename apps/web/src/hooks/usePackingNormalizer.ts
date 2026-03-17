import { useMemo } from 'react';
import type { PackingRecommendation } from '@wms/types';

export interface PackingCalculationResult {
  boxes: {
    box: { id: string; name: string; width: number; length: number; height: number };
    count: number;
    packedSKUs: { skuId: string; name?: string; quantity: number }[];
  }[];
  unpackedItems: { skuId: string; name?: string; quantity: number; reason?: string }[];
  totalCBM: number;
  totalEfficiency: number;
}

export interface NormalizedBoxGroup {
  box: { id: string; name: string; width: number; length: number; height: number };
  count: number;
  totalCBM: number;
  efficiency: number;
  shipments: {
    groupLabel: string;
    count: number;
    packedSKUs: { skuId: string; name?: string; quantity: number }[];
  }[];
}

export const usePackingNormalizer = (
  result: PackingRecommendation | PackingCalculationResult | null,
) => {
  const normalizedBoxes = useMemo((): NormalizedBoxGroup[] => {
    if (!result) return [];

    const hasGroups = 'groups' in result && Array.isArray((result as PackingRecommendation).groups);

    if (hasGroups) {
      const rec = result as PackingRecommendation;
      const boxMap = new Map<string, NormalizedBoxGroup>();

      for (const group of rec.groups) {
        for (const boxGroup of group.boxes) {
          const boxId = boxGroup.box.id;
          const boxCBM = (boxGroup.box.width * boxGroup.box.length * boxGroup.box.height) / 1_000_000;

          if (!boxMap.has(boxId)) {
            boxMap.set(boxId, {
              box: boxGroup.box,
              count: boxGroup.count,
              totalCBM: boxCBM * boxGroup.count,
              efficiency: group.totalEfficiency,
              shipments: [],
            });
          } else {
            const existing = boxMap.get(boxId)!;
            existing.count += boxGroup.count;
            existing.totalCBM += boxCBM * boxGroup.count;
          }

          boxMap.get(boxId)!.shipments.push({
            groupLabel: group.groupLabel,
            count: boxGroup.count,
            packedSKUs: boxGroup.packedSKUs,
          });
        }
      }

      return Array.from(boxMap.values());
    } else {
      const calc = result as PackingCalculationResult;
      return calc.boxes.map((boxGroup) => {
        const boxCBM = (boxGroup.box.width * boxGroup.box.length * boxGroup.box.height) / 1_000_000;
        return {
          box: boxGroup.box,
          count: boxGroup.count,
          totalCBM: boxCBM * boxGroup.count,
          efficiency: calc.totalEfficiency,
          shipments: [
            {
              groupLabel: 'All Items',
              count: boxGroup.count,
              packedSKUs: boxGroup.packedSKUs,
            },
          ],
        };
      });
    }
  }, [result]);

  const unpackedItems = useMemo(() => {
    if (!result) return [];

    if ('unpackedItems' in result && result.unpackedItems) {
      return result.unpackedItems;
    }
    return [];
  }, [result]);

  return { normalizedBoxes, unpackedItems };
};
