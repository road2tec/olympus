import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, BarChart3, BrainCircuit, ClipboardCheck, FileText, HeartPulse, Lock, ShieldCheck, Sparkles, UserCheck,
} from 'lucide-react';
import { Button, Card, StatCard, StatusPill } from '../../components/ui';
import { TrendLineChart } from '../../components/charts';

// Clearly-labelled illustrative values; not real athlete data.
const SAMPLE_LABELS = Array.from({ length: 12 }, (_, i) => `Day ${i * 3 + 1}`);
const SAMPLE_LOAD = [310, 320, 318, 330, 335, 350, 372, 395, 420, 445, 470, 490];
const SAMPLE_RECOVERY = [74, 75, 73, 74, 75, 72, 70, 66, 62, 59, 56, 53];

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-electric/10 blur-3xl" aria-hidden />
      <div className="rounded-2xl border border-line bg-ink p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-crit/70" /><span className="h-2.5 w-2.5 rounded-full bg-warn/70" /><span className="h-2.5 w-2.5 rounded-full bg-ok/70" /></div>
          <span className="rounded-full border border-violet/30 bg-violet/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-300">Sample illustrative values</span>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Twin status</span>
          <StatusPill status="needs_attention" />
          <span className="text-xs text-slate-400">Load up, recovery down vs previous 7 days</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard label="Load" value="490" accent="#7C5CFF" change={{ delta: 62.4, pct: 14.6 }} neutral />
          <StatCard label="Recovery" value="53.0" accent="#22C55E" change={{ delta: -9.8, pct: -15.6 }} />
          <StatCard label="Fatigue" value="71.2" accent="#F59E0B" change={{ delta: 8.1, pct: 12.8 }} invertGood />
        </div>
        <div className="mt-3 rounded-xl border border-line bg-panel p-3">
          <p className="mb-1 text-xs font-medium text-slate-300">Training load vs recovery</p>
          <TrendLineChart labels={SAMPLE_LABELS} height={170}
            datasets={[{ label: 'Load (sample)', data: SAMPLE_LOAD, color: '#7C5CFF' }, { label: 'Recovery (sample)', data: SAMPLE_RECOVERY, color: '#22C55E' }]} />
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Activity, title: 'Digital twin of your training', text: 'Smoothed performance, load, recovery, fatigue and adaptation, updated every time you log a day.' },
  { icon: HeartPulse, title: 'Recovery you can see', text: 'Sleep and how you felt are blended into a single recovery score, so rest is measured, not guessed.' },
  { icon: BrainCircuit, title: 'Plain-language insights', text: 'Every entry produces a short explanation of what changed and why, with the numbers behind it.' },
  { icon: FileText, title: 'Weekly reports', text: 'Generate a clear weekly summary and download it as a PDF to share with your coach.' },
  { icon: UserCheck, title: 'Built for athlete and coach', text: 'Athletes log and review. Coaches see assigned athletes and their status at a glance.' },
  { icon: BarChart3, title: 'Trends with transparent basis', text: 'Every trend states the windows compared, so you always know what a label is based on.' },
];

const STEPS = [
  { icon: ClipboardCheck, title: 'Log your day', text: 'Training type, duration, intensity, how you felt, sleep and diet. About a minute.' },
  { icon: Activity, title: 'Your twin updates', text: 'Exponential smoothing turns daily noise into a stable picture of load, recovery and fatigue.' },
  { icon: Sparkles, title: 'Get a clear insight', text: 'Olympus compares the last 7 days with the 7 before and flags when load rises while recovery falls.' },
];

const SECURITY = [
  [Lock, 'Protected accounts', 'Passwords are hashed, sessions use short-lived tokens, and sign-in attempts are rate limited.'],
  [ShieldCheck, 'Strict access control', 'Athletes only ever see their own data. Coaches see only athletes assigned to them.'],
  [UserCheck, 'Not a medical device', 'Olympus supports decisions with simple analytics. It never diagnoses or replaces professionals.'],
];

export default function LandingPage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 -z-10 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#3B82F6 1px, transparent 1px), linear-gradient(90deg, #3B82F6 1px, transparent 1px)', backgroundSize: '48px 48px' }} aria-hidden />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-electric" /> Athlete performance, modelled</span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] text-white sm:text-5xl">Know how training is landing before it becomes a problem.</h1>
            <p className="mt-5 max-w-xl text-lg text-slate-400">Olympus builds a digital twin from your daily entries and tells you, in plain language, when load is rising faster than recovery.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register"><Button size="lg">Create free account <ArrowRight className="h-4 w-4" /></Button></Link>
              <a href="#how"><Button size="lg" variant="secondary">See how it works</Button></a>
            </div>
            <p className="mt-4 text-xs text-slate-500">Decision support for athletes and coaches. Not medical advice.</p>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section id="features" className="light-section scroll-mt-16 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-semibold text-electric">Features</p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold text-ink">Everything you need to understand your training load</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-4 inline-flex rounded-lg bg-ink p-2.5 text-electric"><Icon className="h-5 w-5" /></div>
                <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-16 border-b border-line py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-semibold text-electric">How it works</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-white">From a daily log to a clear signal</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative rounded-xl border border-line bg-panel p-6">
                <span className="absolute right-5 top-5 font-display text-3xl font-semibold text-line">{i + 1}</span>
                <Icon className="h-6 w-6 text-electric" aria-hidden />
                <h3 className="mt-4 font-display text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="analytics" className="scroll-mt-16 border-b border-line bg-navy/30 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-electric">Analytics</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-white">Transparent, deterministic, explainable</h2>
            <p className="mt-4 text-slate-400">No black box. Olympus uses simple, documented formulas so every number can be traced back to your entries.</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li><strong className="text-white">Training load</strong> = duration × intensity.</li>
              <li><strong className="text-white">Recovery</strong> = 50% sleep (against 8h) and 50% how you felt.</li>
              <li><strong className="text-white">Smoothing</strong> uses an exponential moving average so one bad day does not dominate.</li>
              <li><strong className="text-white">Needs attention</strong> triggers when 7-day load rises 10% or more while recovery falls 5% or more.</li>
            </ul>
          </div>
          <Card title="Sample attention check" subtitle="Illustrative values only">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-line bg-ink/40 px-3 py-2"><span className="text-slate-300">Training load</span><span className="text-slate-200">342 → 405 <span className="text-amber-400">(+18.4%)</span></span></div>
              <div className="flex items-center justify-between rounded-lg border border-line bg-ink/40 px-3 py-2"><span className="text-slate-300">Recovery</span><span className="text-slate-200">71.0 → 64.5 <span className="text-red-400">(-9.2%)</span></span></div>
              <p className="text-xs leading-relaxed text-slate-400">Consider discussing your recent training schedule and recovery with your coach.</p>
            </div>
          </Card>
        </div>
      </section>

      <section id="security" className="light-section scroll-mt-16 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-semibold text-electric">Security and privacy</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">Your data stays yours</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {SECURITY.map(([Icon, t, d]) => (
              <div key={t} className="rounded-xl border border-slate-200 bg-white p-6">
                <Icon className="h-6 w-6 text-violet" aria-hidden />
                <h3 className="mt-3 font-display text-base font-semibold text-ink">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-semibold text-white">Start modelling your training today</h2>
          <p className="mt-3 text-slate-400">Create an account, log your first day, and watch your twin take shape.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/register"><Button size="lg">Get started</Button></Link>
            <Link to="/login"><Button size="lg" variant="secondary">Log in</Button></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
