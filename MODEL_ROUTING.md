# Model routing for the Stocklana sprint

**Purpose:** reserve the strongest reasoning for decisions that can invalidate the product or misstate its trust model. Use the faster workhorse for implementation, and the lighter model only for tightly bounded mechanical work.

## Recommended assignment

| Work | Model | Effort | Review gate |
| --- | --- | --- | --- |
| Product architecture, Pyth/Solana integration design, risk rules, security, final claims review | `gpt-6-astra` | High or xhigh | Required before changing oracle verification, wallet signing, numerical risk thresholds, or public claims |
| Visual-system translation, information hierarchy, accessibility, final visual QA | `gpt-6-astra` | High | Check against the user-provided `DESIGN.md`; do not alter shared data contracts |
| Main TypeScript/React implementation, integration, debugging, meaningful tests | `gpt-6-sol` | High | Root integrator reviews shared interfaces and runs checks |
| Bounded components, fixed-fixture variations, copy cleanup, README formatting | `gpt-6-luna` | Medium | Provide exact files and acceptance criteria; review before merging |

## Task lanes and handoffs

| Lane | Owns | Must hand over |
| --- | --- | --- |
| Market and risk | Pyth field mapping, freshness/session rules, fixtures, policy tests | Changed files, source/fixture status, test output, threshold assumptions |
| Protocol and transactions | Wallet, account/program instructions, transaction construction, receipts | Network, signer, transaction signature, explorer proof, enforcement boundary |
| Interface | Heron-derived shell, responsive layout, accessible states, frozen-contract wiring | Screenshot, viewport, keyboard/reduced-motion checks, data state shown |
| Evidence | README, architecture, judge steps, demo narration, limitation log | Reproducible judge path, verified claims, final recording/capture |

One root integrator owns the shared contracts, scope, final merges, and judge flow. Every handoff names changed files, commands run, proof produced, known limitation, and next integration action. Do not overlap edits to shared files; split work by files or wait for a handoff.

## Dispatch rule and limits

This file describes recommended assignments; local `AGENTS.md` instructions may repeat them, but neither file automatically selects a model or spawns a subtask. Choose the model and reasoning effort explicitly when creating each agent task. Keep the root integrator on the current host's strongest suitable model for architecture and reviews. If that model is unavailable, keep security-sensitive work with the strongest available model and reduce the scope rather than sending it to an unreviewed low-cost lane.

Low-cost tasks must not independently change oracle verification, transaction construction, wallet signing, numeric risk rules, secrets, deployment settings, or final claims. The workhorse reviews their implementation; the strongest reviewer also checks oracle, transaction, and security-sensitive changes. Model availability and names can change, so verify the host's current choices at dispatch time.

## Current project state

- Core UI, deterministic policy scenarios, server-side Pyth adapter, and devnet wallet connection exist.
- The wallet can record a **policy memo only**. There is no AMM program, token swap, onchain risk enforcement, or onchain Pyth verification yet.
- A live Pyth Pro key and a successful devnet wallet receipt are unverified prerequisites. Do not claim either until the app proves it.
- Do not start the PreStocks extension until the end-to-end core path and submission package are complete.
