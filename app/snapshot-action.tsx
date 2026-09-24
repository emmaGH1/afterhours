"use client";

import { address, type Instruction } from "@solana/kit";
import { useClient } from "@solana/react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useState } from "react";
import type { MarketSnapshot, RiskDecision } from "@/lib/market";
import type { AppClient } from "./client";

const MEMO_PROGRAM = address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export function SnapshotAction({ snapshot, risk }: { snapshot: MarketSnapshot; risk: RiskDecision }) {
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  async function recordSnapshot() {
    if (!connected || pending) return;
    setPending(true);
    setError(null);
    setSignature(null);

    const memo = JSON.stringify({
      app: "AfterHours",
      version: 1,
      market: "AAPLX/USDC",
      source: snapshot.source,
      snapshot: snapshot.id,
      session: snapshot.session,
      referenceAgeSeconds: risk.ageSeconds,
      divergenceBps: risk.divergenceBps,
      confidenceBps: risk.confidenceBps,
      decision: risk.state,
      poolFeeBps: snapshot.poolFeeBps ?? null,
      maxInputUsd: risk.maxInputUsd,
      trust: "ui-computed; no swap or oracle verification",
    });
    const instruction: Instruction = {
      programAddress: MEMO_PROGRAM,
      accounts: [],
      data: new TextEncoder().encode(memo),
    };

    try {
      const result = await client.sendTransaction([instruction]);
      setSignature(result.context.signature.toString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The devnet memo transaction failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="snapshot-action">
      <button className="primary-action snapshot-button" type="button" onClick={recordSnapshot} disabled={!connected || pending}>
        {pending ? "WAITING FOR DEVNET…" : signature ? "MEMO SUBMITTED" : connected ? "RECORD POLICY SNAPSHOT" : "CONNECT WALLET TO RECORD"}
        <span aria-hidden="true">↗</span>
      </button>
      <p className="action-note">Devnet memo only: the wallet pays a testnet fee. If confirmed, it exposes this policy snapshot publicly; it does not move tokens or enforce a swap.</p>
      {signature ? <p className="transaction-receipt" role="status">DEVNET SIGNATURE · <a href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`} target="_blank" rel="noreferrer">{signature.slice(0, 12)}…{signature.slice(-8)} ↗</a> · CHECK CONFIRMATION IN EXPLORER</p> : null}
      {error ? <p className="wallet-error" role="alert">Could not record snapshot: {error}</p> : null}
    </div>
  );
}
