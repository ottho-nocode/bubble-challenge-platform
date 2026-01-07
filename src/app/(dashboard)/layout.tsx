'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/challenges', label: 'Defis', icon: ChallengesIcon },
  { href: '/submissions', label: 'Soumissions', icon: SubmissionsIcon },
  { href: '/review', label: 'Corrections', icon: CorrectionsIcon },
  { href: '/leaderboard', label: 'Classement', icon: LeaderboardIcon },
];

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function ChallengesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2L12.09 7.26L18 8.27L14 12.14L14.81 18L10 15.77L5.19 18L6 12.14L2 8.27L7.91 7.26L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SubmissionsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 3H16C16.55 3 17 3.45 17 4V14C17 14.55 16.55 15 16 15H4C3.45 15 3 14.55 3 14V4C3 3.45 3.45 3 4 3Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 7H17" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 17H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 15V17" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function CorrectionsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 13L9 17L18 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function LeaderboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 17V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 17V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 17V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 17H4C3.46957 17 2.96086 16.7893 2.58579 16.4142C2.21071 16.0391 2 15.5304 2 15V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 14L18 10L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

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
                    <Icon className="w-5 h-5" />
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
            <LogoutIcon className="w-5 h-5" />
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
