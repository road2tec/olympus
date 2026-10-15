import { AlertTriangle, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { Badge, Card, EmptyState } from '../../components/ui';
import { fmtDate, fmtNum, fmtPct } from '../../lib/format';

const SEV = {
  critical: { tone: 'crit', icon: AlertTriangle, label: 'Critical' },
  warning: { tone: 'warn', icon: AlertTriangle, label: 'Needs attention' },
  positive: { tone: 'ok', icon: CheckCircle2, label: 'Positive' },
  info: { tone: 'info', icon: Info, label: 'Info' },
};

export default function InsightCard({ insight, title = 'Latest insight', showFactors = true }) {
  if (!insight) {
    return (
      <Card title={title}>
        <EmptyState icon={Sparkles} title="No insight yet" message="Insights appear after you log a day of training." />
      </Card>
    );
  }
  const s = SEV[insight.severity] || SEV.info;
  const Icon = s.icon;
  const factors = insight.contributingFactors || [];
  return (
    <Card title={title} subtitle={fmtDate(insight.date)} action={<Badge tone={s.tone}>{s.label}</Badge>}>
      <div className="flex gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${{ crit: 'text-crit', warn: 'text-warn', ok: 'text-ok', info: 'text-electric' }[s.tone]}`} aria-hidden />
        <div>
          <h3 className="text-base font-semibold text-white">{insight.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{insight.message}</p>
        </div>
      </div>
      {showFactors && factors.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {factors.map((f, i) => (
            <li key={`${f.metric}-${i}`} className="rounded-lg border border-line bg-ink/40 px-3 py-2 text-xs">
              <span className="text-slate-400">{f.label || f.metric}</span>
              <span className="mt-0.5 block text-slate-200">
                {fmtNum(f.previous)} → {fmtNum(f.current)}{f.unit ? ` ${f.unit}` : ''} <span className="text-slate-500">({fmtPct(f.changePct)})</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
