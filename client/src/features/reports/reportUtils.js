export const TREND_STYLES = {
  improving: { text: 'Improving', cls: 'bg-ok/10 text-ok border-ok/30', arrow: '↑' },
  stable: { text: 'Stable', cls: 'bg-electric/10 text-electric border-electric/30', arrow: '→' },
  declining: { text: 'Declining', cls: 'bg-crit/10 text-crit border-crit/30', arrow: '↓' },
  insufficient_data: { text: 'Insufficient data', cls: 'bg-line/40 text-slate-300 border-line', arrow: '•' },
};

export const fmtDay = (s) => {
  if (!s) return '-';
  const d = new Date(`${String(s).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export const fmtRange = (r) => `${fmtDay(r?.periodStart)} – ${fmtDay(r?.periodEnd)}`;

export const fmtNum = (v, unit = '', dp = 1) =>
  v == null || !Number.isFinite(Number(v)) ? '—' : `${Number(Number(v).toFixed(dp))}${unit}`;

/** Monday (YYYY-MM-DD) of the week containing the given YYYY-MM-DD, UTC math. */
export const mondayOf = (s) => {
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return s;
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
};

export const todayStr = () => new Date().toISOString().slice(0, 10);
