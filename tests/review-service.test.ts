import { describe, expect, it } from "vitest";
import { createReviewPostHandler } from "../lib/review-service";
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
  observationId: "service-observation-1",
  observedAt: "2026-09-27T12:00:00.000Z",
};
const fixedNow = () => Date.parse("2026-09-27T12:00:01.000Z");

function toolCompletion(id = "completion-tool") {
  return {
    id,
    model: "gpt-6-luna",
    choices: [{ finish_reason: "tool_calls", message: { role: "assistant", content: null, tool_calls: [
      { id: "call-options-1", type: "function", function: { name: "get_review_options", arguments: "{}" } },
    ] } }],
    usage: { prompt_tokens: 30, completion_tokens: 4, total_tokens: 34 },
  };
}

function responseCompletion(payload: Record<string, unknown>, optionId = "requested", finishReason = "stop") {
  const messages = payload.messages as Array<Record<string, unknown>>;
  const toolMessage = messages.find((message) => message.role === "tool");
  const toolResult = JSON.parse(String(toolMessage?.content)) as { observation: { id: string } };
  const content = JSON.stringify({
    optionId,
    summary: "This option follows the stated preference.",
    rationale: ["It is feasible in the gathered observation."],
    tradeoffs: ["This review is advisory."],
    evidenceIds: [toolResult.observation.id],
  });
  return {
    id: "completion-choice",
    model: "gpt-6-luna",
    choices: [{ finish_reason: finishReason, message: { role: "assistant", content } }],
    usage: { prompt_tokens: 60, completion_tokens: 18, total_tokens: 78 },
  };
}

function request(signal?: AbortSignal) {
  return new Request("http://localhost/api/review", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost" },
    body: JSON.stringify({ scenario: "fresh", amount: 10, intent: "Use the requested amount." }),
    signal,
  });
}

function successfulFetcher(optionId = "requested") {
  return async (_url: RequestInfo | URL, init?: RequestInit) => {
    const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json(payload.tools ? toolCompletion() : responseCompletion(payload, optionId));
  };
}

describe("review route service", () => {
  it("runs one actual options tool call and one structured SERV choice", async () => {
    let poolSignal: AbortSignal | undefined;
    const handler = createReviewPostHandler({
      apiKey: () => "test-key",
      readPool: async (signal) => { poolSignal = signal; return pool; },
      fetcher: successfulFetcher(),
      now: fixedNow,
      createId: () => "fallback-observation",
    });
    const response = await handler(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(poolSignal?.aborted).toBe(false);
    expect(body.plan.optionId).toBe("requested");
    expect(body.validation.passed).toBe(true);
    expect(body.receipt.toolCalls).toEqual(["get_review_options:call-options-1"]);
    expect(body.receipt.usage.totals).toEqual({ prompt_tokens: 90, completion_tokens: 22, total_tokens: 112 });
  });

  it("surfaces provider failures and releases the process slot for the next request", async () => {
    let fail = true;
    const success = successfulFetcher();
    const handler = createReviewPostHandler({
      apiKey: () => "test-key",
      readPool: async () => pool,
      fetcher: async (url, init) => {
        if (fail) return new Response("upstream failure", { status: 503 });
        return success(url, init);
      },
      now: fixedNow,
    });
    expect((await handler(request())).status).toBe(502);
    fail = false;
    expect((await handler(request())).status).toBe(200);
  });

  it("provides a bounded development diagnostic without echoing the API key", async () => {
    const handler = createReviewPostHandler({
      apiKey: () => "private-test-key",
      readPool: async () => pool,
      fetcher: async () => Response.json({ error: {
        type: "invalid_request_error",
        code: "unsupported_parameter",
        param: "reasoning_effort",
        message: "Function tools with reasoning_effort are unsupported; key private-test-key Bearer private-test-key.",
      } }, { status: 400 }),
      now: fixedNow,
    });
    const response = await handler(request());
    const body = await response.json();
    expect(response.status).toBe(502);
    expect(body.error).toContain("options tool call");
    expect(body.error).toContain("reasoning_effort");
    expect(body.error).not.toContain("private-test-key");
  });

  it("forces the wait option when the reserve tool is unavailable", async () => {
    const handler = createReviewPostHandler({
      apiKey: () => "test-key",
      readPool: async () => { throw new Error("RPC unavailable"); },
      fetcher: successfulFetcher("wait"),
      now: fixedNow,
    });
    const response = await handler(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.observation.poolSource).toBe("unavailable");
    expect(body.options.filter((option: { feasible: boolean }) => option.feasible).map((option: { id: string }) => option.id)).toEqual(["wait"]);
    expect(body.plan.optionId).toBe("wait");
  });

  it("times out an upstream model call, aborts it, and releases capacity", async () => {
    let hold = true;
    let upstreamSignal: AbortSignal | null | undefined;
    let callStarted!: () => void;
    const started = new Promise<void>((resolve) => { callStarted = resolve; });
    const success = successfulFetcher();
    const handler = createReviewPostHandler({
      apiKey: () => "test-key",
      readPool: async () => pool,
      fetcher: async (url, init) => {
        if (hold) {
          upstreamSignal = init?.signal;
          callStarted();
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
          });
        }
        return success(url, init);
      },
      modelCallTimeoutMs: 10,
      now: fixedNow,
    });
    const pending = handler(request());
    await started;
    expect((await pending).status).toBe(504);
    expect(upstreamSignal?.aborted).toBe(true);
    hold = false;
    expect((await handler(request())).status).toBe(200);
  });

  it("times out the reserve read and returns a validated wait-only plan", async () => {
    let poolSignal: AbortSignal | undefined;
    const handler = createReviewPostHandler({
      apiKey: () => "test-key",
      readPool: async (signal) => {
        poolSignal = signal;
        return new Promise<VerifiedPool>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        });
      },
      fetcher: successfulFetcher("wait"),
      poolReadTimeoutMs: 10,
      now: fixedNow,
    });
    const response = await handler(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(poolSignal?.aborted).toBe(true);
    expect(body.observation.poolSource).toBe("unavailable");
    expect(body.plan.optionId).toBe("wait");
  });

  it("propagates client cancellation into the read-only reserve call and releases capacity", async () => {
    let cancelPool = true;
    let poolSignal: AbortSignal | undefined;
    let readStarted!: () => void;
    const started = new Promise<void>((resolve) => { readStarted = resolve; });
    const handler = createReviewPostHandler({
      apiKey: () => "test-key",
      readPool: async (signal) => {
        poolSignal = signal;
        if (!cancelPool) return pool;
        readStarted();
        return new Promise<VerifiedPool>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        });
      },
      fetcher: successfulFetcher(),
      now: fixedNow,
    });
    const controller = new AbortController();
    const pending = handler(request(controller.signal));
    await started;
    controller.abort();
    expect((await pending).status).toBe(499);
    expect(poolSignal?.aborted).toBe(true);
    cancelPool = false;
    expect((await handler(request())).status).toBe(200);
  });

  it("rejects malformed tool calls and truncated plan completions", async () => {
    let reads = 0;
    const malformed = createReviewPostHandler({
      apiKey: () => "test-key",
      readPool: async () => { reads += 1; return pool; },
      fetcher: async () => Response.json({
        ...toolCompletion(),
        choices: [{ finish_reason: "tool_calls", message: { role: "assistant", tool_calls: [
          { id: "call-bad", type: "function", function: { name: "get_review_options", arguments: "{\"amount\":100}" } },
        ] } }],
      }),
      now: fixedNow,
    });
    expect((await malformed(request())).status).toBe(502);
    expect(reads).toBe(0);

    const truncated = createReviewPostHandler({
      apiKey: () => "test-key",
      readPool: async () => pool,
      fetcher: async (_url, init) => {
        const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return Response.json(payload.tools ? toolCompletion() : responseCompletion(payload, "requested", "length"));
      },
      now: fixedNow,
    });
    expect((await truncated(request())).status).toBe(502);

    const invalidChoice = createReviewPostHandler({
      apiKey: () => "test-key",
      readPool: async () => pool,
      fetcher: successfulFetcher("unknown"),
      now: fixedNow,
    });
    expect((await invalidChoice(request())).status).toBe(502);

    const refused = createReviewPostHandler({
      apiKey: () => "test-key",
      readPool: async () => pool,
      fetcher: async (_url, init) => {
        const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return Response.json(payload.tools ? toolCompletion() : responseCompletion(payload, "requested", "content_filter"));
      },
      now: fixedNow,
    });
    expect((await refused(request())).status).toBe(502);
  });

  it("aborts an upstream SERV request and accepts a later review", async () => {
    let waitForCancellation = true;
    let upstreamSignal: AbortSignal | null | undefined;
    let requestStarted!: () => void;
    const started = new Promise<void>((resolve) => { requestStarted = resolve; });
    const success = successfulFetcher();
    const handler = createReviewPostHandler({
      apiKey: () => "test-key",
      readPool: async () => pool,
      fetcher: async (url, init) => {
        if (waitForCancellation) {
          upstreamSignal = init?.signal;
          requestStarted();
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
          });
        }
        return success(url, init);
      },
      now: fixedNow,
    });
    const controller = new AbortController();
    const pending = handler(request(controller.signal));
    await started;
    controller.abort();
    expect((await pending).status).toBe(499);
    expect(upstreamSignal?.aborted).toBe(true);
    waitForCancellation = false;
    expect((await handler(request())).status).toBe(200);
  });

  it("caps active reviews without leaving the process globally locked", async () => {
    let firstCalls = 0;
    let release!: () => void;
    let thirdStarted!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const threeStarted = new Promise<void>((resolve) => { thirdStarted = resolve; });
    const handler = createReviewPostHandler({
      apiKey: () => "test-key",
      readPool: async () => pool,
      fetcher: async (_url, init) => {
        const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
        if (payload.tools) {
          firstCalls += 1;
          if (firstCalls === 3) thirdStarted();
          await held;
          return Response.json(toolCompletion(`completion-tool-${firstCalls}`));
        }
        return Response.json(responseCompletion(payload));
      },
      now: fixedNow,
    });
    const pending = [handler(request()), handler(request()), handler(request())];
    await threeStarted;
    expect((await handler(request())).status).toBe(429);
    release();
    expect((await Promise.all(pending)).map((response) => response.status)).toEqual([200, 200, 200]);
    expect((await handler(request())).status).toBe(200);
  });

  it("enforces the bounded per-process request allowance", async () => {
    const handler = createReviewPostHandler({
      apiKey: () => "test-key",
      readPool: async () => pool,
      fetcher: async () => new Response(null, { status: 503 }),
      now: fixedNow,
    });
    for (let attempt = 0; attempt < 60; attempt += 1) expect((await handler(request())).status).toBe(502);
    expect((await handler(request())).status).toBe(429);
  });
});
