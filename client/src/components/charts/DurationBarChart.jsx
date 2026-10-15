import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { CHART_COLORS, baseTooltip } from './registerCharts';
import EmptyChart from './EmptyChart';

const fmtDate = (d) => {
  const s = String(d || '').slice(0, 10);
  const [, m, day] = s.split('-');
  return m && day ? `${day}/${m}` : s;
};

export default function DurationBarChart({ entries = [], height = 240 }) {
  const rows = useMemo(
    () =>
      (Array.isArray(entries) ? entries : [])
        .filter((e) => e && e.date && Number.isFinite(Number(e.durationMinutes)))
        .slice()
        .sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [entries]
  );

  const data = useMemo(
    () => ({
      labels: rows.map((e) => fmtDate(e.date)),
      datasets: [
        {
          label: 'Duration (min)',
          data: rows.map((e) => Number(e.durationMinutes)),
          backgroundColor: CHART_COLORS.electric,
          hoverBackgroundColor: CHART_COLORS.violet,
          borderRadius: 6,
          maxBarThickness: 28,
        },
      ],
    }),
    [rows]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...baseTooltip, callbacks: { label: (c) => `${c.parsed.y} min` } },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CHART_COLORS.tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
        },
        y: { beginAtZero: true, grid: { color: CHART_COLORS.grid }, ticks: { color: CHART_COLORS.tick } },
      },
    }),
    []
  );

  const label = 'Bar chart of training duration in minutes per day';
  if (rows.length === 0) {
    return <EmptyChart height={height} label={`${label}: no data`} message="No training sessions to display." />;
  }
  return (
    <div style={{ height }} className="relative w-full">
      <Bar data={data} options={options} role="img" aria-label={label} />
    </div>
  );
}
