/**
 * NEXT_PUBLIC_API_PROXY=1 sends API calls through this site's own domain (see next.config.ts). Browsers
 * refuse login cookies from an unrelated domain, so it is needed on vercel.app + onrender.com.
 */
export const API_PROXY = process.env.NEXT_PUBLIC_API_PROXY === "1";
export const API_URL = API_PROXY ? "" : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

export interface ApiMeta {
  requestId?: string;
  nextCursor?: string | null;
  pageSize?: number;
  [key: string]: unknown;
}

/** Typed failure from the API envelope `{ success:false, error:{ code, message, details } }`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Envelope<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string; details?: unknown } | null;
  meta: ApiMeta;
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

type Json = Record<string, unknown> | unknown[];
export type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: Json;
  query?: Query;
  signal?: AbortSignal;
  /** Skip the silent refresh-and-retry on 401 (used by the refresh call itself). */
  noRefresh?: boolean;
}

let refreshing: Promise<boolean> | null = null;
const authListeners = new Set<() => void>();

/** Called when the session is definitely gone (refresh failed), e.g. to send the admin to login. */
export function onSessionLost(fn: () => void): () => void {
  authListeners.add(fn);
  return () => authListeners.delete(fn);
}

/** Single-flight refresh: many parallel 401s trigger one rotation. */
async function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      await request("/api/admin/auth/refresh", { method: "POST", noRefresh: true });
      return true;
    } catch (err) {
      // Another tab rotated the token a moment ago: the browser now holds the new cookie.
      if (err instanceof ApiError && err.code === "REFRESH_CONFLICT") return true;
      authListeners.forEach((fn) => fn());
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_URL}${path}`, API_PROXY ? window.location.origin : undefined);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/**
 * Calls gambknd with the admin session cookies. Mutations always send JSON or the
 * `X-Requested-With` header (the backend's CSRF rule). Expired access tokens are refreshed once.
 */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { Accept: "application/json", "X-Requested-With": "fetch" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? "GET",
      headers,
      credentials: "include",
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK_ERROR", "Can't reach the server. Check your connection.");
  }

  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    body = null;
  }

  if (res.ok && body?.success) return { data: body.data, meta: body.meta ?? {} };

  const code = body?.error?.code ?? (res.status === 429 ? "RATE_LIMITED" : "HTTP_ERROR");
  if (res.status === 401 && !opts.noRefresh && (code === "TOKEN_EXPIRED" || code === "UNAUTHENTICATED")) {
    if (await refreshSession()) return request<T>(path, { ...opts, noRefresh: true });
  }
  throw new ApiError(res.status, code, body?.error?.message ?? `Request failed (${res.status})`, body?.error?.details);
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, body?: Json) => request<T>(path, { method: "POST", body: body ?? {} }),
  patch: <T>(path: string, body?: Json) => request<T>(path, { method: "PATCH", body }),
};

/** A message suitable for a toast, from any thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "VALIDATION_ERROR" && Array.isArray(err.details) && err.details[0]) {
      return String((err.details[0] as { message?: string }).message ?? err.message);
    }
    return err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}
