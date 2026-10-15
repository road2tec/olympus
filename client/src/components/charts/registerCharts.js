import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

let registered = false;

export function registerCharts() {
  if (registered) return;
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);
  ChartJS.defaults.font.family = 'Inter, system-ui, sans-serif';
  ChartJS.defaults.color = '#94A3B8';
  registered = true;
}

registerCharts();

export const CHART_COLORS = {
  electric: '#3B82F6',
  violet: '#7C5CFF',
  ok: '#22C55E',
  warn: '#F59E0B',
  crit: '#EF4444',
  grid: 'rgba(148,163,184,0.12)',
  tick: '#94A3B8',
};

export function withAlpha(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export const baseTooltip = {
  backgroundColor: '#0A0F1E',
  borderColor: '#24304F',
  borderWidth: 1,
  titleColor: '#F4F6FB',
  bodyColor: '#CBD5E1',
  padding: 10,
  cornerRadius: 8,
};

export default ChartJS;
