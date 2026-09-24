"use client";

import { address } from "@solana/kit";
import { useClient } from "@solana/react";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { Connection, PublicKey } from "@solana/web3.js";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useMemo, useState } from "react";
import { assessDirectSwap } from "@/lib/direct-swap";
import type { MarketSnapshot } from "@/lib/market";
import type { VerifiedPool } from "@/lib/pool";
import {
  buildDirectSwapInstruction,
  minimumOutput,
  parseTokenAmount,
} from "@/lib/swap-instruction";
import type { AppClient } from "./client";

const BALANCE_RETRIES = 4;
const BALANCE_RETRY_MS = 750;

function describeError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "The devnet swap could not be completed.";
  if (/reject|declin|cancel/i.test(message)) return "Wallet signature was rejected or cancelled.";
  if (/insufficient|funds|balance/i.test(message)) return "Insufficient devnet SOL or USDC-test balance.";
  return message;
}

async function readRawTokenBalance(connection: Connection, account: string) {
  try {
    return BigInt((await connection.getTokenAccountBalance(new PublicKey(account), "confirmed")).value.amount);
  } catch {
    return 0n;
  }
}

async function waitForBalanceDelta(
  connection: Connection,
  account: string,
  before: bigint,
  minimum: bigint,
) {
  for (let attempt = 0; attempt < BALANCE_RETRIES; attempt += 1) {
    const after = await readRawTokenBalance(connection, account);
    if (after - before >= minimum) return after;
    await new Promise<void>((resolve) => window.setTimeout(resolve, BALANCE_RETRY_MS));
  }
  throw new Error("The transaction confirmed, but the expected AAPLX-test balance change was not observed.");
}

export interface DirectSwapActionProps {
  /** API payload returned only after a verified devnet pool proof exists. */
  pool: VerifiedPool | null;
  /** Must carry the same reserves and fixed fee as `pool`; live or labelled simulated. */
  snapshot: MarketSnapshot;
  amount: string;
}

/**
 * The fallback trade button. It deliberately calls the SPL Token Swap pool
 * directly, so its risk policy is UI-enforced and its copy must never claim
 * on-chain guard protection.
 */
export function DirectSwapAction({ pool, snapshot, amount }: DirectSwapActionProps) {
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const connection = useMemo(() => new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
    "confirmed",
  ), []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ signature: string; outputRaw: bigint } | null>(null);

  const amountNumber = Number(amount);
  const assessment = assessDirectSwap(pool, snapshot, amountNumber);
  const minOut = assessment.quoteAaplx && pool
    ? (() => {
      try {
        return minimumOutput(assessment.quoteAaplx, pool.mints.aaplxTest.decimals);
      } catch {
        return null;
      }
    })()
    : null;
  const canSwap = Boolean(connected && assessment.allowed && minOut && !pending);

  async function submitDirectSwap() {
    if (!connected || !pool || !assessment.allowed || !minOut || pending) return;
    setPending(true);
    setError(null);
    setReceipt(null);
    try {
      // Recalculate at signing time: a live Pyth message can become stale between render and click.
      const currentAssessment = assessDirectSwap(pool, snapshot, Number(amount), Date.now());
      if (!currentAssessment.allowed || !currentAssessment.quoteAaplx) throw new Error(currentAssessment.reason);
      const currentMinOut = minimumOutput(currentAssessment.quoteAaplx, pool.mints.aaplxTest.decimals);
      const signer = connected.signer;
      if (!signer) throw new Error("The wallet is connected without a transaction signer.");
      const wallet = address(connected.account.address);
      const [userUsdc] = await findAssociatedTokenPda({ owner: wallet, mint: address(pool.mints.usdcTest.address), tokenProgram: TOKEN_PROGRAM_ADDRESS });
      const [userAaplx] = await findAssociatedTokenPda({ owner: wallet, mint: address(pool.mints.aaplxTest.address), tokenProgram: TOKEN_PROGRAM_ADDRESS });
      const amountIn = parseTokenAmount(amount, pool.mints.usdcTest.decimals);
      const beforeUsdc = await readRawTokenBalance(connection, userUsdc);
      if (beforeUsdc < amountIn) throw new Error("Insufficient USDC-test in the connected wallet's associated token account.");
      const beforeAaplx = await readRawTokenBalance(connection, userAaplx);

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

      const result = await client.sendTransaction([createDestinationAta, swap]);
      const signature = result.context.signature.toString();
      await connection.confirmTransaction(signature, "confirmed");
      const afterAaplx = await waitForBalanceDelta(connection, userAaplx, beforeAaplx, currentMinOut);
      setReceipt({ signature, outputRaw: afterAaplx - beforeAaplx });
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="direct-swap-action" aria-live="polite">
      {assessment.disclosure ? <p className="transaction-receipt direct-swap-disclosure" role="note"><strong>{assessment.disclosure}</strong></p> : null}
      <button className="primary-action" type="button" onClick={submitDirectSwap} disabled={!canSwap}>
        {pending ? "CONFIRMING DEVNET SWAP…" : connected ? "SWAP USDC-TEST FOR AAPLX-TEST" : "CONNECT WALLET TO SWAP"}
        <span aria-hidden="true">↗</span>
      </button>
      <p className="action-note"><strong>WALLET REQUIREMENT:</strong> switch the connected Wallet Standard wallet to Solana Devnet. It needs USDC-test plus enough devnet SOL for the destination account and transaction fee.</p>
      <p className="action-note"><strong>INTERFACE-LEVEL CHECK:</strong> This direct pool call is not protected by an on-chain guard.</p>
      <p className="action-note">{assessment.reason}</p>
      {minOut ? <p className="action-note">Minimum output: {minOut.toString()} base units of AAPLX-test. This includes a 1% slippage margin below the reserve-derived quote; the pool&apos;s fixed {pool?.poolFeeBps} bps fee and current reserves set the floor.</p> : null}
      {receipt ? (
        <p className="transaction-receipt" role="status">
          AAPLX-TEST BALANCE INCREASE VERIFIED · {receipt.outputRaw.toString()} BASE UNITS · <a href={`https://explorer.solana.com/tx/${receipt.signature}?cluster=devnet`} target="_blank" rel="noreferrer">EXPLORER RECEIPT ↗</a>
        </p>
      ) : null}
      {error ? <p className="wallet-error" role="alert">Direct devnet swap unavailable: {error}</p> : null}
    </div>
  );
}
