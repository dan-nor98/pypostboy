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
  Globe,
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
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const statusStyles: Record<string, string> = {
  healthy: 'bg-[hsl(var(--state-healthy)/0.15)] text-[hsl(var(--state-healthy))]',
  warning: 'bg-[hsl(var(--state-warning)/0.15)] text-[hsl(var(--state-warning))]',
  error: 'bg-[hsl(var(--state-error)/0.15)] text-[hsl(var(--state-error))]',
  info: 'bg-[hsl(var(--state-info)/0.15)] text-[hsl(var(--state-info))]',
};

const distribution = [
  { name: 'Healthy 2xx', value: 82, key: 'healthy' },
  { name: 'Warning 4xx', value: 11, key: 'warning' },
  { name: 'Error 5xx', value: 7, key: 'error' },
];

const trafficData = [
  { t: '08:00', traffic: 980, latency: 124 },
  { t: '10:00', traffic: 1260, latency: 112 },
  { t: '12:00', traffic: 1620, latency: 136 },
  { t: '14:00', traffic: 1810, latency: 145 },
  { t: '16:00', traffic: 1710, latency: 129 },
  { t: '18:00', traffic: 1490, latency: 121 },
];

export default function EnterpriseApiDashboard() {
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
              <div className="h-56"><ResponsiveContainer><AreaChart data={trafficData}><defs><linearGradient id="traf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} /><stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="hsl(var(--border-subtle))" strokeDasharray="4 4" /><XAxis dataKey="t" stroke="hsl(var(--text-meta))" /><YAxis stroke="hsl(var(--text-meta))" /><Tooltip /><Area dataKey="traffic" stroke="hsl(var(--chart-1))" fill="url(#traf)" /><Line dataKey="latency" stroke="hsl(var(--chart-2))" dot={false} /></AreaChart></ResponsiveContainer></div>
              <div className="mt-3 flex gap-2 text-xs"><span className="insight-chip bg-[hsl(var(--state-healthy)/0.15)] text-[hsl(var(--state-healthy))]">Healthy p95 145ms</span><span className="insight-chip bg-[hsl(var(--state-warning)/0.15)] text-[hsl(var(--state-warning))]">Warning spikes at 14:00 UTC</span><span className="insight-chip bg-[hsl(var(--state-error)/0.15)] text-[hsl(var(--state-error))]">Error peak 0.52%</span></div>
            </section>

            <section className="card-shell"><h2 className="mb-3 font-medium">Response Distribution</h2><div className="h-48"><ResponsiveContainer><PieChart><Pie data={distribution} dataKey="value" innerRadius={48} outerRadius={72}>{distribution.map((d) => <Cell key={d.name} fill={`hsl(var(--state-${d.key}))`} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></section>

            <section className="card-shell 2xl:col-span-2"><h2 className="mb-3 font-medium">Monitoring Summary</h2><div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[{label:'P1 alerts',value:2,icon:AlertTriangle,key:'error'},{label:'SLA breaches',value:1,icon:ShieldCheck,key:'warning'},{label:'Failed tests',value:4,icon:XCircle,key:'error'},{label:'Passing tests',value:47,icon:CheckCircle2,key:'healthy'}].map((a) => <div key={a.label} className="metric-tile interactive"><a.icon className="mb-1 h-4 w-4 text-accent" /><p className="text-lg font-semibold">{a.value}</p><p className="text-xs text-[hsl(var(--text-meta))]">{a.label}</p><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] ${statusStyles[a.key]}`}>{a.key}</span></div>)}</div></section>
          </main>
        </div>

        <aside className="hidden border-l border-border/70 bg-[hsl(var(--bg-panel-2)/0.88)] p-5 xl:block" aria-label="AI assistant panel">
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-medium"><Bot className="h-4 w-4 text-accent" /> Insight Assistant</h2><Sparkles className="h-4 w-4 text-accent" /></div>
          <section className="space-y-3">{[
            { prompt: 'Investigate AP-South latency spike', insight: 'Cache warmup lag likely from 08:00 autoscale replacement.' },
            { prompt: 'Summarize failed tests', insight: 'Billing contract test failed after invoice_total field precision change.' },
            { prompt: 'Optimize retry policy', insight: 'Drop GET retries from 5 to 3 for idempotent endpoints to protect upstream quotas.' },
          ].map((a) => <article key={a.prompt} className="card-shell interactive"><p className="mb-1 flex items-center gap-2 text-sm"><MessageSquareText className="h-4 w-4 text-muted" />{a.prompt}</p><p className="text-xs text-[hsl(var(--text-meta))]">{a.insight}</p></article>)}</section>
          <section className="mt-5 card-shell"><h3 className="mb-2 flex items-center gap-2 text-sm font-medium"><ListChecks className="h-4 w-4 text-accent" /> Runbook Actions</h3><div className="grid gap-2 text-sm text-muted">{[PlayCircle, Server, Database, LifeBuoy, Layers3, Clock3].map((Icon, i) => (<button key={i} className="nav-item interactive !py-1"><Icon className="h-4 w-4" />Execute production-safe action</button>))}</div></section>
        </aside>
      </div>
    </div>
  );
}
