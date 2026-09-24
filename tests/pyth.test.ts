import { describe, expect, it } from "vitest";
import { parsePythResponse } from "../lib/pyth";

describe("Pyth response parser", () => {
  it("maps signed AAPL and AAPLX fields without floating the timestamps", () => {
    const result = parsePythResponse({
      parsed: {
        timestampUs: "1780000000000000",
        priceFeeds: [
          {
            priceFeedId: 922,
            price: "22918000",
            exponent: -5,
            confidence: "8000",
            publisherCount: 11,
            marketSession: "regular",
            feedUpdateTimestamp: "1779999999000000",
          },
          {
            priceFeedId: 1792,
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
    });

    expect(result.snapshot.underlyingPrice).toBeCloseTo(229.18);
    expect(result.snapshot.tokenPrice).toBeCloseTo(229.74);
    expect(result.snapshot.feedUpdateTimestampMs).toBe(1779999999000);
    expect(result.snapshot.messageTimestampMs).toBe(1780000000000);
    expect(result.signedPayload.data).toBe("deadbeef");
  });

  it("rejects a response without signed Solana bytes", () => {
    expect(() => parsePythResponse({ parsed: { timestampUs: "1", priceFeeds: [] } })).toThrow();
  });
});
