import { evaluateRisk, quoteOutput, type MarketSnapshot, type RiskDecision } from "./market";
import type { VerifiedPool } from "./pool";
import committedPoolManifest from "../public/pool-manifest.json";

const COMMITTED_POOL = committedPoolManifest;

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

function hasCommittedPoolBinding(pool: VerifiedPool) {
  const expected = COMMITTED_POOL;
  const calculatedPoolPrice = pool.reserves.usdc / pool.reserves.aaplx;
  const priceMatchesReserves = Number.isFinite(calculatedPoolPrice) && calculatedPoolPrice > 0
    && Math.abs(pool.poolPrice / calculatedPoolPrice - 1) < 0.000001;
  return pool.poolAddress === expected.poolAddress
    && pool.poolAuthority === expected.poolAuthority
    && pool.programId === expected.programId
    && pool.mints.usdcTest.address === expected.mints.usdcTest.address
    && pool.mints.usdcTest.decimals === expected.mints.usdcTest.decimals
    && pool.mints.aaplxTest.address === expected.mints.aaplxTest.address
    && pool.mints.aaplxTest.decimals === expected.mints.aaplxTest.decimals
    && pool.mints.pool.address === expected.mints.pool.address
    && pool.mints.pool.decimals === expected.mints.pool.decimals
    && pool.reserveAccounts.usdcTest === expected.reserveAccounts.usdcTest
    && pool.reserveAccounts.aaplxTest === expected.reserveAccounts.aaplxTest
    && pool.feeAccount === expected.feeAccount
    && pool.poolFeeBps === expected.poolFee.basisPoints
    && pool.proof.signature === expected.proof.signature
    && pool.proof.explorerUrl === expected.proof.explorerUrl
    && Number.isFinite(pool.reserves.usdc) && pool.reserves.usdc > 0
    && Number.isFinite(pool.reserves.aaplx) && pool.reserves.aaplx > 0
    && Number.isFinite(pool.poolFeeBps) && pool.poolFeeBps >= 0 && pool.poolFeeBps < 10_000
    && priceMatchesReserves;
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
  if (!pool || !pool.proof?.signature || !hasAddress(pool.poolAddress)
    || !hasAddress(pool.poolAuthority) || !hasAddress(pool.programId)
    || !hasAddress(pool.reserveAccounts?.usdcTest) || !hasAddress(pool.reserveAccounts?.aaplxTest)
    || !hasAddress(pool.feeAccount) || !hasAddress(pool.mints?.usdcTest?.address)
    || !hasAddress(pool.mints?.aaplxTest?.address) || !hasAddress(pool.mints?.pool?.address)
    || !hasCommittedPoolBinding(pool)) {
    return { allowed: false, reason: "The pool API response does not match the committed devnet pool binding.", disclosure: null, risk, quoteAaplx: null };
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
