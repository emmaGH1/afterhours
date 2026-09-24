import { describe, expect, it } from "vitest";
import { evaluateRisk, quoteOutput, scenarios } from "../lib/market";

describe("AfterHours risk policy", () => {
  it("keeps a fresh regular-market quote open", () => {
    const decision = evaluateRisk(scenarios.fresh);
    expect(decision.state).toBe("open");
    expect(decision.maxInputUsd).toBe(500);
    expect(quoteOutput(100, scenarios.fresh, decision)).toBeGreaterThan(0);
  });

  it("guards a carried-forward closed-market quote", () => {
    const decision = evaluateRisk(scenarios.afterHours);
    expect(decision.state).toBe("guarded");
    expect(decision.maxInputUsd).toBe(50);
  });

  it("pauses after a hard risk limit and returns no quote", () => {
    const decision = evaluateRisk(scenarios.paused);
    expect(decision.state).toBe("paused");
    expect(quoteOutput(100, scenarios.paused, decision)).toBeNull();
  });

  it("rejects an amount over the guarded limit", () => {
    const decision = evaluateRisk(scenarios.afterHours);
    expect(quoteOutput(decision.maxInputUsd + 1, scenarios.afterHours, decision)).toBeNull();
  });

  it("guards a fresh feed with an unusually wide confidence interval", () => {
    const snapshot = { ...scenarios.fresh, confidence: 1 };
    const decision = evaluateRisk(snapshot);
    expect(decision.confidenceBps).toBeGreaterThan(25);
    expect(decision.state).toBe("guarded");
    expect(decision.reasons.some((reason) => reason.includes("confidence width"))).toBe(true);
  });

  it("pauses when fewer than three oracle publishers contribute", () => {
    const snapshot = { ...scenarios.fresh, publisherCount: 2 };
    expect(evaluateRisk(snapshot).state).toBe("paused");
  });

  it("limits a carried-forward weekend reference to ten test USDC", () => {
    const snapshot = {
      ...scenarios.afterHours,
      feedUpdateTimestampMs: scenarios.afterHours.messageTimestampMs - 25 * 3_600_000,
    };
    expect(evaluateRisk(snapshot).maxInputUsd).toBe(10);
  });

  it("pauses after seventy-two hours even when prices still agree", () => {
    const snapshot = {
      ...scenarios.fresh,
      feedUpdateTimestampMs: scenarios.fresh.messageTimestampMs - 73 * 3_600_000,
    };
    expect(evaluateRisk(snapshot).state).toBe("paused");
  });

  it("rejects a live message older than thirty seconds", () => {
    const now = Date.now();
    const snapshot = {
      ...scenarios.fresh,
      source: "live" as const,
      messageTimestampMs: now - 31_000,
      feedUpdateTimestampMs: now - 32_000,
    };
    expect(evaluateRisk(snapshot, now).state).toBe("paused");
  });

  it("quotes from reserves and the fixed pool fee, including price impact", () => {
    const decision = evaluateRisk(scenarios.fresh);
    const quote = quoteOutput(100, scenarios.fresh, decision);
    expect(quote).not.toBeNull();
    expect(quote!).toBeLessThan(100 / scenarios.fresh.poolPrice!);
  });

  it("does not quote from a displayed spot price when reserve proof is absent", () => {
    const snapshot = { ...scenarios.fresh, poolReserves: null };
    expect(quoteOutput(100, snapshot, evaluateRisk(snapshot))).toBeNull();
  });

  it("does not quote a nonfinite input", () => {
    expect(quoteOutput(Number.NaN, scenarios.fresh, evaluateRisk(scenarios.fresh))).toBeNull();
  });

  it("pauses on an invalid nonpositive reference price", () => {
    const snapshot = { ...scenarios.fresh, underlyingPrice: 0 };
    expect(evaluateRisk(snapshot).state).toBe("paused");
  });

  it("pauses on malformed pool price or publisher count", () => {
    expect(evaluateRisk({ ...scenarios.fresh, poolPrice: Number.NaN }).state).toBe("paused");
    expect(evaluateRisk({ ...scenarios.fresh, poolPrice: 0 }).state).toBe("paused");
    expect(evaluateRisk({ ...scenarios.fresh, publisherCount: Number.NaN }).state).toBe("paused");
  });
});
