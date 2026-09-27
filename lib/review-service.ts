import { randomUUID } from "node:crypto";
import { buildReviewOptions, parseReviewRequest, REVIEW_PROMPT_VERSION, validateReviewPlan } from "./review";
import type { VerifiedPool } from "./pool";

const SERV_URL = "https://inference-api.openserv.ai/v1/chat/completions";
const SERV_MODEL = "gpt-6-luna";
const MAX_REQUESTS_PER_PROCESS = 60;
const MAX_ACTIVE_PER_PROCESS = 3;
const MAX_MODEL_CALL_MS = 45_000;
const MAX_POOL_READ_MS = 8_000;
const MAX_BODY_CHARS = 3_072;

const decisionPrompt = `You are SERV, choosing among deterministic alternatives for one AfterHours review.
The user's natural-language intent determines which feasible alternative best matches their preferences. Choose exactly one option by its listed ID; never change any amount, arithmetic, policy, reserves, quote, minimum output, evidence ID, or expiry.
Use only the get_review_options tool result. A requested or reduced option with feasible=false is not available. If reserves are unavailable, only wait is feasible. If policyState is paused, only wait is feasible. If the user's requirements conflict, choose wait when no feasible option satisfies them. Never recommend bypassing the interface policy.
Return concise JSON. Rationale and tradeoffs are free-form advisory text; do not invent evidence or claim semantic verification. Cite only the observation ID supplied by the tool. Always label input amounts as USDC-test and outputs as AAPLX-test. Never call them real USDC, dollars, or shares. These are real SPL tokens on devnet, but they are unbacked test tokens. This is an advisory review for simulated references, not Pyth verification, an on-chain guard, or a trade instruction.`;

const gatherTool = {
  type: "function",
  function: {
    name: "get_review_options",
    description: "Read one current devnet reserve observation and return deterministic requested, reduced, and wait alternatives for this review.",
    strict: true,
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
};

interface CompletionChoice {
  finish_reason?: unknown;
  message?: {
    role?: unknown;
    content?: unknown;
    refusal?: unknown;
    tool_calls?: Array<{
      id?: unknown;
      type?: unknown;
      function?: { name?: unknown; arguments?: unknown };
    }>;
  };
}

interface Completion {
  id: string;
  model: string;
  choices: CompletionChoice[];
  usage?: unknown;
}

interface ReviewServiceDependencies {
  apiKey: () => string | undefined;
  readPool: (signal: AbortSignal) => Promise<VerifiedPool>;
  fetcher?: typeof fetch;
  now?: () => number;
  createId?: () => string;
  modelCallTimeoutMs?: number;
  poolReadTimeoutMs?: number;
}

class ServiceFailure extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function failure(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readCompletion(value: unknown, stage: string): Completion {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id || typeof value.model !== "string" || !value.model
    || !Array.isArray(value.choices)) throw new ServiceFailure(`SERV returned an incomplete ${stage} completion. No wallet action was requested.`, 502);
  return value as unknown as Completion;
}

function parseEmptyArguments(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) && Object.keys(parsed).length === 0;
  } catch { return false; }
}

async function sanitizedProviderError(response: Response, apiKey: string): Promise<string> {
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    const reader = response.body?.getReader();
    if (reader) {
      while (length < 4_096) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        const chunk = value.subarray(0, 4_096 - length);
        chunks.push(chunk);
        length += chunk.length;
        if (chunk.length !== value.length) { await reader.cancel(); break; }
      }
      reader.releaseLock();
    }
  } catch { return ""; }
  if (!length) return "";
  const text = new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return ""; }
  if (!isRecord(parsed) || !isRecord(parsed.error)) return "";
  const upstream = parsed.error;
  const labels = [upstream.type, upstream.code, upstream.param]
    .filter((item): item is string => typeof item === "string" && /^[a-z0-9_.-]{1,80}$/i.test(item));
  if (typeof upstream.message !== "string") return labels.length ? `(${labels.join(", ")})` : "";
  let message = upstream.message.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (apiKey) message = message.split(apiKey).join("[redacted]");
  message = message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b(?:sk|serv|os|api)[-_][A-Za-z0-9_-]{16,}\b/gi, "[redacted]");
  return `${labels.length ? `(${labels.join(", ")}) ` : ""}${message.slice(0, 220)}`;
}

function usageReceipt(first: Completion, second: Completion) {
  const calls = [first, second].map((completion) => ({ completionId: completion.id, usage: completion.usage ?? null }));
  const values = calls.map(({ usage }) => usage);
  const numeric = (key: string) => {
    if (!values.every((value) => isRecord(value) && typeof value[key] === "number")) return undefined;
    return (values as Array<Record<string, number>>).reduce((sum, value) => sum + value[key], 0);
  };
  const totals = {
    prompt_tokens: numeric("prompt_tokens"),
    completion_tokens: numeric("completion_tokens"),
    total_tokens: numeric("total_tokens"),
  };
  return { calls, totals: Object.fromEntries(Object.entries(totals).filter(([, count]) => count !== undefined)) };
}

export function createReviewPostHandler(dependencies: ReviewServiceDependencies) {
  const fetcher = dependencies.fetcher ?? fetch;
  const now = dependencies.now ?? Date.now;
  const createId = dependencies.createId ?? randomUUID;
  let admittedRequests = 0;
  let activeRequests = 0;

  async function callServ(body: unknown, key: string, stage: string, requestSignal: AbortSignal): Promise<Completion> {
    const timeoutSignal = AbortSignal.timeout(dependencies.modelCallTimeoutMs ?? MAX_MODEL_CALL_MS);
    const signal = AbortSignal.any([requestSignal, timeoutSignal]);
    let response: Response;
    try {
      response = await fetcher(SERV_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal,
      });
    } catch {
      if (requestSignal.aborted) throw new ServiceFailure("Review request was cancelled.", 499);
      if (timeoutSignal.aborted) throw new ServiceFailure("SERV did not respond before the review timeout.", 504);
      throw new ServiceFailure("SERV is unavailable. No wallet action was requested.", 502);
    }
    if (!response.ok) {
      const detail = process.env.NODE_ENV === "production" ? "" : await sanitizedProviderError(response, key);
      throw new ServiceFailure(`SERV rejected the ${stage} request (HTTP ${response.status}).${detail ? ` ${detail}` : ""} No wallet action was requested.`, 502);
    }
    let result: unknown;
    try { result = await response.json(); }
    catch {
      if (requestSignal.aborted) throw new ServiceFailure("Review request was cancelled.", 499);
      throw new ServiceFailure(`SERV returned an unreadable ${stage} completion. No wallet action was requested.`, 502);
    }
    return readCompletion(result, stage);
  }

  return async function POST(request: Request): Promise<Response> {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== request.headers.get("host")) return failure("Review requests must come from this application.", 403);
      } catch { return failure("Review requests must come from this application.", 403); }
    }
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_CHARS) return failure("Review request is too large.", 413);
    let body: unknown;
    try {
      const text = await request.text();
      if (text.length > MAX_BODY_CHARS) return failure("Review request is too large.", 413);
      body = JSON.parse(text);
    } catch { return failure("Provide a scenario, positive test-USDC amount, and natural-language intent.", 400); }
    const input = parseReviewRequest(body);
    if (!input) return failure("Provide a scenario, positive test-USDC amount with at most six decimals, and a short natural-language intent.", 400);

    const key = dependencies.apiKey();
    if (!key) return failure("SERV review is not configured on this server.", 503);
    if (admittedRequests >= MAX_REQUESTS_PER_PROCESS) {
      return failure("This demo's review allowance has been reached. Existing quote and policy tools remain available.", 429);
    }
    if (activeRequests >= MAX_ACTIVE_PER_PROCESS) {
      return failure("SERV is reviewing other requests right now. Please retry shortly.", 429);
    }

    admittedRequests += 1;
    activeRequests += 1;
    const startedAt = performance.now();
    try {
      const first = await callServ({
        model: SERV_MODEL,
        reasoning_effort: "none",
        max_completion_tokens: 512,
        messages: [
          { role: "system", content: "Call get_review_options exactly once. Do not answer from memory." },
          { role: "user", content: JSON.stringify({ scenario: input.scenario, amountUsdc: input.amount, intent: input.intent }) },
        ],
        tools: [gatherTool],
        tool_choice: { type: "function", function: { name: "get_review_options" } },
      }, key, "options tool call", request.signal);
      const firstChoice = first.choices[0];
      const toolCalls = firstChoice?.message?.tool_calls;
      if (firstChoice?.finish_reason !== "tool_calls" || !Array.isArray(toolCalls) || toolCalls.length !== 1
        || toolCalls[0]?.type !== "function" || toolCalls[0]?.function?.name !== "get_review_options"
        || typeof toolCalls[0]?.id !== "string" || !toolCalls[0].id || !parseEmptyArguments(toolCalls[0]?.function?.arguments)) {
        throw new ServiceFailure("SERV did not request the required review-options tool. No wallet action was requested.", 502);
      }

      let pool: VerifiedPool | null = null;
      const poolTimeoutSignal = AbortSignal.timeout(dependencies.poolReadTimeoutMs ?? MAX_POOL_READ_MS);
      const poolSignal = AbortSignal.any([request.signal, poolTimeoutSignal]);
      try { pool = await dependencies.readPool(poolSignal); }
      catch {
        if (request.signal.aborted) throw new ServiceFailure("Review request was cancelled.", 499);
        pool = null;
      }
      const gathered = buildReviewOptions(input, pool, now(), createId);
      const toolCallId = toolCalls[0].id as string;
      const toolCallMessage = {
        role: "assistant",
        content: firstChoice.message?.content ?? null,
        tool_calls: toolCalls,
      };
      const feasibleIds = gathered.options.filter((option) => option.feasible).map((option) => option.id);
      const second = await callServ({
        model: SERV_MODEL,
        reasoning_effort: "low",
        max_completion_tokens: 1_024,
        messages: [
          { role: "system", content: decisionPrompt },
          { role: "user", content: JSON.stringify({ scenario: input.scenario, amountUsdc: input.amount, intent: input.intent }) },
          toolCallMessage,
          { role: "tool", tool_call_id: toolCallId, content: JSON.stringify({ observation: gathered.observation, options: gathered.options }) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "afterhours_review_plan",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                optionId: { type: "string", enum: feasibleIds },
                summary: { type: "string", minLength: 1, maxLength: 500 },
                rationale: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", minLength: 1, maxLength: 400 } },
                tradeoffs: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", minLength: 1, maxLength: 400 } },
                evidenceIds: { type: "array", minItems: 1, maxItems: 1, items: { type: "string", enum: [gathered.observation.id] } },
              },
              required: ["optionId", "summary", "rationale", "tradeoffs", "evidenceIds"],
            },
          },
        },
      }, key, "structured choice", request.signal);
      const secondChoice = second.choices[0];
      if (secondChoice?.finish_reason !== "stop" || typeof secondChoice.message?.content !== "string") {
        throw new ServiceFailure("SERV did not return a complete plan. No wallet action was requested.", 502);
      }
      let parsedPlan: unknown;
      try { parsedPlan = JSON.parse(secondChoice.message.content); }
      catch { throw new ServiceFailure("SERV returned an unreadable plan. No wallet action was requested.", 502); }
      const validated = validateReviewPlan(parsedPlan, gathered.observation, gathered.options, now());
      if (!validated) throw new ServiceFailure("SERV's option, evidence, feasibility, or expiry selection failed application validation. No wallet action was requested.", 502);

      const response = {
        ...gathered,
        plan: validated.plan,
        validation: { passed: true as const, checks: validated.checks },
        receipt: {
          id: second.id,
          model: second.model,
          createdAt: new Date(now()).toISOString(),
          latencyMs: Math.round(performance.now() - startedAt),
          usage: usageReceipt(first, second),
          toolCalls: [`get_review_options:${toolCallId}`],
          promptVersion: REVIEW_PROMPT_VERSION,
        },
      };
      return Response.json(response, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof ServiceFailure) return failure(error.message, error.status);
      if (request.signal.aborted) return failure("Review request was cancelled.", 499);
      return failure("The review service timed out or is unavailable. No wallet action was requested.", 502);
    } finally {
      activeRequests -= 1;
    }
  };
}
