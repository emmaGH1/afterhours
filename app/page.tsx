"use client";

import { useEffect, useMemo, useState } from "react";
import { evaluateRisk, formatAge, formatBps, quoteOutput, scenarios, type MarketSnapshot } from "@/lib/market";
import { WalletControls } from "./wallet-controls";
import { NetworkStatus } from "./network-status";
import { SnapshotAction } from "./snapshot-action";

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

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M3 13 13 3M6 3h7v7" />
    </svg>
  );
}

export default function Home() {
  const [viewKey, setViewKey] = useState<ViewKey>("live");
  const [liveSnapshot, setLiveSnapshot] = useState<MarketSnapshot | null>(null);
  const [pythMessage, setPythMessage] = useState("Checking server-side Pyth access…");
  const [amount, setAmount] = useState("500");

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
          setPythMessage("LIVE PYTH DATA · SIGNED PAYLOAD RECEIVED · ONCHAIN VERIFICATION PENDING");
        }
      } catch {
        if (active) setPythMessage("Could not reach the server-side Pyth adapter.");
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 15_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const snapshot = viewKey === "live" && liveSnapshot
    ? liveSnapshot
    : scenarios[viewKey === "live" ? "afterHours" : viewKey];
  const isSimulated = snapshot.source !== "live";
  const risk = useMemo(() => evaluateRisk(snapshot), [snapshot]);
  const amountNumber = Number(amount) || 0;
  const output = quoteOutput(amountNumber, snapshot, risk);
  const overLimit = risk.state !== "paused" && amountNumber > risk.maxInputUsd;
  const blocked = risk.state === "paused" || overLimit;

  return (
    <main className="app-frame">
      <div className="terminal-shell">
        <header className="topbar">
          <a className="wordmark" href="#top" aria-label="AfterHours home">
            AFTER<span>HOURS</span><i />
          </a>
          <div className="market-id">
            <span>AAPLX / USDC</span>
            <span className="test-badge">TEST MARKET</span>
          </div>
          <WalletControls />
        </header>

        <section className="intro" id="top">
          <span className="section-index">00 / AFTERHOURS</span>
          <h1><span className="headline-wide">WHEN THE REFERENCE STOPS,</span><span className="headline-compact">WHEN THE<br />REFERENCE STOPS,</span><em>RISK SHOULD NOT.</em></h1>
          <p>Pyth-informed risk limits for tokenized equity liquidity outside regular market conditions.</p>
          <div className="source-stamp"><span /> {snapshot.source.toUpperCase()} {isSimulated ? "SCENARIO" : "FEED"} · PYTH FEEDS 922 + 1792</div>
        </section>

        <section className={`status-band status-${risk.state}`} aria-live="polite">
          <div>
            <span className="eyebrow">CURRENT POLICY</span>
            <strong>{risk.state.toUpperCase()}</strong>
          </div>
          <Metric label="MARKET SESSION" value={snapshot.session.replace("_", " ").toUpperCase()} detail="Signed field target" />
          <Metric label="REFERENCE AGE" value={formatAge(risk.ageSeconds)} detail="Feed-generated → message time" />
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
            <div className="blueprint-plot" aria-label="Price relationship diagram">
              <div className="plot-label label-reference">AAPL ${snapshot.underlyingPrice.toFixed(2)}</div>
              <div className="plot-line line-reference" style={{ top: "58%" }} />
              <div className="plot-label label-token">AAPLX ${snapshot.tokenPrice.toFixed(2)}</div>
              <div className="plot-line line-token" style={{ top: "37%" }} />
              <div className="plot-label label-pool">{snapshot.poolPrice === null ? "POOL NOT CONNECTED" : `POOL $${snapshot.poolPrice.toFixed(2)}`}</div>
              <div className="plot-line line-pool" style={{ top: "24%" }} />
              <div className="risk-envelope" style={{ height: risk.state === "open" ? "26%" : risk.state === "guarded" ? "48%" : "72%" }}>
                <span>PERMITTED RISK ENVELOPE</span>
              </div>
              <span className="coordinate coord-a">+ 922</span>
              <span className="coordinate coord-b">+ 1792</span>
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
              <span>02</span><div><span className="eyebrow">QUOTE SIMULATION</span><h2>TRADE PREVIEW</h2></div>
            </div>
            <label className="amount-field">
              <span className="eyebrow">YOU PAY</span>
              <div><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" aria-describedby="amount-help" /><strong>USDC</strong></div>
            </label>
            <div className="swap-arrow" aria-hidden="true">↓</div>
            <div className="receive-field">
              <span className="eyebrow">YOU RECEIVE (EST.)</span>
              <div><strong>{output ? output.toFixed(4) : "—"}</strong><strong>AAPLX</strong></div>
            </div>
            <div className="quote-lines" id="amount-help">
              <div><span>Effective fee</span><strong>{risk.state === "paused" ? "—" : `${risk.feeBps} BPS`}</strong></div>
              <div><span>Maximum input</span><strong>${risk.maxInputUsd.toLocaleString()}</strong></div>
              <div><span>Pool basis</span><strong>{snapshot.poolPrice === null ? "NO POOL" : "SIMULATED SPOT"}</strong></div>
              <div><span>Price source</span><strong>{isSimulated ? "SIMULATED" : "LIVE; UNVERIFIED"}</strong></div>
            </div>
            <button className="primary-action swap-disabled" type="button" disabled>
              {blocked ? (risk.state === "paused" ? "TRADING PAUSED" : "AMOUNT EXCEEDS LIMIT") : "SWAP PROGRAM NOT DEPLOYED"}
              <ArrowIcon />
            </button>
            <p className="action-note">{pythMessage}</p>
            <SnapshotAction snapshot={snapshot} risk={risk} />
          </section>
        </div>

        <section className="evidence-strip">
          <div><span className="eyebrow">03 / POLICY OUTPUT</span><strong>{risk.reasons.join(" ")}</strong></div>
          <div><span className="eyebrow">ONCHAIN EVIDENCE</span><strong>POLICY MEMO ONLY · NO SWAP PROGRAM</strong></div>
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
