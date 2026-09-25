"use client";

import { address } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useClient } from "@solana/react";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assessDirectSwap } from "@/lib/direct-swap";
import { confirmSubmittedSignature, pollForBalanceIncrease, type ConfirmationTransport, type BalanceTransport } from "@/lib/confirmation";
import { formatTokenUnits, saveBrowserReceipt } from "@/lib/wallet-receipt";
import type { MarketSnapshot } from "@/lib/market";
import type { VerifiedPool } from "@/lib/pool";
import {
  buildDirectSwapInstruction,
  minimumOutput,
  parseTokenAmount,
} from "@/lib/swap-instruction";
import type { AppClient } from "./client";

type Lifecycle =
  | "ready"
  | "awaiting-signature"
  | "submitted"
  | "confirming"
  | "confirmed"
  | "verifying-balance"
  | "verified"
  | "balance-pending"
  | "confirmation-unknown"
  | "confirmed-failed"
  | "cancelled"
  | "failed";

const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  ready: "Ready",
  "awaiting-signature": "Awaiting wallet signature",
  submitted: "Submitted",
  confirming: "Confirming on Devnet",
  confirmed: "Transaction confirmed",
  "verifying-balance": "Verifying AAPLX-test balance",
  verified: "Balance increase verified",
  "balance-pending": "Balance verification pending",
  "confirmation-unknown": "Confirmation status unknown",
  "confirmed-failed": "Transaction failed on devnet",
  cancelled: "Cancelled in wallet",
  failed: "Failed",
};

const BUTTON_LABEL: Record<Lifecycle, string> = {
  ready: "SWAP USDC-TEST FOR AAPLX-TEST",
  "awaiting-signature": "APPROVE IN WALLET…",
  submitted: "SUBMITTED — CONFIRMING…",
  confirming: "CONFIRMING ON DEVNET…",
  confirmed: "CONFIRMED — VERIFYING BALANCE…",
  "verifying-balance": "VERIFYING BALANCE…",
  verified: "BALANCE INCREASE VERIFIED",
  "balance-pending": "CONFIRMED — BALANCE PENDING",
  "confirmation-unknown": "CHECK CONFIRMATION STATUS",
  "confirmed-failed": "RETRY SWAP",
  cancelled: "SWAP USDC-TEST FOR AAPLX-TEST",
  failed: "RETRY SWAP",
};

function explorerUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

function describeError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "";
  if (/reject|declin|cancel/i.test(message)) {
    return { message: "The wallet signature was rejected or the request was cancelled. No transaction was submitted.", kind: "cancelled" as const };
  }
  if (/Insufficient USDC-test/.test(message)) {
    return { message: "Not enough USDC-test in the connected wallet for this amount. Reduce the amount or add test USDC.", kind: "failed" as const };
  }
  if (/insufficient.*lamport|insufficient.*sol|0x1/i.test(message)) {
    return { message: "Not enough devnet SOL to pay the transaction fee and account costs. Fund the wallet with devnet SOL and retry.", kind: "failed" as const };
  }
  if (/blockhash|block height|expired/i.test(message)) {
    return { message: "The transaction blockhash expired before it could be submitted. Retry the swap.", kind: "failed" as const };
  }
  if (/fetch|network|rpc|connection/i.test(message)) {
    return { message: "The devnet RPC is temporarily unavailable. Retry in a moment.", kind: "failed" as const };
  }
  return { message: "The swap could not be completed on devnet. Retry, or check the technical details.", kind: "failed" as const, technical: message };
}

async function readRawTokenBalance(connection: Connection, account: string): Promise<bigint | null> {
  try {
    return BigInt((await connection.getTokenAccountBalance(new PublicKey(account), "confirmed")).value.amount);
  } catch {
    return null;
  }
}

function web3Transport(connection: Connection): ConfirmationTransport {
  return {
    async confirmTransaction(signature, commitment) {
      return connection.confirmTransaction(signature, commitment as "confirmed");
    },
    async getSignatureStatus(signature) {
      const statuses = await connection.getSignatureStatuses([signature]);
      // null = RPC has not seen the signature at all (distinct from an error).
      return statuses.value[0] ?? null;
    },
  };
}

function balanceTransport(connection: Connection): BalanceTransport {
  return {
    readTokenBalance: (account: string) => readRawTokenBalance(connection, account),
  };
}

interface BalanceEvidence {
  usdcBefore: string;
  usdcAfter: string;
  aaplxBefore: string;
  aaplxAfter: string;
  aaplxIncrease: string;
}

export interface DirectSwapActionProps {
  pool: VerifiedPool | null;
  snapshot: MarketSnapshot;
  amount: string;
  quoteMode: "loading" | "verified" | "preview" | "unavailable";
}

export function DirectSwapAction({ pool, snapshot, amount, quoteMode }: DirectSwapActionProps) {
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const connection = useMemo(() => new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
    "confirmed",
  ), []);

  const [lifecycle, setLifecycle] = useState<Lifecycle>("ready");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; technical?: string } | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<BalanceEvidence | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const submittingRef = useRef(false);

  // Freeze the inputs actually used for the pending transaction so the user can
  // still see what was signed while confirmation is in flight.
  const [pending, setPending] = useState<{ amount: string; quote: number; minOutText: string; scenarioId: string } | null>(null);

  const amountNumber = Number(amount);
  const assessment = useMemo(
    () => assessDirectSwap(pool, snapshot, amountNumber),
    [pool, snapshot, amountNumber],
  );
  const minOut = assessment.quoteAaplx && pool
    ? (() => {
      try {
        return minimumOutput(assessment.quoteAaplx, pool.mints.aaplxTest.decimals);
      } catch {
        return null;
      }
    })()
    : null;

  const terminal: Lifecycle[] = ["ready", "cancelled", "failed", "verified", "balance-pending", "confirmation-unknown", "confirmed-failed"];
  const busy = !terminal.includes(lifecycle);
  const policyBlocked = !assessment.allowed;
  const quoteBlocked = quoteMode === "loading" || quoteMode === "preview" || quoteMode === "unavailable";
  const disabled = !connected || policyBlocked || quoteBlocked || busy || submittingRef.current || !minOut;

  const stepIndex = (lifecycle === "balance-pending" || lifecycle === "confirmation-unknown" ? "confirmed" : lifecycle) as Lifecycle;
  const steps = ["READY", "SIGNATURE", "SUBMITTED", "CONFIRMING", "CONFIRMED", "BALANCE", "VERIFIED"] as const;
  const activeStepIndex = ("ready awaiting-signature submitted confirming confirmed verifying-balance verified" as const)
    .split(" ").indexOf(stepIndex);

  const pollBalanceDelta = useCallback(
    (account: string, before: bigint, minimum: bigint) =>
      pollForBalanceIncrease(balanceTransport(connection), account, before, minimum),
    [connection],
  );

  async function submitDirectSwap() {
    if (submittingRef.current) return;
    if (!connected || !pool || !minOut) return;
    // Recalculate policy and minimum output immediately before signing.
    const current = assessDirectSwap(pool, snapshot, Number(amount), Date.now());
    if (!current.allowed || !current.quoteAaplx) {
      setError({ message: "The policy state changed before signing. Review the decision and retry." });
      setLifecycle("failed");
      return;
    }
    const currentMinOut = (() => {
      try {
        return minimumOutput(current.quoteAaplx, pool.mints.aaplxTest.decimals);
      } catch {
        return null;
      }
    })();
    if (!currentMinOut) {
      setError({ message: "A valid minimum output could not be constructed. Retry." });
      setLifecycle("failed");
      return;
    }

    submittingRef.current = true;
    let submittedSignature: string | null = null;
    setError(null);
    setStatusMessage(null);
    setEvidence(null);
    setSignature(null);
    setLifecycle("awaiting-signature");

    try {
      const signer = connected.signer;
      if (!signer) throw new Error("The connected wallet does not expose a transaction signer.");
      const wallet = address(connected.account.address);
      const [userUsdc] = await findAssociatedTokenPda({ owner: wallet, mint: address(pool.mints.usdcTest.address), tokenProgram: TOKEN_PROGRAM_ADDRESS });
      const [userAaplx] = await findAssociatedTokenPda({ owner: wallet, mint: address(pool.mints.aaplxTest.address), tokenProgram: TOKEN_PROGRAM_ADDRESS });
      const amountIn = parseTokenAmount(amount, pool.mints.usdcTest.decimals);

      const beforeUsdc = await readRawTokenBalance(connection, userUsdc);
      if (beforeUsdc === null || beforeUsdc < amountIn) {
        throw new Error("Insufficient USDC-test in the connected wallet's associated token account.");
      }
      const beforeAaplx = await readRawTokenBalance(connection, userAaplx) ?? 0n;

      const createDestinationAta = await getCreateAssociatedTokenIdempotentInstructionAsync({
        payer: signer,
        ata: userAaplx,
        owner: wallet,
        mint: address(pool.mints.aaplxTest.address),
      });
      const swap = buildDirectSwapInstruction({
        swapProgram: pool.programId,
        pool: pool.poolAddress,
        poolAuthority: pool.poolAuthority,
        wallet,
        userUsdc,
        reserveUsdc: pool.reserveAccounts.usdcTest,
        reserveAaplx: pool.reserveAccounts.aaplxTest,
        userAaplx,
        poolMint: pool.mints.pool.address,
        feeAccount: pool.feeAccount,
      }, amountIn, currentMinOut);

      setPending({
        amount,
        quote: current.quoteAaplx,
        minOutText: formatTokenUnits(currentMinOut.toString(), pool.mints.aaplxTest.decimals),
        scenarioId: snapshot.id,
      });

      const result = await client.sendTransaction([createDestinationAta, swap]);
      const signatureStr = result.context.signature.toString();
      // Preserve the signature as soon as submission succeeds.
      submittedSignature = signatureStr;
      setSignature(signatureStr);
      setLifecycle("submitted");
      setStatusMessage("Transaction submitted. The signature is preserved even if later checks fail.");
      setLifecycle("confirming");

      // The wallet adapter does not expose the blockhash it used, so pair the
      // submitted signature with signature-status confirmation only. Never
      // combine it with a blockhash fetched after submission.
      const outcome = await confirmSubmittedSignature(web3Transport(connection), signatureStr);

      if (outcome.kind === "confirmed-failure") {
        setLifecycle("confirmed-failed");
        setError({
          message: "The transaction was submitted and executed, but the swap failed on devnet. No receipt was recorded. Retry after checking the Explorer receipt.",
          technical: outcome.error,
        });
        return;
      }
      if (outcome.kind === "unknown") {
        setLifecycle("confirmation-unknown");
        setStatusMessage(
          outcome.reason === "timeout"
            ? "Confirmation was not observed within the window. The transaction may still land — check the Explorer receipt before retrying, because resubmitting could double-spend."
            : "The devnet RPC could not confirm the status. Check the Explorer receipt before retrying.",
        );
        return;
      }

      setLifecycle("confirmed");
      setStatusMessage("Transaction confirmed. Checking the AAPLX-test balance increase.");

      setLifecycle("verifying-balance");
      const { observed, after } = await pollBalanceDelta(userAaplx, beforeAaplx, currentMinOut);
      const afterUsdc = await readRawTokenBalance(connection, userUsdc);

      const balanceEvidence: BalanceEvidence = {
        usdcBefore: beforeUsdc.toString(),
        usdcAfter: (afterUsdc ?? 0n).toString(),
        aaplxBefore: beforeAaplx.toString(),
        aaplxAfter: after.toString(),
        aaplxIncrease: (after - beforeAaplx).toString(),
      };
      setEvidence(balanceEvidence);

      if (observed) {
        // A verified receipt requires BOTH a confirmed-successful transaction
        // AND a measured AAPLX-test balance increase. Nothing else persists.
        saveBrowserReceipt({
          version: 1,
          walletAddress: connected.account.address,
          signature: signatureStr,
          explorerUrl: explorerUrl(signatureStr),
          confirmed: true,
          inputAmount: amountIn.toString(),
          outputAmount: balanceEvidence.aaplxIncrease,
          usdcBefore: balanceEvidence.usdcBefore,
          usdcAfter: balanceEvidence.usdcAfter,
          aaplxBefore: balanceEvidence.aaplxBefore,
          aaplxAfter: balanceEvidence.aaplxAfter,
          aaplxIncrease: balanceEvidence.aaplxIncrease,
          confirmedAtMs: Date.now(),
          recordedAtMs: Date.now(),
        });
        setLifecycle("verified");
        setStatusMessage("AAPLX-test balance increase verified after the confirmed transaction.");
      } else {
        setLifecycle("balance-pending");
        setStatusMessage("Transaction confirmed, but the AAPLX-test balance increase was not observed within the window. The Explorer receipt remains valid; no verified receipt was recorded.");
      }
    } catch (cause) {
      if (submittedSignature) {
        // Submission succeeded; do not reduce an in-flight transaction to "failed".
        setLifecycle("confirmation-unknown");
        setStatusMessage("The transaction was submitted and its signature is preserved below. Confirmation could not finish — check the Explorer receipt before retrying.");
      } else {
        const described = describeError(cause);
        if (described.kind === "cancelled") {
          setLifecycle("cancelled");
          setStatusMessage("The wallet signature was rejected or cancelled. No transaction was submitted.");
        } else {
          setLifecycle("failed");
          setError({ message: described.message, technical: described.technical ?? (cause instanceof Error ? cause.message : undefined) });
        }
      }
    } finally {
      submittingRef.current = false;
    }
  }

  const shownAmount = pending ? pending.amount : amount;
  const shownQuote = pending && busy ? pending.quote : assessment.quoteAaplx;
  const shownMinOut = pending && busy ? pending.minOutText : minOut !== null ? formatTokenUnits(minOut.toString(), pool?.mints.aaplxTest.decimals ?? 6) : null;

  return (
    <div className="direct-swap-action" aria-live="polite">
      <ol className="tx-steps" aria-label="Transaction progress">
        {steps.map((label, index) => (
          <li
            key={label}
            data-done={activeStepIndex > index}
            data-active={activeStepIndex === index}
          >
            {label}
          </li>
        ))}
      </ol>

      {assessment.disclosure ? <p className="transaction-receipt direct-swap-disclosure" role="note"><strong>{assessment.disclosure}</strong></p> : null}

      <button
        className="primary-action"
        type="button"
        onClick={submitDirectSwap}
        disabled={disabled}
        aria-disabled={disabled}
      >
        {busy || lifecycle !== "ready" ? BUTTON_LABEL[lifecycle] : connected ? BUTTON_LABEL.ready : "CONNECT WALLET TO SWAP"}
        <span aria-hidden="true">↗</span>
      </button>

      <p className="action-note tx-status" role="status">
        {LIFECYCLE_LABEL[lifecycle]}
        {statusMessage ? ` — ${statusMessage}` : ""}
      </p>

      {busy && pending ? (
        <p className="action-note">
          Signing <strong>{shownAmount} USDC-test</strong> for an estimated {shownQuote?.toFixed(4)} AAPLX-test
          (minimum {shownMinOut}) from scenario <strong>{pending.scenarioId}</strong>.
        </p>
      ) : null}

      {!connected ? (
        <p className="action-note">
          <strong>WALLET REQUIREMENT:</strong> connect a Wallet Standard wallet such as Solflare set
          to Solana Devnet. It needs USDC-test plus enough devnet SOL for fees and the destination
          token account.
        </p>
      ) : null}
      <p className="action-note">
        <strong>INTERFACE-LEVEL CHECK:</strong> this direct pool call is not protected by an on-chain
        guard; the pool can be called outside this interface.
      </p>
      {assessment.reason && pool ? <p className="action-note">{assessment.reason}</p> : null}
      {shownMinOut ? (
        <p className="action-note">
          Minimum output: <strong>{shownMinOut} AAPLX-test</strong> — a 1% slippage margin below the
          reserve-derived quote, with the pool&apos;s fixed {pool?.poolFeeBps} bps fee applied.
        </p>
      ) : null}

      {signature ? (
        <p className="transaction-receipt" role="status">
          SIGNATURE PRESERVED · <a href={explorerUrl(signature)} target="_blank" rel="noreferrer">EXPLORER RECEIPT ↗</a>
          <span className="tx-signature">{signature}</span>
        </p>
      ) : null}

      {evidence ? (
        <dl className="balance-evidence">
          <div><dt>USDC-test before / after</dt><dd>{formatTokenUnits(evidence.usdcBefore, 6)} → {formatTokenUnits(evidence.usdcAfter, 6)}</dd></div>
          <div><dt>AAPLX-test before / after</dt><dd>{formatTokenUnits(evidence.aaplxBefore, 6)} → {formatTokenUnits(evidence.aaplxAfter, 6)}</dd></div>
          <div><dt>AAPLX-test increase</dt><dd>+{formatTokenUnits(evidence.aaplxIncrease, 6)}</dd></div>
        </dl>
      ) : null}

      {error ? (
        <>
          <p className="wallet-error" role="alert">{error.message}</p>
          {error.technical ? (
            <button type="button" className="mini-action" aria-expanded={showTechnical} onClick={() => setShowTechnical((value) => !value)}>
              TECHNICAL DETAILS
            </button>
          ) : null}
          {showTechnical && error.technical ? (
            <p className="action-note tx-technical">{error.technical}</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
