import { describe, expect, it } from "vitest";
import { evaluateRisk, quoteOutput, scenarios } from "../lib/market";

describe("AfterHours risk policy", () => {
  it("keeps a fresh regular-market quote open", () => {
    const decision = evaluateRisk(scenarios.fresh);
    expect(decision.state).toBe("open");
    expect(decision.feeBps).toBe(30);
  });

  it("guards a carried-forward closed-market quote", () => {
    const decision = evaluateRisk(scenarios.afterHours);
    expect(decision.state).toBe("guarded");
    expect(decision.feeBps).toBeGreaterThan(30);
    expect(decision.maxInputUsd).toBeLessThan(5_000);
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

  it("pauses on an invalid nonpositive reference price", () => {
    const snapshot = { ...scenarios.fresh, underlyingPrice: 0 };
    expect(evaluateRisk(snapshot).state).toBe("paused");
  });
});
