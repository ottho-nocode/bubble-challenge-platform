'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  SquaresFour,
  Star,
  Monitor,
  CheckSquare,
  ChartBar,
  SignOut
} from '@phosphor-icons/react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: SquaresFour },
  { href: '/challenges', label: 'Defis', icon: Star },
  { href: '/submissions', label: 'Soumissions', icon: Monitor },
  { href: '/review', label: 'Corrections', icon: CheckSquare },
  { href: '/leaderboard', label: 'Classement', icon: ChartBar },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#e2e8f0] flex flex-col">
        {/* Logo */}
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-b from-[#4a90d9] to-[#001354] rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">B</span>
            </div>
            <div>
              <span className="text-[#101828] font-semibold text-sm block leading-tight">Bubble</span>
              <span className="text-[#101828] font-semibold text-sm block leading-tight">Challenge</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-[14px] text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-black text-white'
                        : 'text-[#6a7282] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[#e2e8f0]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-[#ef4444] hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
          >
            <SignOut size={20} />
            <span>Deconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-[#f8f9fc]">
        {children}
      </main>
    </div>
  );
}
