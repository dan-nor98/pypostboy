import type { ReactNode } from 'react';
import {
  Braces,
  Check,
  ChevronDown,
  Clock3,
  Code2,
  Copy,
  Database,
  Download,
  FileJson,
  Folder,
  Globe2,
  History,
  KeyRound,
  Lock,
  LogOut,
  Moon,
  Plus,
  Save,
  Search,
  Send,
  Settings2,
  Upload,
  UserCircle2,
  Wand2,
} from 'lucide-react';

const collections = [
  { name: 'Authentication', count: 4, requests: ['Login user', 'Refresh token'] },
  { name: 'Orders API', count: 7, requests: ['List orders', 'Create order'] },
  { name: 'Health checks', count: 3, requests: ['Service status', 'Readiness probe'] },
];

const history = [
  { method: 'GET', path: '/api/orders', time: '2 min ago', status: '200 OK' },
  { method: 'POST', path: '/api/auth/login', time: '11 min ago', status: '201 Created' },
  { method: 'PATCH', path: '/api/orders/902', time: '34 min ago', status: '204 No Content' },
];

const params = [
  ['page', '1', 'Current page number'],
  ['limit', '25', 'Maximum rows returned'],
  ['include', 'line_items', 'Expand nested resources'],
];

const headers = [
  ['Authorization', 'Bearer {{token}}'],
  ['Content-Type', 'application/json'],
];

const environments = ['Local', 'Staging', 'Production'];

const methodBadgeStyles: Record<string, string> = {
  GET: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  POST: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  PATCH: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
};

function ShellButton({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active
          ? 'border-accent/40 bg-accent/15 text-foreground'
          : 'border-border/80 bg-card/70 text-muted hover:border-accent/40 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-border/80 bg-card/85 shadow-sm ${className}`}>{children}</section>;
}

export default function PostBoyDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
        <aside className="border-b border-border/80 bg-[hsl(var(--bg-panel-1)/0.95)] p-4 xl:border-b-0 xl:border-r">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/20 text-accent">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--text-meta))]">API Testing Client</p>
              <h1 className="text-xl font-semibold">PostBoy</h1>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-border/80 bg-background/55 p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <UserCircle2 className="h-4 w-4 text-accent" /> Guest workspace
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Temporary session active
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ShellButton><LogOut className="h-4 w-4" /> Log out</ShellButton>
              <ShellButton><Moon className="h-4 w-4" /> Theme</ShellButton>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <ShellButton active><Folder className="h-4 w-4" /> Collections</ShellButton>
            <ShellButton><History className="h-4 w-4" /> History</ShellButton>
            <ShellButton><Globe2 className="h-4 w-4" /> Environ</ShellButton>
          </div>

          <div className="mb-4 flex gap-2">
            <button type="button" className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black shadow-lg shadow-orange-500/20">
              <Plus className="mr-1 inline h-4 w-4" /> New Collection
            </button>
            <ShellButton><Upload className="h-4 w-4" /> Import</ShellButton>
          </div>

          <label className="mb-4 flex items-center gap-2 rounded-xl border border-border/80 bg-background/60 px-3 py-2 text-sm text-muted">
            <Search className="h-4 w-4" />
            <input className="w-full bg-transparent outline-none placeholder:text-muted" placeholder="Search collections, folders, requests…" />
          </label>

          <div className="space-y-3">
            {collections.map((collection) => (
              <article key={collection.name} className="rounded-2xl border border-border/70 bg-background/45 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium"><Folder className="h-4 w-4 text-accent" /> {collection.name}</div>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">{collection.count}</span>
                </div>
                <div className="space-y-1">
                  {collection.requests.map((request) => (
                    <button key={request} type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-muted hover:bg-card hover:text-foreground">
                      <FileJson className="h-3.5 w-3.5" /> {request}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </aside>

        <main className="flex min-w-0 flex-col p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <ShellButton active>Untitled Request</ShellButton>
            <ShellButton>Orders API / List orders</ShellButton>
            <ShellButton><Plus className="h-4 w-4" /> New tab</ShellButton>
          </div>

          <Panel className="mb-4 p-4">
            <div className="grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)_110px]">
              <button type="button" className="flex items-center justify-between rounded-xl border border-border/80 bg-background/60 px-3 py-3 text-left font-semibold text-sky-600 dark:text-sky-300">
                GET <ChevronDown className="h-4 w-4 text-muted" />
              </button>
              <input className="rounded-xl border border-border/80 bg-background/60 px-4 py-3 text-sm outline-none focus:border-accent" defaultValue="https://api.example.com/orders?page=1&limit=25" />
              <button type="button" className="rounded-xl bg-accent px-4 py-3 font-semibold text-black shadow-lg shadow-orange-500/25">
                <Send className="mr-2 inline h-4 w-4" /> Send
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <ShellButton><Settings2 className="h-4 w-4" /> Server proxy</ShellButton>
              <ShellButton><Lock className="h-4 w-4" /> Credentials omitted</ShellButton>
              <ShellButton><Wand2 className="h-4 w-4" /> Advanced options</ShellButton>
            </div>
          </Panel>

          <div className="grid flex-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
            <Panel className="overflow-hidden">
              <div className="flex flex-wrap border-b border-border/80 bg-background/35 p-2">
                {['Params', 'Headers', 'Body', 'Auth'].map((tab, index) => (
                  <button key={tab} type="button" className={`rounded-xl px-4 py-2 text-sm font-medium ${index === 0 ? 'bg-accent/15 text-foreground' : 'text-muted hover:text-foreground'}`}>{tab}</button>
                ))}
              </div>
              <div className="p-4">
                <div className="mb-3 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-700 dark:text-sky-200">
                  Query parameters are detected from the URL and ready to edit before sending.
                </div>
                <div className="overflow-hidden rounded-xl border border-border/80">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="bg-background/70 text-xs uppercase tracking-wide text-muted">
                      <tr><th className="px-3 py-2">On</th><th className="px-3 py-2">Key</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Description</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {params.map(([key, value, description]) => (
                        <tr key={key} className="bg-card/40">
                          <td className="px-3 py-2"><Check className="h-4 w-4 text-emerald-500" /></td>
                          <td className="px-3 py-2 font-mono text-foreground">{key}</td>
                          <td className="px-3 py-2 font-mono text-muted">{value}</td>
                          <td className="px-3 py-2 text-muted">{description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="mt-3 rounded-xl border border-border/80 px-3 py-2 text-sm text-muted hover:border-accent/40 hover:text-foreground">+ Add parameter</button>
              </div>
            </Panel>

            <Panel className="flex min-h-[420px] flex-col overflow-hidden">
              <div className="border-b border-border/80 bg-background/35 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold">Request body</h2>
                  <span className="rounded-full bg-accent/10 px-2 py-1 text-xs text-accent">JSON</span>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-muted">
                  {headers.map(([key, value]) => <span key={key} className="rounded-full border border-border/70 px-2 py-1 font-mono">{key}: {value}</span>)}
                </div>
              </div>
              <pre className="flex-1 overflow-auto p-4 text-sm leading-6 text-[hsl(var(--text-secondary))]"><code>{`{
  "customer_id": "cus_123",
  "include": ["line_items", "shipping"],
  "limit": 25
}`}</code></pre>
            </Panel>
          </div>

          <Panel className="mt-4 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-background/35 p-4">
              <div>
                <h2 className="font-semibold">Response</h2>
                <p className="text-sm text-muted">Send a request to inspect status, timing, headers, and body.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-600 dark:text-emerald-300">Status 200</span>
                <span className="rounded-full border border-border/80 px-3 py-1 text-muted">128 ms</span>
                <span className="rounded-full border border-border/80 px-3 py-1 text-muted">14.2 KB</span>
                <ShellButton><Save className="h-4 w-4" /> Save Snapshot</ShellButton>
                <ShellButton><Copy className="h-4 w-4" /> Copy</ShellButton>
              </div>
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <pre className="overflow-auto rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-100"><code>{`{
  "data": [],
  "page": 1,
  "limit": 25,
  "message": "Response preview appears here."
}`}</code></pre>
              <div className="rounded-xl border border-border/80 bg-background/45 p-3 text-sm text-muted">
                <h3 className="mb-2 font-medium text-foreground">Headers</h3>
                <p className="font-mono">content-type: application/json</p>
                <p className="font-mono">cache-control: no-cache</p>
              </div>
            </div>
          </Panel>
        </main>

        <aside className="border-t border-border/80 bg-[hsl(var(--bg-panel-2)/0.95)] p-4 xl:border-l xl:border-t-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Tools</h2>
            <Settings2 className="h-4 w-4 text-muted" />
          </div>

          <Panel className="mb-4 p-4">
            <h3 className="mb-2 flex items-center gap-2 font-medium"><Database className="h-4 w-4 text-accent" /> Snapshot Management</h3>
            <p className="mb-3 text-sm text-muted">Save useful responses and reload them while debugging request changes.</p>
            <button type="button" className="w-full rounded-xl border border-border/80 px-3 py-2 text-sm text-muted hover:border-accent/40 hover:text-foreground">Save Snapshot from Response</button>
          </Panel>

          <Panel className="mb-4 p-4">
            <h3 className="mb-2 flex items-center gap-2 font-medium"><Code2 className="h-4 w-4 text-accent" /> cURL Output</h3>
            <textarea className="min-h-36 w-full rounded-xl border border-border/80 bg-background/60 p-3 font-mono text-xs outline-none focus:border-accent" readOnly value={'curl -X GET "https://api.example.com/orders?page=1&limit=25" \\\n  -H "Authorization: Bearer {{token}}"'} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ShellButton><Braces className="h-4 w-4" /> Generate</ShellButton>
              <ShellButton><Copy className="h-4 w-4" /> Copy</ShellButton>
            </div>
          </Panel>

          <Panel className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-medium"><KeyRound className="h-4 w-4 text-accent" /> Environments</h3>
            <div className="space-y-2">
              {environments.map((environment, index) => (
                <button key={environment} type="button" className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm ${index === 1 ? 'border-accent/40 bg-accent/10 text-foreground' : 'border-border/80 text-muted hover:text-foreground'}`}>
                  {environment}
                  {index === 1 ? <Check className="h-4 w-4 text-accent" /> : <Clock3 className="h-4 w-4" />}
                </button>
              ))}
            </div>
            <button type="button" className="mt-3 w-full rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black"><Download className="mr-2 inline h-4 w-4" /> Export Collection</button>
          </Panel>

          <div className="mt-4 rounded-2xl border border-border/80 bg-background/45 p-3">
            <h3 className="mb-2 text-sm font-medium">Recent history</h3>
            <div className="space-y-2">
              {history.map((item) => (
                <div key={`${item.method}-${item.path}`} className="rounded-xl border border-border/60 p-2 text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`rounded px-1.5 py-0.5 font-semibold ${methodBadgeStyles[item.method]}`}>{item.method}</span>
                    <span className="text-muted">{item.time}</span>
                  </div>
                  <p className="truncate font-mono text-sm">{item.path}</p>
                  <p className="text-muted">{item.status}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
