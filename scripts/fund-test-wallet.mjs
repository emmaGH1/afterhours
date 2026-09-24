import { readFile } from "node:fs/promises";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

const recipientArgument = process.argv[2];
const amountArgument = process.argv[3] || "100";
const rpcUrl = process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com";
const confirmation = { commitment: "confirmed", preflightCommitment: "confirmed" };

function parseUiAmount(value, decimals) {
  if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error("Amount must be a positive decimal number.");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) throw new Error(`Amount supports at most ${decimals} decimal places.`);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0"));
}

async function loadKeypair(name) {
  const stored = JSON.parse(await readFile(new URL(`../.hackathon/devnet-${name}.json`, import.meta.url), "utf8"));
  if (!Array.isArray(stored.secretKey)) throw new Error(`Stored ${name} keypair is missing secret key bytes.`);
  return Keypair.fromSecretKey(Uint8Array.from(stored.secretKey));
}

async function main() {
  if (!recipientArgument) throw new Error("Usage: npm run fund:test-wallet -- <DEVNET_WALLET_ADDRESS> [USDC_TEST_AMOUNT]");
  const manifest = JSON.parse(await readFile(new URL("../public/pool-manifest.json", import.meta.url), "utf8"));
  if (manifest.network !== "devnet") throw new Error("The pool manifest is not a Devnet manifest.");
  const recipient = new PublicKey(recipientArgument);
  const payer = await loadKeypair("pool-payer");
  const mintAuthority = await loadKeypair("mint-authority");
  const mint = new PublicKey(manifest.mints.usdcTest.address);
  const decimals = manifest.mints.usdcTest.decimals;
  const amount = parseUiAmount(amountArgument, decimals);
  if (amount <= 0n) throw new Error("Amount must be greater than zero.");
  const connection = new Connection(rpcUrl, "confirmed");
  const recipientAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mint, recipient, false, confirmation);
  const signature = await mintTo(connection, payer, mint, recipientAccount.address, mintAuthority, amount, [], confirmation);
  console.log(JSON.stringify({ network: "devnet", recipient: recipient.toBase58(), recipientTokenAccount: recipientAccount.address.toBase58(), mint: mint.toBase58(), amount: amount.toString(), signature, explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet` }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
