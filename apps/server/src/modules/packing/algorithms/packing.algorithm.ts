import { SKU, Box, PackingCalculationResult, PackedBox3D, PackingResult3D } from '@wms/types';

const EFFICIENCY_THRESHOLD = 0.9;

export function calculatePacking(skus: SKU[], boxes: Box[]): PackingCalculationResult {
  if (!boxes || boxes.length === 0) {
    return {
      boxes: [],
      unpackedItems: skus.map((sku) => ({
        skuId: sku.id,
        quantity: sku.quantity,
        reason: 'Too large for any box',
      })),
      totalCBM: 0,
      totalEfficiency: 0,
    };
  }

  const sortedBoxes = [...boxes].sort((a, b) => {
    const volA = a.width * a.length * a.height;
    const volB = b.width * b.length * b.height;
    return volA - volB;
  });

  const largestBox = sortedBoxes[sortedBoxes.length - 1];

  const skuDetailsMap = new Map<string, SKU>();
  for (const sku of skus) {
    skuDetailsMap.set(sku.id, sku);
  }

  const doesItemFit = (skuId: string, box: Box): boolean => {
    const sku = skuDetailsMap.get(skuId);
    if (!sku) return false;
    const itemDims = [sku.width, sku.length, sku.height].sort((a, b) => a - b);
    const boxDims = [box.width, box.length, box.height].sort((a, b) => a - b);
    return itemDims[0] <= boxDims[0] && itemDims[1] <= boxDims[1] && itemDims[2] <= boxDims[2];
  };

  let itemsToPack: { skuId: string; volume: number; quantity: number }[] = skus
    .map((sku) => ({
      skuId: sku.id,
      volume: sku.width * sku.length * sku.height,
      quantity: sku.quantity,
    }))
    .sort((a, b) => b.volume - a.volume);

  const recommendedBoxes: PackingCalculationResult['boxes'] = [];
  const unpackedItems: PackingCalculationResult['unpackedItems'] = [];
  let totalCBM = 0;
  let totalUsedVolume = 0;
  let totalAvailableVolume = 0;

  while (itemsToPack.length > 0) {
    const currentTotalVolume = itemsToPack.reduce((sum, item) => sum + item.volume * item.quantity, 0);
    let selectedSingleBox: Box | null = null;

    for (const box of sortedBoxes) {
      const boxVolume = box.width * box.length * box.height;
      const effectiveCapacity = boxVolume * EFFICIENCY_THRESHOLD;

      if (currentTotalVolume <= effectiveCapacity) {
        const allFitPhysically = itemsToPack.every((item) => doesItemFit(item.skuId, box));
        if (allFitPhysically) {
          selectedSingleBox = box;
          break;
        }
      }
    }

    if (selectedSingleBox) {
      const boxVol = selectedSingleBox.width * selectedSingleBox.length * selectedSingleBox.height;
      totalCBM += boxVol / 1000000000;
      totalUsedVolume += currentTotalVolume;
      totalAvailableVolume += boxVol;

      recommendedBoxes.push({
        box: selectedSingleBox,
        count: 1,
        packedSKUs: itemsToPack.map((item) => ({ skuId: item.skuId, quantity: item.quantity })),
      });

      itemsToPack = [];
    } else {
      const boxVolume = largestBox.width * largestBox.length * largestBox.height;
      const effectiveCapacity = boxVolume * EFFICIENCY_THRESHOLD;

      let currentBoxUsedVolume = 0;
      const packedInThisBox: { skuId: string; volume: number; quantity: number }[] = [];
      const remainingItems: { skuId: string; volume: number; quantity: number }[] = [];

      for (const item of itemsToPack) {
        const fitsPhysically = doesItemFit(item.skuId, largestBox);
        if (!fitsPhysically) {
          remainingItems.push(item);
          continue;
        }

        const spaceLeft = effectiveCapacity - currentBoxUsedVolume;
        const maxQtyByVolume = Math.floor(spaceLeft / item.volume);
        const qtyToPack = Math.min(item.quantity, maxQtyByVolume);

        if (qtyToPack > 0) {
          currentBoxUsedVolume += item.volume * qtyToPack;
          packedInThisBox.push({ skuId: item.skuId, volume: item.volume, quantity: qtyToPack });
          const leftover = item.quantity - qtyToPack;
          if (leftover > 0) {
            remainingItems.push({ skuId: item.skuId, volume: item.volume, quantity: leftover });
          }
        } else {
          remainingItems.push(item);
        }
      }

      if (packedInThisBox.length === 0 && itemsToPack.length > 0) {
        const failedItem = itemsToPack[0];
        console.warn(
          `Item ${failedItem.skuId} is too large for the largest box (Volume or Dimensions)`,
        );
        const existing = unpackedItems.find((i) => i.skuId === failedItem.skuId);
        if (existing) {
          existing.quantity += failedItem.quantity;
        } else {
          unpackedItems.push({
            skuId: failedItem.skuId,
            quantity: failedItem.quantity,
            reason: 'Too large for any box',
          });
        }
        remainingItems.shift();
      } else {
        totalCBM += boxVolume / 1000000000;
        totalUsedVolume += currentBoxUsedVolume;
        totalAvailableVolume += boxVolume;

        recommendedBoxes.push({
          box: largestBox,
          count: 1,
          packedSKUs: packedInThisBox.map((item) => ({ skuId: item.skuId, quantity: item.quantity })),
        });
      }

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

      const boxCBM = boxVolume / 1000000000;

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
