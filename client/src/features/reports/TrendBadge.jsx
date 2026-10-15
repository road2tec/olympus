import React from 'react';
import { TREND_STYLES } from './reportUtils';

export default function TrendBadge({ label, changePct }) {
  const s = TREND_STYLES[label] || TREND_STYLES.insufficient_data;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      <span aria-hidden="true">{s.arrow}</span>
      {s.text}
      {changePct != null && Number.isFinite(changePct) && (
        <span className="font-normal opacity-80">
          {changePct > 0 ? '+' : ''}
          {Number(changePct).toFixed(1)}%
        </span>
      )}
    </span>
  );
}
