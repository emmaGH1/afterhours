import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction,
  TransactionInstruction, sendAndConfirmTransaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createAccount, createMint, getAccount, mintTo } from "@solana/spl-token";
import { CurveType, TOKEN_SWAP_PROGRAM_ID, TokenSwap } from "@solana/spl-token-swap";

const rpcUrl = process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(rpcUrl, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 30_000,
});
const confirmation = { commitment: "confirmed", preflightCommitment: "confirmed" };
const hackathonDir = new URL("../.hackathon/", import.meta.url);
const outputPath = new URL("../public/pool-manifest.json", import.meta.url);
// Keep public progress separate from the private Token Swap account keypair.
// The earlier shared filename could overwrite the keypair after initialization.
const statePath = new URL("../.hackathon/devnet-pool-progress.json", import.meta.url);
const decimals = 6;
// 115,000 / 500 = 230 USDC-test per AAPLX-test, aligned with the demo fixture.
const usdcReserve = 115_000_000_000n;
const aaplxReserve = 500_000_000n;
const traderInput = 10_000_000n;
const tradeFeeNumerator = 30n;
const tradeFeeDenominator = 10_000n;

async function loadState() {
  try {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    // A pre-proof iteration stored a local devnet key in this state file. The
    // payer now has its own ignored key file; never retain key material here.
    delete state.secretKey;
    return state;
  }
  catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return {};
    throw error;
  }
}

async function saveState(state) {
  await mkdir(hackathonDir, { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function loadOrCreateKeypair(name) {
  const path = new URL(`../.hackathon/devnet-${name}.json`, import.meta.url);
  try {
    const stored = JSON.parse(await readFile(path, "utf8"));
    if (!Array.isArray(stored.secretKey)) throw new Error(`Stored ${name} keypair is missing secret key bytes.`);
    return Keypair.fromSecretKey(Uint8Array.from(stored.secretKey));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code !== "ENOENT") throw error;
    const keypair = Keypair.generate();
    await mkdir(hackathonDir, { recursive: true });
    await writeFile(path, `${JSON.stringify({ secretKey: [...keypair.secretKey] })}\n`, { encoding: "utf8", mode: 0o600 });
    return keypair;
  }
}

async function fundDevnetPayer(payer) {
  const minimumLamports = LAMPORTS_PER_SOL / 2;
  if (await connection.getBalance(payer.publicKey, "confirmed") >= minimumLamports) return;
  try {
    const signature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
    const blockhash = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction({ signature, ...blockhash }, "confirmed");
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown faucet error";
    throw new Error(`Devnet payer ${payer.publicKey.toBase58()} needs a manual faucet top-up (at least 0.5 devnet SOL). Public RPC faucet failed: ${reason}`);
  }
  const balance = await connection.getBalance(payer.publicKey, "confirmed");
  if (balance < minimumLamports) throw new Error(`Devnet payer ${payer.publicKey.toBase58()} has ${balance} lamports after faucet funding; at least ${minimumLamports} are required.`);
}

async function ensureMint(state, field, payer, authority) {
  if (state[field]) return new PublicKey(state[field]);
  const mint = await createMint(connection, payer, authority, null, decimals, undefined, confirmation);
  state[field] = mint.toBase58();
  await saveState(state);
  return mint;
}

async function ensureTokenAccount(state, field, payer, mint, owner) {
  if (state[field]) {
    const address = new PublicKey(state[field]);
    if (await connection.getAccountInfo(address, "confirmed")) return address;
  }
  console.error(`Pool proof: creating ${field}`);
  // Pool reserves belong to a program-derived authority, so they cannot use an
  // ATA derived from an on-curve wallet owner. A standalone SPL account works
  // for both PDA-owned reserves and the disposable test trader.
  const account = await createAccount(connection, payer, mint, owner, Keypair.generate(), confirmation);
  state[field] = account.toBase58();
  await saveState(state);
  return account;
}

async function mintUpTo(payer, mint, account, authority, requiredAmount) {
  const current = (await getAccount(connection, account, "confirmed")).amount;
  if (current < requiredAmount) await mintTo(connection, payer, mint, account, authority, requiredAmount - current, [], confirmation);
}

async function ownerProgram(address) {
  const account = await connection.getAccountInfo(address, "confirmed");
  if (!account) throw new Error(`Expected account ${address.toBase58()} does not exist.`);
  return account.owner.toBase58();
}

function quoteConstantProduct(amountIn, sourceReserve, destinationReserve) {
  const amountAfterFee = (amountIn * (tradeFeeDenominator - tradeFeeNumerator)) / tradeFeeDenominator;
  return (amountAfterFee * destinationReserve) / (sourceReserve + amountAfterFee);
}

async function main() {
  const progress = (stage) => console.error(`Pool proof: ${stage}`);
  progress("checking SPL Token Swap deployment");
  const deployment = await connection.getAccountInfo(TOKEN_SWAP_PROGRAM_ID, "confirmed");
  if (!deployment?.executable) throw new Error(`SPL Token Swap is not executable at ${TOKEN_SWAP_PROGRAM_ID.toBase58()} on this RPC.`);

  const state = await loadState();
  const payer = await loadOrCreateKeypair("pool-payer");
  const mintAuthority = await loadOrCreateKeypair("mint-authority");
  const trader = await loadOrCreateKeypair("initial-trader");
  const tokenSwapAccount = await loadOrCreateKeypair("pool-keypair");
  if (state.poolAddress && state.poolAddress !== tokenSwapAccount.publicKey.toBase58()) {
    throw new Error("Persisted pool address does not match the local devnet pool keypair.");
  }
  state.poolAddress = tokenSwapAccount.publicKey.toBase58();
  await saveState(state);
  progress("checking devnet payer balance");
  await fundDevnetPayer(payer);

  progress("loading test mints");
  const mintUsdc = await ensureMint(state, "mintUsdc", payer, mintAuthority.publicKey);
  const mintAaplx = await ensureMint(state, "mintAaplx", payer, mintAuthority.publicKey);
  const [authority] = PublicKey.findProgramAddressSync([tokenSwapAccount.publicKey.toBuffer()], TOKEN_SWAP_PROGRAM_ID);
  progress("creating or loading token accounts");
  const reserveUsdc = await ensureTokenAccount(state, "reserveUsdc", payer, mintUsdc, authority);
  const reserveAaplx = await ensureTokenAccount(state, "reserveAaplx", payer, mintAaplx, authority);
  const poolMint = await ensureMint(state, "poolMint", payer, authority);
  const feeAccount = await ensureTokenAccount(state, "feeAccount", payer, poolMint, payer.publicKey);
  const poolTokenAccount = await ensureTokenAccount(state, "poolTokenAccount", payer, poolMint, payer.publicKey);
  const userUsdc = await ensureTokenAccount(state, "userUsdc", payer, mintUsdc, trader.publicKey);
  const userAaplx = await ensureTokenAccount(state, "userAaplx", payer, mintAaplx, trader.publicKey);
  progress("seeding test liquidity");
  await mintUpTo(payer, mintUsdc, reserveUsdc, mintAuthority, usdcReserve);
  await mintUpTo(payer, mintAaplx, reserveAaplx, mintAuthority, aaplxReserve);
  await mintUpTo(payer, mintUsdc, userUsdc, mintAuthority, traderInput);

  if (state.poolInitialized) {
    progress("loading existing pool");
  } else {
    progress("initializing constant-product pool");
    await TokenSwap.createTokenSwap(
      connection, payer, tokenSwapAccount, authority, reserveUsdc, reserveAaplx, poolMint, mintUsdc, mintAaplx,
      feeAccount, poolTokenAccount, TOKEN_SWAP_PROGRAM_ID, TOKEN_PROGRAM_ID,
      tradeFeeNumerator, tradeFeeDenominator, 0n, 0n, 0n, 0n, 0n, 0n, CurveType.ConstantProduct, undefined, confirmation,
    );
    state.poolInitialized = true;
    await saveState(state);
  }

  const reservesBefore = {
    usdc: (await getAccount(connection, reserveUsdc, "confirmed")).amount,
    aaplx: (await getAccount(connection, reserveAaplx, "confirmed")).amount,
  };
  const expectedOutput = quoteConstantProduct(traderInput, reservesBefore.usdc, reservesBefore.aaplx);
  const minimumOut = (expectedOutput * 99n) / 100n;
  if (minimumOut <= 0n) throw new Error("Calculated minimum output is zero.");

  const sourceBefore = await getAccount(connection, userUsdc, "confirmed");
  const before = await getAccount(connection, userAaplx, "confirmed");
  progress(`token programs ${JSON.stringify({
    mintUsdc: await ownerProgram(mintUsdc),
    mintAaplx: await ownerProgram(mintAaplx),
    reserveUsdc: await ownerProgram(reserveUsdc),
    reserveAaplx: await ownerProgram(reserveAaplx),
    feeAccount: await ownerProgram(feeAccount),
    source: TOKEN_PROGRAM_ID.toBase58(),
    destination: TOKEN_PROGRAM_ID.toBase58(),
    pool: TOKEN_PROGRAM_ID.toBase58(),
  })}`);
  progress("submitting permitted USDC-test to AAPLX-test swap");
  // Devnet's official SwapsVeC deployment is SPL Token Swap v3. Its Swap
  // instruction has one classic token-program meta at index 9; the current
  // JavaScript SDK constructs a later multi-program layout, which v3 rejects.
  const swapData = Buffer.alloc(17);
  swapData.writeUInt8(1, 0);
  swapData.writeBigUInt64LE(traderInput, 1);
  swapData.writeBigUInt64LE(minimumOut, 9);
  const swapInstruction = new TransactionInstruction({
    programId: TOKEN_SWAP_PROGRAM_ID,
    keys: [
      { pubkey: tokenSwapAccount.publicKey, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: trader.publicKey, isSigner: true, isWritable: false },
      { pubkey: userUsdc, isSigner: false, isWritable: true },
      { pubkey: reserveUsdc, isSigner: false, isWritable: true },
      { pubkey: reserveAaplx, isSigner: false, isWritable: true },
      { pubkey: userAaplx, isSigner: false, isWritable: true },
      { pubkey: poolMint, isSigner: false, isWritable: true },
      { pubkey: feeAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: swapData,
  });
  const swapSignature = await sendAndConfirmTransaction(
    connection, new Transaction().add(swapInstruction), [payer, trader], confirmation,
  );
  const sourceAfter = await getAccount(connection, userUsdc, "confirmed");
  const after = await getAccount(connection, userAaplx, "confirmed");
  const observedInputDebit = sourceBefore.amount - sourceAfter.amount;
  const delta = after.amount - before.amount;
  if (delta < minimumOut) throw new Error(`Swap output ${delta} is below the enforced minimum ${minimumOut}.`);
  progress("writing verified public manifest");

  const manifest = {
    network: "devnet", verifiedAt: new Date().toISOString(), settlement: "SPL Token Swap v3 constant-product pool",
    programId: TOKEN_SWAP_PROGRAM_ID.toBase58(), poolAddress: tokenSwapAccount.publicKey.toBase58(), poolAuthority: authority.toBase58(),
    mints: { usdcTest: { address: mintUsdc.toBase58(), decimals }, aaplxTest: { address: mintAaplx.toBase58(), decimals }, pool: { address: poolMint.toBase58(), decimals } },
    reserveAccounts: { usdcTest: reserveUsdc.toBase58(), aaplxTest: reserveAaplx.toBase58() },
    feeAccount: feeAccount.toBase58(),
    poolFee: { numerator: tradeFeeNumerator.toString(), denominator: tradeFeeDenominator.toString(), basisPoints: 30 },
    proof: {
      signature: swapSignature, explorerUrl: `https://explorer.solana.com/tx/${swapSignature}?cluster=devnet`,
      input: {
        requestedAmount: traderInput.toString(), observedDebit: observedInputDebit.toString(), symbol: "USDC-test",
      }, expectedOutput: expectedOutput.toString(), minimumOutput: minimumOut.toString(), output: { amount: delta.toString(), symbol: "AAPLX-test" },
    },
    disclosure: "Devnet test assets only. This pool is not a backed security or production liquidity.",
  };
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  const reason = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ""}` : String(error);
  process.stderr.write(`Pool proof failed: ${reason}\n`);
  process.exitCode = 1;
});
