import { useState, useMemo } from 'react';
import { Product } from '@wms/types';

interface FilterOptions {
  search?: string;
  sku?: string;
  name?: string;
}

export const useProductFilters = (products: Product[]) => {
  const [filters, setFilters] = useState<FilterOptions>({});

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          product.sku.toLowerCase().includes(searchLower) ||
          product.name.toLowerCase().includes(searchLower)
        ) {
          return true;
        }
        return false;
      }
      if (filters.sku) {
        return product.sku.toLowerCase().includes(filters.sku.toLowerCase());
      }
      if (filters.name) {
        return product.name.toLowerCase().includes(filters.name.toLowerCase());
      }
      return true;
    });
  }, [products, filters]);

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  return {
    filteredProducts,
    filters,
    updateFilters,
    clearFilters,
  };
};