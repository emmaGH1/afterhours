# AfterHours

AfterHours reviews a proposed `USDC-test → AAPLX-test` swap before signing. It combines a Solana devnet pool quote, visibly simulated market-reference scenarios, and an interface trade limit. The SERV edition adds a pre-trade review that explains the evidence and next action.

**The SERV workspace review is verified locally.** Fresh, carried, and paused scenarios produced real `gpt-6-luna` responses that passed application validation in the browser. Public deployment and browser-wallet settlement remain pending.

## Run locally

Requirements: Node.js and npm.

```bash
npm install
```

Copy `.env.example` to `.env.local` and add your server-only OpenServ key:

```env
OPENSERV_API_KEY=your-key
```

Never prefix the key with `NEXT_PUBLIC_` or commit `.env.local`. SERV requests use account credit. `NEXT_PUBLIC_SOLANA_RPC_URL` optionally overrides the default devnet RPC. Leave Pyth entries empty for the labelled simulated scenarios; no active Pyth reference is connected.

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000) and select **Review a request**. `/` is the landing page; `/workspace` is the review and devnet swap interface.

## Try the review

1. Choose the fresh simulated reference scenario and enter **100 USDC-test**. No wallet is needed to review a request.
2. Read the pool quote and fixed 30 bps fee. Live reserves come from manifest-bound devnet accounts when RPC is available; preview data must remain labelled.
3. Select **Review with SERV**. Read the returned explanation and evidence. The fresh scenario is `OPEN`, with a 500 USDC-test interface cap.
4. Change to the carried scenario and review the same amount: `GUARDED`, cap 50, request blocked. Then review the paused scenario: `PAUSED`, cap 0, hold. Changing scenarios clears the previous review. Application code checks amounts and policy; model prose cannot override those checks.
5. Wallet signing is a separate optional step. It requires a verified pool payload, an allowed interface decision, devnet test tokens, and devnet SOL.

The server sends quote and scenario evidence to `gpt-6-luna` through the [OpenServ inference API](https://docs.openserv.ai/serv-reasoning/api/chat-completions), requests structured JSON, and validates the response before displaying it. The [official integration guide](https://docs.openserv.ai/serv-reasoning/sdk-integration) documents the endpoint and system-message requirement.

The demo limits review requests to 60 per server process, with a five-second cooldown and one concurrent request. These are local safeguards, not distributed spending enforcement; restarts or additional instances can reset or multiply the allowance.

## Current evidence

| Component | Status |
| --- | --- |
| Devnet SPL Token Swap v3 pool and reserve/fee API | Verified in the existing foundation |
| Script-signed direct pool swap | Confirmed; receipt below |
| SERV workspace review | Real browser responses verified for fresh, carried, and paused scenarios; structured output passed application validation |
| Browser-wallet swap | Implemented in the foundation; no submitted transaction or observed balance delta |
| Reference prices | Simulated; no live or signed Pyth reference |
| AfterHours on-chain risk guard | Unfinished, not compiled or deployed, outside the demo path |
| Public judge access | Pending deployment and fresh-session check |

USDC-test and AAPLX-test are unbacked devnet test tokens, not securities or production liquidity. The soft browser policy is not enforced by the pool and direct callers can bypass it. SERV reviews explain evidence; they do not authorize transactions.

## Confirmed script settlement

A separate script submitted a direct SPL Token Swap v3 call at slot `503568283`: 10 USDC-test requested, 0.043344 AAPLX-test received, and 0.042910 AAPLX-test required as minimum output. The fixed pool fee was 30 bps.

[Inspect the confirmed devnet transaction](https://explorer.solana.com/tx/5qRPZVjqCoRGyJqAKSRL9owHSTmZavnAeHuK76vdGESafiKDPzPdd4Ktg2sMEnnHVysiKjdnqxuhbCmduXgLMWMy?cluster=devnet).

This receipt proves direct pool settlement and minimum-output behavior. It is not proof of a browser-wallet swap, SERV review, oracle verification, or policy enforcement.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

The final integration passed type checking, 49 tests, and the production build. Browser review checks passed for all three scenarios and for clearing a prior review when the scenario changes. Invalid scenarios returned HTTP 400 and cross-origin requests returned HTTP 403. The mobile stack was inspected without horizontal overflow.

In the observed fresh 100 USDC-test request, the live devnet reserve quote was 0.432802 AAPLX-test. This is a recorded observation, not a fixed expected quote: pool reserves can change.

## Foundation and attribution

AfterHours reuses the landing design, devnet pool, and wallet-swap foundation originally built for Stocklana. The new SERV review workflow is the focus of this edition; repository history is preserved. Reuse eligibility for the OpenServ event remains subject to organizer clarification.

Visual direction was informed by [Heron AI](https://heronaiapp.com/). AfterHours uses original branding, copy, layouts, diagrams, and licensed open fonts; it does not include Heron logos, proprietary imagery, or font files.
