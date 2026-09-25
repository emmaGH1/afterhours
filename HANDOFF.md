# AfterHours handoff

Updated: September 25, 2026

## Current product state

- AfterHours has a finished landing page at `/` and a direct-swap workspace at `/workspace`.
- The landing page includes the approved hero and interactive route drawing, the Built With strip, the full-height reference-risk mechanism, the Explorer-backed proof section, and an architectural closing footer. It uses warm paper grain, charcoal, vermilion, technical rulers, and responsive section layouts.
- `/workspace` uses labelled simulated reference scenarios, on-chain SPL Token Swap v3 reserves, and the pool's fixed 30 bps fee. The trade limit is a soft browser-side check; the pool remains directly callable.
- One script-signed direct pool swap is verified at slot `503568283`. It proves pool settlement and minimum output only; it is distinct from the workspace wallet path.
- The browser-wallet action is implemented. Its own confirmed transaction and AAPLX-test balance delta are still pending verification. Read-only Devnet preflight confirmed the generated demo wallet is funded with 0.05 SOL and 100 USDC-test; its AAPLX-test balance is 0.
- Pyth credentials and catalog-confirmed equity feed IDs are unavailable. There is no compiled or deployed AfterHours on-chain guard or Pyth verification in the demo path. AAPLX-test and USDC-test are devnet assets, not backed shares.
- The demo wallet's secret is stored only in ignored local environment configuration. Never print, commit, or share it.

## Workspace completion — September 25, 2026

The `/workspace` rework is implemented and locally verified (typecheck, 26 relevant policy/quote/instruction tests, production build, desktop and 390 px render inspection). Facts maintained in the UI: both assets are devnet test tokens, AAPLX-test is not a backed security, there is no live Pyth integration, no deployed guard program, the pool can be called outside this interface, and the policy is a browser-side interface check only.

What changed in the workspace:

- Default state always renders an explicitly selected scenario (`aria-pressed` verified); the trade amount defaults to 10 USDC-test.
- Trade panel leads the page and the mobile order; policy decision, quote state, wallet details, and transaction progress live inside it. The price-envelope chart moved below the action.
- Quote modes are explicit: loading, verified devnet pool, preview-only (sample reserves, submission disabled), and unavailable-with-retry. In the current sandbox the devnet RPC is unreachable, so the page correctly renders the preview/unavailable states; the verified state activates when the pool API responds.
- One consolidated policy decision component (OPEN/GUARDED/PAUSED) with measured values, a "Why this limit?" disclosure, and SIMULATED REFERENCE / INTERFACE CHECK labels.
- Wallet-status panel with truncated address, copy action, expected-cluster wording (the adapter cannot report the wallet's selected network), SOL/USDC-test/AAPLX-test balances, refresh, and loading/error states.
- Transaction lifecycle: ready → awaiting signature → submitted → confirming → confirmed → verifying balance → verified / balance-pending / cancelled / failed, with blockhash-based confirmation, a 60-second bounded balance poll, separate insufficient-SOL/USDC messages, and signature preservation even if balance polling fails.
- Before/after balance evidence is recorded and human-readable amounts are shown; base units stay out of primary copy.
- Two separated proof cards: the script receipt ("produced by the setup script") and a browser-wallet card that stays "pending" until a real wallet transaction confirms. The browser receipt persists in validated localStorage with a Clear-local-receipt control.

### Browser-wallet proof — still pending (blocker: no Solflare in the controllable browser)

Funding update: the user is testing with a separate wallet they control, funded by the project mint authority on September 25, 2026 — address `VxJ3GiSSmefjfUnGnqtV2yNHSBskgpRDykzzpkzMX1F` received 100 USDC-test via [mint transaction 56ZFdwkx1HUYrPMyyPudVsp8D8bYNh4nG1UdBbniBv2esZyAwPe4spT6iZFHnyztduZUwNbC2KJL1kh1EtdrSS4T](https://explorer.solana.com/tx/56ZFdwkx1HUYrPMyyPudVsp8D8bYNh4nG1UdBbniBv2esZyAwPe4spT6iZFHnyztduZUwNbC2KJL1kh1EtdrSS4T?cluster=devnet) (public data only). Devnet RPC responded successfully from the server during this funding run, so the workspace's verified-quote state should be reachable.

No browser-wallet transaction has been submitted. The script receipt remains the only on-chain evidence. When the Brave/Solflare test is run manually, complete this evidence form (public data only — never record keys, seeds, or ignored keypair files):

| Field | Value |
| --- | --- |
| Wallet address (public) | |
| Network confirmed in Solflare | |
| SOL / USDC-test / AAPLX-test before | |
| Scenario selected | Regular / fresh |
| Amount | 10 USDC-test |
| Quote / minimum output shown | |
| Signature | |
| Explorer URL | |
| Confirmation state | |
| USDC-test after | |
| AAPLX-test after | |
| AAPLX-test increase | |
| Receipt visible after refresh | |
| Risk-limit-crossed scenario blocks signing (Solflare does not open) | |

After the form is complete, record the signature, Explorer URL, and balance delta in `PLAN.md` and `README.md`, replacing the pending wording. Do not commit addresses or receipts into source code.

## Immediate task: Solflare browser-wallet proof

The user selected the generated demo wallet in Solflare. Connect Solflare to Solana Devnet, verify the wallet identity and balances without displaying secrets, then make one `10 USDC-test → AAPLX-test` swap through `/workspace` using the fresh simulated scenario. Record the transaction's own signature, confirmation, Explorer link, minimum output, and before/after USDC-test and AAPLX-test balances. Do not reuse the script receipt as browser-wallet evidence.

The paused scenario's action is disabled before submission in the inspected code path (`assessment.allowed` is required by the button, and the handler exits before wallet work). Runtime browser verification is still pending. Describe this as a browser-side block only.

Read-only Devnet RPC succeeded after platform approval. The current browser-control connector fails during initialization, and the standard Chrome, Brave, and Edge profiles checked do not contain the Solflare extension. No browser-wallet transaction has been submitted. Resume only when Solflare is available in a controllable browser session; then verify the wallet/network, execute one 10 USDC-test swap through `/workspace`, and record its own confirmation and balance delta. Do not substitute the script-signed receipt. No additional token funding is needed based on the observed preflight balances. Never use the ignored authority material or expose any secret.

## Documentation and delivery

Update `PLAN.md`, `README.md`, `AGENTS.md`, `MODEL_ROUTING.md`, and the relevant `.hackathon/` briefs only from observed results. Keep script and browser-wallet receipts separate. The pending receipt and current access blocker are recorded; replace them only after the browser swap succeeds with its own confirmation and measured balance delta. The paused action's static gate is inspected, but the browser interaction itself is not yet verified.

Remaining delivery work after the swap proof: rehearse and record the 90-second to 3-minute demo, choose and configure a public host, set `NEXT_PUBLIC_SITE_URL`, create or select a public repository, verify the public deployment, and submit the app, source, and video before the Stocklana deadline. No repository remote or public deployment has been confirmed. Do not push or publish without the user's authorization.

## Model routing and scope

- GPT-6 Luna xhigh: bounded implementation and documentation.
- GPT-5.6 Terra high: difficult Solana integration or transaction-path debugging.
- GPT-6 Sol high: UI design, debugging, and review.
- Do not use GPT-6 Astra.

Do not add Pyth, an on-chain guard, a custom AMM, PreStocks, dynamic fees, or extra markets without a new scope decision. The approved fallback is the existing direct devnet pool with honest interface-level risk disclosure.
