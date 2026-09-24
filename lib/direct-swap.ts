import { evaluateRisk, quoteOutput, type MarketSnapshot, type RiskDecision } from "./market";
import type { VerifiedPool } from "./pool";

const EXPECTED_SWAP_PROGRAM_ID = "SwapsVeCiPHMUAtzQWZw7RjsKjgCjhwU55QGu4U1Szw";

export interface DirectSwapAssessment {
  allowed: boolean;
  reason: string;
  disclosure: string | null;
  risk: RiskDecision;
  quoteAaplx: number | null;
}

function hasAddress(value: string | undefined) {
  return typeof value === "string" && value.length >= 32 && value.length <= 44;
}

/**
 * This is intentionally an interface-level gate. It checks the API's verified
 * devnet-pool payload and policy state before the wallet signs a direct pool
 * transaction. It is not an on-chain route guard.
 */
export function assessDirectSwap(
  pool: VerifiedPool | null,
  snapshot: MarketSnapshot,
  amountUsdc: number,
  nowMs = Date.now(),
): DirectSwapAssessment {
  // Pool reserves and price come only from the verified API payload. A labelled
  // scenario may provide a reference/token condition, but never an execution quote.
  const executionSnapshot: MarketSnapshot = pool ? {
    ...snapshot,
    poolPrice: pool.poolPrice,
    poolReserves: pool.reserves,
    poolFeeBps: pool.poolFeeBps,
  } : snapshot;
  const risk = evaluateRisk(executionSnapshot, nowMs);
  if (!pool || !pool.proof?.signature || pool.programId !== EXPECTED_SWAP_PROGRAM_ID || !hasAddress(pool.poolAddress)
    || !hasAddress(pool.poolAuthority) || !hasAddress(pool.programId)
    || !hasAddress(pool.reserveAccounts?.usdcTest) || !hasAddress(pool.reserveAccounts?.aaplxTest)
    || !hasAddress(pool.feeAccount) || !hasAddress(pool.mints?.usdcTest?.address)
    || !hasAddress(pool.mints?.aaplxTest?.address) || !hasAddress(pool.mints?.pool?.address)) {
    return { allowed: false, reason: "A verified devnet pool manifest is required before a direct swap.", disclosure: null, risk, quoteAaplx: null };
  }
  const disclosure = snapshot.source === "live"
    ? "Live Pyth reference; token swap real; no on-chain guard."
    : "Reference/policy simulated; token swap real; no on-chain guard.";
  if (risk.state === "paused") {
    return { allowed: false, reason: risk.reasons[0] || "The interface risk policy is paused.", disclosure, risk, quoteAaplx: null };
  }
  if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
    return { allowed: false, reason: "Enter a positive USDC-test amount.", disclosure, risk, quoteAaplx: null };
  }
  if (amountUsdc > risk.maxInputUsd) {
    return { allowed: false, reason: `The current interface limit is ${risk.maxInputUsd} USDC-test.`, disclosure, risk, quoteAaplx: null };
  }
  const quoteAaplx = quoteOutput(amountUsdc, executionSnapshot, risk);
  if (quoteAaplx === null || !Number.isFinite(quoteAaplx) || quoteAaplx <= 0) {
    return { allowed: false, reason: "A reserve-derived quote is unavailable.", disclosure, risk, quoteAaplx: null };
  }
  return { allowed: true, reason: `${snapshot.source === "live" ? "Interface" : "Simulated interface"} policy and verified pool data permit this test swap.`, disclosure, risk, quoteAaplx };
}
