// Exports the demo wallet's secret in Phantom-importable forms WITHOUT printing
// it to the terminal. Keys are written to git-ignored files only.
//
// Usage: node scripts/export-demo-wallet-import.mjs
// Outputs (in git-ignored demo-work/):
//   demo-wallet-import-base58.txt  — 64-byte secret key, base58 (most wallets)
//   demo-wallet-import-array.json  — JSON byte array (Phantom/Solflare CLI style)
// Delete both files immediately after importing into the browser wallet.

import { Keypair } from "@solana/web3.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bs58 from "bs58";

const bs58encode = bs58.default?.encode ?? bs58.encode;

const root = resolve(join(fileURLToPath(import.meta.url), "..", ".."));
const outDir = join(root, "demo-work");

function readEnvFile(filePath) {
  return readFile(filePath, "utf8").catch(() => "");
}

function extractVariable(content, name) {
  const match = content.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match ? match[1].trim() : undefined;
}

async function loadDemoKeypair() {
  for (const fileName of [".env.local", ".env"]) {
    const raw = await readEnvFile(join(root, fileName));
    const b64 = extractVariable(raw, "DEMO_WALLET_SECRET_KEY_BASE64");
    if (!b64) continue;
    const bytes = Buffer.from(b64, "base64");
    if (bytes.length !== 64) throw new Error(`DEMO_WALLET_SECRET_KEY_BASE64 in ${fileName} does not decode to 64 bytes.`);
    return { keypair: Keypair.fromSecretKey(Uint8Array.from(bytes)), source: fileName };
  }
  throw new Error("DEMO_WALLET_SECRET_KEY_BASE64 was not found in .env.local or .env.");
}

const { keypair, source } = await loadDemoKeypair();
const base58Secret = bs58encode(keypair.secretKey);
const jsonArray = JSON.stringify([...keypair.secretKey]);

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "demo-wallet-import-base58.txt"), `${base58Secret}\n`, { encoding: "utf8" });
await writeFile(join(outDir, "demo-wallet-import-array.json"), `${jsonArray}\n`, { encoding: "utf8" });

// Public information only is printed.
console.log(`Source env file : ${basename(source)}`);
console.log(`Public address  : ${keypair.publicKey.toBase58()}`);
console.log(`Base58 file     : demo-work/demo-wallet-import-base58.txt (${base58Secret.length} chars)`);
console.log(`JSON array file : demo-work/demo-wallet-import-array.json (64 bytes)`);
console.log("Phantom: Import private key -> paste ONE full file contents, no extra whitespace.");
console.log("If base58 is rejected, paste the JSON array file contents instead.");
console.log("DELETE both files immediately after the wallet shows the matching address.");
