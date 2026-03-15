import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { dashboard } from './queryKeys';

export function useDashboardStats() {
  return useQuery({
    ...dashboard.stats,
    queryFn: () => api.dashboard.stats(),
  });
}
