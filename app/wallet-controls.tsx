"use client";

import { useState } from "react";
import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useWallets,
  useWalletStatus,
} from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import type { AppClient } from "./client";

function shortAddress(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function WalletControls() {
  const client = useClient<AppClient>();
  const wallets = useWallets(client);
  const status = useWalletStatus(client);
  const connected = useConnectedWallet(client);
  const connect = useConnect(client);
  const disconnect = useDisconnect(client);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(wallet: (typeof wallets)[number]) {
    setError(null);
    try {
      await connect.dispatchAsync(wallet);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wallet connection was cancelled.");
    }
  }

  async function handleDisconnect() {
    setError(null);
    try {
      await disconnect.dispatchAsync();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not disconnect the wallet.");
    }
  }

  return (
    <div className="wallet-control">
      {connected ? (
        <button className="wallet-button connected-wallet" type="button" onClick={handleDisconnect} aria-label="Disconnect wallet">
          {shortAddress(connected.account.address)} <span>DISCONNECT</span>
        </button>
      ) : (
        <button
          className="wallet-button"
          type="button"
          onClick={() => setOpen((value) => !value)}
          disabled={status === "connecting" || status === "pending"}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          {status === "connecting" ? "CONNECTING…" : "CONNECT WALLET"}
          <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M3 13 13 3M6 3h7v7" /></svg>
        </button>
      )}

      {open && !connected ? (
        <div className="wallet-menu" role="listbox" aria-label="Available Solana wallets">
          {wallets.length ? wallets.map((wallet) => (
            <button key={wallet.name} type="button" role="option" onClick={() => handleConnect(wallet)} disabled={connect.isRunning}>
              CONNECT {wallet.name.toUpperCase()}
            </button>
          )) : <p>No Wallet Standard wallet found. Install Solflare or Phantom.</p>}
          <button className="wallet-menu-close" type="button" onClick={() => setOpen(false)}>CLOSE</button>
        </div>
      ) : null}
      {error ? <p className="wallet-error" role="alert">{error}</p> : null}
    </div>
  );
}
