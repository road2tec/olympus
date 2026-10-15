import { Link } from 'react-router-dom';
import { Logo } from '../../components/ui';
import { DISCLAIMER } from '../../lib/format';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-ink lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-navy/50 p-12 lg:flex">
        <Link to="/"><Logo /></Link>
        <div>
          <h2 className="font-display text-3xl font-semibold leading-tight text-white">See how training is landing, before it becomes a problem.</h2>
          <p className="mt-4 max-w-md text-slate-400">Olympus turns daily entries into a living digital twin: load, recovery, fatigue and adaptation, with plain-language insights you can take to your coach.</p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-center text-xs text-slate-400">
            {['Training load', 'Recovery', 'Fatigue'].map((m) => (
              <div key={m} className="rounded-lg border border-line bg-panel/70 py-3">{m}</div>
            ))}
          </div>
        </div>
        <p className="max-w-md text-xs text-slate-500">{DISCLAIMER}</p>
      </div>
      <div className="flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-block lg:hidden"><Logo /></Link>
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-slate-400">{footer}</div>
        </div>
      </div>
    </div>
  );
}
