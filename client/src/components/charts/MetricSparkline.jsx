import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { CHART_COLORS, withAlpha } from './registerCharts';

export default function MetricSparkline({
  data = [],
  color = CHART_COLORS.electric,
  height = 40,
  width,
  ariaLabel = 'Metric sparkline',
}) {
  const key = JSON.stringify(data || []);
  const values = useMemo(
    () =>
      (Array.isArray(data) ? data : [])
        .map((v) => (v == null ? null : Number(v)))
        .map((v) => (v === null || Number.isFinite(v) ? v : null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );
  const has = values.some((v) => v !== null);

  const chartData = useMemo(
    () => ({
      labels: values.map((_, i) => i + 1),
      datasets: [
        {
          data: values,
          borderColor: color,
          backgroundColor: withAlpha(color, 0.15),
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.4,
          fill: true,
          spanGaps: true,
        },
      ],
    }),
    [values, color]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      events: [],
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
      layout: { padding: 2 },
    }),
    []
  );

  const style = { height, width: width || '100%' };
  if (!has) {
    return <div role="img" aria-label={`${ariaLabel}: no data`} style={style} className="rounded bg-line/30" />;
  }
  return (
    <div style={style} className="relative">
      <Line data={chartData} options={options} role="img" aria-label={ariaLabel} />
    </div>
  );
}
