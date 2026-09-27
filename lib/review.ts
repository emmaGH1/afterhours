import { evaluateRisk, quoteOutput, scenarios } from "./market";
import type { VerifiedPool } from "./pool";

export type ReviewScenario = keyof typeof scenarios;
export interface ReviewEvidence {
  scenario: ReviewScenario;
  amount: number;
  policyState: string;
  maxInputUsdc: number;
  allowed: boolean;
  reasons: string[];
  referenceAgeSeconds: number;
  session: string;
  divergenceBps: number;
  referenceSource: "simulated";
  poolSource: "onchain-reserve-accounts" | "sample-reserves";
  quoteOutput: number | null;
  poolFeeBps: number;
  poolAddress: string | null;
}
export interface ServReview { summary: string; checks: string[]; nextAction: string }
export interface ReviewResponse {
  review: ServReview;
  evidence: ReviewEvidence;
  receipt: { id: string; model: string; createdAt: string; usage: unknown };
}

export function parseReviewRequest(value: unknown): { scenario: ReviewScenario; amount: number } | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (input.scenario !== "fresh" && input.scenario !== "afterHours" && input.scenario !== "paused") return null;
  if (typeof input.amount !== "number" || !Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 1_000_000) return null;
  return { scenario: input.scenario, amount: input.amount };
}

export function buildReviewEvidence(scenario: ReviewScenario, amount: number, pool: VerifiedPool | null): ReviewEvidence {
  const snapshot = pool ? { ...scenarios[scenario], poolPrice: pool.poolPrice, poolReserves: pool.reserves, poolFeeBps: pool.poolFeeBps } : scenarios[scenario];
  const policy = evaluateRisk(snapshot);
  return {
    scenario, amount, policyState: policy.state, maxInputUsdc: policy.maxInputUsd,
    allowed: policy.state !== "paused" && amount <= policy.maxInputUsd,
    reasons: policy.reasons, referenceAgeSeconds: policy.ageSeconds,
    session: snapshot.session, divergenceBps: policy.divergenceBps, referenceSource: "simulated",
    poolSource: pool ? "onchain-reserve-accounts" : "sample-reserves",
    quoteOutput: quoteOutput(amount, snapshot, policy), poolFeeBps: snapshot.poolFeeBps ?? 30,
    poolAddress: pool?.poolAddress ?? null,
  };
}

export function parseServReview(value: unknown): ServReview | null {
  if (!value || typeof value !== "object") return null;
  const review = value as Record<string, unknown>;
  const validText = (text: unknown): text is string => typeof text === "string" && text.trim().length > 0 && text.length <= 1_500;
  if (!validText(review.summary) || !validText(review.nextAction) || !Array.isArray(review.checks)
    || review.checks.length < 1 || review.checks.length > 6 || !review.checks.every(validText)) return null;
  return { summary: review.summary, checks: review.checks, nextAction: review.nextAction };
}
