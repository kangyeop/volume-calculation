import { Box, SKU, PackingRecommendation } from '@wms/types';

/**
 * Checks if an SKU can fit into a box based on dimensions (L, W, H).
 * Heuristic: Sort SKU dimensions and Box dimensions descending and compare.
 */
export function canSkuFitInBox(sku: SKU, box: Box): boolean {
  const skuDims = [sku.width, sku.length, sku.height].sort((a, b) => b - a);
  const boxDims = [box.width, box.length, box.height].sort((a, b) => b - a);

  return skuDims[0] <= boxDims[0] &&
         skuDims[1] <= boxDims[1] &&
         skuDims[2] <= boxDims[2];
}

/**
 * Calculates packing recommendation based on volume and dimension constraints.
 * - Effective box capacity is 90% of total volume (10% void space).
 * - Tries to fit all in one box first.
 * - Otherwise, fills largest boxes and handles remainder.
 */
export function calculateVolumePacking(skus: SKU[], boxes: Box[]): PackingRecommendation {
  if (skus.length === 0) {
    return { boxes: [], totalCBM: 0, totalEfficiency: 0 };
  }

  const sortedBoxes = [...boxes].sort((a, b) => {
    const volA = a.width * a.length * a.height;
    const volB = b.width * b.length * b.height;
    return volB - volA; // Sort Large to Small
  });

  // Sort SKUs by volume descending to improve packing efficiency (First Fit Decreasing)
  const sortedSkus = [...skus].sort((a, b) => {
    const volA = a.width * a.length * a.height;
    const volB = b.width * b.length * b.height;
    return volB - volA;
  });

  // Check if every SKU fits in at least one box (checking both dimensions and effective volume).
  for (const sku of sortedSkus) {
    const skuVolume = sku.width * sku.length * sku.height;
    const fitsInAnyBox = sortedBoxes.some(box => {
      const boxVolume = box.width * box.length * box.height;
      const effectiveVolume = boxVolume * 0.9;
      return canSkuFitInBox(sku, box) && skuVolume <= effectiveVolume;
    });

    if (!fitsInAnyBox) {
       return { boxes: [], totalCBM: 0, totalEfficiency: 0 };
    }
  }

  const remainingSkus = sortedSkus.map(s => ({ ...s }));
  const resultBoxes: { box: Box; count: number; packedSKUs: { skuId: string; quantity: number }[] }[] = [];

  // Pre-calculate box stats for cost estimation
  const boxStats = boxes.map(b => {
    const vol = b.width * b.length * b.height;
    return {
      box: b,
      price: b.price || (vol / 100),
      vol: vol,
      effVol: vol * 0.9,
    };
  }).sort((a, b) => b.effVol - a.effVol); // Sort by capacity descending

  if (boxStats.length === 0) return { boxes: [], totalCBM: 0, totalEfficiency: 0 };

  const largestBox = boxStats[0];

  const estimateRemainingCost = (remVol: number, maxRemDim: number): number => {
    if (remVol <= 0.001) return 0;

    const capableBoxes = boxStats.filter(s =>
      Math.max(s.box.width, s.box.length, s.box.height) >= maxRemDim
    );

    if (capableBoxes.length === 0) return Infinity;

    let cheapestSingle = Infinity;
    let bestRatio = Infinity;
    let bestRatioBox = capableBoxes[0];

    for (const s of capableBoxes) {
      if (s.effVol >= remVol - 0.001) {
        cheapestSingle = Math.min(cheapestSingle, s.price);
      }
      const ratio = s.price / s.effVol;
      if (ratio < bestRatio) {
        bestRatio = ratio;
        bestRatioBox = s;
      }
    }

    const bulkCost = Math.ceil(remVol / bestRatioBox.effVol) * bestRatioBox.price;
    return Math.min(cheapestSingle, bulkCost);
  };

  while (remainingSkus.some(s => s.quantity > 0)) {
    const totalRemainingItemVolume = remainingSkus.reduce((sum, s) => sum + s.quantity * s.width * s.length * s.height, 0);

    let bestBox: Box | null = null;
    let bestPacked: { skuId: string; quantity: number }[] = [];
    let minEstimatedTotalCost = Infinity;
    let maxPackedVolume = -1;
    let maxBoxVolume = -1;

    for (const box of sortedBoxes) {
      const boxVolume = box.width * box.length * box.height;
      const effectiveVolume = boxVolume * 0.9;
      const price = box.price || (boxVolume / 100);

      let currentBoxPackedVolume = 0;
      const packedInThisBox: { skuId: string; quantity: number }[] = [];

      for (const sku of remainingSkus) {
        if (sku.quantity <= 0) continue;
        if (!canSkuFitInBox(sku, box)) continue;

        const skuUnitVolume = sku.width * sku.length * sku.height;
        const roomLeft = effectiveVolume - currentBoxPackedVolume;
        const maxCanFit = Math.floor(roomLeft / skuUnitVolume);
        const toPack = Math.min(sku.quantity, maxCanFit);

        if (toPack > 0) {
          packedInThisBox.push({ skuId: sku.id, quantity: toPack });
          currentBoxPackedVolume += toPack * skuUnitVolume;
        }
      }

      if (packedInThisBox.length === 0) continue;

      // Calculate max dimension of remaining items (unpacked)
      let maxRemDim = 0;
      for (const s of remainingSkus) {
          const packedQty = packedInThisBox.find(p => p.skuId === s.id)?.quantity || 0;
          const remainingQty = s.quantity - packedQty;
          if (remainingQty > 0) {
             maxRemDim = Math.max(maxRemDim, s.width, s.length, s.height);
          }
      }

      const remainingItemVolume = totalRemainingItemVolume - currentBoxPackedVolume;
      const estimatedCostForRemainder = estimateRemainingCost(remainingItemVolume, maxRemDim);
      const estimatedTotalCost = price + estimatedCostForRemainder;

      // Primary: Minimize estimated total cost
      // Secondary: Maximize packed volume in current box
      // Tertiary: Maximize box volume (favor larger boxes if cost/packed volume are same for robustness)
      if (estimatedTotalCost < minEstimatedTotalCost - 0.000001) {
        minEstimatedTotalCost = estimatedTotalCost;
        maxPackedVolume = currentBoxPackedVolume;
        maxBoxVolume = boxVolume;
        bestBox = box;
        bestPacked = packedInThisBox;
      } else if (Math.abs(estimatedTotalCost - minEstimatedTotalCost) < 0.000001) {
        if (currentBoxPackedVolume > maxPackedVolume + 0.000001) {
          maxPackedVolume = currentBoxPackedVolume;
          maxBoxVolume = boxVolume;
          bestBox = box;
          bestPacked = packedInThisBox;
        } else if (Math.abs(currentBoxPackedVolume - maxPackedVolume) < 0.000001 && boxVolume > maxBoxVolume) {
          maxBoxVolume = boxVolume;
          bestBox = box;
          bestPacked = packedInThisBox;
        }
      }
    }

    if (!bestBox || bestPacked.length === 0) {
      break;
    }

    if (!bestBox || bestPacked.length === 0) {
      // If we can't fit any SKU in any box but there are still SKUs (should not happen due to check above)
      break;
    }

    // Update remaining quantities
    for (const p of bestPacked) {
      const sku = remainingSkus.find(s => s.id === p.skuId);
      if (sku) sku.quantity -= p.quantity;
    }

    // Add to result or group if same box and same contents
    const existing = resultBoxes.find(rb =>
      rb.box.id === bestBox!.id &&
      rb.packedSKUs.length === bestPacked.length &&
      rb.packedSKUs.every((p, i) => p.skuId === bestPacked[i].skuId && p.quantity === bestPacked[i].quantity)
    );

    if (existing) {
      existing.count++;
    } else {
      resultBoxes.push({
        box: bestBox,
        count: 1,
        packedSKUs: bestPacked
      });
    }
  }

  let totalBoxVolume = 0;
  let totalItemVolume = 0;

  resultBoxes.forEach(rb => {
    totalBoxVolume += (rb.box.width * rb.box.length * rb.box.height) * rb.count;
    rb.packedSKUs.forEach(p => {
      const originalSku = skus.find(s => s.id === p.skuId);
      if (originalSku) {
        totalItemVolume += (originalSku.width * originalSku.length * originalSku.height) * p.quantity * rb.count;
      }
    });
  });

  const totalCBM = totalBoxVolume / 1000000;

  return {
    boxes: resultBoxes,
    totalCBM,
    totalEfficiency: totalBoxVolume > 0 ? (totalItemVolume / totalBoxVolume) : 0
  };
}
