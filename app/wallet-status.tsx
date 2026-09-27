"use client";

import { address } from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatTokenUnits } from "@/lib/wallet-receipt";
import type { VerifiedPool } from "@/lib/pool";
import type { AppClient } from "./client";

interface WalletBalances {
  sol: number;
  usdc: string | null;
  aaplx: string | null;
}

function shortAddress(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

async function readRawBalance(connection: Connection, account: string) {
  try {
    return BigInt((await connection.getTokenAccountBalance(new PublicKey(account), "confirmed")).value.amount);
  } catch {
    return null; // Missing ATA is normal for AAPLX before the first swap.
  }
}

/**
 * Honest wallet panel. The wallet adapter cannot reliably report the selected
 * cluster, so the panel says "expected cluster" instead of claiming the wallet
 * is confirmed on Devnet.
 */
export function WalletStatus({ pool }: { pool: VerifiedPool | null }) {
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const connection = useMemo(() => new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
    "confirmed",
  ), []);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [balanceState, setBalanceState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refreshBalances = useCallback(async () => {
    if (!connected) return;
    setBalanceState("loading");
    setErrorMessage(null);
    try {
      const wallet = address(connected.account.address);
      const walletKey = new PublicKey(connected.account.address);
      const solLamports = await connection.getBalance(walletKey, "confirmed");
      let usdc: bigint | null = null;
      let aaplx: bigint | null = null;
      if (pool) {
        const [usdcAta] = await findAssociatedTokenPda({ owner: wallet, mint: address(pool.mints.usdcTest.address), tokenProgram: TOKEN_PROGRAM_ADDRESS });
        const [aaplxAta] = await findAssociatedTokenPda({ owner: wallet, mint: address(pool.mints.aaplxTest.address), tokenProgram: TOKEN_PROGRAM_ADDRESS });
        [usdc, aaplx] = await Promise.all([
          readRawBalance(connection, usdcAta),
          readRawBalance(connection, aaplxAta),
        ]);
      }
      setBalances({
        sol: solLamports / 1_000_000_000,
        usdc: usdc === null ? null : formatTokenUnits(usdc.toString(), pool?.mints.usdcTest.decimals ?? 6),
        aaplx: aaplx === null ? null : formatTokenUnits(aaplx.toString(), pool?.mints.aaplxTest.decimals ?? 6),
      });
      setBalanceState("ready");
    } catch {
      setBalanceState("error");
      setErrorMessage("Could not read wallet balances from the devnet RPC. Use refresh to try again.");
    }
  }, [connected, connection, pool]);

  useEffect(() => {
    if (!connected) {
      setBalances(null);
      setBalanceState("idle");
      return;
    }
    void refreshBalances();
  }, [connected, refreshBalances]);

  if (!connected) {
    return (
      <section className="wallet-status" aria-label="Connected wallet">
        <span className="eyebrow">CONNECTED WALLET</span>
        <strong className="wallet-status-title">WALLET DISCONNECTED</strong>
        <p className="wallet-status-note">
          Optional balance inspection uses a Wallet Standard wallet such as Solflare, set to the Solana Devnet
          network. SERV reviews require no wallet. This desk uses devnet addresses only.
        </p>
      </section>
    );
  }

  const fullAddress = connected.account.address;

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="wallet-status" aria-label="Connected wallet">
      <div className="wallet-status-head">
        <span className="eyebrow">CONNECTED WALLET</span>
        {connected.wallet.name ? <span className="wallet-name">{connected.wallet.name.toUpperCase()}</span> : null}
      </div>
      <div className="wallet-status-address">
        <strong title={fullAddress}>{shortAddress(fullAddress)}</strong>
        <span className="visually-hidden">{fullAddress}</span>
        <button type="button" className="mini-action" onClick={copyAddress}>
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>
      <div className="wallet-status-network">
        <span>Expected cluster: <strong>Devnet</strong></span>
        <p className="wallet-status-note">
          The adapter cannot report the wallet&apos;s selected network here. Transactions use devnet
          addresses and will fail safely if the wallet is on an incompatible network.
        </p>
      </div>
      <dl className="wallet-status-balances">
        <div>
          <dt>Devnet SOL</dt>
          <dd>{balanceState === "loading" ? "…" : balances ? balances.sol.toFixed(4) : "—"}</dd>
        </div>
        <div>
          <dt>USDC-test</dt>
          <dd>
            {balanceState === "loading" ? "…"
              : balances ? (balances.usdc ?? "No account") : "—"}
          </dd>
        </div>
        <div>
          <dt>AAPLX-test</dt>
          <dd>
            {balanceState === "loading" ? "…"
              : balances ? (balances.aaplx ?? "No account") : "—"}
          </dd>
        </div>
      </dl>
      <button type="button" className="mini-action" onClick={() => void refreshBalances()} disabled={balanceState === "loading"}>
        {balanceState === "loading" ? "REFRESHING…" : "REFRESH BALANCES"}
      </button>
      {balanceState === "unavailable" ? (
        <p className="wallet-status-note" role="status">Balances unavailable from the RPC.</p>
      ) : null}
      {balanceState === "error" && errorMessage ? (
        <p className="wallet-error wallet-status-error" role="alert">{errorMessage}</p>
      ) : null}
    </section>
  );
}
