import { Box, SKU, PackingRecommendation } from '@wms/types';
import { STANDARD_BOXES } from '../constants/boxes';
import { calculateVolumePacking } from './volume-calculator';

// Calculate CBM (Cubic Meter)
export function calculateCBM(width: number, length: number, height: number): number {
  return (width * length * height) / 1000000;
}

export function recommendPacking(skus: SKU[], boxes: Box[] = STANDARD_BOXES): PackingRecommendation {
  if (skus.length === 0) {
    return { boxes: [], totalCBM: 0, totalEfficiency: 0 };
  }

  return calculateVolumePacking(skus, boxes);
}
