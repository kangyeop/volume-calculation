import { createQueryKeys } from '@lukemorales/query-key-factory';

export const projects = createQueryKeys('projects', {
  all: null,
  detail: (id: string) => [id],
  stats: null,
});

export const productGroups = createQueryKeys('productGroups', {
  all: null,
  detail: (id: string) => [id],
});

export const products = createQueryKeys('products', {
  all: (projectId: string) => [projectId],
  listAll: null,
  byGroup: (groupId: string) => [groupId, 'group'],
});

export const orderItems = createQueryKeys('orderItems', {
  all: (projectId: string) => [projectId],
});

export const shipments = createQueryKeys('shipments', {
  all: null,
  detail: (id: string) => [id],
  orderItems: (shipmentId: string) => [shipmentId, 'order-items'],
  infiniteOrderItems: (shipmentId: string) => [shipmentId, 'order-items', 'infinite'],
  configurationSummary: (shipmentId: string) => [shipmentId, 'configuration-summary'],
});

export const settlements = createQueryKeys('settlements', {
  all: null,
  detail: (id: string) => [id],
  packingRecommendation: (id: string) => [id, 'packing-recommendation'],
});

export const boxes = createQueryKeys('boxes', {
  all: null,
  unassigned: null,
  stockHistories: (boxId: string) => [boxId, 'stock-histories'],
});

export const boxGroups = createQueryKeys('boxGroups', {
  all: null,
  detail: (id: string) => [id],
});

export const packing = createQueryKeys('packing', {
  history: (projectId: string) => [projectId, 'history'],
  historyByBatch: (shipmentId: string) => [shipmentId, 'batch', 'history'],
  recommendation: (shipmentId: string) => [shipmentId, 'recommendation'],
});

export const upload = createQueryKeys('upload', {
  parse: null,
  confirm: null,
  session: (sessionId: string) => [sessionId],
});

export const estimates = createQueryKeys('estimates', {
  all: null,
  search: (query: string) => [query],
  signedUrl: (id: string) => [id, 'signed-url'],
});

export const dashboard = createQueryKeys('dashboard', {
  stats: null,
});

export const globalProductGroups = createQueryKeys('globalProductGroups', {
  all: null,
  detail: (id: string) => [id],
});

export const globalProducts = createQueryKeys('globalProducts', {
  byGroup: (groupId: string) => [groupId, 'group'],
});

export const globalShipments = createQueryKeys('globalShipments', {
  all: null,
  detail: (id: string) => [id],
  orderItems: (shipmentId: string) => [shipmentId, 'order-items'],
  configurationSummary: (shipmentId: string) => [shipmentId, 'configuration-summary'],
});

export const globalPacking = createQueryKeys('globalPacking', {
  recommendation: (shipmentId: string) => [shipmentId, 'recommendation'],
});
