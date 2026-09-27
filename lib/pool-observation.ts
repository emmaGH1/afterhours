import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Connection, PublicKey } from "@solana/web3.js";
import { unpackAccount } from "@solana/spl-token";
import type { VerifiedPool } from "./pool";

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

export class PoolObservationError extends Error {
  constructor(message: string, readonly status: 502 | 503) {
    super(message);
    this.name = "PoolObservationError";
  }
}

async function readManifest(): Promise<PoolManifest> {
  try {
    const text = await readFile(join(process.cwd(), "public", "pool-manifest.json"), "utf8");
    const manifest = JSON.parse(text) as PoolManifest;
    if (manifest.network !== "devnet" || !manifest.proof?.signature) throw new Error();
    return manifest;
  } catch {
    throw new PoolObservationError("No verified devnet pool and swap proof yet.", 503);
  }
}

export async function readVerifiedPoolObservation(signal: AbortSignal): Promise<VerifiedPool> {
  const manifest = await readManifest();
  try {
    const connection = new Connection(process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com", {
      commitment: "confirmed",
      disableRetryOnRateLimit: true,
      fetch: (input, init) => fetch(input, { ...init, signal }),
    });
    const usdcAddress = new PublicKey(manifest.reserveAccounts.usdcTest);
    const aaplxAddress = new PublicKey(manifest.reserveAccounts.aaplxTest);
    const response = await connection.getMultipleAccountsInfoAndContext([usdcAddress, aaplxAddress], "confirmed");
    const [usdcInfo, aaplxInfo] = response.value;
    const usdcAccount = unpackAccount(usdcAddress, usdcInfo);
    const aaplxAccount = unpackAccount(aaplxAddress, aaplxInfo);
    if (usdcAccount.mint.toBase58() !== manifest.mints.usdcTest.address
      || aaplxAccount.mint.toBase58() !== manifest.mints.aaplxTest.address) {
      throw new Error("The pool reserve accounts do not match the verified test mints.");
    }
    const usdc = Number(usdcAccount.amount) / 10 ** manifest.mints.usdcTest.decimals;
    const aaplx = Number(aaplxAccount.amount) / 10 ** manifest.mints.aaplxTest.decimals;
    if (!Number.isFinite(usdc) || !Number.isFinite(aaplx) || usdc <= 0 || aaplx <= 0) {
      throw new Error("Pool reserves are unavailable or invalid.");
    }
    if (signal.aborted) throw signal.reason ?? new DOMException("Request aborted", "AbortError");
    return {
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
      observationId: randomUUID(),
      observedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (signal.aborted) throw error;
    throw new PoolObservationError(
      error instanceof Error ? error.message : "Could not verify devnet pool reserves.",
      502,
    );
  }
}
