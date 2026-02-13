import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { Package, Send, LayoutDashboard, Calculator, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sidebar: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const navItems = [
    {
      to: `/projects/${id}`,
      label: 'Dashboard',
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: `/projects/${id}/products`,
      label: 'Products',
      icon: Package,
    },
    {
      to: `/projects/${id}/outbound`,
      label: 'Outbound',
      icon: Send,
    },
    {
      to: `/projects/${id}/packing`,
      label: 'Packing / CBM',
      icon: Calculator,
    },
    {
      to: `/projects/${id}/guide`,
      label: 'Outbound Guide',
      icon: BookOpen,
    },
  ];

  return (
    <aside className="w-64 border-r bg-gray-50/40 h-screen sticky top-0">
      <div className="flex flex-col h-full gap-2 p-4">
        <div className="mb-4">
          <h2 className="px-2 text-lg font-semibold tracking-tight">Project Menu</h2>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-gray-100',
                  isActive ? 'bg-gray-100 text-primary' : 'text-muted-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1">
          <NavLink
            to="/boxes"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-gray-100',
                isActive ? 'bg-gray-100 text-primary' : 'text-muted-foreground'
              )
            }
          >
            📦 Box Manager
          </NavLink>
          <NavLink
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-gray-100"
          >
            ← Back to Projects
          </NavLink>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
