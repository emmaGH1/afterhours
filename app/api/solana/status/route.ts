import { devnet, createSolanaRpc } from "@solana/kit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
  try {
    const rpc = createSolanaRpc(devnet(rpcUrl));
    const [slot, health] = await Promise.all([
      rpc.getSlot({ commitment: "confirmed" }).send(),
      rpc.getHealth().send(),
    ]);
    return NextResponse.json({ network: "devnet", healthy: health === "ok", slot: slot.toString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Solana RPC failure.";
    return NextResponse.json({ network: "devnet", healthy: false, error: message }, { status: 502 });
  }
}
