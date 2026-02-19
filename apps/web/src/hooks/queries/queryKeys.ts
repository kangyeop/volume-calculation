import { createQueryKeys } from '@lukemorales/query-key-factory';

export const projects = createQueryKeys('projects', {
  all: null,
  detail: (id: string) => [id],
});

export const products = createQueryKeys('products', {
  all: (projectId: string) => [projectId],
});

export const outbounds = createQueryKeys('outbounds', {
  all: (projectId: string) => [projectId],
  batches: (projectId: string) => [projectId, 'batches'],
});

export const boxes = createQueryKeys('boxes', {
  all: null,
});

export const packing = createQueryKeys('packing', {
  history: (projectId: string) => [projectId, 'history'],
});

export const upload = createQueryKeys('upload', {
  parse: null,
  confirm: null,
  session: (sessionId: string) => [sessionId],
});
