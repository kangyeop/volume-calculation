'use client';

import { useState, useMemo } from 'react';
import { useAllProducts } from '@/hooks/queries';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Package } from 'lucide-react';

type SortKey = 'name' | 'sku' | 'productGroupName' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export function ProductSearchTab() {
  const { data: products = [], isLoading } = useAllProducts();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filtered = useMemo(() => {
    if (!search) return products;
    const lower = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.sku.toLowerCase().includes(lower),
    );
  }, [products, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      const valA = a[sortKey] ?? '';
      const valB = b[sortKey] ?? '';
      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="상품명 또는 SKU로 검색..."
          className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {sorted.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed rounded-xl text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          {search ? (
            <>
              <p className="font-medium text-gray-500">검색 결과가 없습니다.</p>
              <p className="text-sm mt-1">다른 검색어를 입력해보세요.</p>
            </>
          ) : (
            <>
              <p className="font-medium text-gray-500">등록된 상품이 없습니다.</p>
              <p className="text-sm mt-1">상품 그룹에서 상품을 추가해보세요.</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b bg-gray-50 text-xs text-gray-500">
            {search ? `${sorted.length}개 검색됨` : `총 ${sorted.length}개`}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <SortableHeader column="sku" label="SKU" onSort={handleSort} icon={<SortIcon column="sku" />} />
                <SortableHeader column="name" label="상품명" onSort={handleSort} icon={<SortIcon column="name" />} />
                <th className="px-4 py-3 text-right font-medium text-gray-600">크기 (W×L×H)</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">바코드</th>
                <th className="px-4 py-3 font-medium text-gray-600">에어캡</th>
                <SortableHeader column="productGroupName" label="그룹" onSort={handleSort} icon={<SortIcon column="productGroupName" />} />
                <SortableHeader column="createdAt" label="생성일" onSort={handleSort} icon={<SortIcon column="createdAt" />} className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{product.sku}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                  <td className="px-4 py-3 text-right text-gray-600 font-mono text-xs">
                    {product.width}×{product.length}×{product.height}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked={product.barcode} disabled className="rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked={product.aircap} disabled className="rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                      {product.productGroupName ?? '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {new Date(product.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SortableHeader({
  column,
  label,
  onSort,
  icon,
  className = '',
}: {
  column: SortKey;
  label: string;
  onSort: (key: SortKey) => void;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-4 py-3 font-medium text-gray-600 ${className}`}>
      <button
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors"
      >
        {label}
        {icon}
      </button>
    </th>
  );
}
