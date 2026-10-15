import React, { useMemo, useState } from 'react';
import TrendLineChart from './TrendLineChart';
import EmptyChart from './EmptyChart';
import { CHART_COLORS } from './registerCharts';

const METRICS = [
  { key: 'performance', label: 'Performance', color: CHART_COLORS.electric },
  { key: 'recovery', label: 'Recovery', color: CHART_COLORS.ok },
  { key: 'fatigue', label: 'Fatigue', color: CHART_COLORS.crit },
  { key: 'adaptation', label: 'Adaptation', color: CHART_COLORS.violet },
  { key: 'trainingLoad', label: 'Training load', color: CHART_COLORS.warn },
];

const fmtDate = (d) => {
  if (!d) return '';
  const s = String(d).slice(0, 10);
  const [, m, day] = s.split('-');
  return m && day ? `${day}/${m}` : s;
};

export default function TwinHistoryChart({ history = [], height = 320, metrics }) {
  const available = useMemo(
    () => (metrics ? METRICS.filter((m) => metrics.includes(m.key)) : METRICS),
    [metrics]
  );
  const [active, setActive] = useState(() =>
    available.filter((m) => m.key !== 'trainingLoad').map((m) => m.key)
  );
  const rows = useMemo(() => (Array.isArray(history) ? history : []), [history]);

  const labels = useMemo(() => rows.map((h) => fmtDate(h.date)), [rows]);
  const datasets = useMemo(
    () =>
      available
        .filter((m) => active.includes(m.key))
        .map((m) => ({
          label: m.label,
          color: m.color,
          data: rows.map((h) => (h[m.key] == null ? null : Number(h[m.key]))),
        })),
    [rows, active, available]
  );

  // Training load is on a different scale, so only pin the axis to 0-100 when it is hidden.
  const showsLoad = active.includes('trainingLoad');
  const toggle = (k) => setActive((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));

  if (rows.length === 0) {
    return (
      <EmptyChart
        height={height}
        message="No twin history yet. Log a daily entry to begin."
        label="Digital twin history chart: no data"
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Select twin metrics to display">
        {available.map((m) => {
          const on = active.includes(m.key);
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(m.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                on ? 'border-electric/60 bg-electric/10 text-white' : 'border-line text-slate-400 hover:text-white'
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
              {m.label}
            </button>
          );
        })}
      </div>
      <TrendLineChart
        labels={labels}
        datasets={datasets}
        yMin={showsLoad ? undefined : 0}
        yMax={showsLoad ? undefined : 100}
        height={height}
        ariaLabel="Digital twin history chart showing selected metrics over time"
      />
    </div>
  );
}
