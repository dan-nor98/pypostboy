export type WorkspaceMode = 'authenticated' | 'guest' | 'anonymous';
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export type Loadable<T> = { status: LoadStatus; data: T; error?: string };

export type PostBoyUser = { id: number | null; username: string; email: string | null; authProvider: string | null; isGuest: boolean };
export type WorkspaceUserState =
  | { mode: 'authenticated'; user: PostBoyUser }
  | { mode: 'guest'; user: PostBoyUser | null; reason?: string }
  | { mode: 'anonymous'; user: null; reason?: string };

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | string;
export type KeyValuePair = { key: string; value: string; enabled: boolean; description?: string };
export type RequestBodyType = 'none' | 'json' | 'xml' | 'text' | 'form-data' | 'form-urlencoded' | string;
export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key' | string;
export type AuthData = Record<string, string | number | boolean | null | undefined>;
export type RequestFormField = KeyValuePair & { type?: 'text' | 'file'; fileName?: string };

export type RequestIdentity = {
  id: number;
  collectionId: number;
  name: string;
  method: HttpMethod;
  url: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type RequestDetails = RequestIdentity & {
  headers: KeyValuePair[];
  params: KeyValuePair[];
  bodyType: RequestBodyType;
  bodyContent: string;
  bodyRawType: string;
  formData: RequestFormField[];
  authType: AuthType;
  authData: AuthData;
  instances: RequestInstance[];
};

export type CollectionNode = {
  id: number;
  name: string;
  description: string;
  parentId: number | null;
  sortOrder: number;
  requests: RequestIdentity[];
  children: CollectionNode[];
  createdAt?: string;
  updatedAt?: string;
};

export type ProxyRequestPayload = {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string | null;
  contentType?: string | null;
  formData?: RequestFormField[];
  auth?: { type: AuthType; data: AuthData };
  verifySsl?: boolean;
};

export type ProxyResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  responseTimeMs?: number;
  responseSize?: string | number;
  error?: string;
};

export type RequestInstance = Omit<RequestDetails, 'instances'> & {
  requestId: number;
  responseStatus: number | null;
  responseStatusText: string;
  responseHeaders: Record<string, string> | string;
  responseBody: unknown;
  responseTimeMs: number | null;
  responseSize: string | number | null;
};

export type ImportType = 'postman' | 'curl';
export type ImportPayload = { type: ImportType; data: unknown };
export type ImportOutcome =
  | { type: 'postman'; collection: CollectionNode; warnings: string[] }
  | { type: 'curl'; request: Partial<RequestDetails>; warnings: string[] }
  | { type: ImportType; raw: unknown; warnings: string[] };

export type SidebarTab = 'collections' | 'history' | 'environment';
export type EnvVars = Record<string, string>;

export type DashboardViewModel = {
  workspace: WorkspaceUserState;
  collections: Loadable<CollectionNode[]>;
  selectedRequest: Loadable<RequestDetails | null>;
  responseHistory: Loadable<RequestInstance[]>;
  lastResponse: ProxyResponse | null;
  importOutcome: ImportOutcome | null;
};

export const emptyLoadable = <T>(data: T): Loadable<T> => ({ status: 'idle', data });
export const loadingLoadable = <T>(data: T): Loadable<T> => ({ status: 'loading', data });
export const readyLoadable = <T>(data: T): Loadable<T> => ({ status: 'ready', data });
export const errorLoadable = <T>(data: T, error: string): Loadable<T> => ({ status: 'error', data, error });
export const anonymousWorkspace: WorkspaceUserState = { mode: 'anonymous', user: null };

export const createInitialDashboardViewModel = (): DashboardViewModel => ({
  workspace: anonymousWorkspace,
  collections: emptyLoadable([]),
  selectedRequest: emptyLoadable(null),
  responseHistory: emptyLoadable([]),
  lastResponse: null,
  importOutcome: null,
});
