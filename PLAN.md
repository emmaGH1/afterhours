# AfterHours — SERV decision desk execution plan

Current event: SERV Hackathon Open Track. Deadline September 28, 2026, 00:00 UTC / 01:00 Lagos. Original Stocklana plan preserved privately in `.hackathon/STOCKLANA_PLAN_ARCHIVE.md`.

## Product

AfterHours helps a user choose what to do with a proposed devnet test-token trade when simulated reference conditions and intent conflict. SERV interprets intent and compares the requested trade, a permitted smaller trade, and waiting. Deterministic tools gather/calculate evidence; code validates selected candidate and evidence IDs. The new desk has optional read-only wallet quote/balance inspection; signing is disabled in this flow.

Routes: `/` landing; `/workspace` named Review Desk. One pair USDC-test -> AAPLX-test, real devnet SPL test tokens, not backed securities. References simulated, not Pyth. Interface policy bypassable through direct pool calls. No deployed AfterHours guard, dynamic fees, extra markets or custom AMM.

## Current checkpoint

First integration at local commit e8de26d produced real structured browser reviews and passed 49 tests/typecheck/build. Strict review found shallow model contribution, semantic validation gaps, independent reserve reads, process-local allowance limitations, cancellation gaps, incomplete delivery, and no validated commercial case. This is a baseline, not the final entry.

The revamp now passes 61 tests, typecheck, production build and a six-case real SERV evaluation. Browser carried-100 intent changes produced wait versus reduced 50 using identical verified reserve values. Expiry removes amount application and closes optional quote details. Independent Sol-high review found reserve coherence, transaction lifecycle, precision and evaluator issues; all were fixed. Timeout and cancellation boundary tests pass. Public deployment, fresh-session proof and recording are still pending.

Existing Vercel target: afterhours-one-rho.vercel.app, connected to emmaGH1/afterhours main. User is signed in. Production currently serves the original e449905 build. OPENSERV_API_KEY is not yet present in the project's listed environment variables. Never publish .env.local or wallet secrets; push requires user authorization.

## Approved lanes

- Integration: GPT-6 Luna max — real read-only option tool, dated observations, deterministic quotes/minimum output, SERV selection and validation, bounded requests/cancellation, meaningful tests/evaluation.
- UI: GPT-6 Sol medium — full landing and Review Desk revamp; intent/evidence/options/plan/validation/provenance/expiry/error states; optional wallet action.
- Root — frozen contract, docs, coordination, final assembly and verification.
- Independent review: GPT-6 Sol high — completed implementation and judge path, findings resolved or disclosed.

Frozen types: `lib/review-contract.ts`. Design: top of `DESIGN.md`. Ownership/acceptance: `.hackathon/SERV_BUILD_BRIEF.md`.

## Exit gates

1. Carried 100 USDC-test: preserve full amount -> wait; smaller amount acceptable -> reduced if reserves verified. Intent changes selection beyond threshold prose.
2. Paused/missing reserves cannot select trade. Unknown or infeasible options and mismatched evidence IDs rejected. Free-text remains advisory; feasibility validation does not prove every sentence true.
3. Each comparison uses one dated observation. Expiry visible; no polling claim unless implemented. Optional wallet quote may be independently refreshed, clearly labelled; it does not expose signing.
4. Evaluation records expected/observed choices, failures, latency/usage against a deterministic baseline. No unmeasured claim SERV beats raw inference.
5. Typecheck, tests, build, desktop/mobile inspection of request/result/error/expiry flows.
6. Public judge access, server-only key, deliberate budget controls. Initial credit $1; no paid top-up authorized. Process-local limits are not a hard spending guarantee.
7. Actual short recording leads SERV judgment/evidence. Label simulated references and edited waits. Script receipt is settlement proof only; browser-wallet proof remains unverified.
8. Required public X post and official form within user authorization. Reuse approval unresolved; history and foundation attribution preserved.

## Time

Kickoff September 27 around 20:00 UTC: ~4 hours remain. 15min contracts/brief; 75–90min parallel implementation; 30–40min independent review/fixes; protect public delivery/recording/submission buffer. Check time at gates, cut optional wallet work first.

## Customer hypothesis

Trading-interface operators could use a readable evidence-backed review component. Unvalidated, no demand/pricing/traction claim. Prototype is decision support, not production securities trading. Current baseline is deterministic policy explanation.
