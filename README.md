# AfterHours

A decision desk powered by SERV Reasoning. Give AfterHours a proposed devnet test-token trade and your intent; it gathers dated evidence, compares the requested amount, a permitted smaller trade, and waiting, then presents an advisory plan checked against deterministic constraints.

**Current status:** [the public Review Desk](https://afterhours-one-rho.vercel.app/workspace) is verified. The six-case real SERV evaluation passed, including different choices for two intents under the same guarded reserve values; that wait/reduced pair also passed in the public browser. Typecheck, 61 tests, and production build passed. This desk does not submit transactions.

## Why SERV is part of the decision

A policy cap tells you what is permitted, but not which permitted option best matches your intent. “Trade all 100 or wait” and “I prefer a smaller permitted trade” can call for different plans under the same evidence. SERV interprets that preference. Application tools handle exact calculations and feasibility; the model cannot change the policy or sign a transaction.

This is a prototype of a review component for trading-interface operators. That customer and revenue hypothesis is unvalidated; no adoption or production-readiness claim is made.

## Run locally

Requirements: Node.js and npm.

```bash
npm install
```

Copy `.env.example` to `.env.local` and add your server-only key:

```env
OPENSERV_API_KEY=your-key
```

Do not commit the key or prefix it with `NEXT_PUBLIC_`. Requests consume SERV account credit. No paid top-up or automatic retries are assumed.

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). `/` introduces the decision desk; `/workspace` is the Review Desk. No wallet is needed for the review workflow.

## Judge path

1. Select the carried simulated reference and request 100 USDC-test. Say you want the full amount or would rather wait.
2. Choose **Full amount or wait**, then **Compare with SERV**. In the verified guarded case, SERV selected waiting: 100 exceeds the interface's 50 cap, and a smaller amount does not satisfy that intent.
3. Keep the amount and scenario unchanged. Choose **Smaller is acceptable**, then run the comparison. With verified guarded reserves, SERV selected the reduced 50 USDC-test candidate.
4. Inspect the dated observation, candidate quotes/minimum outputs, selected option, application validation and actual API/tool-call record.
5. Try paused or unavailable-reserve conditions. Only waiting is feasible. Unknown or infeasible model selections must be rejected, not displayed as an accepted plan.

Those choices were observed in the browser and repeated in the real API evaluation. Each review gathers a new dated observation; future model responses or reserve changes can affect results. No wallet is needed. Plans expire after 120 seconds, and the optional quote inspection does not enable signing.

## Architecture and trust boundaries

`intent + request -> read-only evidence tool -> SERV option comparison -> deterministic selection validation -> user review`

SERV uses the [documented inference API](https://docs.openserv.ai/serv-reasoning/api/chat-completions). Exact policy and quote arithmetic belong to application tools, consistent with [SERV guidance](https://docs.openserv.ai/serv-reasoning/day-one).

One dated, batched reserve observation supplies the comparison options. Each request makes two actual SERV calls: an evidence-tool request and an intent-based selection. The receipt records actual tool calls, completion IDs, latency and usage; it is not a transaction receipt or proof that every free-text statement is true. Selection/feasibility validation is narrower than semantic verification of all model prose.

The demonstration limits each process to 60 admitted reviews and three concurrent requests, with bounded outputs, provider/reserve timeouts, cancellation, and no automatic retries. These are process-local controls: restarts and additional server instances reset or multiply them. They are not a hard billing cap.

The Review Desk permits optional read-only wallet quote and balance inspection. It does not submit swaps. The original direct SPL Token Swap v3 components remain in the repository as a separate foundation; their browser-wallet settlement is unverified. No model-generated prose constructs or authorizes a transaction.

USDC-test and AAPLX-test are real devnet SPL test tokens, not backed securities. Reference scenarios are simulated; no live or signed Pyth reference is connected. The interface policy is not enforced by the pool and direct callers can bypass it. No AfterHours on-chain guard is compiled/deployed in this demo.

## Evidence

| Component | Status |
| --- | --- |
| SERV API access and previous explanation-only browser flow | Verified locally in baseline commit e8de26d |
| Intent-based tool/option selection | Six real API cases passed; browser wait/reduced pair observed |
| Devnet pool reserve reads | Verified in the existing foundation |
| Script-signed pool settlement | Confirmed; separate receipt below |
| Browser-wallet settlement | No submitted transaction or observed balance delta |
| Public judge access | Verified public browser wait/reduced pair on September 27, 2026 |

A separate script swap at slot 503568283 requested 10 USDC-test, received 0.043344 AAPLX-test, and required at least 0.042910 AAPLX-test output, with the pool's fixed 30 bps fee. [Inspect the devnet settlement](https://explorer.solana.com/tx/5qRPZVjqCoRGyJqAKSRL9owHSTmZavnAeHuK76vdGESafiKDPzPdd4Ktg2sMEnnHVysiKjdnqxuhbCmduXgLMWMy?cluster=devnet). This proves direct settlement, not a SERV plan, browser-wallet swap, oracle verification or risk enforcement.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

The current build passed 61 tests, typecheck and production build. [The real SERV evaluation](docs/SERV_EVALUATION.md) reports the six expected/observed choices, latency, usage, earlier failures, and limits. Missing reserves and invalid outputs are checked in mocked boundary tests; a live outage was not induced. No claim of superiority over raw inference is made.

## Foundation and attribution

AfterHours reuses the landing identity, devnet pool and wallet-swap foundation originally built for Stocklana. The new SERV workflow is the focus of this edition; repository history is preserved. Organizer permission for reuse remains unresolved, so eligibility is not asserted as confirmed.

Visual research was informed by [Heron AI](https://heronaiapp.com/). AfterHours uses original branding, copy, layouts, diagrams and licensed open fonts, without Heron logos, proprietary imagery or font files.
