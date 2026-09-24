import type { MarketSession, MarketSnapshot } from "./market";

export interface PythFeedConfig {
  /** The Pyth Pro catalog entry independently chosen for the AAPL reference. */
  underlying: { id: number; catalogSymbol: "Equity.US.AAPL/USD" };
  /**
   * The Pyth Pro catalog entry independently chosen for comparison. This does
   * not imply that the internal AAPLX-test devnet mint is the Pyth asset.
   */
  tokenized: { id: number; catalogSymbol: "Crypto.AAPLX/USD" };
}

interface PythFeedEnvironment {
  PYTH_AAPL_FEED_ID?: string;
  PYTH_AAPLX_FEED_ID?: string;
}

function parseFeedId(value: string | undefined, name: string) {
  if (!value || !/^\d+$/.test(value)) throw new Error(`${name} must be an unsigned Pyth Pro feed ID.`);
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id === 0) throw new Error(`${name} is invalid.`);
  return id;
}

/**
 * Feed IDs are an entitled-catalog deployment setting, never a product
 * assumption. Return no configuration until both mappings are independently
 * confirmed and supplied by the deployment environment.
 */
export function getPythFeedConfig(
  environment: PythFeedEnvironment = process.env as PythFeedEnvironment,
): PythFeedConfig | null {
  const underlyingId = environment.PYTH_AAPL_FEED_ID;
  const tokenizedId = environment.PYTH_AAPLX_FEED_ID;
  if (!underlyingId || !tokenizedId) return null;

  const underlying = parseFeedId(underlyingId, "PYTH_AAPL_FEED_ID");
  const tokenized = parseFeedId(tokenizedId, "PYTH_AAPLX_FEED_ID");
  if (underlying === tokenized) throw new Error("Pyth underlying and tokenized feed IDs must differ.");
  return {
    underlying: { id: underlying, catalogSymbol: "Equity.US.AAPL/USD" },
    tokenized: { id: tokenized, catalogSymbol: "Crypto.AAPLX/USD" },
  };
}

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
  /** Bytes received over REST, not verified by this parser or the browser. */
  unverifiedSolanaMessage: { encoding: string; data: string };
}

export function parsePythResponse(payload: unknown, feedsConfig: PythFeedConfig): ParsedPythMarket {
  if (!isRecord(payload) || !isRecord(payload.parsed)) throw new Error("Pyth response has no parsed payload.");
  const parsed = payload.parsed;
  const feeds = Array.isArray(parsed.priceFeeds) ? parsed.priceFeeds.filter(isRecord) : [];
  const underlying = feeds.find((feed) => asNumber(feed.priceFeedId, "priceFeedId") === feedsConfig.underlying.id);
  const tokenized = feeds.find((feed) => asNumber(feed.priceFeedId, "priceFeedId") === feedsConfig.tokenized.id);
  if (!underlying || !tokenized) throw new Error("Pyth response did not include both required feeds.");

  const solana = isRecord(payload.solana) ? payload.solana : null;
  if (!solana || typeof solana.data !== "string" || solana.data.length === 0) {
    throw new Error("Pyth response has no Solana-format message.");
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
    unverifiedSolanaMessage: {
      encoding: typeof solana.encoding === "string" ? solana.encoding : "hex",
      data: solana.data,
    },
  };
}
