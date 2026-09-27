import { describe, expect, it } from "vitest";
import { buildReviewOptions, parseReviewRequest, validateReviewPlan } from "../lib/review";
import type { ReviewOption, ReviewObservation, ReviewRequest } from "../lib/review-contract";
import type { VerifiedPool } from "../lib/pool";

const pool: VerifiedPool = {
  poolAddress: "7qa8JFCaHB5KzhD7EYejEgbkaKr3HYjT7LUbuzsaTNFq",
  poolAuthority: "AAAZEx7YisBUWWD2GZX3i38H7vZWCkKtv62JhabDTS4R",
  programId: "SwapsVeCiPHMUAtzQWZw7RjsKjgCjhwU55QGu4U1Szw",
  mints: {
    usdcTest: { address: "F7GpvkuKjESazTTkjvdBn2jFYFgMe5Mbks1zJ9ekcBJV", decimals: 6 },
    aaplxTest: { address: "4VNAoDuqqGLLjXayM6NN1H2PBtcQJEXByw9R384dVZvx", decimals: 6 },
    pool: { address: "FwZqJ6Dn6GcKazhndvsKzABg4AQKA6BHwCYFX3XdBX9f", decimals: 6 },
  },
  reserveAccounts: { usdcTest: "GZzceiWrJgse8tnyYcEX6wK9wnNXsxwcLMrCSji5syha", aaplxTest: "3gZ3Cac3wRZ9Qi1skjYXRBewbCKStx7qEUfvHiAoke6H" },
  feeAccount: "EURWavE3cRcvHupCytrvYPRiUfSAAaQaMkimyDx6bVyp",
  poolPrice: 230,
  poolFeeBps: 30,
  reserves: { usdc: 23_000, aaplx: 100 },
  proof: { signature: "verified-test-fixture", explorerUrl: "https://explorer.solana.com" },
  observationId: "observation-fixture-1",
  observedAt: "2026-09-27T12:00:00.000Z",
};

const carriedRequest: ReviewRequest = { scenario: "afterHours", amount: 100, intent: "I accept a smaller permitted trade." };
const nowMs = Date.parse("2026-09-27T12:00:01.000Z");

function optionSet(request = carriedRequest, currentPool: VerifiedPool | null = pool) {
  return buildReviewOptions(request, currentPool, nowMs, () => "observation-fixture-1");
}

function validPlan(optionId: string, observation: ReviewObservation) {
  return {
    optionId,
    summary: "A plan based on this observation.",
    rationale: ["This choice matches the stated preference."],
    tradeoffs: ["The review is advisory."],
    evidenceIds: [observation.id],
  };
}

describe("SERV review evidence and option boundary", () => {
  it("accepts only a valid scenario, precise positive amount, and short intent", () => {
    for (const value of [
      null,
      { scenario: "live", amount: 10, intent: "Proceed" },
      { scenario: "fresh", amount: -1, intent: "Proceed" },
      { scenario: "fresh", amount: 10.0000001, intent: "Proceed" },
      { scenario: "fresh", amount: "10", intent: "Proceed" },
      { scenario: "fresh", amount: 10, intent: "  " },
      { scenario: "fresh", amount: 10, intent: "x".repeat(801) },
    ]) expect(parseReviewRequest(value)).toBeNull();
    expect(parseReviewRequest({ scenario: "fresh", amount: 10.123456, intent: "Use the requested amount." }))
      .toEqual({ scenario: "fresh", amount: 10.123456, intent: "Use the requested amount." });
  });

  it("builds requested, half-or-cap reduction, and wait from one dated reserve observation", () => {
    const result = optionSet();
    expect(result.observation.id).toBe(pool.observationId);
    expect(result.observation.poolSource).toBe("onchain-reserve-accounts");
    expect(result.observation.expiresAt).toBe("2026-09-27T12:02:00.000Z");
    expect(result.options.map(({ id }) => id)).toEqual(["requested", "reduced", "wait"]);
    expect(result.options[0]).toMatchObject({ amountUsdc: 100, feasible: false, quoteOutput: expect.any(Number), minimumOutput: expect.any(Number) });
    expect(result.options[0].blockers.join(" ")).toContain("50 USDC-test interface limit");
    expect(result.options[1]).toMatchObject({ amountUsdc: 50, feasible: true, quoteOutput: expect.any(Number), minimumOutput: expect.any(Number) });
    expect(result.options[2]).toMatchObject({ amountUsdc: 0, feasible: true, quoteOutput: null, minimumOutput: null });
  });

  it("keeps reserve-derived indicative outputs for policy-blocked requests and forces wait when paused", () => {
    const result = optionSet({ scenario: "paused", amount: 10, intent: "Try to trade" });
    expect(result.observation.policyState).toBe("paused");
    expect(result.options[0]).toMatchObject({ feasible: false, quoteOutput: expect.any(Number), minimumOutput: expect.any(Number) });
    expect(result.options[1]).toMatchObject({ amountUsdc: 0, feasible: false, quoteOutput: null, minimumOutput: null });
    expect(result.options[2].feasible).toBe(true);
    expect(validateReviewPlan(validPlan("wait", result.observation), result.observation, result.options, nowMs)?.plan.optionId).toBe("wait");
    expect(validateReviewPlan(validPlan("requested", result.observation), result.observation, result.options, nowMs)).toBeNull();
  });

  it("never treats sample reserves as evidence or an executable choice", () => {
    const result = optionSet({ scenario: "fresh", amount: 100, intent: "A smaller option is fine." }, null);
    expect(result.observation.poolSource).toBe("unavailable");
    expect(result.observation.reserves).toBeNull();
    expect(result.options[0]).toMatchObject({ feasible: false, quoteOutput: null, minimumOutput: null });
    expect(result.options[1]).toMatchObject({ feasible: false, amountUsdc: 50, quoteOutput: null, minimumOutput: null });
    expect(result.options[2].feasible).toBe(true);
    expect(validateReviewPlan(validPlan("requested", result.observation), result.observation, result.options, nowMs)).toBeNull();
  });

  it("validates option IDs, feasibility, observation evidence, and expiry", () => {
    const result = optionSet();
    const validate = (candidate: unknown, at = nowMs) => validateReviewPlan(candidate, result.observation, result.options, at);
    expect(validate(validPlan("reduced", result.observation))?.checks).toHaveLength(5);
    expect(validate(validPlan("unknown", result.observation))).toBeNull();
    expect(validate(validPlan("requested", result.observation))).toBeNull();
    expect(validate({ ...validPlan("reduced", result.observation), evidenceIds: ["some-other-observation"] })).toBeNull();
    expect(validate(validPlan("reduced", result.observation), Date.parse(result.observation.expiresAt))).toBeNull();
    expect(validate({ ...validPlan("reduced", result.observation), rationale: [] })).toBeNull();
  });
});
