import { describe, expect, it } from "vitest";
import { getPythFeedConfig, parsePythResponse, type PythFeedConfig } from "../lib/pyth";

const confirmedFixtureFeeds: PythFeedConfig = {
  underlying: { id: 1001, catalogSymbol: "Equity.US.AAPL/USD" },
  tokenized: { id: 1002, catalogSymbol: "Crypto.AAPLX/USD" },
};

describe("Pyth response parser", () => {
  it("maps explicitly configured fixture feeds without floating the timestamps", () => {
    const result = parsePythResponse({
      parsed: {
        timestampUs: "1780000000000000",
        priceFeeds: [
          {
            priceFeedId: 1001,
            price: "22918000",
            exponent: -5,
            confidence: "8000",
            publisherCount: 11,
            marketSession: "regular",
            feedUpdateTimestamp: "1779999999000000",
          },
          {
            priceFeedId: 1002,
            price: "22974000000",
            exponent: -8,
            confidence: "12000000",
            publisherCount: 8,
            marketSession: "regular",
            feedUpdateTimestamp: "1779999999000000",
          },
        ],
      },
      solana: { encoding: "hex", data: "deadbeef" },
    }, confirmedFixtureFeeds);

    expect(result.snapshot.underlyingPrice).toBeCloseTo(229.18);
    expect(result.snapshot.tokenPrice).toBeCloseTo(229.74);
    expect(result.snapshot.feedUpdateTimestampMs).toBe(1779999999000);
    expect(result.snapshot.messageTimestampMs).toBe(1780000000000);
    expect(result.unverifiedSolanaMessage.data).toBe("deadbeef");
  });

  it("rejects a response without Solana-format bytes", () => {
    expect(() => parsePythResponse({ parsed: { timestampUs: "1", priceFeeds: [] } }, confirmedFixtureFeeds)).toThrow();
  });

  it("requires deployment-supplied catalog-confirmed IDs", () => {
    expect(getPythFeedConfig({})).toBeNull();
    expect(() => getPythFeedConfig({ PYTH_AAPL_FEED_ID: "4", PYTH_AAPLX_FEED_ID: "4" })).toThrow();
    expect(getPythFeedConfig({ PYTH_AAPL_FEED_ID: "1001", PYTH_AAPLX_FEED_ID: "1002" }))
      .toMatchObject({ underlying: { id: 1001 }, tokenized: { id: 1002 } });
  });
});
