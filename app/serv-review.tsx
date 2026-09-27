"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./serv-review.module.css";

import type { ReviewResponse, ReviewScenario } from "@/lib/review";

export function ServReview({ scenario, amount, onAmountChange }: {
  scenario: ReviewScenario | null; amount: string; onAmountChange: (value: string) => void;
}) {
  const requestKey = `${scenario}:${amount}`;
  const controller = useRef<AbortController | null>(null);
  const [state, setState] = useState<{ key: string; loading?: boolean; data?: ReviewResponse; error?: string } | null>(null);
  const current = state?.key === requestKey ? state : null;
  const validAmount = Number.isFinite(Number(amount)) && Number(amount) > 0;

  useEffect(() => {
    setState(null);
    return () => controller.current?.abort();
  }, [requestKey]);

  async function review() {
    if (!scenario || !validAmount || current?.loading) return;
    const abortController = new AbortController();
    controller.current?.abort();
    controller.current = abortController;
    setState({ key: requestKey, loading: true });
    try {
      const response = await fetch("/api/review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, amount: Number(amount) }), signal: abortController.signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "SERV review is unavailable. Please try again.");
      if (!payload.review || !payload.evidence || !payload.receipt) throw new Error("The review response was incomplete. Please try again.");
      if (!abortController.signal.aborted) setState({ key: requestKey, data: payload as ReviewResponse });
    } catch (error) {
      if (!abortController.signal.aborted) setState({ key: requestKey, error: error instanceof Error ? error.message : "Could not reach SERV. Please try again." });
    }
  }

  const data = current?.data;
  return (
    <section className={styles.panel} aria-labelledby="serv-review-heading">
      <div className={styles.request}>
        <span className="eyebrow">01 / SERV REASONING · PRE-TRADE REVIEW</span>
        <h2 id="serv-review-heading">EVIDENCE FIRST.<br /><em>THEN YOUR DECISION.</em></h2>
        <p>Ask SERV to explain this trade against the selected simulated reference and the pool quote. No wallet required.</p>
        <label className={styles.amount}>
          <span className="eyebrow">REVIEW A SWAP OF</span>
          <div><input value={amount} onChange={(event) => onAmountChange(event.target.value)} inputMode="decimal" aria-label="Amount of USDC-test to review and pay" aria-describedby="serv-amount-help" /><strong>USDC-test</strong></div>
        </label>
        <p className={styles.note} id="serv-amount-help">USDC-test → AAPLX-test · Devnet test tokens, not backed securities.</p>
        <button className={styles.action} type="button" onClick={() => void review()} disabled={!scenario || !validAmount || current?.loading}>
          <span>{current?.loading ? "REVIEWING EVIDENCE…" : data ? "REVIEW AGAIN" : "REVIEW WITH SERV"}</span><span aria-hidden="true">↗</span>
        </button>
        <p className={styles.note}>Advisory explanation. Deterministic interface checks control the swap action; direct pool callers can bypass them.</p>
      </div>
      <div className={styles.result} aria-live="polite" aria-busy={Boolean(current?.loading)}>
        <span className="eyebrow">REVIEW RECORD / {data ? "RECEIVED" : current?.loading ? "IN PROGRESS" : current?.error ? "UNAVAILABLE" : "AWAITING REQUEST"}</span>
        {current?.loading ? <div className={styles.empty}><span className={styles.marker}>…</span><h3>Reading the evidence.</h3><p>SERV is reviewing your amount, simulated reference conditions, interface cap and reserve-based quote.</p></div> : null}
        {current?.error ? <div className={styles.empty} role="alert"><h3>Review unavailable.</h3><p>{current.error}</p><p>No trade was submitted. Use the button to retry.</p></div> : null}
        {!current?.loading && !current?.error && !data ? <div className={styles.empty}><span className={styles.marker}>→</span><h3>What changes after hours?</h3><p>Select a scenario, enter an amount and run a review. Compare 100 USDC-test under fresh and carried references to see the cap change.</p><div className={styles.steps}><span>01 / REQUEST</span><span>02 / EVIDENCE</span><span>03 / EXPLANATION</span></div></div> : null}
        {data ? <>
          <div className={styles.decision}><span>{data.evidence.policyState.toUpperCase()} / INTERFACE POLICY</span><strong>{data.evidence.allowed ? "WITHIN INTERFACE LIMIT" : "BLOCKED BY INTERFACE"}</strong></div>
          <h3 className={styles.summary}>{data.review.summary}</h3>
          <ul className={styles.checks}>{data.review.checks.map((check, index) => <li key={`${index}:${check}`}><span aria-hidden="true">↳</span>{check}</li>)}</ul>
          <dl className={styles.evidence}>
            <div><dt>Amount / cap</dt><dd>{data.evidence.amount} / {data.evidence.maxInputUsdc} USDC-test</dd></div>
            <div><dt>Reference</dt><dd>SIMULATED / {data.evidence.scenario}</dd></div>
            <div><dt>Pool evidence</dt><dd>{data.evidence.poolSource === "onchain-reserve-accounts" ? "ON-CHAIN DEVNET RESERVES" : "SAMPLE RESERVES / PREVIEW"}</dd></div>
            <div><dt>Quote / fixed fee</dt><dd>{data.evidence.quoteOutput === null ? "UNAVAILABLE" : `${data.evidence.quoteOutput.toFixed(4)} AAPLX-test`} / {data.evidence.poolFeeBps} BPS</dd></div>
          </dl>
          <div className={styles.next}><span className="eyebrow">NEXT ACTION / ADVISORY</span><p>{data.review.nextAction}</p></div>
          <details className={styles.receipt}><summary>SERV API receipt · {data.receipt.model}</summary><dl><dt>Request</dt><dd>{data.receipt.id}</dd><dt>Created</dt><dd>{data.receipt.createdAt}</dd><dt>Usage</dt><dd>{JSON.stringify(data.receipt.usage)}</dd><dt>Policy reasons</dt><dd>{data.evidence.reasons.join(" ")}</dd><dt>Pool</dt><dd>{data.evidence.poolAddress ?? "Sample reserves only"}</dd></dl></details>
          <p className={styles.note}>This receipt records an AI review. It is not a transaction receipt or proof of a wallet swap. No live Pyth reference or on-chain AfterHours guard is active.</p>
        </> : null}
      </div>
    </section>
  );
}
