import { NextResponse } from "next/server";
import { GET as getPool } from "../pool/route";
import type { VerifiedPool } from "@/lib/pool";
import { buildReviewEvidence, parseReviewRequest, parseServReview } from "@/lib/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// A bounded demo allowance per server process, not a distributed billing limit.
let requests = 0;
let inFlight = false;
let lastRequestAt = 0;
const allowance = 60;
const prompt = `You are AfterHours, a pre-trade review assistant for a Solana DEVNET test-token demonstration.
Use only the evidence supplied. Explain the most important uncertainty, reconcile the selected simulated reference scenario with the reserve quote, and propose the next interface action.
All references are simulated; USDC-test and AAPLX-test are unbacked test tokens. A live reserve reading is not live reference data.
The tokens are real SPL tokens deployed on devnet, not simulated tokens. Only the reference scenario is simulated. Call amounts USDC-test, never dollars or real USDC.
poolSource onchain-reserve-accounts means this server read the configured devnet reserve accounts, checked their token mints, and derived the quote; accept that limited provenance. You have not independently audited the program or verified securities backing.
The deterministic allowed field and maxInputUsdc are authoritative. Never override a blocked policy, recommend bypassing it, or promise execution.
If allowed is false, nextAction must explain holding or reducing the request within the cap when the cap is positive. If policyState is paused, hold the request.
If poolSource is sample-reserves, nextAction must say to wait for verified reserves before wallet signing, even if allowed is true.
If allowed is true and reserves are verified, invite the user to inspect the current quote and minimum output before wallet signing; you cannot sign or trade.
The interface policy is bypassable by direct pool calls. No deployed AfterHours guard or Pyth verification exists. No browser-wallet swap is verified.
Return concise JSON: summary, checks (2 to 4 short evidence-based explanations), nextAction. Use plain language rather than field names, code formatting or JSON terminology in these texts. Do not invent prices, receipts or verification.`;

function failure(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) return failure("Review requests must come from this application.", 403);
    } catch { return failure("Review requests must come from this application.", 403); }
  }
  if (Number(request.headers.get("content-length") || 0) > 2_048) return failure("Review request is too large.", 413);
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 2_048) return failure("Review request is too large.", 413);
    body = JSON.parse(text);
  } catch { return failure("Provide a valid scenario and a positive test-USDC amount.", 400); }
  const input = parseReviewRequest(body);
  if (!input) return failure("Provide a valid scenario and a positive test-USDC amount.", 400);
  const key = process.env.OPENSERV_API_KEY;
  if (!key) return failure("SERV review is not configured on this server.", 503);
  if (requests >= allowance) return failure("This demo's review allowance has been reached. Existing quote and policy tools remain available.", 429);
  if (inFlight || Date.now() - lastRequestAt < 5_000) return failure("Please wait a few seconds before requesting another review.", 429);
  inFlight = true;
  lastRequestAt = Date.now();
  requests += 1;
  try {
    let pool: VerifiedPool | null = null;
    let poolTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const poolResponse = await Promise.race([
        getPool(),
        new Promise<null>((resolve) => { poolTimeout = setTimeout(() => resolve(null), 8_000); }),
      ]);
      if (poolResponse?.ok) pool = await poolResponse.json() as VerifiedPool;
    } finally { if (poolTimeout) clearTimeout(poolTimeout); }
    const evidence = buildReviewEvidence(input.scenario, input.amount, pool);
    const response = await fetch("https://inference-api.openserv.ai/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45_000), cache: "no-store",
      body: JSON.stringify({
        model: "gpt-6-luna", reasoning_effort: "low", max_completion_tokens: 2_048,
        messages: [{ role: "system", content: prompt }, { role: "user", content: JSON.stringify(evidence) }],
        response_format: { type: "json_schema", json_schema: { name: "afterhours_review", strict: true, schema: {
          type: "object", additionalProperties: false,
          properties: { summary: { type: "string" }, checks: { type: "array", items: { type: "string" } }, nextAction: { type: "string" } },
          required: ["summary", "checks", "nextAction"],
        } } },
      }),
    });
    if (!response.ok) return failure(`SERV could not complete this review (HTTP ${response.status}). No wallet action was requested.`, 502);
    const completion = await response.json();
    const choice = completion.choices?.[0];
    if (choice?.finish_reason !== "stop" || typeof choice.message?.content !== "string") return failure("SERV did not return a complete review. No wallet action was requested.", 502);
    let parsed: unknown;
    try { parsed = JSON.parse(choice.message.content); } catch { return failure("SERV returned an unreadable review. No wallet action was requested.", 502); }
    const review = parseServReview(parsed);
    if (!review) return failure("SERV returned a review that failed validation. No wallet action was requested.", 502);
    return NextResponse.json({ review, evidence, receipt: {
      id: completion.id, model: completion.model, createdAt: new Date().toISOString(), usage: completion.usage,
    } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure("The review service timed out or is unavailable. No wallet action was requested.", 502);
  } finally { inFlight = false; }
}
