import { forwardRef } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Inbox, Loader2 } from 'lucide-react';

export const cx = (...a) => a.filter(Boolean).join(' ');

const BTN = {
  primary: 'bg-electric text-white hover:bg-blue-500',
  violet: 'bg-violet text-white hover:bg-violet/90',
  secondary: 'border border-line bg-panel text-slate-100 hover:border-electric/60 hover:bg-navy',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-white',
  danger: 'bg-crit/90 text-white hover:bg-crit',
  light: 'bg-ink text-white hover:bg-navy',
  lightOutline: 'border border-slate-300 bg-white text-slate-800 hover:border-electric',
};
const SIZE = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55',
        BTN[variant], SIZE[size], className
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export const Input = forwardRef(function Input({ label, error, hint, id, className, right, ...rest }, ref) {
  const fid = id || rest.name;
  return (
    <div className={className}>
      {label && <label htmlFor={fid} className="mb-1.5 block text-sm font-medium text-slate-300">{label}</label>}
      <div className="relative">
        <input
          ref={ref}
          id={fid}
          aria-invalid={!!error}
          aria-describedby={error ? `${fid}-err` : undefined}
          className={cx('field', error && 'field-error', right && 'pr-10')}
          {...rest}
        />
        {right && <div className="absolute inset-y-0 right-2 flex items-center">{right}</div>}
      </div>
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${fid}-err`} role="alert" className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
});

export function Card({ title, subtitle, action, children, className, padded = true }) {
  return (
    <section className={cx('rounded-xl border border-line bg-panel shadow-card', className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-line/70 px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-white">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

const TONES = {
  neutral: 'border-line bg-white/5 text-slate-300',
  ok: 'border-ok/30 bg-ok/10 text-green-300',
  warn: 'border-warn/30 bg-warn/10 text-amber-300',
  crit: 'border-crit/30 bg-crit/10 text-red-300',
  info: 'border-electric/30 bg-electric/10 text-blue-300',
  violet: 'border-violet/30 bg-violet/10 text-violet-300',
};
export function Badge({ tone = 'neutral', children, className }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', TONES[tone], className)}>{children}</span>;
}

export function Skeleton({ className }) {
  return <div aria-hidden className={cx('animate-pulse rounded-lg bg-white/5', className)} />;
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <div className="mb-3 rounded-full bg-electric/10 p-3 text-electric"><Icon className="h-5 w-5" /></div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-400">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-crit/30 bg-crit/5 px-6 py-8 text-center">
      <AlertTriangle className="mb-2 h-6 w-6 text-crit" aria-hidden />
      <p className="text-sm text-slate-200">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/** change: {delta, pct}; invertGood = true when a decrease is good (fatigue) */
export function ChangeIndicator({ change, invertGood = false, neutral = false }) {
  if (!change || change.delta === null || change.delta === undefined) {
    return <span className="text-xs text-slate-500">No previous value</span>;
  }
  const d = Number(change.delta);
  const flat = Math.abs(d) <= 0.005;
  const Icon = flat ? ArrowRight : d > 0 ? ArrowUpRight : ArrowDownRight;
  const good = invertGood ? d < 0 : d > 0;
  const color = flat || neutral ? 'text-slate-400' : good ? 'text-green-400' : 'text-amber-400';
  return (
    <span className={cx('inline-flex items-center gap-0.5 text-xs font-medium', color)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {d > 0 ? '+' : ''}{d.toFixed(1)}
      {change.pct !== null && change.pct !== undefined && (
        <span className="text-slate-500"> ({change.pct > 0 ? '+' : ''}{Number(change.pct).toFixed(1)}%)</span>
      )}
    </span>
  );
}

export function StatCard({ label, value, unit, hint, change, invertGood, neutral, accent = '#3B82F6', note }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-panel p-4 shadow-card">
      <span className="absolute inset-y-0 left-0 w-0.5" style={{ background: accent }} aria-hidden />
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-white">
        {value}{unit && <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>}
      </p>
      <div className="mt-1 min-h-[1rem]">
        {change !== undefined && <ChangeIndicator change={change} invertGood={invertGood} neutral={neutral} />}
        {note && <span className="text-xs text-slate-500">{note}</span>}
      </div>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const STATUS = {
  needs_attention: { tone: 'crit', label: 'Needs attention', dot: 'bg-crit' },
  monitoring: { tone: 'warn', label: 'Monitoring', dot: 'bg-warn' },
  ok: { tone: 'ok', label: 'On track', dot: 'bg-ok' },
  insufficient_data: { tone: 'neutral', label: 'Not enough data', dot: 'bg-slate-500' },
};
export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.insufficient_data;
  return (
    <Badge tone={s.tone}>
      <span className={cx('h-1.5 w-1.5 rounded-full', s.dot)} aria-hidden />
      {s.label}
    </Badge>
  );
}

const TREND_TONE = { improving: 'ok', stable: 'info', declining: 'warn', insufficient_data: 'neutral' };
export function TrendBadge({ label }) {
  return <Badge tone={TREND_TONE[label] || 'neutral'}>{(label || 'insufficient_data').replace('_', ' ')}</Badge>;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Logo({ className, dark = false }) {
  return (
    <span className={cx('inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight', dark ? 'text-ink' : 'text-white', className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#0F1B3D" stroke="#24304F" />
        <path d="M6 22l7-12 5 8 3-5 5 9z" fill="#3B82F6" />
        <circle cx="23" cy="9" r="2.2" fill="#7C5CFF" />
      </svg>
      Olympus
    </span>
  );
}
