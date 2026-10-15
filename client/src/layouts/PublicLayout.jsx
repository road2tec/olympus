import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button, Logo } from '../components/ui';
import { useAuth, homeForRole } from '../context/AuthContext';
import { DISCLAIMER } from '../lib/format';

const LINKS = [
  ['Features', '/#features'],
  ['How it works', '/#how'],
  ['Analytics', '/#analytics'],
  ['Security', '/#security'],
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink text-slate-400">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm">A digital twin of athlete training load, recovery and fatigue, so the right conversation happens at the right time.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Product</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {LINKS.map(([l, h]) => <li key={h}><a href={h} className="hover:text-white">{l}</a></li>)}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Account</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/login" className="hover:text-white">Log in</Link></li>
            <li><Link to="/register" className="hover:text-white">Create account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs leading-relaxed sm:px-6">{DISCLAIMER}</p>
        <p className="mx-auto max-w-6xl px-4 pb-6 text-xs text-slate-600 sm:px-6">© {new Date().getFullYear()} Olympus. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Olympus home"><Logo /></Link>
          <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex" aria-label="Sections">
            {LINKS.map(([l, h]) => <a key={h} href={h} className="hover:text-white">{l}</a>)}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Link to={homeForRole(user.role)}><Button size="sm">Open app</Button></Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
                <Link to="/register"><Button size="sm">Get started</Button></Link>
              </>
            )}
          </div>
          <button className="rounded-md p-2 text-slate-300 hover:bg-white/5 md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="border-t border-line px-4 pb-4 md:hidden">
            <nav className="flex flex-col py-2 text-sm text-slate-300">
              {LINKS.map(([l, h]) => <a key={h} href={h} onClick={() => setOpen(false)} className="rounded-md px-2 py-2.5 hover:bg-white/5">{l}</a>)}
            </nav>
            <div className="flex gap-2">
              {user ? (
                <Link to={homeForRole(user.role)} className="flex-1"><Button className="w-full">Open app</Button></Link>
              ) : (
                <>
                  <Link to="/login" className="flex-1"><Button variant="secondary" className="w-full">Log in</Button></Link>
                  <Link to="/register" className="flex-1"><Button className="w-full">Get started</Button></Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <Outlet />
      <SiteFooter />
    </div>
  );
}
