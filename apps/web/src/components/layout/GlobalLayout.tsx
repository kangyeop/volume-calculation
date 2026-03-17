import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Package, Truck, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/products', label: '상품', icon: Package },
  { to: '/outbound', label: '출고', icon: Truck },
  { to: '/boxes', label: '박스 관리', icon: Box },
];

export const GlobalLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r bg-gray-50/40 h-screen sticky top-0 flex flex-col">
        <div className="px-6 py-5 border-b">
          <span className="text-xl font-bold tracking-tight">WMS</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-gray-100',
                  isActive ? 'bg-gray-100 text-primary' : 'text-muted-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
