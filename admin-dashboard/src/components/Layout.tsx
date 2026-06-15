import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  UsersRound,
  FileText,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from './ui';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Users', icon: Users, end: false },
  { to: '/workouts', label: 'Workouts', icon: Dumbbell, end: false },
  { to: '/social', label: 'Groups & Challenges', icon: UsersRound, end: false },
  { to: '/content', label: 'Content', icon: FileText, end: false },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="flex w-60 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img
            src={`${import.meta.env.BASE_URL}applogo.png`}
            alt="Leveld"
            className="h-9 w-9 object-contain"
          />
          <span className="text-lg font-bold tracking-tight text-white">
            Leveld<span className="text-brand"> Admin</span>
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand/15 text-brand'
                    : 'text-muted hover:bg-surface-2 hover:text-white',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 truncate px-2 text-xs text-muted">{user?.email}</div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-white"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
