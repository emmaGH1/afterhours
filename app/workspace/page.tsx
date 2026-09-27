"use client";

import { useEffect, useMemo, useState } from "react";
import { evaluateRisk, formatAge, formatBps, quoteOutput, scenarios, type MarketSnapshot } from "@/lib/market";
import type { VerifiedPool } from "@/lib/pool";
import { WalletControls } from "../wallet-controls";
import { WalletStatus } from "../wallet-status";
import { NetworkStatus } from "../network-status";
import { PolicyDecision } from "../policy-decision";
import { ProofCards } from "../proof-cards";
import { DirectSwapAction } from "../direct-swap-action";
import { ServReview } from "../serv-review";

const scenarioLabels = {
  fresh: "REGULAR / FRESH",
  afterHours: "CLOSED / CARRIED",
  paused: "RISK LIMIT CROSSED",
} as const;

type ScenarioKey = keyof typeof scenarioLabels;
type ViewKey = "live" | ScenarioKey;
type QuoteMode = "loading" | "verified" | "preview" | "unavailable";

// The setup script's verified receipt, also carried by the pool API payload.
const SCRIPT_PROOF = {
  explorerUrl: "https://explorer.solana.com/tx/5qRPZVjqCoRGyJqAKSRL9owHSTmZavnAeHuK76vdGESafiKDPzPdd4Ktg2sMEnnHVysiKjdnqxuhbCmduXgLMWMy?cluster=devnet",
  signature: "5qRPZVjqCoRGyJqAKSRL9owHSTmZavnAeHuK76vdGESafiKDPzPdd4Ktg2sMEnnHVysiKjdnqxuhbCmduXgLMWMy",
};

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="metric">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export default function Workspace() {
  // Phase 1: the default is always an explicitly selected simulated scenario.
  // "live" is only selectable after a live snapshot has actually arrived, so
  // no unselected fallback state can ever render and every displayed value —
  // status, prices, age, decision, quote, tab — comes from the same scenario.
  const [viewKey, setViewKey] = useState<ViewKey>("fresh");
  const [liveSnapshot, setLiveSnapshot] = useState<MarketSnapshot | null>(null);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [pool, setPool] = useState<VerifiedPool | null>(null);
  const [poolState, setPoolState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [poolError, setPoolError] = useState<string | null>(null);
  const [poolDetail, setPoolDetail] = useState<string | null>(null);
  const [poolNonce, setPoolNonce] = useState(0);
  const [amount, setAmount] = useState("10");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 5_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/market", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload.snapshot) {
          if (active) setLiveNotice("Live Pyth data is unavailable; labelled simulated scenarios are in use.");
          return;
        }
        if (active) setLiveSnapshot(payload.snapshot as MarketSnapshot);
      } catch {
        if (active) setLiveNotice("Could not reach the server-side Pyth adapter; labelled scenarios remain in use.");
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 15_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let active = true;
    setPoolState("loading");
    setPoolError(null);
    setPoolDetail(null);
    const refresh = async () => {
      try {
        const response = await fetch("/api/pool", { cache: "no-store" });
        const payload = await response.json();
        if (!active) return;
        if (!response.ok || !payload.reserves) {
          setPool(null);
          setPoolState("unavailable");
          setPoolError(payload.error || "Devnet pool reserves are temporarily unavailable.");
          setPoolDetail(typeof payload.detail === "string" ? payload.detail : null);
          return;
        }
        setPool(payload as VerifiedPool);
        setPoolState("ready");
      } catch {
        if (!active) return;
        setPool(null);
        setPoolState("unavailable");
        setPoolError("Could not reach the devnet pool adapter.");
      }
    };
    void refresh();
    return () => { active = false; };
  }, [poolNonce]);

  const activeView: ViewKey = viewKey === "live" && !liveSnapshot ? "fresh" : viewKey;
  const selectedSnapshot = activeView === "live" ? liveSnapshot ?? scenarios.fresh : scenarios[activeView];
  const isLive = activeView === "live" && liveSnapshot !== null;
  const snapshot = pool ? {
    ...selectedSnapshot,
    poolPrice: pool.poolPrice,
    poolReserves: pool.reserves,
    poolFeeBps: pool.poolFeeBps,
  } : selectedSnapshot;
  const isSimulated = snapshot.source !== "live";
  const risk = useMemo(() => evaluateRisk(snapshot, nowMs), [snapshot, nowMs]);
  const amountNumber = Number(amount) || 0;
  const displayQuote = useMemo(
    () => quoteOutput(amountNumber, snapshot, risk),
    [amountNumber, snapshot, risk],
  );

  // Quote mode (Phase 4). "preview" means the pool API is unavailable but the
  // scenario carries sample reserves: policy can be demonstrated, execution cannot.
  const quoteMode: QuoteMode = poolState === "loading"
    ? "loading"
    : poolState === "ready"
      ? "verified"
      : snapshot.poolReserves
        ? "preview"
        : "unavailable";

  const plotPrices = [snapshot.underlyingPrice, snapshot.tokenPrice, snapshot.poolPrice]
    .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0);
  const plotCenter = plotPrices.length ? (Math.min(...plotPrices) + Math.max(...plotPrices)) / 2 : 1;
  const plotSpan = plotPrices.length
    ? Math.max(Math.max(...plotPrices) - Math.min(...plotPrices), plotCenter * 0.01)
    : 1;
  const plotTop = (price: number) => `${Number.isFinite(price)
    ? Math.max(15, Math.min(75, 50 - ((price - plotCenter) / plotSpan) * 60)) : 50}%`;

  return (
    <main className="app-frame">
      <div className="terminal-shell">
        <header className="topbar">
          <a className="wordmark" href="/" aria-label="AfterHours home">
            AFTER<span>HOURS</span><i />
          </a>
          <div className="market-id">
            <span>AAPLX-test / USDC-test</span>
            <span className="test-badge">TEST MARKET</span>
          </div>
          <WalletControls />
        </header>

        <section className="intro workspace-intro" id="top">
          <span className="section-index">00 / SERV REVIEW WORKSPACE · DEVNET TEST ASSETS</span>
          <h1>ASK. <em>UNDERSTAND THE TRADE.</em></h1>
          <p>A SERV-powered evidence review before a wallet-signed devnet swap. Both assets are test tokens; AAPLX-test is not a backed security.</p>
        </section>

        <nav className="scenario-tabs" aria-label="Demo scenarios">
          <span className="eyebrow">
            {isLive ? "SELECT LIVE DATA OR LABELLED SCENARIO" : "DEMO SCENARIOS — SIMULATED REFERENCE"}
          </span>
          <div>
            {liveSnapshot ? (
              <button type="button" aria-pressed={activeView === "live"} onClick={() => setViewKey("live")}>
                LIVE PYTH
              </button>
            ) : null}
            {(Object.keys(scenarioLabels) as ScenarioKey[]).map((key) => (
              <button key={key} type="button" aria-pressed={activeView === key} onClick={() => setViewKey(key)}>
                {scenarioLabels[key]}
              </button>
            ))}
          </div>
        </nav>

        <ServReview scenario={activeView === "live" ? null : activeView} amount={amount} onAmountChange={setAmount} />

        <div className="main-grid main-grid-trading">
          {/* Transaction construction and deterministic policy stay independent of the advisory review. */}
          <section className="trade-panel numbered-panel">
            <div className="panel-heading">
              <span>02</span><div><span className="eyebrow">OPTIONAL WALLET ACTION · DIRECT SPL TOKEN SWAP V3</span><h2>TRADE DETAILS</h2></div>
            </div>

            <PolicyDecision risk={risk} simulated={isSimulated} />

            {quoteMode === "loading" ? (
              <div className="quote-state quote-loading" role="status">
                <span className="eyebrow">QUOTE</span>
                <strong>CHECKING VERIFIED DEVNET POOL…</strong>
                <p className="action-note">The swap action unlocks once a verified reserve payload arrives.</p>
              </div>
            ) : null}

            {quoteMode === "unavailable" ? (
              <div className="quote-state quote-unavailable" role="status">
                <span className="eyebrow">QUOTE</span>
                <strong>DEVNET POOL TEMPORARILY UNAVAILABLE</strong>
                <p className="action-note">
                  {poolError} Retry — the interface will not request a wallet signature without
                  verified reserves.
                </p>
                {poolDetail ? (
                  <details className="quote-detail">
                    <summary>Technical details</summary>
                    <p className="action-note">{poolDetail}</p>
                  </details>
                ) : null}
                <button type="button" className="mini-action" onClick={() => setPoolNonce((value) => value + 1)}>
                  RETRY
                </button>
              </div>
            ) : null}

            {quoteMode === "preview" ? (
              <div className="quote-state quote-preview" role="status">
                <span className="eyebrow">QUOTE</span>
                <strong>PREVIEW ONLY · SAMPLE RESERVES · SIMULATED SCENARIO</strong>
                <p className="action-note">
                  This preview demonstrates policy behavior only. Transaction submission unlocks when
                  the verified devnet pool response is available.
                </p>
                <button type="button" className="mini-action" onClick={() => setPoolNonce((value) => value + 1)}>
                  RETRY POOL
                </button>
              </div>
            ) : null}

            <div className="amount-field">
              <span className="eyebrow">YOU PAY</span>
              <div>
                <strong>{amountNumber.toLocaleString()}</strong>
                <strong>USDC-test</strong>
              </div>
            </div>
            <div className="swap-arrow" aria-hidden="true">↓</div>
            <div className="receive-field">
              <span className="eyebrow">
                {quoteMode === "verified" ? "YOU RECEIVE (EST.)" : "INDICATIVE OUTPUT"}
              </span>
              <div>
                <strong>
                  {quoteMode === "loading"
                    ? "…"
                    : displayQuote !== null
                      ? displayQuote.toFixed(4)
                      : "—"}
                </strong>
                <strong>AAPLX-test</strong>
              </div>
            </div>
            <div className="quote-lines" id="amount-help">
              <div><span>Quote basis</span><strong>
                {quoteMode === "verified" ? "VERIFIED DEVNET POOL"
                  : quoteMode === "loading" ? "CHECKING…"
                    : quoteMode === "preview" ? "PREVIEW · SAMPLE RESERVES"
                      : "UNAVAILABLE"}
              </strong></div>
              <div><span>Pool fee (fixed)</span><strong>{pool ? `${pool.poolFeeBps} BPS` : "—"}</strong></div>
              <div><span>Slippage tolerance</span><strong>1.00% (100 BPS)</strong></div>
              <div><span>Pool reserve basis</span><strong>{pool ? `${pool.reserves.usdc.toLocaleString()} / ${pool.reserves.aaplx.toLocaleString()}` : "SAMPLE"}</strong></div>
              <div><span>Quote freshness</span><strong>{poolState === "ready" ? "LIVE RESERVES · POLLED" : "—"}</strong></div>
            </div>

            <DirectSwapAction
              pool={pool}
              snapshot={snapshot}
              amount={amount}
              quoteMode={quoteMode}
            />
          </section>

          <aside className="reference-column">
            <section className="wallet-strip">
              <WalletStatus pool={pool} />
            </section>

            <section className="reference-panel numbered-panel">
              <div className="panel-heading">
                <span>03</span><div><span className="eyebrow">REFERENCE LAYER</span><h2>PRICE ENVELOPE</h2></div>
              </div>
              <div className="blueprint-plot" aria-label="Relative price positions normalized for display">
                <span className="plot-scale-note">RELATIVE SCALE / USD</span>
                <div className="plot-label label-reference" style={{ top: `calc(${plotTop(snapshot.underlyingPrice)} - 25px)` }}>AAPL ${snapshot.underlyingPrice.toFixed(2)}</div>
                <div className="plot-line line-reference" style={{ top: plotTop(snapshot.underlyingPrice) }} />
                <div className="plot-label label-token" style={{ top: `calc(${plotTop(snapshot.tokenPrice)} - 25px)` }}>AAPLX ${snapshot.tokenPrice.toFixed(2)}</div>
                <div className="plot-line line-token" style={{ top: plotTop(snapshot.tokenPrice) }} />
                {snapshot.poolPrice === null ? null : <>
                  <div className="plot-label label-pool" style={{ top: `calc(${plotTop(snapshot.poolPrice)} - 25px)` }}>POOL ${snapshot.poolPrice.toFixed(2)}</div>
                  <div className="plot-line line-pool" style={{ top: plotTop(snapshot.poolPrice) }} />
                </>}
                <div className="risk-envelope" style={{ height: risk.state === "open" ? "26%" : risk.state === "guarded" ? "48%" : "72%" }}>
                  <span>REFERENCE UNCERTAINTY</span>
                </div>
                <span className="coordinate coord-a">+ AAPL</span>
                <span className="coordinate coord-b">+ AAPLX</span>
              </div>
              <div className="data-table">
                <div><span>Session</span><strong>{snapshot.session.replace("_", " ").toUpperCase()}</strong></div>
                <div><span>Confidence</span><strong>±${snapshot.confidence.toFixed(2)}</strong></div>
                <div><span>Publishers</span><strong>{snapshot.publisherCount.toString().padStart(2, "0")}</strong></div>
                <div><span>Snapshot</span><strong>{snapshot.id}</strong></div>
              </div>
            </section>

            <section className={`status-band status-${risk.state}`} aria-live="polite">
              <div>
                <span className="eyebrow">CURRENT POLICY</span>
                <strong>{risk.state.toUpperCase()}</strong>
              </div>
              <Metric label="MARKET SESSION" value={snapshot.session.replace("_", " ").toUpperCase()} detail={isSimulated ? "Scenario field" : "Pyth response field"} />
              <Metric label="REFERENCE AGE" value={formatAge(risk.ageSeconds)} detail="Reference update → message time" />
              <Metric label="TOKEN / REFERENCE" value={formatBps(risk.divergenceBps)} detail="Absolute divergence" />
              <p>{risk.reasons[0]}</p>
            </section>
          </aside>
        </div>

        <section className="evidence-strip">
          <div className="evidence-proofs">
            <ProofCards scriptReceipt={pool?.proof ?? SCRIPT_PROOF} />
          </div>
          <div>
            <span className="eyebrow">NETWORK HONESTY</span>
            <div className="network-lines">
              <div><span>Devnet RPC status</span><strong><NetworkStatus /></strong></div>
              <div><span>Connected wallet</span><strong>SEE WALLET PANEL</strong></div>
              <div><span>Expected cluster</span><strong>DEVNET</strong></div>
            </div>
            {liveNotice
              ? <p className="action-note pyth-note" role="status">{liveNotice}</p>
              : <p className="action-note pyth-note" role="status">No live Pyth integration: simulated-reference mode is the intentional current fallback, not an application failure.</p>}
          </div>
        </section>

        <footer>
          <span>AFTERHOURS / SERV REASONING</span>
          <span>UNCERTAINTY, MADE VISIBLE.</span>
        </footer>
      </div>
    </main>
  );
}
