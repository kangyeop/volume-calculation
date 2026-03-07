import { SKU, Box, PackingCalculationResult, PackedBox3D, PackingResult3D } from '@wms/types';

const EFFICIENCY_THRESHOLD = 0.9;

export function calculatePacking(skus: SKU[], boxes: Box[]): PackingCalculationResult {
  // Check if we have boxes to pack into
  if (!boxes || boxes.length === 0) {
    const unpackedItems: PackingCalculationResult['unpackedItems'] = [];
    for (const sku of skus) {
      unpackedItems.push({
        skuId: sku.id,
        quantity: sku.quantity,
        reason: 'Too large for any box',
      });
    }
    return {
      boxes: [],
      unpackedItems,
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

  // Create a map for quick SKU details lookup (needed for dimension checks)
  const skuDetailsMap = new Map<string, SKU>();
  for (const sku of skus) {
    skuDetailsMap.set(sku.id, sku);
  }

  // Helper to check if item physically fits in box (allowing rotation)
  const doesItemFit = (skuId: string, box: Box): boolean => {
    const sku = skuDetailsMap.get(skuId);
    if (!sku) return false;

    // Sort dimensions to simulate "best fit" rotation
    // We sort both item and box dimensions ascending: [min, mid, max]
    // If item[0] <= box[0] && item[1] <= box[1] && item[2] <= box[2], it fits.
    const itemDims = [sku.width, sku.length, sku.height].sort((a, b) => a - b);
    const boxDims = [box.width, box.length, box.height].sort((a, b) => a - b);

    return itemDims[0] <= boxDims[0] && itemDims[1] <= boxDims[1] && itemDims[2] <= boxDims[2];
  };

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
  const unpackedItems: PackingCalculationResult['unpackedItems'] = [];
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

      // Check 1: Volume fit
      if (currentTotalVolume <= effectiveCapacity) {
        // Check 2: Physical dimension fit for ALL items
        const allFitPhysically = itemsToPack.every((item) => doesItemFit(item.skuId, box));

        if (allFitPhysically) {
          selectedSingleBox = box;
          break;
        }
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
        packedSKUs: Array.from(skuMap.entries()).map(([skuId, quantity]) => ({
          skuId,
          quantity,
        })),
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
        // Check if individual item fits in the box physically
        const fitsPhysically = doesItemFit(item.skuId, largestBox);

        if (fitsPhysically && currentBoxUsedVolume + item.volume <= effectiveCapacity) {
          currentBoxUsedVolume += item.volume;
          packedInThisBox.push(item);
        } else {
          remainingItems.push(item);
        }
      }

      // Safety check: if no items fit in the largest box
      if (packedInThisBox.length === 0 && itemsToPack.length > 0) {
        const failedItem = itemsToPack[0];
        console.warn(
          `Item ${failedItem.skuId} is too large for the largest box (Volume or Dimensions)`,
        );

        // Add to unpacked items
        const existingUnpacked = unpackedItems.find((i) => i.skuId === failedItem.skuId);
        if (existingUnpacked) {
          existingUnpacked.quantity += 1;
        } else {
          unpackedItems.push({
            skuId: failedItem.skuId,
            quantity: 1,
            reason: 'Too large for any box',
          });
        }

        // Skip this item as it cannot be packed in any available box
        // We remove the first item from remainingItems (which is effectively itemsToPack since nothing was packed)
        remainingItems.shift();
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
          packedSKUs: Array.from(skuMap.entries()).map(([skuId, quantity]) => ({
            skuId,
            quantity,
          })),
        });
      }

      // Update for next iteration
      itemsToPack = remainingItems;
    }
  }

  return {
    boxes: recommendedBoxes,
    unpackedItems,
    totalCBM,
    totalEfficiency: totalAvailableVolume > 0 ? totalUsedVolume / totalAvailableVolume : 0,
  };
}

export function calculateOrderPackingUnified(
  orderId: string,
  items: SKU[],
  boxes: Box[],
  groupLabel?: string,
): PackingResult3D {
  const result = calculatePacking(items, boxes);

  const skuDetailsMap = new Map<string, SKU>();
  for (const sku of items) {
    skuDetailsMap.set(sku.id, sku);
  }

  const packedBoxes: PackedBox3D[] = [];
  let boxNumber = 1;

  for (const boxResult of result.boxes) {
    for (let i = 0; i < boxResult.count; i++) {
      const boxVolume = boxResult.box.width * boxResult.box.length * boxResult.box.height;

      let usedVolume = 0;
      for (const packedSku of boxResult.packedSKUs) {
        const sku = skuDetailsMap.get(packedSku.skuId);
        if (sku) {
          usedVolume += sku.width * sku.length * sku.height * packedSku.quantity;
        }
      }

      const boxCBM = boxVolume / 1000000;

      packedBoxes.push({
        boxId: boxResult.box.id,
        boxName: boxResult.box.name,
        boxNumber,
        width: boxResult.box.width,
        length: boxResult.box.length,
        height: boxResult.box.height,
        items: boxResult.packedSKUs.map((sku) => ({
          skuId: sku.skuId,
          name: skuDetailsMap.get(sku.skuId)?.name,
          quantity: sku.quantity,
          placements: [],
        })),
        totalCBM: boxCBM,
        efficiency: usedVolume / boxVolume,
        usedVolume,
        availableVolume: boxVolume,
      });
      boxNumber++;
    }
  }

  return {
    orderId,
    groupLabel,
    boxes: packedBoxes,
    unpackedItems: result.unpackedItems.map((item) => ({
      skuId: item.skuId,
      name: skuDetailsMap.get(item.skuId)?.name,
      quantity: item.quantity,
      reason: item.reason || 'Could not pack',
    })),
    totalCBM: result.totalCBM,
    totalEfficiency: result.totalEfficiency,
  };
}
