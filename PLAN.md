# AfterHours: Stocklana execution plan

## Goal and current scope

AfterHours is a devnet interface for direct `USDC-test → AAPLX-test` swaps through an existing SPL Token Swap v3 pool. Its reference scenarios and trade limits are evaluated in the browser before the wallet signs. The fallback gate is taken: **there is no on-chain AfterHours risk guard or Pyth verification in the judge path.** The pool itself remains directly callable.

The user has 15–20 focused build hours. Target a demo-ready result by Friday, September 25, 2026, 6 p.m. Lagos time, preserving three hours before the 9 p.m. event deadline. Product routes are `/` (landing) and `/workspace` (trade workspace).

## Verified evidence and remaining proof

The seeded SPL Token Swap v3 pool and live reserve/fee API are verified. `public/pool-manifest.json` contains the pool, test-mint and reserve-account addresses and script receipt. The proof script completed a **direct**, script-signed 10 test-USDC swap at slot **503568283** (`meta.err = null`): AAPLX-test balance changed from 0 to 43,344 base units (**0.043344 AAPLX-test**), and the trader's USDC-test balance changed from 10,000,000 to 15 base units. The pool's fixed fee is **30 bps**; the script required 42,910 AAPLX-test base units minimum and received 43,344. [View the devnet receipt](https://explorer.solana.com/tx/5qRPZVjqCoRGyJqAKSRL9owHSTmZavnAeHuK76vdGESafiKDPzPdd4Ktg2sMEnnHVysiKjdnqxuhbCmduXgLMWMy?cluster=devnet).

This proves the pool can settle a direct devnet swap and satisfy its minimum-output instruction. It does **not** prove a browser-wallet swap, Pyth-backed pricing, or an on-chain policy guard. The browser direct-swap action is implemented with an interface-level risk check, but its own wallet signature, confirmed Explorer transaction, and observed AAPLX balance increase are still unverified. Treat those as pending until the browser action produces them.

The AAPL/AAPLX reference inputs currently come from clearly labelled simulated scenarios: the Pyth API key and catalog-confirmed feed IDs are unavailable. The UI checks policy before asking the wallet to sign, and recomputes its quote/minimum output from live on-chain pool reserves and the fixed fee. This is a **soft interface limit**; it can be bypassed by calling the pool directly. A wallet-signed policy memo, if used, only records browser-computed fields and moves no tokens.

An experimental Rust guard was not compiled or deployed: the WSL build failed, and its draft policy diverges from the UI's soft `OPEN` behavior. It is unfinished and excluded from the judge path. Do not claim an on-chain guard or Pyth signature verification.

## Trade preview policy

These are prototype limits applied by the workspace before signing; they are not enforced by the SPL Token Swap program.

| State | Interface behavior |
| --- | --- |
| `OPEN` | Up to **500 test USDC** when the selected reference is current and no UI hard-stop applies. |
| `GUARDED` | Up to **50 test USDC** for a carried-forward reference up to 24 hours old; up to **10 test USDC** from over 24 through 72 hours. |
| `PAUSED` | Block the workspace action for reference age over 72 hours, invalid data, a live message over 30 seconds old, fewer than 3 publishers, confidence over 250 bps, AAPLX/AAPL divergence over 1,500 bps, or pool/AAPLX deviation over 1,000 bps. The pool program does not know or enforce these policy inputs. |

Show the fixed **30 bps** pool fee and derive quotes from on-chain reserve accounts. Label reference scenarios as simulated. Do not use “dynamic fee,” “guaranteed protection,” or “on-chain risk enforcement” language.

## Build and proof milestones

1. **Verified pool proof — complete.** SPL Token Swap v3 is executable on devnet, the pool is seeded, and the script receipt verifies the direct swap and minimum output. Its v3 instruction uses the deployed legacy **10-account-meta** layout; the newer SDK layout failed before the script was corrected to submit the expected layout.
2. **Browser-wallet swap — pending.** Connect a devnet Wallet Standard wallet holding USDC-test and enough devnet SOL. Select a labelled scenario and an amount within its interface limit, sign the direct pool transaction, then verify confirmation, Explorer signature, and AAPLX-test balance increase. Do not substitute the script's receipt for this browser action.
3. **Judge path — current fallback.** Show the hero, simulated reference states, live reserve-backed quote and fixed fee, interface-level allow/block decision, and the verified script receipt as separate proof. If a browser-wallet receipt is captured, show it separately as a real direct swap with the client-side check.
4. **Visual/functional finish.** Review landing sections in the approved order, verify wallet-connected/disconnected and pending/failure/confirmed states, and rehearse a 90-second to 3-minute demo. Keep remaining time for README, recording, and submission.

## Demo: 90 seconds to 3 minutes

1. **0:00–0:12 — Hook:** use the hero to explain that the token market can keep moving while its equity reference gets stale.
2. **0:12–0:32 — Workspace:** state plainly that Pyth credentials/feed mapping are unavailable and choose the labelled simulated fresh and carried-forward scenarios.
3. **0:32–0:48 — Live pool:** show current on-chain reserves, the fixed 30 bps fee, the reserve-derived quote, and the UI-only size limit.
4. **0:48–1:12 — Direct swap:** if the browser-wallet action has a confirmed transaction, show its own Explorer receipt and observed AAPLX balance increase. Until then, show the existing script receipt as a separate pool proof and say that the browser path is implemented but not yet verified.
5. **1:12–1:30 — Boundary:** show a scenario the interface blocks and explain no transaction was sent for it. State that direct calls to the pool bypass the UI check and that no on-chain guard or Pyth verification is implemented.

Extend up to three minutes to show the script receipt's slot, balances, and v3 account-layout correction. Never call it a browser-wallet or guarded swap. Test assets are devnet-only and are not backed securities.

## UI and delivery

Build `/` section by section: navigation + hero, verified “Built with” strip, problem/mechanism, and proof/CTA. Then keep the action workspace focused on session/source labels, reference scenario, on-chain quote and fee, amount limit/reason, wallet state, and Explorer/balance evidence. Pause for the user's screenshot review between sections while independent data/protocol work continues.

Before claiming a browser swap, verify its own signature, confirmed Explorer receipt, and AAPLX balance delta. A UI message or the pre-existing script transaction is not that evidence. Test insufficient USDC-test/SOL, wallet rejection, missing manifest/RPC, slippage/minimum output, and each interface-policy boundary. The final README and demo must distinguish: simulated reference input; live on-chain pool reserves/fee; script-signed pool proof; optional memo record; and browser-wallet direct swap proof if captured.

Official Stocklana rules: https://hackathons.solana.com/hackathons/stocklana
