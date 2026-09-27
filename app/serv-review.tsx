"use client";
import { useEffect, useRef, useState } from "react";
import type { ReviewResponse, ReviewScenario } from "@/lib/review-contract";
import styles from "./serv-review.module.css";

const scenarioLabels: Record<ReviewScenario, string> = { fresh: "Fresh reference", afterHours: "Carried reference", paused: "Paused policy" };
const fullIntent = "I only want the full amount; otherwise wait.";
const flexibleIntent = "A smaller permitted test trade is acceptable.";
export function ServReview({ scenario, amount, onAmountChange, onScenarioChange, onApply, onPlanReady }: {
  scenario: ReviewScenario; amount: string; onAmountChange: (value: string) => void;
  onScenarioChange: (value: ReviewScenario) => void; onApply: (amount: number) => void; onPlanReady: (ready: boolean) => void;
}) {
  const [intent, setIntent] = useState(flexibleIntent);
  const key = JSON.stringify([scenario, amount, intent]);
  const controller = useRef<AbortController | null>(null);
  const [state, setState] = useState<{ key: string; loading?: boolean; data?: ReviewResponse; error?: string } | null>(null);
  const [now, setNow] = useState(0);
  const current = state?.key === key ? state : null;
  const data = current?.data;
  const selected = data?.options.find(option => option.id === data.plan.optionId);
  const expired = Boolean(data && now >= Date.parse(data.observation.expiresAt));
  const usable = Boolean(selected?.feasible && selected.id !== "wait" && !expired);
  useEffect(() => { onPlanReady(usable); }, [usable, onPlanReady]);
  useEffect(() => { controller.current?.abort(); setState(null); }, [key]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => { window.clearInterval(timer); controller.current?.abort(); }; }, []);
  async function review() {
    const abort = new AbortController(); controller.current?.abort(); controller.current = abort;
    setState({ key, loading: true });
    try {
      const response = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario, amount: Number(amount), intent }), signal: abort.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The review could not complete. Please try again.");
      if (!payload.observation || !payload.plan || !Array.isArray(payload.options) || !payload.validation?.passed || !payload.receipt) throw new Error("The review record is incomplete. Run a new review.");
      if (!abort.signal.aborted) { setNow(Date.now()); setState({ key, data: payload }); }
    } catch (error) { if (!abort.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Could not reach the review service. Try again." }); }
  }
  return <section className={styles.desk} aria-label="SERV decision desk">
    <div className={styles.request}>
      <h2>What would you<br />like to do?</h2>
      <p className={styles.lead}>Set your terms. SERV compares the full request, a permitted smaller trade, and waiting.</p>
      <label className={styles.label} htmlFor="review-amount">Proposed amount</label>
      <div className={styles.amount}><input id="review-amount" value={amount} onChange={event => onAmountChange(event.target.value)} inputMode="decimal" /><span>USDC-test</span></div>
      <label className={styles.label} htmlFor="review-scenario">Reference scenario <span>Simulated</span></label>
      <select id="review-scenario" value={scenario} onChange={event => onScenarioChange(event.target.value as ReviewScenario)}>{Object.entries(scenarioLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <label className={styles.label} htmlFor="review-intent">Your intent</label>
      <textarea id="review-intent" value={intent} onChange={event => setIntent(event.target.value)} maxLength={800} rows={4} />
      <div className={styles.presets} aria-label="Example intents"><button type="button" onClick={() => setIntent(fullIntent)} aria-pressed={intent === fullIntent}>Full amount or wait</button><button type="button" onClick={() => setIntent(flexibleIntent)} aria-pressed={intent === flexibleIntent}>Smaller is acceptable</button></div>
      <button className={styles.action} type="button" disabled={!Number.isFinite(Number(amount)) || Number(amount) <= 0 || intent.trim().length < 3 || current?.loading} onClick={() => void review()}>{current?.loading ? "Comparing your options…" : data ? "Run a new review" : "Compare with SERV"}<span aria-hidden="true">↗</span></button>
      {current?.loading ? <button className={styles.cancel} type="button" onClick={() => { controller.current?.abort(); setState(null); }}>Cancel review</button> : null}
      <p className={styles.note}>No wallet needed. USDC-test and AAPLX-test are devnet test tokens, not backed securities.</p>
    </div>
    <div className={styles.record} aria-live="polite" aria-busy={Boolean(current?.loading)}>
      <div className={styles.recordHead}><span>Decision record</span><span>{current?.loading ? "In progress" : current?.error ? "Unavailable" : data ? expired ? "Expired" : "Validated" : "Awaiting intent"}</span></div>
      {!data ? <div className={styles.empty}>
        <div className={styles.branch} aria-hidden="true"><span>Requested</span><span>Reduced</span><span>Wait</span></div>
        <h3>{current?.loading ? "One observation. Three choices." : current?.error ? "We couldn’t complete this review." : "The same market.\nA different decision."}</h3>
        <p>{current?.error || (current?.loading ? "Reading devnet reserves, calculating feasible options, then asking SERV to choose against your intent. No trade is submitted." : "Try 100 USDC-test with a carried reference. Change only your intent to see whether keeping the full amount or accepting a smaller trade changes the plan.")}</p>
        {current?.error ? <p role="alert">No plan is available. Run a new review to try again.</p> : null}
        <ol className={styles.flow}><li>Gather evidence</li><li>SERV compares</li><li>Validate the choice</li></ol>
      </div> : <>
        <div className={styles.observation}><div><span>Observed</span><strong>{new Date(data.observation.observedAt).toLocaleTimeString()}</strong></div><div><span>Reference / policy</span><strong>Simulated / {data.observation.policyState}</strong></div><div><span>Pool evidence</span><strong>{data.observation.reserves ? "Devnet reserves" : "Unavailable — wait only"}</strong></div></div>
        <p className={styles.note}>One observation for every option · expires {new Date(data.observation.expiresAt).toLocaleTimeString()} · {data.observation.id}</p>
        <div className={styles.options}>{data.options.map(option => <article key={option.id} className={option.id === data.plan.optionId ? styles.selectedOption : styles.option}><div className={styles.optionTop}><span>{option.label}</span><strong>{option.id === data.plan.optionId ? "SERV choice" : option.feasible ? "Feasible" : "Blocked"}</strong></div><h3>{option.amountUsdc.toLocaleString(undefined, { maximumFractionDigits: 6 })}<small> USDC-test</small></h3><p>{option.id === "wait" ? "No trade. Keep your funds." : option.quoteOutput === null ? "Quote unavailable" : `${option.quoteOutput.toFixed(6)} AAPLX-test estimated`}</p>{option.minimumOutput !== null ? <p className={styles.note}>Minimum {option.minimumOutput.toFixed(6)} · slippage {option.slippageBps} bps</p> : null}{option.blockers.map(blocker => <p className={styles.blocker} key={blocker}>{blocker}</p>)}</article>)}</div>
        <div className={styles.plan}><div className={styles.planTitle}><h3>{expired ? "This plan has expired." : selected?.id === "wait" ? "The plan is to wait." : "A plan within your terms."}</h3><span>{expired ? "New review required" : "Application checks passed"}</span></div><p className={styles.summary}>{data.plan.summary}</p><ul>{data.plan.rationale.map(reason => <li key={reason}>{reason}</li>)}</ul>{data.plan.tradeoffs.length ? <p className={styles.note}>Tradeoffs: {data.plan.tradeoffs.join(" ")}</p> : null}{usable && selected ? <button type="button" className={styles.apply} onClick={() => onApply(selected.amountUsdc)}>Use {selected.amountUsdc} USDC-test in optional quote inspection</button> : null}{expired ? <p>Evidence is time bounded. Run a new review before using this plan.</p> : null}</div>
        <details className={styles.receipt}><summary>Evidence & actual API provenance · {(data.receipt.latencyMs / 1000).toFixed(2)}s</summary><dl><dt>Observation</dt><dd>{data.observation.id}</dd><dt>Pool</dt><dd>{data.observation.poolAddress ?? "Unavailable"}</dd><dt>Reference age</dt><dd>{data.observation.referenceAgeSeconds}s · divergence {data.observation.divergenceBps} bps</dd><dt>Reserves</dt><dd>{data.observation.reserves ? `${data.observation.reserves.usdc} USDC-test / ${data.observation.reserves.aaplx} AAPLX-test` : "Unavailable"}</dd><dt>Fixed fee</dt><dd>{data.observation.poolFeeBps ?? "Unavailable"} bps</dd><dt>Cited evidence</dt><dd>{data.plan.evidenceIds.join(", ")}</dd><dt>Validation</dt><dd>{data.validation.checks.join(" · ")}</dd><dt>Completion</dt><dd>{data.receipt.id}</dd><dt>Model / prompt</dt><dd>{data.receipt.model} / {data.receipt.promptVersion}</dd><dt>Actual tool calls</dt><dd>{data.receipt.toolCalls.join(" · ") || "None recorded"}</dd><dt>Usage</dt><dd>{JSON.stringify(data.receipt.usage)}</dd></dl></details>
        <p className={styles.note}>Structural and feasibility checks validate the selected option and cited evidence, not the truth of every model sentence. Model prose is advisory. This review is not a transaction receipt.</p>
      </>}
    </div>
  </section>;
}
