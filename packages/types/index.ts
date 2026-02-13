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
  id: string;
  projectId: string;
  boxId: string;
  boxName: string;
  packedCount: number; // How many items packed in this box
  remainingQuantity: number; // How many items left to pack
  efficiency: number; // 0-1 (percentage of volume used)
  totalCBM: number;
  createdAt: Date | string;
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

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Product {
  id: string;
  projectId: string;
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
  weight: number;
  inboundDate?: Date | string;
  outboundDate?: Date | string;
  barcode?: boolean;
  aircap?: boolean;
  remarks?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Outbound {
  id: string;
  projectId: string;
  orderId: string;
  sku: string;
  quantity: number;
  createdAt: Date | string;
}
