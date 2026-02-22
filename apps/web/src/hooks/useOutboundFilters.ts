import { useState, useMemo } from 'react';
import { Outbound } from '@wms/types';

interface FilterOptions {
  batchId?: string;
  searchTerm?: string;
  sku?: string;
}

export const useOutboundFilters = (
  outbounds: Outbound[],
  batches: { batchId: string; batchName: string }[]
) => {
  const [filters, setFilters] = useState<FilterOptions>({});

  const currentBatches = useMemo(() => {
    return [...batches].sort((a, b) =>
      b.batchName.localeCompare(a.batchName)
    );
  }, [batches]);

  const filteredBatches = useMemo(() => {
    return currentBatches.filter(batch =>
      batch.batchName.toLowerCase().includes(filters.searchTerm?.toLowerCase() || '')
    );
  }, [currentBatches, filters.searchTerm]);

  const filteredOutbounds = useMemo(() => {
    return outbounds.filter(outbound => {
      if (filters.batchId && outbound.batchId !== filters.batchId) {
        return false;
      }
      if (filters.sku) {
        return outbound.sku.toLowerCase().includes(filters.sku.toLowerCase());
      }
      return true;
    });
  }, [outbounds, filters]);

  const selectedBatch = useMemo(() => {
    return currentBatches.find(b => b.batchId === filters.batchId);
  }, [currentBatches, filters.batchId]);

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  return {
    filteredBatches,
    filteredOutbounds,
    selectedBatch,
    filters,
    updateFilters,
    clearFilters,
  };
};