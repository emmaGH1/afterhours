import { evaluateRisk, quoteFromReserves, scenarios } from "./market";
import { minimumOutput, parseTokenAmount } from "./swap-instruction";
import type { VerifiedPool } from "./pool";
import type {
  ReviewObservation,
  ReviewOption,
  ReviewPlan,
  ReviewRequest,
  ReviewResponse,
  ReviewScenario,
} from "./review-contract";

export type { ReviewObservation, ReviewOption, ReviewPlan, ReviewRequest, ReviewResponse, ReviewScenario } from "./review-contract";

const USDC_TEST_DECIMALS = 6;
const AAPLX_TEST_DECIMALS = 6;
const SLIPPAGE_BPS = 100;
export const REVIEW_PLAN_LIFETIME_MS = 120_000;
export const REVIEW_PROMPT_VERSION = "serv-choice-v2";

export function parseReviewRequest(value: unknown): ReviewRequest | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (input.scenario !== "fresh" && input.scenario !== "afterHours" && input.scenario !== "paused") return null;
  if (typeof input.amount !== "number" || !Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 1_000_000) return null;
  if (typeof input.intent !== "string" || input.intent.trim().length < 3 || input.intent.length > 800) return null;
  try { parseTokenAmount(String(input.amount), USDC_TEST_DECIMALS); } catch { return null; }
  return { scenario: input.scenario as ReviewScenario, amount: input.amount, intent: input.intent.trim() };
}

function outputAsTokenNumber(raw: bigint, decimals: number): number {
  return Number(raw) / 10 ** decimals;
}

function buildTradeOption(
  id: "requested" | "reduced",
  label: string,
  amountUsdc: number,
  pool: VerifiedPool | null,
  policy: ReturnType<typeof evaluateRisk>,
  usdcDecimals: number,
  aaplxDecimals: number,
): ReviewOption {
  const blockers: string[] = [];
  let amountUnits: bigint | null = null;
  try { amountUnits = parseTokenAmount(String(amountUsdc), usdcDecimals); }
  catch { blockers.push(`Amount is not representable at ${usdcDecimals} USDC-test decimal places.`); }

  if (policy.state === "paused") blockers.push("The selected simulated reference scenario is paused by the interface policy.");
  else if (amountUsdc > policy.maxInputUsd) blockers.push(`Amount exceeds the ${policy.maxInputUsd} USDC-test interface limit.`);
  if (!pool) blockers.push("Verified devnet reserves are unavailable for this observation.");

  const quote = pool ? quoteFromReserves(amountUsdc, pool.reserves, pool.poolFeeBps) : null;
  let minimum: number | null = null;
  if (quote === null) {
    blockers.push("A reserve-based output quote is unavailable.");
  } else {
    try { minimum = outputAsTokenNumber(minimumOutput(quote, aaplxDecimals, SLIPPAGE_BPS), aaplxDecimals); }
    catch { blockers.push("The quote is too small or invalid for a nonzero minimum output."); }
  }

  return {
    id,
    label,
    amountUsdc,
    feasible: blockers.length === 0 && amountUnits !== null && quote !== null && minimum !== null,
    quoteOutput: quote,
    minimumOutput: minimum,
    slippageBps: SLIPPAGE_BPS,
    blockers,
  };
}

export function buildReviewOptions(
  request: ReviewRequest,
  pool: VerifiedPool | null,
  nowMs = Date.now(),
  createId: () => string = () => crypto.randomUUID(),
): Pick<ReviewResponse, "request" | "observation" | "options"> {
  const scenario = scenarios[request.scenario];
  const snapshot = {
    ...scenario,
    poolPrice: pool?.poolPrice ?? null,
    poolReserves: pool?.reserves ?? null,
    poolFeeBps: pool?.poolFeeBps ?? null,
  };
  const policy = evaluateRisk(snapshot, nowMs);
  const poolObservedAt = pool?.observedAt ? Date.parse(pool.observedAt) : Number.NaN;
  const observedAtMs = Number.isFinite(poolObservedAt) ? poolObservedAt : nowMs;
  const observedAt = new Date(observedAtMs).toISOString();
  const observationId = pool?.observationId || createId();
  const usdcDecimals = pool?.mints.usdcTest.decimals ?? USDC_TEST_DECIMALS;
  const aaplxDecimals = pool?.mints.aaplxTest.decimals ?? AAPLX_TEST_DECIMALS;
  const observation: ReviewObservation = {
    id: observationId,
    observedAt,
    expiresAt: new Date(observedAtMs + REVIEW_PLAN_LIFETIME_MS).toISOString(),
    referenceSource: "simulated",
    referenceAgeSeconds: policy.ageSeconds,
    session: scenario.session,
    divergenceBps: policy.divergenceBps,
    poolSource: pool ? "onchain-reserve-accounts" : "unavailable",
    poolAddress: pool?.poolAddress ?? null,
    reserves: pool?.reserves ?? null,
    poolFeeBps: pool?.poolFeeBps ?? null,
    policyState: policy.state,
    maxInputUsdc: policy.maxInputUsd,
    reasons: pool ? policy.reasons : [...policy.reasons, "Verified devnet reserve observation is unavailable; trade options cannot be executable."],
  };

  let requestedUnits: bigint;
  try { requestedUnits = parseTokenAmount(String(request.amount), usdcDecimals); }
  catch { requestedUnits = 0n; }
  let capUnits = 0n;
  try { capUnits = parseTokenAmount(String(policy.maxInputUsd), usdcDecimals); }
  catch { /* A zero or unrepresentable policy limit leaves only wait feasible. */ }
  const reducedUnits = requestedUnits > 0n ? [requestedUnits / 2n, capUnits].reduce((a, b) => a < b ? a : b) : 0n;
  const reducedAmount = outputAsTokenNumber(reducedUnits, usdcDecimals);

  return {
    request,
    observation,
    options: [
      buildTradeOption("requested", "Trade the requested amount", request.amount, pool, policy, usdcDecimals, aaplxDecimals),
      buildTradeOption("reduced", "Trade a smaller permitted amount", reducedAmount, pool, policy, usdcDecimals, aaplxDecimals),
      {
        id: "wait",
        label: "Wait without a swap",
        amountUsdc: 0,
        feasible: true,
        quoteOutput: null,
        minimumOutput: null,
        slippageBps: 0,
        blockers: [],
      },
    ],
  };
}

export function validateReviewPlan(
  value: unknown,
  observation: ReviewObservation,
  options: ReviewOption[],
  nowMs = Date.now(),
): { plan: ReviewPlan; checks: string[] } | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const validText = (text: unknown, maxLength: number): text is string =>
    typeof text === "string" && text.trim().length > 0 && text.length <= maxLength;
  if (!validText(input.summary, 500) || !Array.isArray(input.rationale) || input.rationale.length < 1 || input.rationale.length > 4
    || !input.rationale.every((item) => validText(item, 400)) || !Array.isArray(input.tradeoffs)
    || input.tradeoffs.length < 1 || input.tradeoffs.length > 4 || !input.tradeoffs.every((item) => validText(item, 400))) return null;
  if (!Array.isArray(input.evidenceIds) || input.evidenceIds.length !== 1 || input.evidenceIds[0] !== observation.id) return null;
  if (!Number.isFinite(Date.parse(observation.expiresAt)) || Date.parse(observation.expiresAt) <= nowMs) return null;

  const selected = options.find((option) => option.id === input.optionId);
  if (!selected || !selected.feasible) return null;
  if (selected.id !== "wait" && (selected.quoteOutput === null || selected.minimumOutput === null
    || observation.poolSource !== "onchain-reserve-accounts" || observation.reserves === null)) return null;

  return {
    plan: {
      optionId: selected.id,
      summary: input.summary.trim(),
      rationale: (input.rationale as string[]).map((item) => item.trim()),
      tradeoffs: (input.tradeoffs as string[]).map((item) => item.trim()),
      evidenceIds: [observation.id],
    },
    checks: [
      "Selected option exists in the gathered alternatives.",
      "Selected option is feasible under the deterministic policy and reserve checks.",
      "Evidence ID matches this single dated observation.",
      "Plan was validated before observation expiry.",
      "Free-form explanation remains advisory; its semantic claims are not independently verified.",
    ],
  };
}
