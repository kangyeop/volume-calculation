import { useState, useMemo } from 'react';
import { Outbound } from '@/types';

interface FilterOptions {
  searchTerm?: string;
  sku?: string;
}

export const useOutboundFilters = (outbounds: Outbound[]) => {
  const [filters, setFilters] = useState<FilterOptions>({});

  const filteredOutbounds = useMemo(() => {
    return outbounds.filter((outbound) => {
      if (filters.sku) {
        return outbound.sku.toLowerCase().includes(filters.sku.toLowerCase());
      }
      return true;
    });
  }, [outbounds, filters]);

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  return {
    filteredOutbounds,
    filters,
    updateFilters,
    clearFilters,
  };
};
