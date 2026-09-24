import { describe, expect, it } from "vitest";
import { assessDirectSwap } from "../lib/direct-swap";
import { scenarios } from "../lib/market";
import type { VerifiedPool } from "../lib/pool";

const address = "11111111111111111111111111111111";
const pool: VerifiedPool = {
  poolAddress: address,
  poolAuthority: address,
  programId: "SwapsVeCiPHMUAtzQWZw7RjsKjgCjhwU55QGu4U1Szw",
  mints: {
    usdcTest: { address, decimals: 6 },
    aaplxTest: { address, decimals: 6 },
    pool: { address, decimals: 6 },
  },
  reserveAccounts: { usdcTest: address, aaplxTest: address },
  feeAccount: address,
  poolPrice: 230,
  poolFeeBps: 30,
  reserves: { usdc: 23_000, aaplx: 100 },
  proof: { signature: "test-signature", explorerUrl: "https://explorer.solana.com" },
};

describe("direct-pool fallback gate", () => {
  it("requires a verified reserve payload", () => {
    expect(assessDirectSwap(null, scenarios.fresh, 25).allowed).toBe(false);
  });

  it("refuses a manifest pointing at another swap program", () => {
    expect(assessDirectSwap({ ...pool, programId: address }, scenarios.fresh, 25).allowed).toBe(false);
  });

  it("allows a labelled simulated scenario with a real-pool quote", () => {
    const result = assessDirectSwap(pool, scenarios.fresh, 25);
    expect(result.allowed).toBe(true);
    expect(result.disclosure).toBe("Reference/policy simulated; token swap real; no on-chain guard.");
    expect(result.quoteAaplx).toBeGreaterThan(0);
  });

  it("keeps live mode when Pyth data is present", () => {
    const now = Date.now();
    const snapshot = { ...scenarios.fresh, source: "live" as const, feedUpdateTimestampMs: now - 10_000, messageTimestampMs: now };
    expect(assessDirectSwap(pool, snapshot, 25, now).disclosure).toBe("Live Pyth reference; token swap real; no on-chain guard.");
  });

  it("refuses an amount above the selected scenario's cap", () => {
    const result = assessDirectSwap(pool, scenarios.afterHours, 51);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("50 USDC-test");
  });

  it("uses the actual pool spot even when a scenario embeds a friendlier sample price", () => {
    const divergentPool = { ...pool, poolPrice: 300, reserves: { usdc: 30_000, aaplx: 100 } };
    expect(assessDirectSwap(divergentPool, scenarios.fresh, 25).allowed).toBe(false);
  });

  it("rechecks live message expiry at submission time", () => {
    const now = Date.now();
    const snapshot = { ...scenarios.fresh, source: "live" as const, messageTimestampMs: now - 31_000, feedUpdateTimestampMs: now - 32_000 };
    expect(assessDirectSwap(pool, snapshot, 25, now).allowed).toBe(false);
  });
});
