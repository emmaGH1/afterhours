# Model routing for the Stocklana build

Use each model for the work the user selected. Keep the root integrator responsible for scope, shared contracts, merges, and the judge path.

| Work | Model | Effort | Review boundary |
| --- | --- | --- | --- |
| Bounded components/features, fixtures, copy cleanup, documentation | `gpt-6-luna` | xhigh | Work from a frozen interface and explicit acceptance criteria; integrator reviews before merge. |
| Difficult Pyth/Solana integration, transaction construction, and protocol decisions | `gpt-5.6-terra` | high | Prove the end-to-end dependency early; document actual evidence and trust boundaries. |
| UI design and implementation, debugging, and review | `gpt-6-sol` | high | Follow the approved Heron-inspired design source; review rendered states rather than code alone. |

These are task assignments, not automatic model selection or agent spawning. The user has explicitly excluded other models from the routing plan. If an assigned model is unavailable, tell the root integrator and use the closest available model only after the integrator resolves the task routing; never silently move sensitive integration work to a bounded code lane.

## Work lanes and handoffs

| Lane | Owns | Handoff evidence |
| --- | --- | --- |
| Reference and risk preview | Labelled simulated scenarios, browser policy limits, optional Pyth access investigation | Scenario inputs, UI-only decision examples, Pyth access/feed-ID status |
| Solana route | Devnet SPL Token Swap v3 pool, manifest-bound reserves/fee, direct wallet transaction, receipts | Separate script and browser-wallet signatures, balance deltas, minimum-output result, enforcement boundary |
| Interface | `/` landing, `/workspace`, responsive/accessibility states, wiring to reviewed contracts | Screenshot per reviewed section, viewport and state, keyboard and reduced-motion results |
| Demo and evidence | Judge path, demo script, README updates when separately assigned, disclosure | Rehearsed flow, verified links, claims matched to artifacts |

The root integrator owns shared types and integrates each lane. Do not overlap edits to shared files; name changed files, commands run, proof, known limitations, and next action at handoff.

## Current baseline and target

The active implementation is the fallback: `/workspace` previews clearly labelled simulated reference scenarios, reads reserves and the fixed fee from the devnet pool, and applies a soft browser-side risk check before a direct SPL Token Swap v3 transaction. The underlying pool can be called directly, so the UI policy is bypassable and is not on-chain protection.

The script-generated pool swap is verified at slot 503568283 and proves direct pool settlement/minimum output only. The browser-wallet swap action is implemented but no transaction has been submitted: Devnet preflight found 0.05 SOL and 100 USDC-test, while Solflare/browser control is unavailable in the current session. Keep the browser path unverified until its own signature confirms and its AAPLX-test balance delta is observed. Pyth credentials and catalog-confirmed feed IDs are unavailable; do not claim live/signed Pyth data or Pyth verification. The optional memo only records browser-computed fields.

An experimental Rust guard was not compiled or deployed: the WSL build failed and its draft diverges from the UI's soft `OPEN` policy. It is unfinished and excluded from the judge path. Keep tasks focused on the interface-level swap flow, truthful receipts, and demo verification. Do not resume guard or Pyth-on-chain work without a new scope decision. Do not add a custom AMM, PreStocks, dynamic-fee collection, or extra markets.
