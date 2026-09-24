import { readFile, rename, writeFile } from "node:fs/promises";
import {
  Connection, Keypair, PublicKey, SystemProgram,
  Transaction, sendAndConfirmTransaction,
} from "@solana/web3.js";

const keyPath = new URL("../.hackathon/devnet-pool-payer.json", import.meta.url);
const tempPath = new URL("../.hackathon/devnet-pool-payer.rotate.tmp", import.meta.url);
const rpcUrl = process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com";
// Keep the old system account rent-exempt as well as able to pay the transfer fee.
const FEE_AND_RENT_BUFFER_LAMPORTS = 1_000_000;

async function main() {
  const stored = JSON.parse(await readFile(keyPath, "utf8"));
  if (!Array.isArray(stored.secretKey)) throw new Error("The existing disposable pool payer keypair is unavailable.");
  const oldPayer = Keypair.fromSecretKey(Uint8Array.from(stored.secretKey));
  const nextPayer = Keypair.generate();
  const connection = new Connection(rpcUrl, "confirmed");
  const oldBalance = await connection.getBalance(oldPayer.publicKey, "confirmed");
  if (oldBalance <= FEE_AND_RENT_BUFFER_LAMPORTS * 2) throw new Error("The existing payer has too little devnet SOL to rotate safely.");
  const transferLamports = oldBalance - FEE_AND_RENT_BUFFER_LAMPORTS;
  const signature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(SystemProgram.transfer({
      fromPubkey: oldPayer.publicKey,
      toPubkey: nextPayer.publicKey,
      lamports: transferLamports,
    })),
    [oldPayer],
    { commitment: "confirmed", preflightCommitment: "confirmed" },
  );
  // Replace only after the new payer holds the transferred devnet balance.
  await writeFile(tempPath, `${JSON.stringify({ secretKey: [...nextPayer.secretKey] })}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(tempPath, keyPath);
  const nextBalance = await connection.getBalance(nextPayer.publicKey, "confirmed");
  console.log(JSON.stringify({
    network: "devnet",
    oldPublicKey: oldPayer.publicKey.toBase58(),
    newPublicKey: nextPayer.publicKey.toBase58(),
    transferredLamports: transferLamports,
    newBalance: nextBalance,
    signature,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
