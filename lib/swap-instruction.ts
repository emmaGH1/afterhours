import { AccountRole, address, type Instruction } from "@solana/kit";

const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export interface DirectSwapAccounts {
  swapProgram: string;
  pool: string;
  poolAuthority: string;
  wallet: string;
  userUsdc: string;
  reserveUsdc: string;
  reserveAaplx: string;
  userAaplx: string;
  poolMint: string;
  feeAccount: string;
}

export function parseTokenAmount(value: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error("Invalid token decimals.");
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(value)) throw new Error("Enter a positive numeric amount.");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) throw new Error(`Amount supports at most ${decimals} decimal places.`);
  const raw = BigInt(whole) * 10n ** BigInt(decimals)
    + BigInt((fraction.padEnd(decimals, "0")) || "0");
  if (raw <= 0n || raw > 0xffff_ffff_ffff_ffffn) throw new Error("Amount is outside the supported range.");
  return raw;
}

export function minimumOutput(quotedTokens: number, decimals: number, slippageBps = 100): bigint {
  if (!Number.isFinite(quotedTokens) || quotedTokens <= 0 || !Number.isInteger(decimals)
    || decimals < 0 || decimals > 9 || slippageBps < 0 || slippageBps >= 10_000) {
    throw new Error("Cannot construct minimum output from an invalid quote.");
  }
  const rawQuote = BigInt(Math.floor(quotedTokens * 10 ** decimals));
  const result = rawQuote * BigInt(10_000 - slippageBps) / 10_000n;
  if (result <= 0n) throw new Error("Quoted output is too small.");
  return result;
}

function u64le(value: bigint, target: Uint8Array, offset: number) {
  if (value < 0n || value > 0xffff_ffff_ffff_ffffn) throw new Error("Swap amount exceeds u64.");
  for (let i = 0; i < 8; i++) target[offset + i] = Number((value >> BigInt(i * 8)) & 0xffn);
}

// SPL Token Swap v3.0.0 instruction 1: the deployed devnet program accepts the
// legacy ten-account layout (optional host fee would be index 10).
export function buildDirectSwapInstruction(
  accounts: DirectSwapAccounts,
  amountIn: bigint,
  minOut: bigint,
): Instruction {
  if (amountIn <= 0n || minOut <= 0n) throw new Error("Swap input and minimum output must be positive.");
  const data = new Uint8Array(17);
  data[0] = 1;
  u64le(amountIn, data, 1);
  u64le(minOut, data, 9);
  const readonly = (value: string) => ({ address: address(value), role: AccountRole.READONLY });
  const writable = (value: string) => ({ address: address(value), role: AccountRole.WRITABLE });
  return {
    programAddress: address(accounts.swapProgram),
    accounts: [
      readonly(accounts.pool),
      readonly(accounts.poolAuthority),
      { address: address(accounts.wallet), role: AccountRole.READONLY_SIGNER },
      writable(accounts.userUsdc),
      writable(accounts.reserveUsdc),
      writable(accounts.reserveAaplx),
      writable(accounts.userAaplx),
      writable(accounts.poolMint),
      writable(accounts.feeAccount),
      readonly(TOKEN_PROGRAM),
    ],
    data,
  };
}
