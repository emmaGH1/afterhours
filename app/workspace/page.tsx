"use client";
import { useEffect, useRef, useState } from "react";
import { evaluateRisk, quoteOutput, scenarios } from "@/lib/market";
import type { ReviewScenario } from "@/lib/review-contract";
import type { VerifiedPool } from "@/lib/pool";
import { WalletControls } from "../wallet-controls";
import { WalletStatus } from "../wallet-status";
import { ServReview } from "../serv-review";
import styles from "../serv-review.module.css";

export default function Workspace() {
  const [scenario, setScenario] = useState<ReviewScenario>("afterHours");
  const [amount, setAmount] = useState("100");
  const [executionAmount, setExecutionAmount] = useState<string | null>(null);
  const quotePanel = useRef<HTMLDetailsElement>(null);
  const [quoteRequest, setQuoteRequest] = useState(0);
  const [planReady, setPlanReady] = useState(false);
  const [pool, setPool] = useState<VerifiedPool | null>(null);
  const [poolState, setPoolState] = useState<"loading" | "verified" | "unavailable">("unavailable");
  const [poolNotice, setPoolNotice] = useState("Refresh the separate wallet quote before continuing.");
  useEffect(() => { if (!planReady) { setExecutionAmount(null); setPool(null); setPoolState("unavailable"); } }, [planReady]);
  useEffect(() => { if (executionAmount && quotePanel.current) { quotePanel.current.open = true; quotePanel.current.scrollIntoView({ block: "start", behavior: "auto" }); quotePanel.current.querySelector("summary")?.focus(); } }, [executionAmount, quoteRequest]);
  const snapshot = pool ? { ...scenarios[scenario], poolPrice: pool.poolPrice, poolReserves: pool.reserves, poolFeeBps: pool.poolFeeBps } : scenarios[scenario];
  const risk = evaluateRisk(snapshot, Date.now());
  const quote = executionAmount && pool ? quoteOutput(Number(executionAmount), snapshot, risk) : null;
  async function refreshPool() {
    setPoolState("loading"); setPool(null);
    try {
      const response = await fetch("/api/pool", { cache: "no-store" }); const payload = await response.json();
      if (!response.ok || !payload.reserves) throw new Error(payload.error || "Pool reserves unavailable.");
      setPool(payload); setPoolState("verified"); setPoolNotice(`Separate wallet quote fetched at ${new Date().toLocaleTimeString()}. It may differ from the review observation.`);
    } catch (error) { setPoolState("unavailable"); setPoolNotice(error instanceof Error ? error.message : "Pool unavailable. Refresh to try again."); }
  }
  function apply(selected: number) { setExecutionAmount(String(selected)); setQuoteRequest(previous => previous + 1); setPool(null); setPoolState("unavailable"); setPoolNotice("Amount applied. Refresh the separate wallet quote before continuing."); }
  return <main className="app-frame"><div className={`terminal-shell ${styles.shell}`}>
    <header className="topbar"><a className="wordmark" href="/" aria-label="AfterHours home">AFTER<span>HOURS</span><i /></a><div className="market-id"><span>REVIEW DESK</span><span className="test-badge">DEVNET</span></div><WalletControls /></header>
    <section className={styles.deskIntro}><h1>Your intent.<br />An informed next step.</h1><p>A decision desk for uncertain reference conditions. SERV interprets your terms; deterministic evidence sets the feasible choices.<span className={styles.deskMode}>No wallet required · Read-only review</span></p></section>
    <ServReview scenario={scenario} amount={amount} onAmountChange={setAmount} onScenarioChange={setScenario} onApply={apply} onPlanReady={setPlanReady} />
    {planReady && executionAmount ? <details ref={quotePanel} className={styles.optional} open><summary>Optional wallet quote · {executionAmount} USDC-test applied</summary><p className={styles.executionLabel}>Inspect a separate reserve quote and connected-wallet balances. Execution is not enabled on this decision desk; no transaction is constructed or signed.</p><div className={styles.optionalGrid}><div><p className={styles.note}>Separate quote inspection · simulated scenario policy: {risk.state} · interface cap {risk.maxInputUsd} USDC-test. This is read-only.</p><strong className={styles.executionAmount}>{executionAmount} USDC-test → {quote === null ? "—" : quote.toFixed(6)} AAPLX-test</strong><p className={styles.executionNote} role="status">{poolNotice}</p><button type="button" className="mini-action" onClick={() => void refreshPool()} disabled={poolState === "loading"}>{poolState === "loading" ? "Refreshing…" : "Refresh wallet quote"}</button><p className={styles.note}>Fixed fee: {pool?.poolFeeBps ?? "—"} bps · Slippage: 100 bps. A fresh quote can differ from the reviewed estimate.</p></div><WalletStatus pool={pool} /></div></details> : null}
    <footer className={styles.footer}><div className={styles.boundaryTitle}><h2>Know the boundaries.</h2><a href="/">About AfterHours</a></div><dl className={styles.boundaryLedger}><div><dt>Assets</dt><dd>USDC-test and AAPLX-test are devnet SPL test tokens, not backed securities.</dd></div><div><dt>Reference data</dt><dd>Scenarios are simulated. No live or signed Pyth data or Pyth verification.</dd></div><div><dt>Policy & execution</dt><dd>The policy is an interface check, bypassable through direct pool calls. No active on-chain AfterHours guard. This desk only inspects quotes and balances; it does not construct or sign transactions.</dd></div><div><dt>Historical evidence</dt><dd>The verified script receipt proves direct pool settlement only. Browser-wallet settlement remains unverified.</dd></div></dl></footer>
  </div></main>;
}
