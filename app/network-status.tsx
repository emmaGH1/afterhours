"use client";

import { useEffect, useState } from "react";

type NetworkState = { healthy: boolean; slot?: string; error?: string };

export function NetworkStatus() {
  const [state, setState] = useState<NetworkState | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/solana/status", { cache: "no-store" });
        const result = await response.json();
        if (active) setState(result);
      } catch {
        if (active) setState({ healthy: false, error: "Network check failed." });
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 20_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  return <strong>{state?.healthy ? `DEVNET ONLINE · SLOT ${state.slot}` : state ? "DEVNET RPC UNAVAILABLE" : "CHECKING DEVNET RPC…"}</strong>;
}
