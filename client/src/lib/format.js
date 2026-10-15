export const DISCLAIMER =
  'Olympus is a decision-support application built on a simplified data-analytics model. It is not a medical device and does not replace a doctor, physiotherapist, or qualified coach.';

export const todayISO = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const fmtNum = (v, dp = 1) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(dp).replace(/\.0+$/, '');

export const fmtDate = (s, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!s) return '—';
  const str = String(s).slice(0, 10);
  const [y, m, d] = str.split('-').map(Number);
  if (!y) return '—';
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
};

export const fmtDateTime = (s) => (s ? new Date(s).toLocaleString('en-GB') : '—');

export const fmtPct = (v) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(1)}%`);

export const TRAINING_TYPES = ['strength', 'endurance', 'speed', 'skill', 'recovery', 'match', 'other'];
export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export const FEELINGS = [
  { v: 1, label: 'Very poor' },
  { v: 2, label: 'Poor' },
  { v: 3, label: 'Okay' },
  { v: 4, label: 'Good' },
  { v: 5, label: 'Great' },
];

export const METRICS = [
  { key: 'performance', label: 'Performance', hint: 'Smoothed performance score (EMA)', color: '#3B82F6' },
  { key: 'trainingLoad', label: 'Training load', hint: 'Smoothed duration × intensity', color: '#7C5CFF' },
  { key: 'recovery', label: 'Recovery', hint: 'Sleep and feeling blend, smoothed', color: '#22C55E' },
  { key: 'fatigue', label: 'Fatigue', hint: 'Load pressure against recovery', color: '#F59E0B', invert: true },
  { key: 'adaptation', label: 'Adaptation', hint: 'Estimated response to training', color: '#06B6D4' },
];
