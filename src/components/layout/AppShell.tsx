import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  RocketIcon,
  TargetIcon,
  GrowthIcon,
  TrophyIcon,
  HandshakeIcon,
  MegaphoneIcon,
  CompassIcon,
  StopwatchIcon,
} from '@/components/icons/StartupIcons';

type NavItem = { to: string; label: string; icon: (p: React.SVGProps<SVGSVGElement>) => ReactNode };

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: GrowthIcon },
  { to: '/team', label: 'Team', icon: HandshakeIcon },
  { to: '/pitches', label: 'Pitches', icon: MegaphoneIcon },
  { to: '/meetings', label: 'Meetings', icon: StopwatchIcon },
  { to: '/sprints', label: 'Sprints', icon: TargetIcon },
  { to: '/polls', label: 'Polls', icon: CompassIcon },
  { to: '/leaderboard', label: 'Leaderboard', icon: TrophyIcon },
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-bg">
      <aside
        className={cn(
          'w-64 bg-surface border-r border-border flex-col fixed inset-y-0 left-0 z-30 transition-transform lg:translate-x-0 lg:static lg:flex',
          mobileOpen ? 'translate-x-0 flex' : '-translate-x-full hidden lg:flex',
        )}
      >
        <div className="px-5 py-5 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center">
            <RocketIcon width={20} height={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink leading-none">FI Teamspace</div>
            <div className="text-xs text-muted mt-1">Team Breakers</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-bubble text-primary-deep'
                      : 'text-muted hover:bg-bg hover:text-ink',
                  )
                }
              >
                <Icon width={18} height={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:bg-bg hover:text-ink"
          >
            <LogOut size={18} />
            Sign out
          </button>
          <div className="text-xs text-muted px-3 mt-2 truncate">{user?.email}</div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col lg:ml-0">
        <header className="lg:hidden bg-surface border-b border-border px-4 h-14 flex items-center gap-3 sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 -ml-2 text-ink"
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>
          <div className="font-semibold">FI Teamspace</div>
        </header>
        <main className="flex-1 min-w-0">
          <div className="container-app py-6">
            <Outlet />
          </div>
        </main>
      </div>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
