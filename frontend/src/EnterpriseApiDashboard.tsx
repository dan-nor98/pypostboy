import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  Activity,
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Command,
  Database,
  Globe2,
  LayoutDashboard,
  ListChecks,
  Rocket,
  Search,
  Server,
  Shield,
  Sparkles,
  Users,
  Workflow,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { loadDashboardViewModel } from './dashboard/adapters';
import { formatLatencyMs, formatPercentage, formatRpm, formatUptimeSla } from './dashboard/formatters';
import type { DashboardViewModel, InfraStatus } from './dashboard/viewModel';

const statusStyles: Record<string, string> = {
  healthy: 'bg-[hsl(var(--state-healthy)/0.15)] text-[hsl(var(--state-healthy))]',
  warning: 'bg-[hsl(var(--state-warning)/0.15)] text-[hsl(var(--state-warning))]',
  error: 'bg-[hsl(var(--state-error)/0.15)] text-[hsl(var(--state-error))]',
  info: 'bg-[hsl(var(--state-info)/0.15)] text-[hsl(var(--state-info))]',
};

const methodStyles: Record<string, string> = {
  GET: 'bg-[hsl(var(--state-info)/0.16)] text-[hsl(var(--state-info))]',
  POST: 'bg-[hsl(var(--accent)/0.18)] text-accent',
  PUT: 'bg-[hsl(var(--state-warning)/0.15)] text-[hsl(var(--state-warning))]',
  DELETE: 'bg-[hsl(var(--state-error)/0.16)] text-[hsl(var(--state-error))]',
};

const statusIcons: Record<InfraStatus['icon'], ComponentType<{ className?: string }>> = {
  alert: Zap,
  shield: Shield,
  error: XCircle,
  check: CheckCircle2,
};

type SidebarNavItem = [label: string, Icon: ComponentType<{ className?: string }>];

const sidebarNavItems: SidebarNavItem[] = [
  ['Dashboard', LayoutDashboard],
  ['APIs', Server],
  ['Collections', Database],
  ['Environments', Globe2],
  ['Monitors', Activity],
  ['Workflows', Workflow],
  ['Analytics', ListChecks],
  ['Security', Shield],
  ['Team', Users],
];

export default function EnterpriseApiDashboard() {
  const [viewModel, setViewModel] = useState<DashboardViewModel | null>(null);

  useEffect(() => {
    loadDashboardViewModel().then(setViewModel);
  }, []);

  const trafficInsights = useMemo(() => {
    if (!viewModel?.traffic.length) return { peakRpm: 0, worstError: 0 };
    return {
      peakRpm: viewModel.traffic.reduce((max, point) => (point.rpm > max ? point.rpm : max), 0),
      worstError: viewModel.traffic.reduce((max, point) => (point.errorRate > max ? point.errorRate : max), 0),
    };
  }, [viewModel]);

  if (!viewModel) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[250px_minmax(0,1fr)_320px]">
        <aside className="border-b border-border/70 bg-[hsl(var(--bg-panel-1)/0.9)] p-4 md:p-5 xl:border-b-0 xl:border-r">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-accent/20 p-2 text-accent"><Cloud className="h-5 w-5" /></div>
            <div><p className="text-xs text-[hsl(var(--text-meta))]">Vertex Systems</p><h2 className="font-semibold">PostFlow Enterprise</h2></div>
          </div>
          <button className="cmd-input interactive mb-5 w-full justify-between text-left">
            <span>Workspace · Global Platform</span><ChevronDown className="h-4 w-4" />
          </button>
          <nav className="space-y-1 text-sm">
            {sidebarNavItems.map(([label, Icon], i) => (
              <button key={String(label)} className={`nav-item interactive ${i === 0 ? 'bg-accent/20 text-foreground' : ''}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>
          <div className="mt-8 rounded-[var(--radius-lg)] border border-border/70 bg-background/40 p-3">
            <p className="text-xs text-[hsl(var(--text-meta))]">Team Space</p>
            <p className="mt-1 text-sm font-medium">Platform Reliability Guild</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 px-4 py-4 backdrop-blur-xl md:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <button className="cmd-input interactive min-w-[260px] flex-1 justify-start"><Search className="h-4 w-4" />Search APIs, alerts, commands…</button>
              <button className="cmd-input interactive">Prod-US <ChevronDown className="h-4 w-4" /></button>
              <span className="rounded-full border border-[hsl(var(--state-healthy)/0.5)] bg-[hsl(var(--state-healthy)/0.12)] px-3 py-2 text-xs text-[hsl(var(--state-healthy))]">Platform health: Operational</span>
              <button className="cmd-input interactive"><Bell className="h-4 w-4" /></button>
              <button className="cmd-input interactive">AD</button>
              <button className="cta-btn interactive"><Rocket className="mr-2 inline h-4 w-4" />New API Request</button>
            </div>
          </header>

          <main className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-5 2xl:grid-cols-3">
            <section className="card-shell md:col-span-2">
              <div className="mb-3 flex items-center justify-between"><h2 className="font-medium">API Traffic Overview</h2><span className="insight-chip bg-accent/15 text-accent">Peak {formatRpm(trafficInsights.peakRpm)}</span></div>
              <div className="h-56"><ResponsiveContainer><AreaChart data={viewModel.traffic}><defs><linearGradient id="traf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.45} /><stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="hsl(var(--border-subtle))" strokeDasharray="4 4" /><XAxis dataKey="timestamp" stroke="hsl(var(--text-meta))" /><YAxis stroke="hsl(var(--text-meta))" /><Tooltip /><Area dataKey="rpm" stroke="hsl(var(--chart-1))" fill="url(#traf)" /><Line dataKey="latencyMs" stroke="hsl(var(--chart-2))" dot={false} /><Line dataKey="errorRate" stroke="hsl(var(--state-error))" dot={false} /></AreaChart></ResponsiveContainer></div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="metric-tile"><p className="text-[hsl(var(--text-meta))]">Requests/min</p><p className="text-lg font-semibold">{formatRpm(viewModel.kpis.rpm)}</p></div>
                <div className="metric-tile"><p className="text-[hsl(var(--text-meta))]">Latency p95</p><p className="text-lg font-semibold">{formatLatencyMs(viewModel.kpis.latencyMs)}</p></div>
                <div className="metric-tile"><p className="text-[hsl(var(--text-meta))]">Error rate</p><p className="text-lg font-semibold text-[hsl(var(--state-error))]">{formatPercentage(viewModel.kpis.errorRate, 2)}</p></div>
              </div>
            </section>

            <section className="card-shell"><h2 className="mb-3 font-medium">Infrastructure Health</h2><div className="space-y-2">{viewModel.infraSummary.map((item) => { const Icon = statusIcons[item.icon]; return <div key={item.label} className="metric-tile flex items-center justify-between"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-accent" /><span>{item.label}</span></div><span className={`rounded-full px-2 py-1 text-xs ${statusStyles[item.status]}`}>{item.value}</span></div>; })}<p className="mt-3 text-xs text-[hsl(var(--text-meta))]">{formatUptimeSla(viewModel.uptimeRatio)} · Gateway: Active · Regions: 6/6</p></div></section>

            <section className="card-shell"><h2 className="mb-3 font-medium">API Collections</h2><div className="space-y-2">{viewModel.collections.map((item) => <div key={item.name} className="metric-tile"><div className="mb-1 flex items-center justify-between"><p className="text-sm font-medium">{item.name}</p><span className={`rounded-full px-2 py-1 text-xs ${methodStyles[item.method]}`}>{item.method}</span></div><div className="flex items-center justify-between text-xs"><span className="text-[hsl(var(--text-meta))]">{item.statusText}</span><span className="text-[hsl(var(--text-meta))]">{item.endpoints} endpoints</span></div></div>)}</div></section>

            <section className="card-shell"><h2 className="mb-3 font-medium">Monitoring Panel</h2><div className="space-y-2">{viewModel.alerts.map((alert) => <div key={alert.title} className="metric-tile"><div className="mb-1 flex items-center justify-between"><p className="text-sm">{alert.title}</p><span className={`rounded-full px-2 py-1 text-xs ${statusStyles[alert.status]}`}>{alert.severity}</span></div><p className="text-xs text-[hsl(var(--text-meta))]">{alert.summary}</p></div>)}</div></section>

            <section className="card-shell"><h2 className="mb-3 font-medium">Workflow Orchestration</h2><div className="flex items-center gap-2 overflow-x-auto">{viewModel.workflow.map((step, i) => <div key={step.label} className="flex items-center gap-2"><span className="insight-chip bg-background/60">{step.label}</span>{i < viewModel.workflow.length - 1 && <span className="text-[hsl(var(--text-meta))]">→</span>}</div>)}</div><p className="mt-3 text-xs text-[hsl(var(--text-meta))]">Automation coverage {viewModel.automationCoverage}% · Last run 2m ago</p></section>

            <section className="card-shell"><h2 className="mb-3 font-medium">Usage by Team</h2><div className="h-44"><ResponsiveContainer><BarChart data={viewModel.teamUsage}><CartesianGrid stroke="hsl(var(--border-subtle))" strokeDasharray="4 4" /><XAxis dataKey="team" stroke="hsl(var(--text-meta))" /><YAxis stroke="hsl(var(--text-meta))" /><Tooltip /><Bar dataKey="sharePercent" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section>

            <section className="card-shell"><h2 className="mb-3 font-medium">Error Breakdown</h2><div className="h-44"><ResponsiveContainer><PieChart><Pie data={viewModel.errorBreakdown} dataKey="percent" innerRadius={38} outerRadius={66}>{viewModel.errorBreakdown.map((slice) => <Cell key={slice.name} fill={`hsl(var(--state-${slice.status}))`} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></section>
          </main>
        </div>

        <aside className="border-t border-border/70 bg-[hsl(var(--bg-panel-2)/0.9)] p-5 xl:border-l xl:border-t-0">
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-medium"><Bot className="h-4 w-4 text-accent" />AI API Assistant</h2><Sparkles className="h-4 w-4 text-accent" /></div>
          <div className="space-y-3">{viewModel.assistantInsights.map((item) => <article key={item.prompt} className="card-shell interactive"><p className="text-sm font-medium">{item.prompt}</p><p className="mt-1 text-xs text-[hsl(var(--text-meta))]">{item.insight}</p></article>)}</div>
          <div className="mt-4 card-shell">
            <h3 className="mb-2 text-sm font-medium">Suggested actions</h3>
            {['Generate auth tests', 'Explain 500 errors', 'Optimize slow endpoints'].map((s) => (
              <button key={s} className="nav-item interactive mb-1 !py-1"><Command className="h-4 w-4 text-accent" />{s}</button>
            ))}
            <div className="mt-2 rounded-lg border border-border/60 bg-background/40 p-2 text-xs text-[hsl(var(--text-meta))]"><Wrench className="mr-1 inline h-3.5 w-3.5" />SLA risk down 14% after retry policy tuning.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
