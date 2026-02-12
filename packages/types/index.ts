export interface Dimensions {
  width: number; // cm
  length: number; // cm
  height: number; // cm
}

export interface SKU extends Dimensions {
  id: string;
  name: string;
  quantity: number;
}

export interface Box extends Dimensions {
  id: string;
  name: string; // e.g., "Post Office #1"
  price?: number; // Optional: for cost calculation
}

export interface PackingResult {
  boxId: string;
  boxName: string;
  packedCount: number; // How many items packed in this box
  remainingQuantity: number; // How many items left to pack
  efficiency: number; // 0-1 (percentage of volume used)
  totalCBM: number;
}

export interface PackingRecommendation {
  boxes: {
    box: Box;
    count: number;
    packedSKUs: { skuId: string; quantity: number }[];
  }[];
  totalCBM: number;
  totalEfficiency: number;
}
