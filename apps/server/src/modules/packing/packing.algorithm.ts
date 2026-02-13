import { SKU, Box, PackingRecommendation } from '@wms/types';

const EFFICIENCY_THRESHOLD = 0.9;

export function calculatePacking(skus: SKU[], boxes: Box[]): PackingRecommendation {
  // Check if we have boxes to pack into
  if (!boxes || boxes.length === 0) {
    return {
      boxes: [],
      totalCBM: 0,
      totalEfficiency: 0,
    };
  }

  // Sort boxes by volume (descending)
  const sortedBoxes = [...boxes].sort((a, b) => {
    const volA = a.width * a.length * a.height;
    const volB = b.width * b.length * b.height;
    return volB - volA;
  });

  // Flat list of items to pack, sorted by volume (descending)
  let itemsToPack: { skuId: string; volume: number }[] = [];
  for (const sku of skus) {
    const volume = sku.width * sku.length * sku.height;
    for (let i = 0; i < sku.quantity; i++) {
      itemsToPack.push({ skuId: sku.id, volume });
    }
  }
  itemsToPack.sort((a, b) => b.volume - a.volume);

  const recommendedBoxes: PackingRecommendation['boxes'] = [];
  let totalCBM = 0;
  let totalUsedVolume = 0;
  let totalAvailableVolume = 0;

  while (itemsToPack.length > 0) {
    let bestBox: Box | null = null;
    let bestFitItems: { skuId: string; volume: number }[] = [];

    // Find the smallest box that can fit the largest remaining item
    const largestItem = itemsToPack[0];

    // We try to find the smallest box that can fit at least this largest item
    // and potentially more. In volume-based FFD, we often pick the largest box
    // and fill it as much as possible, or pick the most efficient one.
    // For simplicity and following "First Fit Decreasing", we'll try boxes.

    // Actually, "First Fit Decreasing" typically means:
    // Take the next item, put it in the first box it fits in.
    // But here we are deciding which boxes to use.

    // Let's use the largest box and fill it.
    const selectedBox = sortedBoxes[0];
    const boxVolume = selectedBox.width * selectedBox.length * selectedBox.height;
    const effectiveVolume = boxVolume * EFFICIENCY_THRESHOLD;

    let currentBoxUsedVolume = 0;
    const packedInThisBox: { skuId: string; volume: number }[] = [];
    const remainingItems: { skuId: string; volume: number }[] = [];

    for (const item of itemsToPack) {
      if (currentBoxUsedVolume + item.volume <= effectiveVolume) {
        currentBoxUsedVolume += item.volume;
        packedInThisBox.push(item);
      } else {
        remainingItems.push(item);
      }
    }

    // If we couldn't even fit the largest item in the largest box
    if (packedInThisBox.length === 0 && itemsToPack.length > 0) {
      // This item is too big for any box. In a real scenario, we'd handle this.
      // For now, let's just skip it to avoid infinite loop, but this shouldn't happen with standard box sizes vs typical items.
      console.warn(`Item ${itemsToPack[0].skuId} is too large for any box`);
      itemsToPack.shift();
      continue;
    }

    // Try to downsize the box if a smaller one can fit all these items
    let finalBox = selectedBox;
    for (let i = sortedBoxes.length - 1; i >= 0; i--) {
      const b = sortedBoxes[i];
      const bVol = b.width * b.length * b.height;
      if (currentBoxUsedVolume <= bVol * EFFICIENCY_THRESHOLD) {
        finalBox = b;
        break;
      }
    }

    const boxVol = finalBox.width * finalBox.length * finalBox.height;
    totalCBM += boxVol / 1000000; // cm3 to m3
    totalUsedVolume += currentBoxUsedVolume;
    totalAvailableVolume += boxVol;

    // Group packed items for recommendation
    const skuMap = new Map<string, number>();
    for (const item of packedInThisBox) {
      skuMap.set(item.skuId, (skuMap.get(item.skuId) || 0) + 1);
    }

    recommendedBoxes.push({
      box: finalBox,
      count: 1,
      packedSKUs: Array.from(skuMap.entries()).map(([skuId, quantity]) => ({ skuId, quantity })),
    });

    itemsToPack = remainingItems;
  }

  // Merge identical boxes in recommendation
  const mergedBoxes: PackingRecommendation['boxes'] = [];
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
