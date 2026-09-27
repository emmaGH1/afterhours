import { describe, expect, it } from "vitest";
import { buildReviewEvidence, parseReviewRequest, parseServReview } from "../lib/review";

describe("SERV review boundary", () => {
  it("rejects arbitrary scenarios and invalid trade amounts", () => {
    for (const value of [null, { scenario: "live", amount: 10 }, { scenario: "fresh", amount: -1 }, { scenario: "fresh", amount: Infinity }, { scenario: "fresh", amount: "10" }]) {
      expect(parseReviewRequest(value)).toBeNull();
    }
    expect(parseReviewRequest({ scenario: "fresh", amount: 10, allowed: true })).toEqual({ scenario: "fresh", amount: 10 });
  });
  it("reconstructs a guarded rejection without client policy inputs", () => {
    const evidence = buildReviewEvidence("afterHours", 100, null);
    expect(evidence.allowed).toBe(false);
    expect(evidence.maxInputUsdc).toBe(50);
    expect(evidence.quoteOutput).toBeNull();
    expect(evidence.referenceSource).toBe("simulated");
    expect(evidence.poolSource).toBe("sample-reserves");
  });
  it("keeps paused requests blocked and sample quotes distinct from live reserves", () => {
    expect(buildReviewEvidence("paused", 1, null).allowed).toBe(false);
    const fresh = buildReviewEvidence("fresh", 10, null);
    expect(fresh.allowed).toBe(true);
    expect(fresh.quoteOutput).toBeGreaterThan(0);
    expect(fresh.poolAddress).toBeNull();
  });
  it("rejects malformed or empty model output", () => {
    expect(parseServReview({ summary: "", checks: [], nextAction: "" })).toBeNull();
    expect(parseServReview({ summary: "Review", checks: [42], nextAction: "Hold" })).toBeNull();
    expect(parseServReview({ summary: "Blocked", checks: ["Over the cap"], nextAction: "Reduce amount" })).not.toBeNull();
  });
});
