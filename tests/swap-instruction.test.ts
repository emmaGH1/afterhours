import { describe, expect, it } from "vitest";
import { AccountRole } from "@solana/kit";
import { buildDirectSwapInstruction, minimumOutput, parseTokenAmount } from "../lib/swap-instruction";

const accounts = {
  swapProgram: "SwapsVeCiPHMUAtzQWZw7RjsKjgCjhwU55QGu4U1Szw",
  pool: "11111111111111111111111111111111",
  poolAuthority: "11111111111111111111111111111111",
  wallet: "11111111111111111111111111111111",
  userUsdc: "11111111111111111111111111111111",
  reserveUsdc: "11111111111111111111111111111111",
  reserveAaplx: "11111111111111111111111111111111",
  userAaplx: "11111111111111111111111111111111",
  poolMint: "11111111111111111111111111111111",
  feeAccount: "11111111111111111111111111111111",
};

describe("direct devnet swap instruction", () => {
  it("uses integer token amounts and rejects excess precision", () => {
    expect(parseTokenAmount("10.25", 6)).toBe(10_250_000n);
    expect(() => parseTokenAmount("10.0000001", 6)).toThrow();
    expect(() => parseTokenAmount("0", 6)).toThrow();
  });

  it("encodes exact input and the deployed v3 ten-account legacy Swap layout", () => {
    const instruction = buildDirectSwapInstruction(accounts, 10_250_000n, 42_000n);
    const view = new DataView(instruction.data!.buffer);
    expect(instruction.programAddress).toBe(accounts.swapProgram);
    expect(instruction.data![0]).toBe(1);
    expect(view.getBigUint64(1, true)).toBe(10_250_000n);
    expect(view.getBigUint64(9, true)).toBe(42_000n);
    expect(instruction.accounts?.[2].role).toBe(AccountRole.READONLY_SIGNER);
    expect(instruction.accounts).toHaveLength(10);
    expect(instruction.accounts?.map(({ address: account }) => account)).toEqual([
      accounts.pool,
      accounts.poolAuthority,
      accounts.wallet,
      accounts.userUsdc,
      accounts.reserveUsdc,
      accounts.reserveAaplx,
      accounts.userAaplx,
      accounts.poolMint,
      accounts.feeAccount,
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    ]);
    expect(instruction.accounts?.[9].role).toBe(AccountRole.READONLY);
  });

  it("builds a nonzero one-percent slippage floor", () => {
    expect(minimumOutput(0.05, 6)).toBe(49_500n);
    expect(() => minimumOutput(0, 6)).toThrow();
  });
});
