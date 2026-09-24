import { readFile, writeFile } from "node:fs/promises";
import { Keypair } from "@solana/web3.js";

const envPath = new URL("../.env.local", import.meta.url);

function containsVariable(content, name) {
  return new RegExp(`^${name}=`, "m").test(content);
}

async function main() {
  let existing = "";
  try {
    existing = await readFile(envPath, "utf8");
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error;
  }
  if (containsVariable(existing, "DEMO_WALLET_SECRET_KEY_BASE64") || containsVariable(existing, "DEMO_WALLET_PUBLIC_KEY")) {
    throw new Error("Demo wallet entries already exist in .env.local; refusing to overwrite them.");
  }

  const wallet = Keypair.generate();
  const suffix = existing.length && !existing.endsWith("\n") ? "\n" : "";
  const entries = [
    "# Devnet-only demo wallet. Keep server-only; never expose through NEXT_PUBLIC_.",
    `DEMO_WALLET_SECRET_KEY_BASE64=${Buffer.from(wallet.secretKey).toString("base64")}`,
    `DEMO_WALLET_PUBLIC_KEY=${wallet.publicKey.toBase58()}`,
    "",
  ].join("\n");
  await writeFile(envPath, `${existing}${suffix}${entries}`, { encoding: "utf8", mode: 0o600 });
  // Never print secret material. The address is safe to use for devnet funding.
  console.log(JSON.stringify({ network: "devnet", publicKey: wallet.publicKey.toBase58() }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
