# AfterHours: Stocklana execution plan

## Product and scope

AfterHours is a Solana devnet interface for direct `USDC-test → AAPLX-test` swaps through an existing SPL Token Swap v3 constant-product pool. The workspace quotes from on-chain reserves, displays the pool's fixed fee, and evaluates labelled simulated reference scenarios in a soft browser-side policy check before wallet signing. Direct pool callers can bypass that interface.

There is no active Pyth feed or Pyth verification and no compiled or deployed AfterHours on-chain guard in the judge path. The test tokens are not backed shares. Do not claim pool-wide protection, dynamic fees, or production liquidity. No custom AMM, PreStocks, or extra markets are in scope.

## Verified pool evidence

The seeded pool and reserve/fee API are verified. The script-signed direct swap at slot `503568283` requested 10 USDC-test, received 43,344 AAPLX-test base units (`0.043344`), and required 42,910 base units minimum. Its USDC-test balance changed from 10,000,000 to 15 base units. The pool fee is 30 bps. [View the script-signed devnet receipt](https://explorer.solana.com/tx/5qRPZVjqCoRGyJqAKSRL9owHSTmZavnAeHuK76vdGESafiKDPzPdd4Ktg2sMEnnHVysiKjdnqxuhbCmduXgLMWMy?cluster=devnet).

This transaction proves direct pool settlement and minimum-output behavior only. It does not prove the browser-wallet path or risk enforcement. The SPL Token Swap v3 instruction must use the deployed legacy 10-account-meta layout.

## Current delivery status — September 25, 2026

- **Landing page — complete.** `/` contains the approved hero and interactive route drawing, Built With rail, full-height mechanism section with discrete cap steps, full-height proof scene, and full-height system-record footer. The visual system uses warm paper grain, charcoal, vermilion, technical rules, and responsive layouts.
- **Workspace — implemented.** `/workspace` supports a Wallet Standard direct swap, reserve-derived quote, fixed pool fee, minimum output, confirmation state, Explorer receipt, and observed output-balance check.
- **Workspace — demo-ready rework implemented.** The trade panel leads the workspace with the consolidated OPEN/GUARDED/PAUSED decision attached to it; quote states (loading / verified pool / preview-only / unavailable) are explicit; the wallet panel shows balances with expected-cluster wording; the transaction lifecycle preserves the signature through confirmation and a bounded balance poll; and the script and browser-wallet proof paths are separate cards with a validated local receipt. Simulated-reference, interface-only-policy, no-Pyth, and no-guard disclosures are maintained throughout.
- **Browser-wallet proof — blocked pending access.** Read-only Devnet preflight confirmed the generated demo wallet has 0.05 SOL, 100 USDC-test, and 0 AAPLX-test. No Solflare extension was found in the checked Chrome, Brave, or Edge profiles, and the browser-control connector fails during initialization. No browser transaction was submitted. Make Solflare available in a controllable browser, then verify one 10 USDC-test swap and record its own signature, confirmation, Explorer URL, minimum output, and pre/post balances. Keep it separate from the script proof above.
- **Demo — prepare.** Show the product, simulated scenarios, live reserve quote and fee, a confirmed wallet transaction if available, and an interface-blocked scenario. Explain the policy can be bypassed and that no Pyth verification or on-chain guard is active.
- **Public delivery — not done.** No public URL, configured Git remote, recording, or Stocklana submission confirmation is present. Finish these after proof and rehearsal; do not push or publish without authorization.

## Prototype policy

These limits are applied in the browser before signing and are not enforced by the SPL Token Swap program.

| State | Interface behavior |
| --- | --- |
| `OPEN` | Up to 500 test USDC for a current selected scenario when no soft-check stop applies. |
| `GUARDED` | Up to 50 test USDC for a carried-forward reference up to 24 hours old; 10 test USDC from over 24 through 72 hours. |
| `PAUSED` | Block the workspace action for age over 72 hours or any configured hard-stop condition. The pool itself does not know these policy inputs. |

## Immediate verification sequence

1. Use Solflare with the generated demo wallet; confirm the wallet identity, Solana Devnet network, and SOL/USDC-test/AAPLX-test balances without exposing secret material.
2. Select the fresh simulated scenario and enter 10 USDC-test. Check the reserve-derived quote, displayed minimum output, and that the amount is within the interface cap.
3. Submit once through `/workspace`. Confirm the wallet signature, Devnet transaction status, Explorer record, and corresponding USDC-test debit and AAPLX-test credit.
4. Select a paused scenario. Confirm the interface blocks the action without a wallet prompt or transaction. Describe it as an interface block, never an on-chain rejection.
5. Update the README, handoff, agent instructions, model-routing baseline, and hackathon briefs from observed evidence. If confirmation or the balance delta is missing, keep browser proof marked pending and write down the blocker.

Read-only Devnet RPC succeeded after platform approval. Wallet funding is sufficient, so no faucet or mint-authority action is needed. Browser verification is blocked only by missing Solflare/browser control. The paused action is disabled by the inspected UI gate before wallet submission, but this has not been runtime-verified in the browser. Never use ignored authority material or expose secrets.

## Demo and closeout

Target a 90-second to 3-minute demo:

1. Explain the stale-reference problem from the hero.
2. Show simulated reference states and how the proposed interface cap changes.
3. Show live pool reserves, fixed 30 bps fee, and the reserve-derived quote.
4. Show the browser-wallet receipt only if that transaction confirms and its AAPLX-test balance increase is observed; otherwise show the separate script receipt and state that browser proof is pending.
5. Show a paused interface scenario and state the trust boundary: no Pyth verification, no on-chain guard, and direct pool calls can bypass the UI.

Then verify the public deployment, prepare the repository and video, and submit before the event deadline. Set `NEXT_PUBLIC_SITE_URL` for a public host that does not provide `VERCEL_URL`.

## UI and model routing

The approved visual reference is Heron AI's architectural/editorial language, recreated with original AfterHours branding, copy, and diagrams. Keep the hero, mechanism, proof, and footer as distinct scenes; respect reduced motion and maintain factual clarity.

- GPT-6 Luna xhigh: bounded implementation and documentation.
- GPT-5.6 Terra high: difficult Solana integration and transaction-path debugging.
- GPT-6 Sol high: UI design, debugging, and review.
- GPT-6 Astra is excluded.
