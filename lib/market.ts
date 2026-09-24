export type MarketSource = "live" | "recorded" | "simulated";
export type MarketSession = "regular" | "pre_market" | "post_market" | "overnight" | "closed";
export type RiskState = "open" | "guarded" | "paused";

export interface PoolReserves {
  usdc: number;
  aaplx: number;
}

export interface MarketSnapshot {
  id: string;
  source: MarketSource;
  session: MarketSession;
  underlyingSymbol: "AAPL";
  tokenSymbol: "AAPLX";
  underlyingPrice: number;
  tokenPrice: number;
  poolPrice: number | null;
  poolReserves?: PoolReserves | null;
  poolFeeBps?: number | null;
  confidence: number;
  publisherCount: number;
  feedUpdateTimestampMs: number;
  messageTimestampMs: number;
}

export interface RiskDecision {
  state: RiskState;
  maxInputUsd: number;
  ageSeconds: number;
  messageAgeSeconds: number;
  divergenceBps: number;
  confidenceBps: number;
  poolDeviationBps: number;
  reasons: string[];
}

const OPEN_CAP_USDC = 500;
const GUARDED_CAP_USDC = 50;
const WEEKEND_CAP_USDC = 10;
const DAY_SECONDS = 86_400;

export function evaluateRisk(snapshot: MarketSnapshot, nowMs = Date.now()): RiskDecision {
  const ageSeconds = Math.max(0, Math.floor((snapshot.messageTimestampMs - snapshot.feedUpdateTimestampMs) / 1_000));
  const messageAgeSeconds = Math.max(0, Math.floor((nowMs - snapshot.messageTimestampMs) / 1_000));
  const divergenceBps = snapshot.underlyingPrice > 0
    ? Math.round(Math.abs(snapshot.tokenPrice / snapshot.underlyingPrice - 1) * 10_000)
    : Number.POSITIVE_INFINITY;
  const confidenceBps = snapshot.underlyingPrice > 0
    ? Math.ceil(Math.abs(snapshot.confidence / snapshot.underlyingPrice) * 10_000)
    : Number.POSITIVE_INFINITY;
  const poolDeviationBps = snapshot.poolPrice === null || snapshot.tokenPrice <= 0
    ? 0
    : Math.round(Math.abs(snapshot.poolPrice / snapshot.tokenPrice - 1) * 10_000);
  const reasons: string[] = [];

  if (snapshot.session !== "regular") reasons.push(`Underlying session is ${snapshot.session.replace("_", " ")}.`);
  if (ageSeconds > 60) reasons.push(`Equity reference is ${formatAge(ageSeconds)} old.`);
  if (divergenceBps > 150) reasons.push(`Token/reference divergence is ${formatBps(divergenceBps)}.`);
  if (poolDeviationBps > 150) reasons.push(`Pool/token deviation is ${formatBps(poolDeviationBps)}.`);
  if (confidenceBps > 25) reasons.push(`Oracle confidence width is ${formatBps(confidenceBps)}.`);
  if (snapshot.publisherCount < 5) reasons.push(`Oracle publisher count is low (${snapshot.publisherCount}).`);

  const invalid = !Number.isFinite(snapshot.underlyingPrice) || snapshot.underlyingPrice <= 0
    || !Number.isFinite(snapshot.tokenPrice) || snapshot.tokenPrice <= 0
    || (snapshot.poolPrice !== null && (!Number.isFinite(snapshot.poolPrice) || snapshot.poolPrice <= 0))
    || !Number.isFinite(snapshot.confidence) || snapshot.confidence < 0
    || !Number.isInteger(snapshot.publisherCount) || snapshot.publisherCount < 0
    || !Number.isFinite(snapshot.feedUpdateTimestampMs) || !Number.isFinite(snapshot.messageTimestampMs)
    || snapshot.feedUpdateTimestampMs > snapshot.messageTimestampMs;
  const staleLiveMessage = snapshot.source === "live" && (
    messageAgeSeconds > 30 || snapshot.messageTimestampMs > nowMs + 5_000
  );
  const shouldPause = invalid || staleLiveMessage || ageSeconds > 3 * DAY_SECONDS
    || divergenceBps > 1_500 || poolDeviationBps > 1_000
    || confidenceBps > 250 || snapshot.publisherCount < 3;
  if (shouldPause) {
    if (staleLiveMessage) reasons.push("Pyth message is too old or from the future for execution.");
    if (ageSeconds > 3 * DAY_SECONDS) reasons.push("Equity reference is more than 72 hours old.");
    if (invalid) reasons.push("Market data is invalid.");
    return {
      state: "paused",
      maxInputUsd: 0,
      ageSeconds,
      messageAgeSeconds,
      divergenceBps,
      confidenceBps,
      poolDeviationBps,
      reasons: [...reasons, "One or more hard risk limits were crossed."],
    };
  }

  const guarded = snapshot.session !== "regular" || ageSeconds > 60
    || divergenceBps > 150 || poolDeviationBps > 150
    || confidenceBps > 25 || snapshot.publisherCount < 5;
  return {
    state: guarded ? "guarded" : "open",
    maxInputUsd: guarded ? (ageSeconds > DAY_SECONDS ? WEEKEND_CAP_USDC : GUARDED_CAP_USDC) : OPEN_CAP_USDC,
    ageSeconds,
    messageAgeSeconds,
    divergenceBps,
    confidenceBps,
    poolDeviationBps,
    reasons: reasons.length ? reasons : ["Reference and pool conditions are inside the open envelope."],
  };
}

// Preview only. The swap program calculates the authoritative output and enforces minOut.
export function quoteOutput(amountUsd: number, snapshot: MarketSnapshot, decision: RiskDecision) {
  const reserves = snapshot.poolReserves;
  const feeBps = snapshot.poolFeeBps;
  if (decision.state === "paused" || !Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > decision.maxInputUsd
    || !reserves || reserves.usdc <= 0 || reserves.aaplx <= 0
    || feeBps == null || feeBps < 0 || feeBps >= 10_000) return null;
  const netInput = amountUsd * (1 - feeBps / 10_000);
  return (reserves.aaplx * netInput) / (reserves.usdc + netInput);
}

export function formatAge(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m`;
  return `${(seconds / 3_600).toFixed(seconds < 36_000 ? 1 : 0)}h`;
}

export function formatBps(bps: number) {
  return `${(bps / 100).toFixed(2)}%`;
}

const now = Date.now();
const examplePool: PoolReserves = { usdc: 23_000, aaplx: 100 };
export const scenarios: Record<"fresh" | "afterHours" | "paused", MarketSnapshot> = {
  fresh: {
    id: "fixture-aapl-regular-01",
    source: "simulated",
    session: "regular",
    underlyingSymbol: "AAPL",
    tokenSymbol: "AAPLX",
    underlyingPrice: 229.18,
    tokenPrice: 229.74,
    poolPrice: 230,
    poolReserves: examplePool,
    poolFeeBps: 30,
    confidence: 0.08,
    publisherCount: 11,
    feedUpdateTimestampMs: now - 12_000,
    messageTimestampMs: now,
  },
  afterHours: {
    id: "fixture-aapl-closed-02",
    source: "simulated",
    session: "closed",
    underlyingSymbol: "AAPL",
    tokenSymbol: "AAPLX",
    underlyingPrice: 229.18,
    tokenPrice: 233.92,
    poolPrice: 234.61,
    poolReserves: { usdc: 23_461, aaplx: 100 },
    poolFeeBps: 30,
    confidence: 0.24,
    publisherCount: 9,
    feedUpdateTimestampMs: now - 21_600_000,
    messageTimestampMs: now,
  },
  paused: {
    id: "fixture-aapl-stale-03",
    source: "simulated",
    session: "closed",
    underlyingSymbol: "AAPL",
    tokenSymbol: "AAPLX",
    underlyingPrice: 229.18,
    tokenPrice: 268.42,
    poolPrice: 271.03,
    poolReserves: { usdc: 27_103, aaplx: 100 },
    poolFeeBps: 30,
    confidence: 0.74,
    publisherCount: 5,
    feedUpdateTimestampMs: now - 280_800_000,
    messageTimestampMs: now,
  },
};
