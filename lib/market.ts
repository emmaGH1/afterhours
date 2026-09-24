export type MarketSource = "live" | "recorded" | "simulated";
export type MarketSession = "regular" | "pre_market" | "post_market" | "overnight" | "closed";
export type RiskState = "open" | "guarded" | "paused";

export interface MarketSnapshot {
  id: string;
  source: MarketSource;
  session: MarketSession;
  underlyingSymbol: "AAPL";
  tokenSymbol: "AAPLX";
  underlyingPrice: number;
  tokenPrice: number;
  poolPrice: number | null;
  confidence: number;
  publisherCount: number;
  feedUpdateTimestampMs: number;
  messageTimestampMs: number;
}

export interface RiskDecision {
  state: RiskState;
  feeBps: number;
  maxInputUsd: number;
  ageSeconds: number;
  divergenceBps: number;
  confidenceBps: number;
  poolDeviationBps: number;
  reasons: string[];
}

const BASE_FEE_BPS = 30;

export function evaluateRisk(snapshot: MarketSnapshot): RiskDecision {
  const ageSeconds = Math.max(0, Math.floor((snapshot.messageTimestampMs - snapshot.feedUpdateTimestampMs) / 1000));
  const divergenceBps = Math.round(Math.abs(snapshot.tokenPrice / snapshot.underlyingPrice - 1) * 10_000);
  const confidenceBps = snapshot.underlyingPrice > 0
    ? Math.ceil(Math.abs(snapshot.confidence / snapshot.underlyingPrice) * 10_000)
    : Number.POSITIVE_INFINITY;
  const poolDeviationBps = snapshot.poolPrice === null
    ? 0
    : Math.round(Math.abs(snapshot.poolPrice / snapshot.tokenPrice - 1) * 10_000);
  const nonRegular = snapshot.session !== "regular";
  const lowPublisherCount = snapshot.publisherCount < 5;
  const reasons: string[] = [];

  if (nonRegular) reasons.push(`Underlying session is ${snapshot.session.replace("_", " ")}.`);
  if (ageSeconds > 60) reasons.push(`Equity reference is ${formatAge(ageSeconds)} old.`);
  if (divergenceBps > 150) reasons.push(`Token/reference divergence is ${formatBps(divergenceBps)}.`);
  if (poolDeviationBps > 150) reasons.push(`Pool/token deviation is ${formatBps(poolDeviationBps)}.`);
  if (confidenceBps > 25) reasons.push(`Oracle confidence width is ${formatBps(confidenceBps)}.`);
  if (lowPublisherCount) reasons.push(`Oracle publisher count is low (${snapshot.publisherCount}).`);

  const invalidPrice = !Number.isFinite(snapshot.underlyingPrice) || snapshot.underlyingPrice <= 0
    || !Number.isFinite(snapshot.tokenPrice) || snapshot.tokenPrice <= 0;
  const shouldPause = invalidPrice || ageSeconds > 86_400 || divergenceBps > 1_500
    || poolDeviationBps > 1_000 || confidenceBps > 250 || snapshot.publisherCount < 3;
  if (shouldPause) {
    return {
      state: "paused",
      feeBps: 0,
      maxInputUsd: 0,
      ageSeconds,
      divergenceBps,
      confidenceBps,
      poolDeviationBps,
      reasons: [...reasons, invalidPrice ? "A market price is invalid." : "One or more hard risk limits were crossed."],
    };
  }

  const guarded = nonRegular || ageSeconds > 60 || divergenceBps > 150 || poolDeviationBps > 150
    || confidenceBps > 25 || lowPublisherCount;
  if (!guarded) {
    return {
      state: "open",
      feeBps: BASE_FEE_BPS,
      maxInputUsd: 5_000,
      ageSeconds,
      divergenceBps,
      confidenceBps,
      poolDeviationBps,
      reasons: ["Reference and pool conditions are inside the open envelope."],
    };
  }

  const ageFee = Math.min(120, Math.floor(ageSeconds / 600) * 5);
  const divergenceFee = Math.min(100, Math.floor(divergenceBps / 100) * 8);
  const confidenceFee = Math.min(100, Math.floor(confidenceBps / 25) * 8);
  const publisherFee = Math.max(0, 5 - snapshot.publisherCount) * 10;
  const feeBps = Math.min(250, BASE_FEE_BPS + 25 + ageFee + divergenceFee + confidenceFee + publisherFee);
  const qualityPenalty = Math.min(500, confidenceBps * 4) + Math.max(0, 5 - snapshot.publisherCount) * 100;
  const maxInputUsd = Math.max(250, Math.round(2_000 - Math.min(1_500, ageSeconds / 60) - divergenceBps / 2 - qualityPenalty));

  return { state: "guarded", feeBps, maxInputUsd, ageSeconds, divergenceBps, confidenceBps, poolDeviationBps, reasons };
}

export function quoteOutput(amountUsd: number, snapshot: MarketSnapshot, decision: RiskDecision) {
  if (decision.state === "paused" || snapshot.poolPrice === null || amountUsd <= 0 || amountUsd > decision.maxInputUsd) return null;
  const afterFee = amountUsd * (1 - decision.feeBps / 10_000);
  return afterFee / snapshot.poolPrice;
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

export const scenarios: Record<"fresh" | "afterHours" | "paused", MarketSnapshot> = {
  fresh: {
    id: "fixture-aapl-regular-01",
    source: "simulated",
    session: "regular",
    underlyingSymbol: "AAPL",
    tokenSymbol: "AAPLX",
    underlyingPrice: 229.18,
    tokenPrice: 229.74,
    poolPrice: 229.9,
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
    confidence: 0.74,
    publisherCount: 5,
    feedUpdateTimestampMs: now - 108_000_000,
    messageTimestampMs: now,
  },
};
