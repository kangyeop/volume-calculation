'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Package, LayoutDashboard, Wand2, ClipboardList, History } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar: React.FC = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const pathname = usePathname();

  const navItems = [
    {
      to: `/projects/${id}`,
      label: 'Dashboard',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      to: `/projects/${id}/products`,
      label: 'Products',
      icon: Package,
    },
    {
      to: `/projects/${id}/outbound/upload`,
      label: 'Outbound Upload',
      icon: Wand2,
    },
    {
      to: `/projects/${id}/outbound/list`,
      label: 'Outbound List',
      icon: ClipboardList,
    },
    {
      to: `/projects/${id}/packing/history`,
      label: '패킹 이력',
      icon: History,
    },
  ];

  return (
    <aside className="w-64 border-r bg-gray-50/40 h-screen sticky top-0">
      <div className="flex flex-col h-full gap-2 p-4">
        <div className="mb-4">
          <h2 className="px-2 text-lg font-semibold tracking-tight">Project Menu</h2>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.to : pathname?.startsWith(item.to);
            return (
              <Link
                key={item.to}
                href={item.to}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-gray-100',
                  isActive ? 'bg-gray-100 text-primary' : 'text-muted-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-1">
          <Link
            href="/boxes"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-gray-100',
              pathname === '/boxes' ? 'bg-gray-100 text-primary' : 'text-muted-foreground',
            )}
          >
            📦 Box Manager
          </Link>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-gray-100"
          >
            ← Back to Projects
          </Link>
        </div>
      </div>
    </aside>
  );
};
