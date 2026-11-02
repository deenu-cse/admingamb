/** Shapes returned by gambknd's /api/admin routes. Amounts are integer minor units (100 = 1 token). */

export type Role = "user" | "admin" | "superadmin";
export type UserStatus = "active" | "suspended" | "self_excluded";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  totpEnabled: boolean;
}

export interface Overview {
  users: { total: number; newToday: number; suspended: number; activeNow: number };
  tokens: { circulation: number; locked: number };
  today: { staked: number; bets: number };
  openBets: number;
  totalLiability: number;
  housePnl: { today: number; d7: number; d30: number };
  generatedAt: string;
}

export interface Charts {
  days: number;
  betsOverTime: Array<{ date: string; bets: number; staked: number }>;
  pnlByMarketType: Array<{ marketType: string; pnl: number; staked: number; bets: number }>;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  balance: number;
  locked: number;
}

export interface WalletSummary {
  balance: number;
  locked: number;
  available: number;
  lifetimeStaked: number;
  lifetimeWon: number;
  lifetimeBonuses: number;
  netPnl: number;
}

export interface ResponsiblePlay {
  dailyStakeLimit: number | null;
  dailyLossLimit: number | null;
  sessionReminderMinutes: number | null;
  cooldownUntil: string | null;
  selfExcludedUntil: string | null;
  pendingIncrease: { effectiveAt: string } | null;
}

export interface UserDetail {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: UserStatus;
    statusReason: string | null;
    emailVerified: boolean;
    googleLinked: boolean;
    totpEnabled: boolean;
    responsiblePlay: ResponsiblePlay;
    lastLoginAt: string | null;
    createdAt: string;
  };
  /** Null for staff created outside registration. */
  wallet: WalletSummary | null;
  stats: { bets: number; open: number; won: number; lost: number; cashedOut: number; voided: number; activeSessions: number };
}

export interface SessionRow {
  id: string;
  realm: "user" | "admin";
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
}

export interface AuditRow {
  id: string;
  action: string;
  actorId: string | null;
  actorRole: string;
  actor?: { name: string; email: string } | null;
  targetType?: string;
  targetId?: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  requestId?: string | null;
  createdAt: string;
}

export interface UserTransaction {
  id: string;
  txnId: string;
  type: string;
  bucket: "available" | "locked";
  signedAmount: number;
  balanceAfter: number | null;
  refType: string | null;
  refId: string | null;
  createdAt: string;
}

export interface LedgerRow {
  id: string;
  txnId: string;
  account: string;
  userId: string | null;
  direction: "debit" | "credit";
  amount: number;
  balanceAfter: number | null;
  type: string;
  refType: string | null;
  refId: string | null;
  idempotencyKey: string;
  counterparty: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface ReconciliationRun {
  _id: string;
  trigger: "scheduled" | "manual";
  status: "running" | "clean" | "mismatches" | "failed";
  startedAt: string;
  finishedAt: string | null;
  walletsChecked: number;
  ledgerEntriesScanned: number;
  mismatches: Array<{ userId: string; field: string; expected: number; actual: number }>;
  unbalancedTxns: string[];
  globalSum: number;
  error: string | null;
}

export interface BetLeg {
  matchId: string;
  marketId: string;
  selectionId: string;
  matchTitle: string;
  marketType: string;
  marketName: string;
  selectionName: string;
  line: string | null;
  odds: number;
  inPlay: boolean;
  result: string;
}

export type BetStatus = "PENDING_DELAY" | "ACCEPTED" | "REJECTED" | "WON" | "LOST" | "VOID" | "CASHED_OUT";

export interface AdminBet {
  id: string;
  userId: string;
  user: { name: string; email: string } | null;
  ip: string | null;
  kind: "SINGLE" | "ACCA";
  status: BetStatus;
  stake: number;
  odds: number;
  potentialReturn: number;
  payout: number;
  legs: BetLeg[];
  placedAt: string;
  settledAt: string | null;
  rejectReason: string | null;
  voidReason: string | null;
}

export interface TeamRef {
  key: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
}

export interface InningsBrief {
  number: number;
  teamKey: string;
  runs: number;
  wickets: number;
  overs: string;
}

export type MatchStatus = "UPCOMING" | "TOSS" | "LIVE" | "INNINGS_BREAK" | "RAIN_DELAY" | "COMPLETED" | "ABANDONED" | "NO_RESULT";

export interface AdminMatch {
  id: string;
  source: "live" | "replay";
  title: string;
  format: string;
  teams: TeamRef[];
  startTime: string;
  status: MatchStatus;
  statusText: string;
  score: InningsBrief[];
  bettingEnabled: boolean;
  featured: boolean;
  stale: boolean;
  lastSyncedAt: string;
  markets: { total: number; open: number; suspended: number };
  openBets: number;
  openStake: number;
}

export interface CreaseBatter {
  id: string;
  name: string;
  runs: number;
  balls: number;
}

export interface MatchDetail extends AdminMatch {
  providerId: string;
  scheduledOvers: number | null;
  currentState: {
    runs: number;
    wickets: number;
    balls: number;
    runRate100: number;
    target: number | null;
    requiredRunRate100: number | null;
    striker: CreaseBatter | null;
    nonStriker: CreaseBatter | null;
    bowler: { id: string; name: string; balls: number; runs: number; wickets: number } | null;
    lastSixBalls: string[];
    winProbabilityBps: number | null;
  } | null;
}

export type MarketStatus = "PENDING" | "OPEN" | "SUSPENDED" | "CLOSED" | "SETTLED" | "VOID";

export interface MarketBook {
  totalStake: number;
  bets: number;
  worstCaseLoss: Record<string, number>;
}

export interface AdminMarket {
  id: string;
  matchId: string;
  key: string;
  type: string;
  group: string;
  name: string;
  status: MarketStatus;
  suspendReason: string | null;
  inPlay: boolean;
  line: string | null;
  betDelayMs: number;
  minStake: number;
  maxStake: number;
  marginBps: number;
  maxLiability: number;
  autoManaged: boolean;
  selections: Array<{ id: string; name: string; odds: number; status: string }>;
  probabilitiesBps: Record<string, number>;
  book: MarketBook | null;
  result: { winningSelectionIds: string[]; isVoid: boolean; reason: string | null } | null;
}

export interface PendingSettlement {
  market: AdminMarket;
  match: { _id: string; title: string; status: string; statusText: string } | null;
}

export interface ExposureRow {
  marketId: string;
  matchId: string;
  matchTitle: string;
  marketName: string;
  marketType: string;
  status: MarketStatus;
  totalStake: number;
  bets: number;
  maxLiability: number;
  worstCaseLoss: number;
  utilizationBps: number;
  selections: Array<{ id: string; name: string; odds: number; worstCaseLoss: number }>;
}

export interface UnusualWinner {
  userId: string;
  user: { name: string; email: string } | null;
  bets: number;
  wins: number;
  winRateBps: number;
  expectedWinRateBps: number;
  zScoreX100: number;
  staked: number;
  netWin: number;
}

export interface RiskView {
  totalLiability: number;
  markets: ExposureRow[];
  biggestBets: AdminBet[];
  unusualWinRates: UnusualWinner[];
  window: { days: number; minBets: number; minZScore: number };
  generatedAt: string;
}

export interface PlatformSettings {
  welcomeBonus: number;
  dailyBonus: number;
  defaultMarginsBps: Record<string, number>;
  defaultBetDelayMs: number;
  marketReopenDelayMs: number;
  globalMinStake: number;
  globalMaxStake: number;
  defaultMaxLiability: number;
  cashoutMarginBps: number;
  adminMaxAdjustment: number;
  staleThresholdMs: number;
  marketTypesEnabled: string[];
  maintenance: { enabled: boolean; message: string };
  providerMode: "live" | "replay";
  version: number;
  updatedAt: string;
}

export interface ReplayScript {
  id: string;
  title: string;
  format: string;
  scheduledOvers: number;
  teams: string[];
  result: string;
}

export type ReplayAction = "start" | "pause" | "rain" | "resume" | "abandon" | "finish" | "outage_on" | "outage_off";

export interface ReplaySession {
  id: string;
  scriptId: string;
  status: "scheduled" | "running" | "paused" | "finished";
  pauseReason: "manual" | "rain" | null;
  abandoned: boolean;
  outage: boolean;
  intervalMs: number;
  cursor: number;
  startAt: number;
  createdAt: number;
  match: { matchId: string; status: MatchStatus } | null;
}

export interface SystemHealth {
  provider: {
    providerMode: "live" | "replay";
    liveConfigured: boolean;
    budget: { used: number; limit: number; reserved: number; remainingNormal: number; resetsAt: string };
    circuit: { state: string; failures: number; openedAt: number | null } | null;
    poller: { lastTickAt: string | null; liveNextAt: string | null; fixturesNextAt: string | null };
    matches: { inProgress: number; stale: number };
  };
  dependencies: { mongo: { ok: boolean; latencyMs: number }; redis: { ok: boolean; latencyMs: number } };
  queues: Array<{ name: string; waiting: number; active: number; delayed: number; failed: number }>;
  sockets: { live: number; user: number; admin: number };
  errorRate: { windowMinutes: number; requests: number; errors: number; rateBps: number };
  lastSyncAt: string | null;
  lastReconciliation: { id: string; status: string; startedAt: string; mismatches: number } | null;
  uptimeSec: number;
  generatedAt: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
