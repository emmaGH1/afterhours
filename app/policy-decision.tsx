import { useId, useState } from "react";
import { formatAge, formatBps } from "@/lib/market";
import type { RiskDecision } from "@/lib/market";

const STATE_SUMMARY: Record<RiskDecision["state"], string> = {
  open: "Trade allowed up to the interface limit. Reference and pool conditions are within the prototype envelope.",
  guarded: "Reduced maximum input. The condition that reduced the limit is identified below.",
  paused: "The trade action is unavailable. This interface will not request a wallet signature for this state.",
};

const STATE_GLYPH: Record<RiskDecision["state"], string> = {
  open: "◆",
  guarded: "▲",
  paused: "■",
};

/**
 * Interface-check decision display. This is the browser-side soft policy only;
 * it never claims on-chain enforcement.
 */
export function PolicyDecision({ risk, simulated }: { risk: RiskDecision; simulated: boolean }) {
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  const state = risk.state;

  return (
    <section
      className={`policy-decision policy-${state}`}
      aria-label="Interface policy decision"
    >
      <div className="policy-headline">
        <span className="policy-glyph" aria-hidden="true">{STATE_GLYPH[state]}</span>
        <div className="policy-title">
          <span className="eyebrow">
            {simulated ? "SIMULATED REFERENCE · " : "LIVE REFERENCE · "}
            INTERFACE CHECK
          </span>
          <strong className="policy-state">{state.toUpperCase()}</strong>
        </div>
        <div className="policy-max">
          <span className="eyebrow">MAX PERMITTED INPUT</span>
          <strong>{risk.maxInputUsd.toLocaleString()} USDC-test</strong>
        </div>
      </div>

      <p className="policy-reason" role="status">
        <strong>{STATE_SUMMARY[state]}</strong>
        {" "}
        {state === "paused"
          ? risk.reasons.join(" ")
          : risk.reasons[0]}
      </p>

      <div className="policy-measures" aria-label="Measured policy values">
        <div><span>Reference age</span><strong>{formatAge(risk.ageSeconds)}</strong></div>
        <div><span>Token / reference</span><strong>{formatBps(risk.divergenceBps)}</strong></div>
        <div><span>Pool / token</span><strong>{formatBps(risk.poolDeviationBps)}</strong></div>
        <div><span>Confidence width</span><strong>{formatBps(risk.confidenceBps)}</strong></div>
      </div>

      <button
        type="button"
        className="policy-toggle"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((value) => !value)}
      >
        WHY THIS LIMIT? {expanded ? "−" : "+"}
      </button>
      {expanded ? (
        <div id={detailsId} className="policy-details">
          <p>
            This is an interface-level check performed in the browser before signing. It reads the
            labelled scenario and the verified devnet pool reserves. The SPL Token Swap pool does
            not know these inputs: the policy can only control the action exposed by this
            interface, and the pool can be called directly without it.
          </p>
          <ul>
            {risk.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
