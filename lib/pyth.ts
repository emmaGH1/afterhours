import type { MarketSession, MarketSnapshot } from "./market";

export const PYTH_FEEDS = {
  underlying: { id: 922, symbol: "Equity.US.AAPL/USD" },
  tokenized: { id: 1792, symbol: "Crypto.AAPLX/USD" },
} as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown, field: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Pyth field ${field} is missing or invalid.`);
  return parsed;
}

function normalizeSession(value: unknown): MarketSession {
  const raw = String(value ?? "closed").toLowerCase().replaceAll("-", "_");
  const aliases: Record<string, MarketSession> = {
    premarket: "pre_market",
    postmarket: "post_market",
    pre_market: "pre_market",
    post_market: "post_market",
    afterhours: "overnight",
    after_hours: "overnight",
  };
  const session = aliases[raw] ?? raw;
  if (["regular", "pre_market", "post_market", "overnight", "closed"].includes(session)) {
    return session as MarketSession;
  }
  return "closed";
}

function decimalPrice(feed: UnknownRecord) {
  const price = asNumber(feed.price, "price");
  const exponent = asNumber(feed.exponent, "exponent");
  return price * 10 ** exponent;
}

export interface ParsedPythMarket {
  snapshot: MarketSnapshot;
  signedPayload: { encoding: string; data: string };
}

export function parsePythResponse(payload: unknown): ParsedPythMarket {
  if (!isRecord(payload) || !isRecord(payload.parsed)) throw new Error("Pyth response has no parsed payload.");
  const parsed = payload.parsed;
  const feeds = Array.isArray(parsed.priceFeeds) ? parsed.priceFeeds.filter(isRecord) : [];
  const underlying = feeds.find((feed) => asNumber(feed.priceFeedId, "priceFeedId") === PYTH_FEEDS.underlying.id);
  const tokenized = feeds.find((feed) => asNumber(feed.priceFeedId, "priceFeedId") === PYTH_FEEDS.tokenized.id);
  if (!underlying || !tokenized) throw new Error("Pyth response did not include both required feeds.");

  const solana = isRecord(payload.solana) ? payload.solana : null;
  if (!solana || typeof solana.data !== "string" || solana.data.length === 0) {
    throw new Error("Pyth response has no signed Solana payload.");
  }

  const messageTimestampUs = asNumber(parsed.timestampUs, "timestampUs");
  const feedUpdateTimestampUs = asNumber(underlying.feedUpdateTimestamp, "feedUpdateTimestamp");
  const tokenPrice = decimalPrice(tokenized);

  return {
    snapshot: {
      id: `pyth-${Math.trunc(messageTimestampUs)}`,
      source: "live",
      session: normalizeSession(underlying.marketSession),
      underlyingSymbol: "AAPL",
      tokenSymbol: "AAPLX",
      underlyingPrice: decimalPrice(underlying),
      tokenPrice,
      poolPrice: null,
      confidence: asNumber(underlying.confidence, "confidence") * 10 ** asNumber(underlying.exponent, "exponent"),
      publisherCount: asNumber(underlying.publisherCount, "publisherCount"),
      feedUpdateTimestampMs: feedUpdateTimestampUs / 1_000,
      messageTimestampMs: messageTimestampUs / 1_000,
    },
    signedPayload: {
      encoding: typeof solana.encoding === "string" ? solana.encoding : "hex",
      data: solana.data,
    },
  };
}
