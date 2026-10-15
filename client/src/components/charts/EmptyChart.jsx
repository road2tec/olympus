import React from 'react';

export default function EmptyChart({ height = 220, message = 'No data to display yet.', label }) {
  return (
    <div
      role="img"
      aria-label={label || message}
      style={{ height }}
      className="flex w-full items-center justify-center rounded-xl border border-dashed border-line px-4 text-center text-sm text-slate-400"
    >
      {message}
    </div>
  );
}
