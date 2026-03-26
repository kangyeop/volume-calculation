'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Package, Truck, Box, Layers, LogOut, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSupabaseBrowser } from '@/lib/supabase/client';

const navItems = [
  { to: '/products', label: '상품', icon: Package },
  { to: '/shipments', label: '출고', icon: Truck },
  { to: '/settlements', label: '정산', icon: Calculator },
  { to: '/boxes', label: '박스 관리', icon: Box },
  { to: '/box-groups', label: '박스 그룹', icon: Layers },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, []);

  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen min-w-[1280px] bg-background">
      <aside className="w-64 border-r bg-gray-50/40 h-screen sticky top-0 flex flex-col">
        <div className="px-6 py-5 border-b flex items-center gap-2">
          <Image src="/logo.png" alt="큐브" width={36} height={36} />
          <span className="text-xl font-bold tracking-tight">도넛 큐브</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.to || pathname.startsWith(item.to + '/');
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
        <div className="border-t p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm text-muted-foreground">
              {userEmail ?? ''}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-muted-foreground hover:bg-gray-100 hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
