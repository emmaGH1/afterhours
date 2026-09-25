"use client";

import { useEffect, useState } from "react";
import { clearBrowserReceipt, formatTokenUnits, loadBrowserReceipt, onBrowserReceiptChange, type BrowserReceipt } from "@/lib/wallet-receipt";

function shortAddress(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function formatTimestamp(ms: number) {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

/**
 * Two clearly separated proof paths. The script receipt is produced by the
 * setup script and must never be presented as evidence of a browser-wallet
 * swap. The browser receipt is only shown after a real wallet transaction.
 */
export function ProofCards({ scriptReceipt }: { scriptReceipt: { explorerUrl: string; signature: string } }) {
  const [receipt, setReceipt] = useState<BrowserReceipt | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setReceipt(loadBrowserReceipt());
    setHydrated(true);
    // Update immediately when a verified receipt is saved (or cleared), same tab or another.
    return onBrowserReceiptChange(setReceipt);
  }, []);

  function handleClear() {
    clearBrowserReceipt();
    setReceipt(null);
  }

  return (
    <section className="proof-cards" aria-label="Swap evidence">
      <article className="proof-card proof-script">
        <span className="eyebrow">01 / SCRIPT PATH</span>
        <h3>VERIFIED SCRIPT POOL SWAP</h3>
        <p className="proof-tag">Direct SPL Token Swap v3 settlement</p>
        <p className="proof-note">This receipt was produced by the setup script, not by a browser wallet.</p>
        <a className="proof-link" href={scriptReceipt.explorerUrl} target="_blank" rel="noreferrer">
          {scriptReceipt.signature.slice(0, 8)}…{scriptReceipt.signature.slice(-6)} · EXPLORER ↗
        </a>
      </article>

      <article className={`proof-card ${receipt ? "proof-browser-verified" : "proof-browser-pending"}`}>
        <span className="eyebrow">02 / BROWSER-WALLET PATH</span>
        {receipt ? (
          <>
            <h3>SOLFLARE WORKSPACE SWAP VERIFIED</h3>
            <dl className="proof-facts">
              <div><dt>Signature</dt><dd className="proof-signature">{receipt.signature}</dd></div>
              <div><dt>Wallet</dt><dd>{shortAddress(receipt.walletAddress)}<span className="visually-hidden">{receipt.walletAddress}</span></dd></div>
              <div><dt>Input</dt><dd>{formatTokenUnits(receipt.inputAmount, 6)} USDC-test</dd></div>
              <div><dt>AAPLX-test increase</dt><dd>+{formatTokenUnits(receipt.aaplxIncrease, 6)}</dd></div>
              <div><dt>Recorded</dt><dd>{formatTimestamp(receipt.recordedAtMs)}</dd></div>
            </dl>
            <a className="proof-link" href={receipt.explorerUrl} target="_blank" rel="noreferrer">EXPLORER RECEIPT ↗</a>
            <button type="button" className="mini-action proof-clear" onClick={handleClear}>
              CLEAR LOCAL RECEIPT
            </button>
          </>
        ) : (
          <>
            <h3>BROWSER-WALLET SWAP PENDING</h3>
            <p className="proof-note">
              {hydrated
                ? "No Solflare-signed workspace receipt recorded yet. This card fills only after a browser-wallet transaction confirms with a measured AAPLX-test balance increase."
                : "Checking for a locally saved receipt…"}
            </p>
            <p className="proof-note">The script receipt above does not prove a browser-wallet swap.</p>
          </>
        )}
      </article>
    </section>
  );
}
