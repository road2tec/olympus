import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, BarChart3, ChevronDown, ClipboardList, FilePlus2, FileText, LayoutDashboard, LogOut, Menu, User, Users, X, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo, cx } from '../components/ui';
import { DISCLAIMER } from '../lib/format';

const NAV = {
  athlete: [
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/log', label: 'Log today', icon: FilePlus2 },
    { to: '/app/entries', label: 'Entries', icon: ClipboardList },
    { to: '/app/twin', label: 'Digital Twin', icon: Activity },
    { to: '/app/reports', label: 'Reports', icon: FileText },
    { to: '/app/profile', label: 'Profile', icon: User },
  ],
  coach: [{ to: '/coach', label: 'My athletes', icon: Users }],
  admin: [{ to: '/admin', label: 'User management', icon: ShieldCheck }],
};

const CRUMBS = {
  app: 'Athlete', dashboard: 'Dashboard', log: 'Log today', entries: 'Entries', twin: 'Digital Twin',
  reports: 'Reports', profile: 'Profile', coach: 'Coach', admin: 'Admin',
};

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = parts.map((p, i) => ({
    label: CRUMBS[p] || (p.length > 12 ? 'Details' : p),
    to: '/' + parts.slice(0, i + 1).join('/'),
    last: i === parts.length - 1,
    link: p !== 'app',
  }));
  return (
    <nav aria-label="Breadcrumb" className="min-w-0 truncate text-sm text-slate-400">
      {crumbs.map((c, i) => (
        <span key={c.to}>
          {i > 0 && <span className="mx-1.5 text-slate-600">/</span>}
          {c.last || !c.link ? <span className={c.last ? 'text-slate-100' : ''}>{c.label}</span> : <Link to={c.to} className="hover:text-white">{c.label}</Link>}
        </span>
      ))}
    </nav>
  );
}

function SideNav({ items, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Primary">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-electric/15 text-white ring-1 ring-electric/30' : 'text-slate-400 hover:bg-white/5 hover:text-white')
          }
        >
          <Icon className="h-4 w-4" aria-hidden /> {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  const items = NAV[user?.role] || NAV.athlete;

  useEffect(() => { setDrawer(false); setMenu(false); }, [pathname]);
  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const doLogout = () => { logout(); navigate('/login', { replace: true }); };
  const initials = (user?.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-ink">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-navy/40 lg:flex">
        <div className="flex h-16 items-center px-6"><Link to="/"><Logo /></Link></div>
        <div className="flex-1 overflow-y-auto py-4"><SideNav items={items} /></div>
        <p className="border-t border-line px-5 py-4 text-[11px] leading-snug text-slate-500">Decision support, not medical advice.</p>
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-line bg-ink">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded-md p-2 text-slate-400 hover:bg-white/5"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-4"><SideNav items={items} onNavigate={() => setDrawer(false)} /></div>
          </div>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-ink/90 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setDrawer(true)} aria-label="Open menu" className="rounded-md p-2 text-slate-300 hover:bg-white/5 lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><Breadcrumbs /></div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenu((m) => !m)}
              aria-haspopup="menu"
              aria-expanded={menu}
              className="flex items-center gap-2 rounded-lg border border-line bg-panel py-1.5 pl-1.5 pr-2.5 hover:border-electric/50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet/20 text-xs font-semibold text-violet-300">{initials}</span>
              <span className="hidden text-sm text-slate-200 sm:block">{user?.name}</span>
              <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden />
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-panel p-1.5 shadow-xl">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-medium text-white">{user?.name}</p>
                  <p className="truncate text-xs text-slate-400">{user?.email}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-electric">{user?.role}</p>
                </div>
                {user?.role === 'athlete' && (
                  <Link role="menuitem" to="/app/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"><User className="h-4 w-4" /> Profile</Link>
                )}
                <button role="menuitem" onClick={doLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"><LogOut className="h-4 w-4" /> Log out</button>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
          <p className="mt-12 border-t border-line pt-4 text-xs text-slate-500">{DISCLAIMER}</p>
        </main>
      </div>
    </div>
  );
}

export { BarChart3 };
