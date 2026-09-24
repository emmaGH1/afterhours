import { readFile } from "node:fs/promises";
import {
  Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram,
  Transaction, sendAndConfirmTransaction,
} from "@solana/web3.js";

const recipientArgument = process.argv[2];
const amountArgument = process.argv[3] || "0.05";
const rpcUrl = process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com";

function parseLamports(value) {
  if (!/^\d+(?:\.\d{1,9})?$/.test(value)) throw new Error("SOL amount must have at most nine decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const lamports = BigInt(whole) * BigInt(LAMPORTS_PER_SOL)
    + BigInt(fraction.padEnd(9, "0") || "0");
  if (lamports <= 0n || lamports > BigInt(LAMPORTS_PER_SOL)) throw new Error("Use a positive devnet amount of at most 1 SOL.");
  return Number(lamports);
}

async function main() {
  if (!recipientArgument) throw new Error("Usage: node scripts/fund-demo-sol.mjs <DEVNET_WALLET_ADDRESS> [SOL_AMOUNT]");
  const stored = JSON.parse(await readFile(new URL("../.hackathon/devnet-pool-payer.json", import.meta.url), "utf8"));
  if (!Array.isArray(stored.secretKey)) throw new Error("The disposable devnet pool payer keypair is unavailable.");
  const payer = Keypair.fromSecretKey(Uint8Array.from(stored.secretKey));
  const recipient = new PublicKey(recipientArgument);
  const lamports = parseLamports(amountArgument);
  const connection = new Connection(rpcUrl, "confirmed");
  const payerBalance = await connection.getBalance(payer.publicKey, "confirmed");
  if (payerBalance < lamports + 10_000) throw new Error("The disposable pool payer has insufficient devnet SOL for this transfer and its fee.");
  const signature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: recipient, lamports })),
    [payer],
    { commitment: "confirmed", preflightCommitment: "confirmed" },
  );
  const recipientBalance = await connection.getBalance(recipient, "confirmed");
  console.log(JSON.stringify({
    network: "devnet", recipient: recipient.toBase58(), lamports, recipientBalance,
    signature, explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
