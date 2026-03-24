import { SKU, Box, BoxSortStrategy, PackingCalculationResult, PackedBox3D, PackingResult3D } from '@/types';

const EFFICIENCY_THRESHOLD = 0.9;
const BOX_MARGIN = 2;

interface ExpandedItem {
  skuId: string;
  width: number;
  length: number;
  height: number;
  volume: number;
}

function getOrientations(w: number, l: number, h: number): [number, number, number][] {
  if (w === l) return [[w, l, h]];
  return [[w, l, h], [l, w, h]];
}

function expandItems(skus: SKU[]): ExpandedItem[] {
  const items: ExpandedItem[] = [];
  for (const sku of skus) {
    for (let i = 0; i < sku.quantity; i++) {
      items.push({
        skuId: sku.id,
        width: sku.width,
        length: sku.length,
        height: sku.height,
        volume: sku.width * sku.length * sku.height,
      });
    }
  }
  return items.sort((a, b) => b.volume - a.volume);
}

function canItemFitInBox(item: ExpandedItem, box: Box): boolean {
  if (item.height > box.height) return false;
  const itemMin = Math.min(item.width, item.length);
  const itemMax = Math.max(item.width, item.length);
  const boxMin = Math.min(box.width, box.length);
  const boxMax = Math.max(box.width, box.length);
  return itemMin <= boxMin && itemMax <= boxMax;
}

function tryPackInOrientation(
  items: ExpandedItem[],
  boxW: number,
  boxL: number,
  boxH: number,
): boolean {
  let layerY = 0;
  let layerHeight = 0;
  let rowZ = 0;
  let rowDepth = 0;
  let currentX = 0;

  for (const item of items) {
    const orientations = getOrientations(item.width, item.length, item.height);
    let placed = false;

    for (const [w, l, h] of orientations) {
      if (currentX + w <= boxW && rowZ + l <= boxL && layerY + h <= boxH) {
        currentX += w;
        rowDepth = Math.max(rowDepth, l);
        layerHeight = Math.max(layerHeight, h);
        placed = true;
        break;
      }
    }

    if (!placed) {
      rowZ += rowDepth;
      currentX = 0;
      rowDepth = 0;

      for (const [w, l, h] of orientations) {
        if (w <= boxW && rowZ + l <= boxL && layerY + h <= boxH) {
          currentX = w;
          rowDepth = l;
          layerHeight = Math.max(layerHeight, h);
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      layerY += layerHeight;
      layerHeight = 0;
      rowZ = 0;
      currentX = 0;
      rowDepth = 0;

      for (const [w, l, h] of orientations) {
        if (w <= boxW && l <= boxL && layerY + h <= boxH) {
          currentX = w;
          rowDepth = l;
          layerHeight = h;
          placed = true;
          break;
        }
      }
    }

    if (!placed) return false;
  }

  return true;
}

function tryPackWithLayers(items: ExpandedItem[], box: Box): boolean {
  const dims = [box.width, box.length, box.height];
  const boxOrientations: [number, number, number][] = [
    [dims[0], dims[1], dims[2]],
    [dims[0], dims[2], dims[1]],
    [dims[1], dims[2], dims[0]],
  ];

  for (const [bw, bl, bh] of boxOrientations) {
    if (tryPackInOrientation(items, bw, bl, bh)) return true;
  }
  return false;
}

function sortBoxes(boxes: Box[], strategy: BoxSortStrategy): Box[] {
  return [...boxes].sort((a, b) => {
    if (strategy === 'longest-side') {
      const maxA = Math.max(a.width, a.length, a.height);
      const maxB = Math.max(b.width, b.length, b.height);
      if (maxA !== maxB) return maxA - maxB;
    }
    const volA = a.width * a.length * a.height;
    const volB = b.width * b.length * b.height;
    return volA - volB;
  });
}

export function calculatePacking(skus: SKU[], boxes: Box[], strategy: BoxSortStrategy = 'volume'): PackingCalculationResult {
  if (!boxes || boxes.length === 0) {
    const unassignedBox: Box = { id: 'unassigned', name: '미지정', width: 0, length: 0, height: 0, boxGroupId: '' };
    return {
      boxes: [{
        box: unassignedBox,
        count: 1,
        packedSKUs: skus.map((sku) => ({ skuId: sku.id, quantity: sku.quantity })),
      }],
      unpackedItems: [],
      totalCBM: 0,
      totalEfficiency: 0,
    };
  }

  const sortedBoxes = sortBoxes(boxes, strategy);

  const expandedItems = expandItems(skus);
  const totalItemVolume = expandedItems.reduce((sum, item) => sum + item.volume, 0);

  const recommendedBoxes: PackingCalculationResult['boxes'] = [];
  const unpackedItems: PackingCalculationResult['unpackedItems'] = [];
  let totalCBM = 0;
  let totalUsedVolume = 0;
  let totalAvailableVolume = 0;

  let selectedBox: Box | null = null;
  for (const box of sortedBoxes) {
    const boxVolume = box.width * box.length * box.height;
    if (totalItemVolume > boxVolume * EFFICIENCY_THRESHOLD) continue;

    const effectiveBox: Box = {
      ...box,
      width: box.width - BOX_MARGIN,
      length: box.length - BOX_MARGIN,
      height: box.height - BOX_MARGIN,
    };

    if (!expandedItems.every((item) => canItemFitInBox(item, effectiveBox))) continue;

    if (tryPackWithLayers(expandedItems, effectiveBox)) {
      selectedBox = box;
      break;
    }
  }

  if (selectedBox) {
    const boxVol = selectedBox.width * selectedBox.length * selectedBox.height;
    totalCBM += boxVol / 1_000_000;
    totalUsedVolume += totalItemVolume;
    totalAvailableVolume += boxVol;

    recommendedBoxes.push({
      box: selectedBox,
      count: 1,
      packedSKUs: skus.map((sku) => ({ skuId: sku.id, quantity: sku.quantity })),
    });
  } else {
    const unassignedBox: Box = {
      id: 'unassigned',
      name: '미지정',
      width: 0,
      length: 0,
      height: 0,
      boxGroupId: '',
    };

    totalUsedVolume += totalItemVolume;

    recommendedBoxes.push({
      box: unassignedBox,
      count: 1,
      packedSKUs: skus.map((sku) => ({ skuId: sku.id, quantity: sku.quantity })),
    });
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
  strategy: BoxSortStrategy = 'volume',
): PackingResult3D {
  const result = calculatePacking(items, boxes, strategy);

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

      const boxCBM = boxVolume / 1_000_000;

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
