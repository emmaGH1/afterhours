# Stocklana build plan: AfterHours

**Product thesis:** AfterHours aims to be a risk-aware AMM for tokenized public equities when the underlying market is closed or its reference price is carried forward. Pyth is the best-fit data layer because it supplies the inputs the mechanism needs and supports signed Solana-verifiable updates. **Current sprint deliverable:** a risk-policy prototype; no AMM or program-level enforcement is implemented yet.

At 10:26 a.m. Lagos time on Thursday, September 24, the user revised the remaining personal build time to **about seven focused hours**. Target a demo-complete build within those seven hours and preserve Friday afternoon for submission recovery if available.

## Build status and revised target (1:23 p.m. Lagos time)

**Built:** responsive one-screen interface in the supplied Heron-inspired direction, three labelled policy scenarios, deterministic `open`/`guarded`/`paused` decisions, server-side Pyth Pro adapter/parser, Wallet Standard devnet connection, and nine risk/parser tests.

**New fallback proof path:** the interface can submit a policy snapshot as a Solana Memo from a connected devnet wallet. It is a public testnet transaction carrying browser-computed fields. It moves no tokens, verifies no Pyth signature, and enforces no risk decision. The swap button remains disabled because no AMM program is deployed.

**Still unverified:** a real Pyth Pro response (requires a local trial key), a successful wallet-signed devnet memo receipt on a public RPC, and an onchain AMM. Present the current build as an oracle-aware risk-policy prototype with an optional audit memo, not as a working AMM. The original seven-hour work window began around 10:00 a.m.; budget roughly **3.5 hours** for the remaining judge path from this checkpoint.

## Remaining ~3.5-hour execution roadmap

1. **First 45 minutes: dependency gate.** If available, add the Pyth Pro key locally and confirm both feeds and timestamp fields. Connect a devnet wallet and submit a memo; inspect confirmation in Explorer. Timebox missing access to 20 minutes, then keep the labelled fallback. Do not install a Rust/Anchor stack.
2. **Next 45 minutes: risk audit.** Exercise freshness, confidence width, publisher count, divergence, hard pause, amount limit, and missing pool quote. Fix only defects that change the judge path; keep demonstration thresholds labelled as prototypes.
3. **Next 45 minutes: final interface QA.** Check Pyth unavailable/live, wallet disconnected, memo pending/failure/signature, and paused risk. Review 1366x768, 1440x900, 390px mobile, keyboard focus, wrapping, and reduced motion. Refresh the screenshot if the local app is reachable.
4. **Final 75 minutes: demo and submission.** Rehearse the 90-second cut; run typecheck, tests, production build; finalize the judge README and submission fields. Deploy only if an existing account makes it quick. Keep this block for the demo/upload; do not start PreStocks or an AMM program.

The actual acceptance target is **live Pyth data if the key works, a confirmed devnet policy memo if public RPC access works, and an accurate risk-policy demo in either case**. A real AMM and onchain risk enforcement remain out of the verified sprint scope. Parallel work is bounded to independent files: risk review/tests, responsive QA, and submission/demo copy; the key and wallet gates are sequential. Model selection remains manual per task.

## Integration decision

| Option | Product fit | Data integrity | Build cost | Prize value | Decision |
| --- | --- | --- | --- | --- | --- |
| Pyth Pro | Exact fit: underlying equity versus 24/7 tokenized representation, market session, freshness, and confidence | Signed payloads can be verified by a Solana program | Medium/high | Non-cash | **Core integration** |
| PreStocks | Useful for a private-market version based on token price versus issuer mark | Ordinary unsigned API; no provider timestamp | Low/medium | $10k | **Conditional extension only** |
| Meteora DBC | A token-launch primitive, not the after-hours risk mechanism | Onchain | Medium/high | $5k | Do not target |
| Tessera / Clawpump | Requires a different asset or product model | Varies | High distraction | Cash | Do not target |

This choice is based on product quality rather than sponsor payout. Pyth makes the original thesis technically credible. PreStocks changes the thesis and weakens the trust model, so we add it only if the Pyth path is stable and the private-market mode can be completed without compromising the core.

## The 60-second idea

> Tokenized stocks trade around the clock, but their underlying exchanges do not. When the equity reference is carried forward, a normal AMM may keep quoting as if nothing changed. AfterHours compares the Pyth equity reference with the token market and shows how uncertainty can change fees, lower trade limits, or pause a proposed trade. This prototype does not enforce those choices onchain.

Judges should understand the product from one comparison: **the same trade under a fresh regular-market reference and a carried-forward closed-market reference**.

## Product boundary

Use one pair: a clearly labeled test representation of AAPLX against test USDC. Pyth lists both the underlying Apple equity feed and tokenized-stock feeds in the Stocklana brief, making this the cleanest event-specific example.

The MVP has five parts:

1. **Pyth adapter:** receives the underlying equity and tokenized-stock price, `marketSession`, confidence, publisher count, `feedUpdateTimestamp`, and update timestamp.
2. **Risk engine:** combines market session, reference age, confidence width, tokenized/underlying divergence, pool deviation, and trade size into `open`, `guarded`, or `paused`.
3. **Onchain pool:** constant-product AAPLX-test/USDC-test pool on localnet or devnet. The swap instruction verifies or consumes the approved Pyth update and enforces fee, cap, expiry, and pause state.
4. **Single-screen app:** market state, feed freshness, reserves, quote, rule explanation, wallet transaction, and receipt.
5. **Evidence layer:** calculation tests, successful and rejected transactions, deployment links, judge README, and a 90-second to 3-minute demo.

Omit social sentiment, prediction models, multiple stocks, production liquidity claims, and decorative analytics.

## Why Pyth is central

Pyth Pro exposes the fields AfterHours needs directly:

- `marketSession` distinguishes regular, pre-market, post-market, overnight, and closed conditions.
- `feedUpdateTimestamp` reveals when a displayed equity price was actually generated.
- `timestampUs` reveals when the signed update was delivered. If it is newer than `feedUpdateTimestamp`, the price was carried forward.
- confidence and publisher count provide additional quality signals.
- the `solana` binary format is signed and can be verified inside an SVM transaction.

Official Pyth Terminal metadata identifies `Equity.US.AAPL/USD` as Pro feed **922** and `Crypto.AAPLX/USD` as feed **1792**. AAPL has broader 24/5 coverage, including overnight sessions, so the product must react to the signed session and measured feed age rather than claiming that the reference always freezes at the regular-market close.

The API key remains server-side. A free trial key can be generated from Pyth Terminal, but access and the selected feed IDs must be proven during the first build gate.

## Shared contracts

- `MarketSnapshot`: underlying symbol/price, token symbol/price, session, confidence, publisher count, feed update time, message time, signature payload.
- `PoolSnapshot`: token mints, reserves, spot price, network, pool address.
- `RiskDecision`: state (`open`, `guarded`, `paused`), effective fee bps, maximum input, reasons, verified snapshot identity.
- `SwapQuote`: input/output, minimum output, price impact, risk decision, oracle age, expiry.
- `SwapReceipt`: signature, actual input/output, new reserves, explorer URL.

Use explicit prototype parameters:

| Condition | State | Behavior |
| --- | --- | --- |
| Regular session, fresh feed, low deviation | Open | Base fee and normal cap |
| Closed/non-regular session or aging reference | Guarded | Fee rises and cap falls with reference age |
| Pyth confidence width above 25 bps or fewer than five publishers | Guarded | Fee rises and trade cap falls with weaker oracle quality |
| Excessive age, confidence, divergence, or pool deviation | Paused | Reject swap |

Additional prototype hard stops: confidence width above 250 bps, fewer than three publishers, invalid/nonpositive prices, reference age above 24 hours, token/reference divergence above 1,500 bps, or pool/token deviation above 1,000 bps. These are hackathon demonstration parameters, not calibrated market rules or onchain enforcement.

The pool does not claim to know fair value or predict the next market open. It exposes and limits uncertainty.

## Seven-hour kickoff roadmap (historical; replaced by the current execution plan above)

### 0:00–0:30 — Freeze contracts and scaffold

- Lock AAPL/AAPLX, interfaces, risk parameters, visual contract, and live/recorded/simulated labels.
- Scaffold the single-page application and create fresh, carried-forward, high-deviation, and paused fixtures.
- **Exit evidence:** the app runs and every lane uses the same typed objects.

### 0:30–1:30 — Pyth and transaction feasibility gate

- Obtain/test a Pyth Pro trial key and verify the exact equity and tokenized-stock feed IDs and fields.
- Capture one signed `solana` payload containing `feedUpdateTimestamp`.
- Test the fastest credible settlement path. Rust, Solana CLI, Anchor, and usable WSL are not currently available, so do not spend this hour installing a full custom-program toolchain.
- Prefer an existing devnet token-swap program driven from TypeScript. If it is unavailable, lock the fallback: verified Pyth data and deterministic risk enforcement in the app, plus a real Solana transaction/receipt that records the approved policy snapshot. Disclose that this fallback is an execution guard rather than an onchain-enforced AMM.
- **Exit evidence:** real Pyth response and a written settlement choice backed by a successful minimal transaction or a confirmed blocker.

### 1:30–3:00 — Core risk engine and visual shell

- Implement deterministic freshness, divergence, confidence, fee, size-cap, and pause calculations.
- Build the Heron-derived framed shell, status band, reference panel, trade panel, policy comparison, and receipt panel.
- Connect the decision to quote construction; add checked arithmetic, slippage protection, and quote expiry.
- **Exit evidence:** one screen shows the same amount under fresh, guarded, and rejected states with truthful source labels.

### 3:00–4:30 — Settlement proof and integration

- Wire the selected Solana transaction path, wallet state, confirmation, signature, explorer link, and reserve/policy evidence.
- Wire the Pyth backend adapter without exposing its API key.
- If an external pool is used, state exactly where the guard is enforced and how it can be bypassed.
- **Exit evidence:** one permitted action returns a real receipt and one unsafe action is blocked with an explicit reason.

### 4:30–5:30 — Complete judge path

- Remove fixture-only shortcuts from the primary path while retaining labelled demo scenarios for a closed-market comparison.
- Check wallet disconnected, loading, unavailable feed, expired quote, rejected, submitted, and confirmed states.
- Apply the final typography, structural grid, responsive order, focus states, and reduced-motion behavior.
- **Exit evidence:** a fresh user understands and completes the path from one screen.

### 5:30–6:15 — Verify and deploy

- Test risk boundaries, stale data, oversized trades, slippage, and receipt formatting.
- Run typecheck/build and deploy the app.
- Check 1366×768, 1440×900, 390px mobile, keyboard focus, overflow, and truthful labels.
- **Exit evidence:** public URL, reproducible judge path, and passing core checks.

### 6:15–7:00 — Demo and submission package

- Record a 90-second primary demo; extend toward three minutes only for signed-data and transaction proof.
- Finish README, architecture diagram, submission copy, screenshot, attribution, and limitation notes.
- Rehearse once from a clean session and prepare the main-track and Pyth-track links.
- **Exit evidence:** demo-ready build and complete submission package. Do not start PreStocks or another sponsor integration inside these seven hours.

## Parallel build lanes

| Lane | Owns | Handoff proof |
| --- | --- | --- |
| Protocol | Pool, test mints, update verification, swap enforcement, deployment | Swap signature, rejection, and changed reserves |
| Market and risk | Pyth adapter, freshness/session mapping, policy, tests | Real signed response plus open/guarded/paused results |
| App | Wallet, state card, quote/swap flow, receipts | Complete fixture flow, then live endpoints |
| Evidence | README, architecture, demo script, limitation log | Rehearsed 90-second and extended cuts |

Join points: shared fixtures and UI are already in place; the next join point is a Pyth response plus memo receipt, followed by responsive review and demo rehearsal. A swap receipt is outside the currently verified scope. UI styling does not block the market adapter.

## Demo: 90 seconds to 3 minutes

**0:00–0:15 — Hook.** “Tokenized stocks trade around the clock. Their underlying exchanges do not.”

**0:15–0:35 — Inspect the reference.** Show the Pyth equity and tokenized-stock prices, session, `feedUpdateTimestamp`, and whether the equity price is fresh or carried forward.

**0:35–0:55 — Compare the same trade.** A fresh regular-market snapshot receives the base fee and normal limit. A clearly labeled recorded or simulated closed-market state receives a wider fee and smaller limit.

**0:55–1:15 — Record an audit note.** Connect a devnet wallet, record the selected policy snapshot, and open its Explorer transaction. Say plainly that this memo records the app's decision; it does not perform or enforce a swap.

**1:15–1:30 — Show the boundary.** Select the hard-limit scenario, show the quote blocked in the interface, and point to the disabled swap action because no AMM program is deployed.

For a 2–3 minute version, add the live Pyth response and signed-payload fields if the key works. Do not claim signature verification or program enforcement unless actually implemented and verified. Omit PreStocks.

## Main bottlenecks

| Risk | Response |
| --- | --- |
| Missing Solana/Rust/Anchor tooling | Run the transaction gate first; switch architecture at 2.5 hours rather than losing the sprint |
| Pyth key or feed mismatch | Generate the free trial key and verify both feed IDs before building UI |
| Onchain signature verification complexity | Implement it immediately after the minimal pool; fall back to server verification with the trust boundary disclosed |
| No production stock-token liquidity | Use clearly labeled devnet test assets and never claim mainnet readiness |
| Closed-market state unavailable while filming | Use a signed historical/recorded payload or explicit fixture and label it; keep the live feed visible separately |
| Feature creep from cash bounties | Let product fit determine integrations; apply the one-hour PreStocks gate only after the core works |

## Sources

- Stocklana rules and sponsor requirements: https://hackathons.solana.com/hackathons/stocklana
- Pyth market hours: https://docs.pyth.network/price-feeds/pro/market-hours
- Pyth payload and freshness semantics: https://docs.pyth.network/price-feeds/pro/payload-reference
- Pyth Solana verification: https://docs.pyth.network/price-feeds/pro/integrate-as-consumer/svm
- Pyth trial/API access: https://docs.pyth.network/price-feeds/pro/pyth-terminal
- Official PreStocks API: https://prestocks.com/api/prestocks
