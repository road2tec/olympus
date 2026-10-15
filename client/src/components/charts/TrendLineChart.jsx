import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { CHART_COLORS, baseTooltip, withAlpha } from './registerCharts';
import EmptyChart from './EmptyChart';

const PALETTE = [CHART_COLORS.electric, CHART_COLORS.violet, CHART_COLORS.ok, CHART_COLORS.warn];

const hasPoints = (datasets) =>
  Array.isArray(datasets) &&
  datasets.some((d) => Array.isArray(d?.data) && d.data.some((v) => v != null && Number.isFinite(Number(v))));

export default function TrendLineChart({ labels = [], datasets = [], yMin, yMax, height = 260, unit = '', ariaLabel }) {
  const safeSets = Array.isArray(datasets) ? datasets : [];
  const safeLabels = Array.isArray(labels) ? labels : [];
  const ok = hasPoints(safeSets) && safeLabels.length > 0;

  const data = useMemo(
    () => ({
      labels: safeLabels,
      datasets: safeSets.map((d, i) => {
        const color = d.color || PALETTE[i % PALETTE.length];
        return {
          label: d.label,
          data: d.data,
          borderColor: color,
          backgroundColor: withAlpha(color, 0.12),
          pointBackgroundColor: color,
          pointRadius: safeLabels.length > 40 ? 0 : 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          tension: 0.35,
          fill: safeSets.length === 1,
          spanGaps: true,
        };
      }),
    }),
    [safeLabels, safeSets]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: safeSets.length > 1,
          labels: { color: CHART_COLORS.tick, boxWidth: 10, usePointStyle: true },
        },
        tooltip: {
          ...baseTooltip,
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: ${ctx.parsed.y == null ? '-' : ctx.parsed.y}${unit ? ` ${unit}` : ''}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CHART_COLORS.tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        },
        y: {
          min: yMin,
          max: yMax,
          grid: { color: CHART_COLORS.grid },
          ticks: { color: CHART_COLORS.tick },
        },
      },
    }),
    [safeSets.length, yMin, yMax, unit]
  );

  const label =
    ariaLabel ||
    `Trend line chart: ${safeSets.map((d) => d.label).filter(Boolean).join(', ') || 'data'}`;
  if (!ok) return <EmptyChart height={height} label={`${label} (no data)`} />;

  return (
    <div style={{ height }} className="relative w-full">
      <Line data={data} options={options} role="img" aria-label={label} />
    </div>
  );
}
