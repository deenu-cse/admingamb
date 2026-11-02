import { api, type Query } from "./client";
import type {
  AdminBet,
  AdminMarket,
  AdminMatch,
  AuditRow,
  Charts,
  LedgerRow,
  MatchDetail,
  Overview,
  Page,
  PendingSettlement,
  PlatformSettings,
  ReconciliationRun,
  ReplayAction,
  ReplayScript,
  ReplaySession,
  RiskView,
  SessionRow,
  StaffUser,
  SystemHealth,
  UserDetail,
  UserRow,
  UserTransaction,
} from "./types";

const A = "/api/admin";

async function page<T>(path: string, query: Query): Promise<Page<T>> {
  const { data, meta } = await api.get<T[]>(path, query);
  return { items: data, nextCursor: meta.nextCursor ?? null };
}
const unwrap = async <T>(p: Promise<{ data: T }>): Promise<T> => (await p).data;

export const authApi = {
  me: () => unwrap(api.get<StaffUser>(`${A}/auth/me`)),
  login: (body: { email: string; password: string; totpCode?: string }) => unwrap(api.post<{ user: StaffUser }>(`${A}/auth/login`, body)),
  logout: () => api.post(`${A}/auth/logout`),
  totpSetup: () => unwrap(api.post<{ otpauthUrl: string; secret: string }>(`${A}/auth/totp/setup`)),
  totpEnable: (code: string) => api.post(`${A}/auth/totp/enable`, { code }),
  totpDisable: (code: string) => api.post(`${A}/auth/totp/disable`, { code }),
};

export const overviewApi = {
  get: () => unwrap(api.get<Overview>(`${A}/overview`)),
  charts: (days: number) => unwrap(api.get<Charts>(`${A}/overview/charts`, { days })),
};

export const usersApi = {
  list: (q: Query) => page<UserRow>(`${A}/users`, q),
  get: (id: string) => unwrap(api.get<UserDetail>(`${A}/users/${id}`)),
  ledger: (id: string, q: Query) => page<UserTransaction>(`${A}/users/${id}/ledger`, q),
  sessions: (id: string) => unwrap(api.get<SessionRow[]>(`${A}/users/${id}/sessions`)),
  audit: (id: string) => unwrap(api.get<AuditRow[]>(`${A}/users/${id}/audit`)),
  adjust: (id: string, direction: "credit" | "debit", body: { amount: number; reason: string; idempotencyKey: string }) => api.post(`${A}/users/${id}/${direction}`, body),
  action: (id: string, action: "suspend" | "unsuspend" | "force-logout" | "reset-limits", reason: string) => api.post(`${A}/users/${id}/${action}`, { reason }),
};

export const matchesApi = {
  list: (q: Query) => page<AdminMatch>(`${A}/matches`, q),
  get: (id: string) => unwrap(api.get<MatchDetail>(`${A}/matches/${id}`)),
  patch: (id: string, body: { bettingEnabled?: boolean; featured?: boolean; reason: string }) => api.patch(`${A}/matches/${id}`, body),
  resync: (id: string) => unwrap(api.post<{ changed: boolean; status: string }>(`${A}/matches/${id}/resync`)),
  reevaluate: (id: string) => api.post(`${A}/matches/${id}/markets/reevaluate`),
  pending: () => unwrap(api.get<PendingSettlement[]>(`${A}/settlement/pending`)),
  catchUp: () => api.post(`${A}/settlement/catch-up`),
};

export interface MarketEdit {
  name?: string;
  marginBps?: number;
  minStake?: number;
  maxStake?: number;
  maxLiability?: number;
  betDelayMs?: number;
  reason: string;
}

export interface CustomMarket {
  name: string;
  inPlay: boolean;
  selections: Array<{ name: string; odds: number }>;
  minStake?: number;
  maxStake?: number;
  maxLiability?: number;
  reason: string;
}

export interface SettleBody {
  winningSelectionIds?: string[];
  void?: boolean;
  reason: string;
}

export const marketsApi = {
  list: (matchId: string) => unwrap(api.get<AdminMarket[]>(`${A}/matches/${matchId}/markets`)),
  create: (matchId: string, body: CustomMarket) => api.post(`${A}/matches/${matchId}/markets`, { ...body }),
  edit: (id: string, body: MarketEdit) => api.patch(`${A}/markets/${id}`, { ...body }),
  transition: (id: string, action: "suspend" | "reopen" | "close", reason: string) => api.post(`${A}/markets/${id}/${action}`, { reason }),
  settle: (id: string, body: SettleBody) => api.post(`${A}/markets/${id}/settle`, { ...body }),
  voidMarket: (id: string, reason: string) => api.post(`${A}/markets/${id}/void`, { reason }),
  resettle: (id: string, body: SettleBody) => api.post(`${A}/markets/${id}/resettle`, { ...body }),
};

export const betsApi = {
  list: (q: Query) => page<AdminBet>(`${A}/bets`, q),
  voidBet: (id: string, reason: string) => api.post(`${A}/bets/${id}/void`, { reason }),
};

export const riskApi = {
  get: (q: Query = {}) => unwrap(api.get<RiskView>(`${A}/risk`, q)),
};

export const ledgerApi = {
  search: (q: Query) => page<LedgerRow>(`${A}/ledger`, q),
  runs: () => unwrap(api.get<ReconciliationRun[]>(`${A}/reconciliation/runs`)),
  run: () => unwrap(api.post<ReconciliationRun>(`${A}/reconciliation/run`)),
};

export const auditApi = {
  search: (q: Query) => page<AuditRow>(`${A}/audit`, q),
  filters: () => unwrap(api.get<{ actions: string[]; targetTypes: string[] }>(`${A}/audit/filters`)),
};

export const settingsApi = {
  get: () => unwrap(api.get<PlatformSettings>(`${A}/settings`)),
  patch: (body: Partial<PlatformSettings> & { reason: string }) => unwrap(api.patch<PlatformSettings>(`${A}/settings`, body)),
};

export const replayApi = {
  scripts: () => unwrap(api.get<ReplayScript[]>(`${A}/replay/scripts`)),
  sessions: () => unwrap(api.get<ReplaySession[]>(`${A}/replay/sessions`)),
  create: (body: { scriptId: string; intervalMs: number; startInSec: number }) => unwrap(api.post<ReplaySession>(`${A}/replay/sessions`, body)),
  control: (id: string, action: ReplayAction) => api.post(`${A}/replay/sessions/${id}/${action}`),
  speed: (id: string, intervalMs: number) => api.post(`${A}/replay/sessions/${id}/speed`, { intervalMs }),
};

export const systemApi = {
  health: () => unwrap(api.get<SystemHealth>(`${A}/system/health`)),
};
