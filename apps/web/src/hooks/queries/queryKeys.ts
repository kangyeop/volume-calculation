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
  byGroup: (groupId: string) => [groupId, 'group'],
});

export const outbounds = createQueryKeys('outbounds', {
  all: (projectId: string) => [projectId],
});

export const outboundBatches = createQueryKeys('outboundBatches', {
  all: null,
  detail: (id: string) => [id],
  outbounds: (batchId: string) => [batchId, 'outbounds'],
  infiniteOutbounds: (batchId: string) => [batchId, 'outbounds', 'infinite'],
  configurationSummary: (batchId: string) => [batchId, 'configuration-summary'],
});

export const boxes = createQueryKeys('boxes', {
  all: null,
});

export const packing = createQueryKeys('packing', {
  history: (projectId: string) => [projectId, 'history'],
  details: (projectId: string) => [projectId, 'details'],
  historyByBatch: (batchId: string) => [batchId, 'batch', 'history'],
  detailsByBatch: (batchId: string) => [batchId, 'batch', 'details'],
  recommendation: (batchId: string) => [batchId, 'recommendation'],
});

export const upload = createQueryKeys('upload', {
  parse: null,
  confirm: null,
  session: (sessionId: string) => [sessionId],
});

export const dashboard = createQueryKeys('dashboard', {
  stats: null,
});
