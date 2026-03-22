'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, Truck, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/products', label: '상품', icon: Package },
  { to: '/shipments', label: '출고', icon: Truck },
  { to: '/boxes', label: '박스 관리', icon: Box },
];

interface GlobalLayoutProps {
  children: React.ReactNode;
}

export const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen min-w-[1280px] bg-background">
      <aside className="w-64 border-r bg-gray-50/40 h-screen sticky top-0 flex flex-col">
        <div className="px-6 py-5 border-b flex items-center gap-2">
          <Image src="/logo.png" alt="dnut" width={36} height={36} />
          <span className="text-xl font-bold tracking-tight">VC</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-gray-100',
                pathname === item.to ? 'bg-gray-100 text-primary' : 'text-muted-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};
