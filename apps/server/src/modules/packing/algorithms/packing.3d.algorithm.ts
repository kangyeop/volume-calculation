import {
  SKU,
  Box,
  Rotation,
  ItemPlacement,
  PackedBox3D,
  PackedItem3D,
  PackingResult3D,
} from '@wms/types';

const DECIMAL_PRECISION = 2;

interface PlacedItem {
  skuId: string;
  name: string;
  width: number;
  length: number;
  height: number;
  placement: ItemPlacement;
  volume: number;
}

function rotateItem(
  item: SKU,
  rotation: Rotation,
): { width: number; length: number; height: number } {
  switch (rotation) {
    case 'none':
      return { width: item.width, length: item.length, height: item.height };
    case '90':
      return { width: item.length, length: item.width, height: item.height };
    case '180':
      return { width: item.width, length: item.length, height: item.height };
    case '270':
      return { width: item.length, length: item.width, height: item.height };
    default:
      return { width: item.width, length: item.length, height: item.height };
  }
}

function hasCollision(
  pos1: { x: number; y: number; z: number },
  item1: { width: number; length: number; height: number },
  pos2: { x: number; y: number; z: number },
  item2: { width: number; length: number; height: number },
): boolean {
  return (
    pos1.x < pos2.x + item2.width &&
    pos1.x + item1.width > pos2.x &&
    pos1.y < pos2.y + item2.length &&
    pos1.y + item1.length > pos2.y &&
    pos1.z < pos2.z + item2.height &&
    pos1.z + item1.height > pos2.z
  );
}

function findValidPosition(
  item: SKU,
  box: Box,
  placedItems: PlacedItem[],
  rotations: Rotation[],
): { position: { x: number; y: number; z: number }; rotation: Rotation } | null {
  const stepSize = 0.1;

  for (const rotation of rotations) {
    const rotated = rotateItem(item, rotation);

    for (let z = 0; z <= box.height - rotated.height; z = Math.round((z + stepSize) * 10) / 10) {
      for (let y = 0; y <= box.length - rotated.length; y = Math.round((y + stepSize) * 10) / 10) {
        for (let x = 0; x <= box.width - rotated.width; x = Math.round((x + stepSize) * 10) / 10) {
          const position = {
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
            z: Math.round(z * 10) / 10,
          };

          let collides = false;
          for (const placed of placedItems) {
            if (hasCollision(position, rotated, placed.placement, placed)) {
              collides = true;
              break;
            }
          }

          if (!collides) {
            return { position, rotation };
          }
        }
      }
    }
  }

  return null;
}

function packSingleBox(
  items: SKU[],
  box: Box,
  rotations: Rotation[],
): { placedItems: PlacedItem[]; unpackedIndices: number[]; usedVolume: number } {
  const sortedItems = items
    .map((item, index) => ({ ...item, originalIndex: index }))
    .sort((a, b) => {
      const volumeA = a.width * a.length * a.height;
      const volumeB = b.width * b.length * b.height;
      return volumeB - volumeA;
    });

  const placedItems: PlacedItem[] = [];
  const unpackedIndices: number[] = [];
  let usedVolume = 0;

  for (const item of sortedItems) {
    const result = findValidPosition(item, box, placedItems, rotations);

    if (result) {
      const volume = item.width * item.length * item.height;
      usedVolume += volume;

      const rotated = rotateItem(item, result.rotation);

      placedItems.push({
        skuId: item.id,
        name: item.name,
        width: rotated.width,
        length: rotated.length,
        height: rotated.height,
        placement: {
          x: Math.round(result.position.x * DECIMAL_PRECISION * 10) / 10,
          y: Math.round(result.position.y * DECIMAL_PRECISION * 10) / 10,
          z: Math.round(result.position.z * DECIMAL_PRECISION * 10) / 10,
          rotation: result.rotation,
        },
        volume,
      });
    } else {
      unpackedIndices.push(item.originalIndex);
    }
  }

  return { placedItems, unpackedIndices, usedVolume };
}

function doesItemFitInBox(item: SKU, box: Box): boolean {
  const itemDims = [item.width, item.length, item.height].sort((a, b) => a - b);
  const boxDims = [box.width, box.length, box.height].sort((a, b) => a - b);

  return itemDims[0] <= boxDims[0] && itemDims[1] <= boxDims[1] && itemDims[2] <= boxDims[2];
}

function calculatePacking3D(items: SKU[], boxes: Box[]): PackingResult3D {
  if (!boxes || boxes.length === 0) {
    return {
      orderId: '',
      boxes: [],
      unpackedItems: [],
      totalCBM: 0,
      totalEfficiency: 0,
    };
  }

  const sortedBoxes = [...boxes].sort((a, b) => {
    const volA = a.width * a.length * a.height;
    const volB = b.width * b.length * b.height;
    return volA - volB;
  });

  const rotations: Rotation[] = ['none', '90', '180', '270'];
  const largestBox = sortedBoxes[sortedBoxes.length - 1];

  const flattenedItems: SKU[] = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      flattenedItems.push({
        ...item,
        quantity: 1,
      });
    }
  }

  const packedBoxes: PackedBox3D[] = [];
  const unpackedItems: { skuId: string; name?: string; quantity: number; reason: string }[] = [];
  let totalCBM = 0;
  let totalUsedVolume = 0;
  let totalAvailableVolume = 0;
  let boxCounter = 1;

  let remainingItems = [...flattenedItems];

  while (remainingItems.length > 0) {
    let bestBox: Box | null = null;
    let bestResult: {
      placedItems: PlacedItem[];
      unpackedIndices: number[];
      usedVolume: number;
    } | null = null;
    let bestEfficiency = 0;

    for (const box of sortedBoxes) {
      const boxVolume = box.width * box.length * box.height;
      const result = packSingleBox(remainingItems, box, rotations);

      if (result.placedItems.length > 0) {
        const efficiency = result.usedVolume / boxVolume;
        if (efficiency > bestEfficiency) {
          bestEfficiency = efficiency;
          bestBox = box;
          bestResult = result;
        }
      }
    }

    if (bestBox && bestResult && bestResult.placedItems.length > 0) {
      const boxVolume = bestBox.width * bestBox.length * bestBox.height;
      const boxCBM = boxVolume / 1000000;

      totalCBM += boxCBM;
      totalUsedVolume += bestResult.usedVolume;
      totalAvailableVolume += boxVolume;

      const skuMap = new Map<string, PackedItem3D>();

      for (const placed of bestResult.placedItems) {
        const existing = skuMap.get(placed.skuId);
        if (existing) {
          existing.placements.push(placed.placement);
        } else {
          skuMap.set(placed.skuId, {
            skuId: placed.skuId,
            name: placed.name,
            quantity: 1,
            placements: [placed.placement],
          });
        }
      }

      packedBoxes.push({
        boxId: bestBox.id,
        boxName: bestBox.name,
        boxNumber: boxCounter,
        width: bestBox.width,
        length: bestBox.length,
        height: bestBox.height,
        items: Array.from(skuMap.values()),
        totalCBM: boxCBM,
        efficiency: bestEfficiency,
        usedVolume: bestResult.usedVolume,
        availableVolume: boxVolume,
      });

      boxCounter++;

      remainingItems = remainingItems.filter((_, index) =>
        bestResult!.unpackedIndices.includes(index),
      );
    } else {
      const oversizedItem = remainingItems[0];
      const existingUnpacked = unpackedItems.find((u) => u.skuId === oversizedItem.id);
      if (existingUnpacked) {
        existingUnpacked.quantity += 1;
      } else {
        const fitsInLargest = doesItemFitInBox(oversizedItem, largestBox);
        unpackedItems.push({
          skuId: oversizedItem.id,
          name: oversizedItem.name,
          quantity: 1,
          reason: fitsInLargest ? 'Could not find valid placement' : 'Too large for any box',
        });
      }
      remainingItems.shift();
    }
  }

  return {
    orderId: '',
    boxes: packedBoxes,
    unpackedItems,
    totalCBM,
    totalEfficiency: totalAvailableVolume > 0 ? totalUsedVolume / totalAvailableVolume : 0,
  };
}

function calculateOrderPacking3D(
  orderId: string,
  items: SKU[],
  boxes: Box[],
  groupLabel?: string,
): PackingResult3D {
  const result = calculatePacking3D(items, boxes);
  result.orderId = orderId;
  if (groupLabel) {
    result.groupLabel = groupLabel;
  }
  return result;
}

export { calculatePacking3D, calculateOrderPacking3D };
