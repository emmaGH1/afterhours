# AfterHours

AfterHours is a devnet swap interface for tokenized-equity test assets. It previews how reference conditions affect a trade limit, quotes from the live SPL Token Swap pool reserves, and can submit a direct swap from the workspace. Reference scenarios are simulated today, and the risk check runs in the browser before wallet signing. The pool program does not enforce that policy.

## Current status

- `/` contains the hero, Built With rail, full-height mechanism and proof sections, and the system-record footer. `/workspace` shows simulated reference states, the live devnet pool reserve/fee quote, and a direct Wallet Standard swap action.
- Pyth Pro credentials and catalog-confirmed AAPL/AAPLX feed IDs are unavailable. Do not treat scenario prices as live or signed Pyth data.
- The test pool's fixed fee is **30 bps**. Devnet reserves are read from the manifest's on-chain reserve accounts.
- A script-submitted pool swap is confirmed. Devnet preflight found 0.05 SOL and 100 USDC-test in the generated demo wallet, with 0 AAPLX-test. A separate browser-wallet swap has **not yet been submitted or verified**: Solflare was unavailable in the controllable browser session, so there is no wallet signature or measured balance delta.
- No on-chain AfterHours guard or Pyth signature verification is compiled, deployed, or part of the judge path. The interface limit can be bypassed by calling the pool directly.

The AAPLX-test and USDC-test tokens are devnet test assets, not backed securities or production liquidity.

## Run locally

Requirements: Node.js and npm.

```bash
npm install
```

Copy `.env.example` to `.env.local`. For live reference mode, configure a Pyth Pro key as `PYTH_PRO_API_KEY` and catalog-confirmed feed IDs as `PYTH_AAPL_FEED_ID` and `PYTH_AAPLX_FEED_ID`. Keep the key server-only. These values are currently unavailable, so use the labelled scenarios. `NEXT_PUBLIC_SOLANA_RPC_URL` can override the default devnet RPC.

Start the application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and select **Open Workspace**.

## Judge path

1. Start at `/` and follow the hero's **Open Workspace** link.
2. On `/workspace`, select **Regular / fresh** and **Closed / carried**. These reference values are simulated. The pool reserves and 30 bps fee are read from devnet when the RPC responds.
3. On `/workspace`, the trade panel leads: scenario selector and policy decision sit above the amount field, and the price-envelope chart sits below the action. Quote modes are explicit — loading, verified devnet pool, preview-only (sample reserves), and unavailable — and the swap action only unlocks on a verified reserve payload. The policy remains a browser-side interface check that the pool does not enforce.
4. Once Solflare is available in the browser, connect the generated demo wallet on **Solana Devnet**. The wallet panel shows balances and an expected-cluster label (the adapter cannot confirm the wallet's selected network). The last read-only preflight showed 100 USDC-test and 0.05 SOL, sufficient for the planned 10 USDC-test trade. Sign **Swap USDC-test for AAPLX-test** only after checking the quote and minimum output. On confirmation the page records before/after balances, persists a local receipt, and shows it on the separate browser-wallet proof card. **The browser-wallet path remains unverified; no browser-wallet transaction has been submitted.**

Do not use local mint-authority or pool-payer key files to fund a wallet unless their status has been reviewed and any exposed authority rotated. Never share or commit authority keys. If the demo wallet needs more test USDC, arrange safe Devnet funding through the project maintainer.

## Verified script pool receipt

This is separate from the workspace wallet action. The pool proof script submitted a direct SPL Token Swap v3 transaction in slot `503568283` (`meta.err = null`): it requested 10 test USDC, received 43,344 AAPLX-test base units (0.043344), and left the script trader with 15 USDC-test base units from an initial 10,000,000. The instruction required at least 42,910 AAPLX-test base units; the pool fee is 30 bps.

[Inspect the confirmed devnet transaction](https://explorer.solana.com/tx/5qRPZVjqCoRGyJqAKSRL9owHSTmZavnAeHuK76vdGESafiKDPzPdd4Ktg2sMEnnHVysiKjdnqxuhbCmduXgLMWMy?cluster=devnet).

This proves that the script's direct call to the SPL Token Swap pool settled and met its minimum-output instruction. It does not prove a browser-wallet swap, a Pyth-backed quote, or an on-chain policy check. Devnet Token Swap v3 expects a legacy 10-account-meta instruction; the newer SDK layout failed, so the proof script now submits the deployed v3 layout explicitly.

## Local checks

```bash
npm run typecheck
npm test
npm run build
```

Check these commands in the current checkout before reporting results as passing.

## Design attribution

The visual direction was informed by [Heron AI](https://heronaiapp.com/). AfterHours uses original branding, copy, layouts, diagrams, and licensed open fonts; it does not include Heron logos, proprietary imagery, or font files.
