import { SKU, Box, PackingGroup } from '@wms/types';

const EFFICIENCY_THRESHOLD = 0.9;

type PackingCalculationResult = Omit<PackingGroup, 'groupLabel'>;

export function calculatePacking(skus: SKU[], boxes: Box[]): PackingCalculationResult {
  // Check if we have boxes to pack into
  if (!boxes || boxes.length === 0) {
    return {
      boxes: [],
      totalCBM: 0,
      totalEfficiency: 0,
    };
  }

  // Sort boxes by volume (Ascending: Box 1 -> Box 5)
  const sortedBoxes = [...boxes].sort((a, b) => {
    const volA = a.width * a.length * a.height;
    const volB = b.width * b.length * b.height;
    return volA - volB;
  });

  const largestBox = sortedBoxes[sortedBoxes.length - 1];

  // Flat list of items to pack, sorted by volume (descending)
  let itemsToPack: { skuId: string; volume: number }[] = [];
  for (const sku of skus) {
    const volume = sku.width * sku.length * sku.height;
    for (let i = 0; i < sku.quantity; i++) {
      itemsToPack.push({ skuId: sku.id, volume });
    }
  }
  itemsToPack.sort((a, b) => b.volume - a.volume);

  const recommendedBoxes: PackingCalculationResult['boxes'] = [];
  let totalCBM = 0;
  let totalUsedVolume = 0;
  let totalAvailableVolume = 0;

  while (itemsToPack.length > 0) {
    // Check if remaining items fit into any single box (checking from smallest to largest)
    const currentTotalVolume = itemsToPack.reduce((sum, item) => sum + item.volume, 0);
    let selectedSingleBox: Box | null = null;

    for (const box of sortedBoxes) {
      const boxVolume = box.width * box.length * box.height;
      const effectiveCapacity = boxVolume * EFFICIENCY_THRESHOLD;

      if (currentTotalVolume <= effectiveCapacity) {
        selectedSingleBox = box;
        break;
      }
    }

    if (selectedSingleBox) {
      // All remaining items fit into this box
      const boxVol = selectedSingleBox.width * selectedSingleBox.length * selectedSingleBox.height;
      totalCBM += boxVol / 1000000; // cm3 to m3
      totalUsedVolume += currentTotalVolume;
      totalAvailableVolume += boxVol;

      // Group packed items for recommendation
      const skuMap = new Map<string, number>();
      for (const item of itemsToPack) {
        skuMap.set(item.skuId, (skuMap.get(item.skuId) || 0) + 1);
      }

      recommendedBoxes.push({
        box: selectedSingleBox,
        count: 1,
        packedSKUs: Array.from(skuMap.entries()).map(([skuId, quantity]) => ({ skuId, quantity })),
      });

      // All items packed
      itemsToPack = [];
    } else {
      // Items do not fit in any single box (even the largest).
      // We must split. Strategy: Fill the largest box (Box 5) and recurse.
      const boxVolume = largestBox.width * largestBox.length * largestBox.height;
      const effectiveCapacity = boxVolume * EFFICIENCY_THRESHOLD;

      let currentBoxUsedVolume = 0;
      const packedInThisBox: { skuId: string; volume: number }[] = [];
      const remainingItems: { skuId: string; volume: number }[] = [];

      for (const item of itemsToPack) {
        if (currentBoxUsedVolume + item.volume <= effectiveCapacity) {
          currentBoxUsedVolume += item.volume;
          packedInThisBox.push(item);
        } else {
          remainingItems.push(item);
        }
      }

       // Safety check: if largest item is bigger than largest box
      if (packedInThisBox.length === 0 && itemsToPack.length > 0) {
        console.warn(`Item ${itemsToPack[0].skuId} is too large for the largest box`);
        // Force pack it or skip it to avoid infinite loop.
        // For this requirement, we assume items fit in boxes reasonably.
        // Let's skip it from calculation but log it.
        remainingItems.shift();
         // In production, we might want to return an error or special container.
      } else {
          totalCBM += boxVolume / 1000000;
          totalUsedVolume += currentBoxUsedVolume;
          totalAvailableVolume += boxVolume;

          const skuMap = new Map<string, number>();
          for (const item of packedInThisBox) {
             skuMap.set(item.skuId, (skuMap.get(item.skuId) || 0) + 1);
          }

          recommendedBoxes.push({
            box: largestBox,
            count: 1,
            packedSKUs: Array.from(skuMap.entries()).map(([skuId, quantity]) => ({ skuId, quantity })),
          });

          itemsToPack = remainingItems;
      }
    }
  }

  // Merge identical boxes in recommendation
  const mergedBoxes: PackingCalculationResult['boxes'] = [];
  for (const rb of recommendedBoxes) {
    const existing = mergedBoxes.find(b => b.box.id === rb.box.id);
    if (existing) {
      existing.count += 1;
      // Merge packedSKUs
      for (const ps of rb.packedSKUs) {
        const existingSKU = existing.packedSKUs.find(s => s.skuId === ps.skuId);
        if (existingSKU) {
          existingSKU.quantity += ps.quantity;
        } else {
          existing.packedSKUs.push(ps);
        }
      }
    } else {
      mergedBoxes.push(rb);
    }
  }

  return {
    boxes: mergedBoxes,
    totalCBM,
    totalEfficiency: totalAvailableVolume > 0 ? totalUsedVolume / totalAvailableVolume : 0,
  };
}
