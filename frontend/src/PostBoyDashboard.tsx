import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import {
  firstRequestInCollections,
  headersToProxyMap,
  loadCollections,
  loadRequestDetails,
  loadResponseHistory,
  loadWorkspaceUser,
  sendProxyRequest,
} from './dashboard/adapters';
import {
  createInitialDashboardViewModel,
  errorLoadable,
  loadingLoadable,
  readyLoadable,
  type CollectionNode,
  type DashboardViewModel,
  type KeyValuePair,
  type RequestDetails,
  type RequestIdentity,
  type RequestInstance,
} from './dashboard/viewModel';

const methodBadgeStyles: Record<string, string> = {
  GET: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  POST: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  PUT: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',
  PATCH: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  DELETE: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
};

function ShellButton({ children, active = false, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
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

function formatBody(value: unknown) {
  if (value === null || value === undefined || value === '') return 'No body content for this request.';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function statusLabel(instance: RequestInstance) {
  const status = instance.responseStatus ? String(instance.responseStatus) : 'Not sent';
  return instance.responseStatusText ? `${status} ${instance.responseStatusText}` : status;
}

function requestParams(request: RequestDetails | null): KeyValuePair[] {
  if (!request?.url) return [];
  try {
    const parsed = new URL(request.url);
    return Array.from(parsed.searchParams.entries()).map(([key, value]) => ({ key, value, enabled: true }));
  } catch (_err) {
    return request.params;
  }
}

function CollectionTree({ collections, selectedRequestId, onSelectRequest }: { collections: CollectionNode[]; selectedRequestId?: number; onSelectRequest: (request: RequestIdentity) => void }) {
  if (collections.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-background/45 p-4 text-sm text-muted">
        No collections yet. Import a Postman collection or create a collection in the classic workspace.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {collections.map((collection) => (
        <article key={collection.id} className="rounded-2xl border border-border/70 bg-background/45 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2 font-medium"><Folder className="h-4 w-4 shrink-0 text-accent" /> <span className="truncate">{collection.name}</span></div>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">{collection.requests.length}</span>
          </div>
          <div className="space-y-1">
            {collection.requests.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => onSelectRequest(request)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                  selectedRequestId === request.id ? 'bg-accent/15 text-foreground' : 'text-muted hover:bg-card hover:text-foreground'
                }`}
              >
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${methodBadgeStyles[request.method] ?? 'bg-slate-500/15 text-slate-500'}`}>{request.method}</span>
                <FileJson className="h-3.5 w-3.5" />
                <span className="truncate">{request.name}</span>
              </button>
            ))}
            {collection.children.length > 0 ? <CollectionTree collections={collection.children} selectedRequestId={selectedRequestId} onSelectRequest={onSelectRequest} /> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export default function PostBoyDashboard() {
  const [model, setModel] = useState<DashboardViewModel>(() => createInitialDashboardViewModel());
  const selectedRequest = model.selectedRequest.data;
  const queryParams = useMemo(() => requestParams(selectedRequest), [selectedRequest]);
  const latestResponse = model.lastResponse;

  useEffect(() => {
    let active = true;

    setModel((current) => ({ ...current, collections: loadingLoadable(current.collections.data) }));

    Promise.all([loadWorkspaceUser(), loadCollections()])
      .then(([workspace, collections]) => {
        if (!active) return;
        const firstRequest = firstRequestInCollections(collections);
        setModel((current) => ({ ...current, workspace, collections: readyLoadable(collections) }));
        if (firstRequest) {
          selectRequest(firstRequest.id);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setModel((current) => ({ ...current, collections: errorLoadable(current.collections.data, err instanceof Error ? err.message : 'Unable to load collections') }));
      });

    return () => {
      active = false;
    };
  }, []);

  function selectRequest(requestId: number) {
    setModel((current) => ({
      ...current,
      selectedRequest: loadingLoadable(current.selectedRequest.data),
      responseHistory: loadingLoadable(current.responseHistory.data),
    }));

    loadRequestDetails(requestId)
      .then((request) => {
        setModel((current) => ({
          ...current,
          selectedRequest: readyLoadable(request),
          responseHistory: readyLoadable(request.instances),
        }));
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unable to load request details';
        setModel((current) => ({
          ...current,
          selectedRequest: errorLoadable(current.selectedRequest.data, message),
          responseHistory: errorLoadable(current.responseHistory.data, message),
        }));
      });
  }

  function refreshHistory(requestId: number) {
    setModel((current) => ({ ...current, responseHistory: loadingLoadable(current.responseHistory.data) }));
    loadResponseHistory(requestId)
      .then((history) => setModel((current) => ({ ...current, responseHistory: readyLoadable(history) })))
      .catch((err: unknown) => setModel((current) => ({ ...current, responseHistory: errorLoadable(current.responseHistory.data, err instanceof Error ? err.message : 'Unable to load response history') })));
  }

  function handleSend() {
    if (!selectedRequest) return;
    setModel((current) => ({ ...current, lastResponse: null }));
    sendProxyRequest({
      method: selectedRequest.method,
      url: selectedRequest.url,
      headers: headersToProxyMap(selectedRequest.headers),
      body: selectedRequest.bodyType === 'none' ? null : selectedRequest.bodyContent,
      contentType: selectedRequest.bodyRawType,
      formData: selectedRequest.formData,
      verifySsl: true,
    })
      .then((response) => {
        setModel((current) => ({ ...current, lastResponse: response }));
        refreshHistory(selectedRequest.id);
      })
      .catch((err: unknown) => {
        setModel((current) => ({
          ...current,
          lastResponse: {
            status: 0,
            statusText: 'Error',
            headers: {},
            body: err instanceof Error ? err.message : 'Unable to send request',
            error: err instanceof Error ? err.message : 'Unable to send request',
          },
        }));
      });
  }

  const workspaceLabel = model.workspace.user?.username ?? (model.workspace.mode === 'guest' ? 'Guest workspace' : 'Signed-out workspace');
  const workspaceStatus = model.workspace.mode === 'authenticated' ? 'Authenticated session active' : model.workspace.mode === 'guest' ? 'Temporary guest session active' : 'Sign in or continue as guest';

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
              <UserCircle2 className="h-4 w-4 text-accent" /> {workspaceLabel}
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> {workspaceStatus}
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

          {model.collections.status === 'loading' ? <div className="rounded-2xl border border-border/70 bg-background/45 p-4 text-sm text-muted">Loading workspace collections…</div> : null}
          {model.collections.status === 'error' ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600">{model.collections.error}</div> : null}
          <CollectionTree collections={model.collections.data} selectedRequestId={selectedRequest?.id} onSelectRequest={(request) => selectRequest(request.id)} />
        </aside>

        <main className="flex min-w-0 flex-col p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <ShellButton active>{selectedRequest?.name ?? 'No request selected'}</ShellButton>
            {selectedRequest ? <ShellButton>{selectedRequest.method} {selectedRequest.url || 'Untitled URL'}</ShellButton> : null}
            <ShellButton><Plus className="h-4 w-4" /> New tab</ShellButton>
          </div>

          <Panel className="mb-4 p-4">
            <div className="grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)_110px]">
              <button type="button" className="flex items-center justify-between rounded-xl border border-border/80 bg-background/60 px-3 py-3 text-left font-semibold text-sky-600 dark:text-sky-300">
                {selectedRequest?.method ?? 'GET'} <ChevronDown className="h-4 w-4 text-muted" />
              </button>
              <input className="rounded-xl border border-border/80 bg-background/60 px-4 py-3 text-sm outline-none focus:border-accent" value={selectedRequest?.url ?? ''} readOnly placeholder="Select a request to load its URL" />
              <button type="button" onClick={handleSend} disabled={!selectedRequest?.url} className="rounded-xl bg-accent px-4 py-3 font-semibold text-black shadow-lg shadow-orange-500/25 disabled:cursor-not-allowed disabled:opacity-50">
                <Send className="mr-2 inline h-4 w-4" /> Send
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <ShellButton><Settings2 className="h-4 w-4" /> Server proxy</ShellButton>
              <ShellButton><Lock className="h-4 w-4" /> {selectedRequest?.authType === 'none' ? 'Credentials omitted' : `${selectedRequest?.authType} auth configured`}</ShellButton>
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
                  Query parameters are derived from the selected request URL as soon as details load.
                </div>
                <div className="overflow-hidden rounded-xl border border-border/80">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="bg-background/70 text-xs uppercase tracking-wide text-muted">
                      <tr><th className="px-3 py-2">On</th><th className="px-3 py-2">Key</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Description</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {queryParams.length > 0 ? queryParams.map((param) => (
                        <tr key={`${param.key}-${param.value}`} className="bg-card/40">
                          <td className="px-3 py-2">{param.enabled ? <Check className="h-4 w-4 text-emerald-500" /> : null}</td>
                          <td className="px-3 py-2 font-mono text-foreground">{param.key}</td>
                          <td className="px-3 py-2 font-mono text-muted">{param.value}</td>
                          <td className="px-3 py-2 text-muted">{param.description ?? ''}</td>
                        </tr>
                      )) : (
                        <tr className="bg-card/40"><td colSpan={4} className="px-3 py-4 text-center text-muted">No query parameters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Panel>

            <Panel className="flex min-h-[420px] flex-col overflow-hidden">
              <div className="border-b border-border/80 bg-background/35 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold">Request body</h2>
                  <span className="rounded-full bg-accent/10 px-2 py-1 text-xs text-accent">{selectedRequest?.bodyType ?? 'none'}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-muted">
                  {(selectedRequest?.headers ?? []).map((header) => <span key={header.key} className="rounded-full border border-border/70 px-2 py-1 font-mono">{header.key}: {header.value}</span>)}
                </div>
              </div>
              <pre className="flex-1 overflow-auto p-4 text-sm leading-6 text-[hsl(var(--text-secondary))]"><code>{formatBody(selectedRequest?.bodyContent)}</code></pre>
            </Panel>
          </div>

          <Panel className="mt-4 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-background/35 p-4">
              <div>
                <h2 className="font-semibold">Response</h2>
                <p className="text-sm text-muted">Send a request to inspect status, timing, headers, and body.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-600 dark:text-emerald-300">Status {latestResponse?.status ?? '—'}</span>
                <span className="rounded-full border border-border/80 px-3 py-1 text-muted">{latestResponse?.responseTimeMs ?? '—'} ms</span>
                <span className="rounded-full border border-border/80 px-3 py-1 text-muted">{latestResponse?.responseSize ?? '—'}</span>
                <ShellButton><Save className="h-4 w-4" /> Save Snapshot</ShellButton>
                <ShellButton><Copy className="h-4 w-4" /> Copy</ShellButton>
              </div>
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <pre className="overflow-auto rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-100"><code>{formatBody(latestResponse?.body)}</code></pre>
              <div className="rounded-xl border border-border/80 bg-background/45 p-3 text-sm text-muted">
                <h3 className="mb-2 font-medium text-foreground">Headers</h3>
                {Object.entries(latestResponse?.headers ?? {}).length > 0 ? Object.entries(latestResponse?.headers ?? {}).map(([key, value]) => <p key={key} className="font-mono">{key}: {value}</p>) : <p>No response headers yet.</p>}
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
            <textarea className="min-h-36 w-full rounded-xl border border-border/80 bg-background/60 p-3 font-mono text-xs outline-none focus:border-accent" readOnly value={selectedRequest ? `curl -X ${selectedRequest.method} "${selectedRequest.url}"` : ''} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ShellButton><Braces className="h-4 w-4" /> Generate</ShellButton>
              <ShellButton><Copy className="h-4 w-4" /> Copy</ShellButton>
            </div>
          </Panel>

          <Panel className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-medium"><KeyRound className="h-4 w-4 text-accent" /> Request Auth</h3>
            <div className="rounded-xl border border-border/80 bg-background/45 p-3 text-sm text-muted">
              <p>Type: <span className="font-mono text-foreground">{selectedRequest?.authType ?? 'none'}</span></p>
              <p className="mt-2 break-all font-mono text-xs">{formatBody(selectedRequest?.authData ?? {})}</p>
            </div>
            <button type="button" className="mt-3 w-full rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black"><Download className="mr-2 inline h-4 w-4" /> Export Collection</button>
          </Panel>

          <div className="mt-4 rounded-2xl border border-border/80 bg-background/45 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">Recent history</h3>
              {model.responseHistory.status === 'loading' ? <Clock3 className="h-4 w-4 text-muted" /> : null}
            </div>
            <div className="space-y-2">
              {model.responseHistory.data.length > 0 ? model.responseHistory.data.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/60 p-2 text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`rounded px-1.5 py-0.5 font-semibold ${methodBadgeStyles[item.method] ?? 'bg-slate-500/15 text-slate-500'}`}>{item.method}</span>
                    <span className="text-muted">{item.updatedAt ?? item.createdAt ?? ''}</span>
                  </div>
                  <p className="truncate font-mono text-sm">{item.url}</p>
                  <p className="text-muted">{statusLabel(item)}</p>
                </div>
              )) : <p className="text-sm text-muted">No saved response history for this request.</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
