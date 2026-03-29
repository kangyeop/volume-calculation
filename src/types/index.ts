export interface Dimensions {
  width: number;
  length: number;
  height: number;
}

export interface SKU extends Dimensions {
  id: string;
  name: string;
  quantity: number;
}

export interface Box extends Dimensions {
  id: string;
  name: string;
  price?: number;
  stock: number;
  boxGroupId: string | null;
  boxGroup?: BoxGroup;
}

export type StockChangeType = 'INBOUND' | 'OUTBOUND' | 'INITIAL' | 'ADJUSTMENT';

export interface BoxStockHistory {
  id: string;
  boxId: string;
  type: StockChangeType;
  quantity: number;
  resultStock: number;
  note: string | null;
  createdAt: string;
}

export interface BoxGroup {
  id: string;
  name: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  boxes?: Box[];
}

export interface PackingCalculationResult {
  boxes: {
    box: Box;
    count: number;
    packedSKUs: { skuId: string; quantity: number }[];
  }[];
  unpackedItems: { skuId: string; quantity: number; reason?: string }[];
  totalCBM: number;
  totalEfficiency: number;
}

export interface ProductGroup {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  products?: Product[];
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
  barcode: boolean;
  aircap: boolean;
  productGroupId: string;
  productGroup?: ProductGroup;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWithGroup {
  id: string;
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
  barcode: boolean;
  aircap: boolean;
  productGroupId: string;
  productGroupName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderId: string;
  recipient?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED';
  shipmentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  sku: string;
  quantity: number;
  shipmentId: string;
  productId?: string;
  product?: Product;
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  name: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  orders?: Order[];
  orderItems?: OrderItem[];
  packingResults?: PackingResult[];
}

export interface Outbound {
  id: string;
  orderId: string;
  orderIdentifier?: string;
  sku: string;
  quantity: number;
  projectId: string;
  productId?: string;
  product?: Product;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type BoxSortStrategy = 'volume' | 'longest-side';

export enum PackingGroupingOption {
  ORDER = 'ORDER',
}

export interface PackingGroup {
  groupLabel: string;
  boxes: {
    box: Box;
    count: number;
    packedSKUs: { skuId: string; name?: string; quantity: number }[];
  }[];
  unpackedItems: { skuId: string; name?: string; quantity: number; reason?: string }[];
  totalCBM: number;
  totalEfficiency: number;
}

export interface PackingRecommendation {
  groups: PackingGroup[];
  totalCBM: number;
  totalEfficiency: number;
  unpackedItems?: { skuId: string; name?: string; quantity: number; reason?: string }[];
}

export interface PackingResult3D {
  orderId: string;
  groupLabel?: string;
  boxes: PackedBox3D[];
  unpackedItems: { skuId: string; name?: string; quantity: number; reason: string }[];
  totalCBM: number;
  totalEfficiency: number;
}

export interface PackingResultItem {
  sku: string;
  productName: string;
  quantity: number;
  boxName: string;
  boxNumber: number;
  boxIndex: number;
  boxCBM: number;
  efficiency: number;
  unpacked: boolean;
  unpackedReason?: string;
  placements?: Placement3D[];
}

export interface Placement3D {
  x: number;
  y: number;
  z: number;
  rotation: string;
}

export interface UnmatchedItem {
  sku?: string;
  rawValue?: string;
  quantity?: number;
  reason?: string;
}

export interface ShipmentUploadResult {
  imported: number;
  unmatched: UnmatchedItem[];
  shipmentName: string;
  shipmentId: string;
  totalRows: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface DashboardStats {
  totalBatches: number;
  totalBoxesUsed: number;
  batches: BatchStats[];
}

export interface BatchStats {
  batchId: string;
  batchName: string;
  boxCount: number;
  lastCalculatedAt: string;
}

export interface PackingResult {
  id: string;
  shipmentId: string;
  orderId: string;
  boxId?: string;
  packedCount: number;
  efficiency: number;
  totalCBM: number;
  groupLabel?: string;
  groupIndex?: number;
  boxNumber?: number;
  items: PackingResultItem[];
  createdAt: Date | string;
}

export type Rotation = 'none' | '90' | '180' | '270';

export interface ItemPlacement {
  x: number;
  y: number;
  z: number;
  rotation: Rotation;
}

export interface PackedItem3D {
  skuId: string;
  name?: string;
  quantity: number;
  placements: ItemPlacement[];
}

export interface PackedBox3D {
  boxId: string;
  boxName: string;
  boxNumber: number;
  width: number;
  length: number;
  height: number;
  items: PackedItem3D[];
  totalCBM: number;
  efficiency: number;
  usedVolume: number;
  availableVolume: number;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
}

export interface ProjectBoxStat {
  boxName: string;
  boxCount: number;
}

export interface ProjectStats {
  projectId: string;
  projectName: string;
  createdAt: string;
  boxes: ProjectBoxStat[];
}
