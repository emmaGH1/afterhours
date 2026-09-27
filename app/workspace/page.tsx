"use client";
import { useEffect, useState } from "react";
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
  const [planReady, setPlanReady] = useState(false);
  const [pool, setPool] = useState<VerifiedPool | null>(null);
  const [poolState, setPoolState] = useState<"loading" | "verified" | "unavailable">("unavailable");
  const [poolNotice, setPoolNotice] = useState("Refresh the separate wallet quote before continuing.");
  useEffect(() => { if (!planReady) { setExecutionAmount(null); setPool(null); setPoolState("unavailable"); } }, [planReady]);
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
  function apply(selected: number) { setExecutionAmount(String(selected)); setPool(null); setPoolState("unavailable"); setPoolNotice("Amount applied. Refresh the separate wallet quote before continuing."); }
  return <main className="app-frame"><div className={`terminal-shell ${styles.shell}`}>
    <header className="topbar"><a className="wordmark" href="/" aria-label="AfterHours home">AFTER<span>HOURS</span><i /></a><div className="market-id"><span>REVIEW DESK</span><span className="test-badge">DEVNET</span></div><WalletControls /></header>
    <section className={styles.deskIntro}><h1>Your intent.<br />An informed next step.</h1><p>A decision desk for uncertain reference conditions. SERV interprets your terms; deterministic evidence sets the feasible choices.</p></section>
    <ServReview scenario={scenario} amount={amount} onAmountChange={setAmount} onScenarioChange={setScenario} onApply={apply} onPlanReady={setPlanReady} />
    {planReady && executionAmount ? <details className={styles.optional} open><summary>Optional wallet quote · {executionAmount} USDC-test applied</summary><p className={styles.executionLabel}>Inspect a separate reserve quote and connected-wallet balances. Execution is not enabled on this decision desk; no transaction is constructed or signed.</p><div className={styles.optionalGrid}><div><p className={styles.note}>Separate quote inspection · simulated scenario policy: {risk.state} · interface cap {risk.maxInputUsd} USDC-test. This is read-only.</p><strong className={styles.executionAmount}>{executionAmount} USDC-test → {quote === null ? "—" : quote.toFixed(6)} AAPLX-test</strong><p className={styles.executionNote} role="status">{poolNotice}</p><button type="button" className="mini-action" onClick={() => void refreshPool()} disabled={poolState === "loading"}>{poolState === "loading" ? "Refreshing…" : "Refresh wallet quote"}</button><p className={styles.note}>Fixed fee: {pool?.poolFeeBps ?? "—"} bps · Slippage: 100 bps. A fresh quote can differ from the reviewed estimate.</p></div><WalletStatus pool={pool} /></div></details> : <div className={styles.optional}><p className={styles.executionLabel}>Wallet quote inspection is optional. A feasible selection exposes an explicit “Use amount” action; waiting or expired evidence keeps quote details closed. Execution is not enabled on this decision desk.</p></div>}
    <footer className={styles.footer}><p>Simulated references. No live Pyth verification or active on-chain AfterHours guard. Interface policy is bypassable through direct pool calls. The browser-wallet swap remains unverified; the historical script receipt proves direct pool settlement only.</p><a href="/">About AfterHours</a></footer>
  </div></main>;
}
