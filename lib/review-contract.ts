export type ReviewScenario = "fresh" | "afterHours" | "paused";
export type ReviewOptionId = "requested" | "reduced" | "wait";

export interface ReviewRequest {
  scenario: ReviewScenario;
  amount: number;
  intent: string;
}

export interface ReviewObservation {
  id: string;
  observedAt: string;
  expiresAt: string;
  referenceSource: "simulated";
  referenceAgeSeconds: number;
  session: string;
  divergenceBps: number;
  poolSource: "onchain-reserve-accounts" | "unavailable";
  poolAddress: string | null;
  reserves: { usdc: number; aaplx: number } | null;
  poolFeeBps: number | null;
  policyState: "open" | "guarded" | "paused";
  maxInputUsdc: number;
  reasons: string[];
}

export interface ReviewOption {
  id: ReviewOptionId;
  label: string;
  amountUsdc: number;
  feasible: boolean;
  quoteOutput: number | null;
  minimumOutput: number | null;
  slippageBps: number;
  blockers: string[];
}

export interface ReviewPlan {
  optionId: ReviewOptionId;
  summary: string;
  rationale: string[];
  tradeoffs: string[];
  evidenceIds: string[];
}

export interface ReviewResponse {
  request: ReviewRequest;
  observation: ReviewObservation;
  options: ReviewOption[];
  plan: ReviewPlan;
  validation: { passed: true; checks: string[] };
  receipt: {
    id: string;
    model: string;
    createdAt: string;
    latencyMs: number;
    usage: unknown;
    toolCalls: string[];
    promptVersion: string;
  };
}
