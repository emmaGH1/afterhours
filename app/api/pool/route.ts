import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";

export const dynamic = "force-dynamic";

interface PoolManifest {
  network: string;
  poolAddress: string;
  poolAuthority: string;
  programId: string;
  mints: {
    usdcTest: { address: string; decimals: number };
    aaplxTest: { address: string; decimals: number };
    pool: { address: string; decimals: number };
  };
  reserveAccounts: { usdcTest: string; aaplxTest: string };
  feeAccount: string;
  poolFee: { basisPoints: number };
  proof: { signature: string; explorerUrl: string };
}

export async function GET() {
  let manifest: PoolManifest;
  try {
    const file = await readFile(join(process.cwd(), "public", "pool-manifest.json"), "utf8");
    manifest = JSON.parse(file) as PoolManifest;
    if (manifest.network !== "devnet" || !manifest.proof?.signature) throw new Error("Pool proof is incomplete.");
  } catch {
    return NextResponse.json({ configured: false, error: "No verified devnet pool and swap proof yet." }, { status: 503 });
  }

  try {
    const connection = new Connection(process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com", "confirmed");
    const [usdcAccount, aaplxAccount] = await Promise.all([
      getAccount(connection, new PublicKey(manifest.reserveAccounts.usdcTest), "confirmed"),
      getAccount(connection, new PublicKey(manifest.reserveAccounts.aaplxTest), "confirmed"),
    ]);
    if (usdcAccount.mint.toBase58() !== manifest.mints.usdcTest.address
      || aaplxAccount.mint.toBase58() !== manifest.mints.aaplxTest.address) {
      throw new Error("The pool reserve accounts do not match the verified test mints.");
    }
    const usdc = Number(usdcAccount.amount) / 10 ** manifest.mints.usdcTest.decimals;
    const aaplx = Number(aaplxAccount.amount) / 10 ** manifest.mints.aaplxTest.decimals;
    if (!Number.isFinite(usdc) || !Number.isFinite(aaplx) || usdc <= 0 || aaplx <= 0) {
      throw new Error("Pool reserves are unavailable or invalid.");
    }
    return NextResponse.json({
      configured: true,
      network: "devnet",
      poolAddress: manifest.poolAddress,
      poolAuthority: manifest.poolAuthority,
      programId: manifest.programId,
      mints: manifest.mints,
      reserveAccounts: manifest.reserveAccounts,
      feeAccount: manifest.feeAccount,
      reserves: { usdc, aaplx },
      poolPrice: usdc / aaplx,
      poolFeeBps: manifest.poolFee.basisPoints,
      proof: manifest.proof,
      source: "onchain-reserve-accounts",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      error: error instanceof Error ? error.message : "Could not verify devnet pool reserves.",
    }, { status: 502 });
  }
}
