"use client";

import { useEffect, useMemo, useState } from "react";
import { evaluateRisk, formatAge, formatBps, quoteOutput, scenarios, type MarketSnapshot } from "@/lib/market";
import type { VerifiedPool } from "@/lib/pool";
import { WalletControls } from "../wallet-controls";
import { NetworkStatus } from "../network-status";
import { DirectSwapAction } from "../direct-swap-action";

const scenarioLabels = {
  fresh: "Regular / fresh",
  afterHours: "Closed / carried",
  paused: "Risk limit crossed",
} as const;

type ScenarioKey = keyof typeof scenarioLabels;
type ViewKey = "live" | ScenarioKey;

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
  const [viewKey, setViewKey] = useState<ViewKey>("live");
  const [liveSnapshot, setLiveSnapshot] = useState<MarketSnapshot | null>(null);
  const [pythMessage, setPythMessage] = useState("Checking server-side Pyth access…");
  const [pool, setPool] = useState<VerifiedPool | null>(null);
  const [poolMessage, setPoolMessage] = useState("Checking devnet pool proof…");
  const [amount, setAmount] = useState("25");
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
          if (active) setPythMessage(payload.error || "Live Pyth data is unavailable.");
          return;
        }
        if (active) {
          setLiveSnapshot(payload.snapshot as MarketSnapshot);
          setPythMessage("LIVE PYTH RESPONSE · ONCHAIN VERIFICATION PENDING");
        }
      } catch {
        if (active) setPythMessage("Could not reach the server-side Pyth adapter.");
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 15_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/pool", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload.reserves) {
          if (active) { setPool(null); setPoolMessage(payload.error || "Pool reserves unavailable."); }
          return;
        }
        if (active) { setPool(payload as VerifiedPool); setPoolMessage("Verified devnet test-pool reserves."); }
      } catch {
        if (active) { setPool(null); setPoolMessage("Could not reach the devnet pool adapter."); }
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 15_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const selectedSnapshot = viewKey === "live" && liveSnapshot
    ? liveSnapshot
    : scenarios[viewKey === "live" ? "afterHours" : viewKey];
  const snapshot = pool ? {
    ...selectedSnapshot,
    poolPrice: pool.poolPrice,
    poolReserves: pool.reserves,
    poolFeeBps: pool.poolFeeBps,
  } : selectedSnapshot;
  const isSimulated = snapshot.source !== "live";
  const risk = useMemo(() => evaluateRisk(snapshot, nowMs), [snapshot, nowMs]);
  const amountNumber = Number(amount) || 0;
  const output = quoteOutput(amountNumber, snapshot, risk);
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
          <span className="section-index">00 / TRADE WORKSPACE · DEVNET TEST ASSETS</span>
          <h1>TRADE THE TOKEN. <em>CHECK THE REFERENCE.</em></h1>
          <p>Inspect the feed, route limit, and pool quote before a test-token swap.</p>
          <div className="source-stamp"><span /> {snapshot.source.toUpperCase()} {isSimulated ? "SCENARIO · PYTH MAPPING PENDING" : "FEED · ONCHAIN VERIFICATION PENDING"}</div>
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

        <nav className="scenario-tabs" aria-label="Demo scenarios">
          <span className="eyebrow">{liveSnapshot ? "SELECT LIVE DATA OR LABELLED SCENARIO" : "DEMO SCENARIOS — SIMULATED"}</span>
          <div>
            {liveSnapshot ? <button type="button" aria-pressed={viewKey === "live"} onClick={() => setViewKey("live")}>LIVE PYTH</button> : null}
            {(Object.keys(scenarioLabels) as ScenarioKey[]).map((key) => (
              <button key={key} type="button" aria-pressed={viewKey === key} onClick={() => setViewKey(key)}>
                {scenarioLabels[key]}
              </button>
            ))}
          </div>
        </nav>

        <div className="main-grid">
          <section className="reference-panel numbered-panel">
            <div className="panel-heading">
              <span>01</span><div><span className="eyebrow">REFERENCE LAYER</span><h2>PRICE ENVELOPE</h2></div>
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
              <div><span>Confidence</span><strong>±${snapshot.confidence.toFixed(2)}</strong></div>
              <div><span>Publishers</span><strong>{snapshot.publisherCount.toString().padStart(2, "0")}</strong></div>
              <div><span>Pool deviation</span><strong>{snapshot.poolPrice === null ? "NOT CONNECTED" : formatBps(risk.poolDeviationBps)}</strong></div>
              <div><span>Snapshot</span><strong>{snapshot.id}</strong></div>
            </div>
          </section>

          <section className="trade-panel numbered-panel">
            <div className="panel-heading">
              <span>02</span><div><span className="eyebrow">POOL QUOTE</span><h2>TRADE PREVIEW</h2></div>
            </div>
            <label className="amount-field">
              <span className="eyebrow">YOU PAY</span>
              <div><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" aria-describedby="amount-help" /><strong>USDC-test</strong></div>
            </label>
            <div className="swap-arrow" aria-hidden="true">↓</div>
            <div className="receive-field">
              <span className="eyebrow">YOU RECEIVE (EST.)</span>
              <div><strong>{output ? output.toFixed(4) : "—"}</strong><strong>AAPLX-test</strong></div>
            </div>
            <div className="quote-lines" id="amount-help">
              <div><span>Pool fee</span><strong>{snapshot.poolFeeBps == null ? "NOT VERIFIED" : `${snapshot.poolFeeBps} BPS`}</strong></div>
              <div><span>Maximum input</span><strong>${risk.maxInputUsd.toLocaleString()}</strong></div>
              <div><span>Pool basis</span><strong>{pool ? "DEVNET RESERVES" : isSimulated ? "SAMPLE RESERVES" : "NO POOL"}</strong></div>
              <div><span>Price source</span><strong>{isSimulated ? "SIMULATED" : "LIVE; UNVERIFIED"}</strong></div>
            </div>
            <DirectSwapAction pool={pool} snapshot={snapshot} amount={amount} />
            <p className="action-note">{pythMessage}</p>
            <p className="action-note">{poolMessage}</p>
          </section>
        </div>

        <section className="evidence-strip">
          <div><span className="eyebrow">03 / POLICY OUTPUT</span><strong>{risk.reasons.join(" ")}</strong></div>
          <div><span className="eyebrow">ONCHAIN EVIDENCE</span><strong>{pool ? <a href={pool.proof.explorerUrl} target="_blank" rel="noreferrer">TEST-POOL SWAP PROOF ↗</a> : "NO VERIFIED SWAP YET"}</strong></div>
          <div><span className="eyebrow">NETWORK</span><NetworkStatus /></div>
        </section>

        <footer>
          <span>AFTERHOURS / STOCKLANA 2026</span>
          <span>UNCERTAINTY, MADE VISIBLE.</span>
        </footer>
      </div>
    </main>
  );
}
