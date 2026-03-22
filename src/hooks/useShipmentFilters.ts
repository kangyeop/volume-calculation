import { useState, useMemo } from 'react';
import { Outbound } from '@/types';

interface FilterOptions {
  searchTerm?: string;
  sku?: string;
}

export const useShipmentFilters = (orderItems: Outbound[]) => {
  const [filters, setFilters] = useState<FilterOptions>({});

  const filteredOrderItems = useMemo(() => {
    return orderItems.filter((item) => {
      if (filters.sku) {
        return item.sku.toLowerCase().includes(filters.sku.toLowerCase());
      }
      return true;
    });
  }, [orderItems, filters]);

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  return {
    filteredOrderItems,
    filters,
    updateFilters,
    clearFilters,
  };
};
