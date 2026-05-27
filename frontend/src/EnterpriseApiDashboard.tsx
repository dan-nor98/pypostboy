import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cloud,
  Code2,
  Database,
  Gauge,
  Layers3,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  MessageSquareText,
  PlayCircle,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  XCircle,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Cell, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { loadDashboardViewModel } from './dashboard/adapters';
import { formatLatencyMs, formatPercentage, formatRpm, formatUptimeSla } from './dashboard/formatters';
import type { DashboardViewModel, InfraStatus } from './dashboard/viewModel';

const statusStyles: Record<string, string> = {
  healthy: 'bg-[hsl(var(--state-healthy)/0.15)] text-[hsl(var(--state-healthy))]',
  warning: 'bg-[hsl(var(--state-warning)/0.15)] text-[hsl(var(--state-warning))]',
  error: 'bg-[hsl(var(--state-error)/0.15)] text-[hsl(var(--state-error))]',
  info: 'bg-[hsl(var(--state-info)/0.15)] text-[hsl(var(--state-info))]',
};

const statusIcons: Record<InfraStatus['icon'], ComponentType<{ className?: string }>> = {
  alert: AlertTriangle,
  shield: ShieldCheck,
  error: XCircle,
  check: CheckCircle2,
};

export default function EnterpriseApiDashboard() {
  const [viewModel, setViewModel] = useState<DashboardViewModel | null>(null);

  useEffect(() => {
    loadDashboardViewModel().then(setViewModel);
  }, []);

  const trafficInsights = useMemo(() => {
    if (!viewModel?.traffic.length) {
      return { p95: 'n/a', warningTime: 'n/a' };
    }

    const peakLatencyPoint = viewModel.traffic.reduce((max, point) => point.latencyMs > max.latencyMs ? point : max, viewModel.traffic[0]);
    const peakRpm = viewModel.traffic.reduce((max, point) => point.rpm > max ? point.rpm : max, 0);
    return {
      p95: formatLatencyMs(peakLatencyPoint.latencyMs),
      warningTime: peakLatencyPoint.timestamp,
      peakRpm: formatRpm(peakRpm),
    };
  }, [viewModel]);

  if (!viewModel) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="border-b border-border/70 bg-[hsl(var(--bg-panel-1)/0.88)] p-4 md:p-5 xl:border-b-0 xl:border-r" aria-label="Primary navigation">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-accent/20 p-2 text-accent"><Cloud className="h-5 w-5" /></div>
            <div><p className="text-xs text-[hsl(var(--text-meta))]">Enterprise Console</p><h2 className="font-semibold">API Pulse</h2></div>
          </div>
          <nav className="space-y-1">
            {[[ 'Overview', LayoutGrid ], [ 'Collections', Code2 ], [ 'Monitoring', Activity ], [ 'Workflow', Workflow ], [ 'Teams', Users ], [ 'Settings', Settings ]].map(([label, Icon], i) => (
              <button key={String(label)} className={`nav-item interactive ${i === 0 ? 'bg-accent/20 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]' : ''}`}>
                <Icon className="h-4 w-4" />{label}{i === 0 && <ChevronRight className="ml-auto h-4 w-4 text-accent" />}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 px-4 py-4 backdrop-blur-xl md:px-6" aria-label="Dashboard header">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs uppercase tracking-wide text-[hsl(var(--text-meta))]">Live Operations</p><h1 className="text-xl font-semibold md:text-2xl">Enterprise API Dashboard</h1></div>
              <div className="flex items-center gap-2">
                <button className="cmd-input interactive"><Search className="h-4 w-4" />Command</button>
                <button className="cta-btn interactive">Deploy Canary Release</button>
              </div>
            </div>
          </header>

          <main className="grid min-w-0 grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-5 2xl:grid-cols-3" aria-label="Main dashboard widgets">
            <section className="card-shell md:col-span-2 2xl:col-span-2">
              <div className="mb-3 flex items-center justify-between"><h2 className="font-medium">Traffic & Latency</h2><Gauge className="h-4 w-4 text-accent" /></div>
              <div className="h-56"><ResponsiveContainer><AreaChart data={viewModel.traffic}><defs><linearGradient id="traf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} /><stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="hsl(var(--border-subtle))" strokeDasharray="4 4" /><XAxis dataKey="timestamp" stroke="hsl(var(--text-meta))" /><YAxis stroke="hsl(var(--text-meta))" /><Tooltip /><Area dataKey="rpm" stroke="hsl(var(--chart-1))" fill="url(#traf)" /><Line dataKey="latencyMs" stroke="hsl(var(--chart-2))" dot={false} /></AreaChart></ResponsiveContainer></div>
              <div className="mt-3 flex gap-2 text-xs"><span className="insight-chip bg-[hsl(var(--state-healthy)/0.15)] text-[hsl(var(--state-healthy))]">Healthy p95 {trafficInsights.p95}</span><span className="insight-chip bg-[hsl(var(--state-warning)/0.15)] text-[hsl(var(--state-warning))]">Warning spikes at {trafficInsights.warningTime} UTC</span><span className="insight-chip bg-[hsl(var(--state-info)/0.15)] text-[hsl(var(--state-info))]">Peak throughput {trafficInsights.peakRpm}</span><span className="insight-chip bg-[hsl(var(--state-error)/0.15)] text-[hsl(var(--state-error))]">Error peak {formatPercentage(0.52)}</span></div>
            </section>

            <section className="card-shell"><h2 className="mb-3 font-medium">Response Distribution</h2><div className="h-48"><ResponsiveContainer><PieChart><Pie data={viewModel.responseDistribution} dataKey="percent" innerRadius={48} outerRadius={72}>{viewModel.responseDistribution.map((d) => <Cell key={d.name} fill={`hsl(var(--state-${d.status}))`} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></section>

            <section className="card-shell 2xl:col-span-2"><h2 className="mb-3 font-medium">Monitoring Summary</h2><div className="grid grid-cols-2 gap-2 md:grid-cols-4">{viewModel.infraSummary.map((a) => { const Icon = statusIcons[a.icon]; return <div key={a.label} className="metric-tile interactive"><Icon className="mb-1 h-4 w-4 text-accent" /><p className="text-lg font-semibold">{a.value}</p><p className="text-xs text-[hsl(var(--text-meta))]">{a.label}</p><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] ${statusStyles[a.status]}`}>{a.status}</span></div>; })}</div></section>
          </main>
        </div>

        <aside className="hidden border-l border-border/70 bg-[hsl(var(--bg-panel-2)/0.88)] p-5 xl:block" aria-label="AI assistant panel">
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-medium"><Bot className="h-4 w-4 text-accent" /> Insight Assistant</h2><Sparkles className="h-4 w-4 text-accent" /></div>
          <section className="space-y-3">{viewModel.assistantInsights.map((a) => <article key={a.prompt} className="card-shell interactive"><p className="mb-1 flex items-center gap-2 text-sm"><MessageSquareText className="h-4 w-4 text-muted" />{a.prompt}</p><p className="text-xs text-[hsl(var(--text-meta))]">{a.insight}</p></article>)}</section>
          <section className="mt-5 card-shell"><h3 className="mb-2 flex items-center gap-2 text-sm font-medium"><ListChecks className="h-4 w-4 text-accent" /> Runbook Actions · {formatUptimeSla(0.9995)}</h3><div className="grid gap-2 text-sm text-muted">{[PlayCircle, Server, Database, LifeBuoy, Layers3, Clock3].map((Icon, i) => (<button key={viewModel.runbookSteps[i].action} className="nav-item interactive !py-1"><Icon className="h-4 w-4" />{viewModel.runbookSteps[i].label}</button>))}</div></section>
        </aside>
      </div>
    </div>
  );
}
