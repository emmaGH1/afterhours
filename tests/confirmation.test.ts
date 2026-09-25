import { describe, expect, it } from "vitest";
import { confirmSubmittedSignature, pollForBalanceIncrease, type ConfirmationTransport } from "../lib/confirmation";

const SIG = "5qRPZVjqCoRGyJqAKSRL9owHSTmZavnAeHuK76vdGESafiKDPzPdd4Ktg2sMEnnHVysiKjdnqxuhbCmduXgLMWMy";

describe("confirmSubmittedSignature", () => {
  it("classifies a confirmed successful transaction", async () => {
    const transport: ConfirmationTransport = {
      confirmTransaction: async () => ({ value: { err: null } }),
      getSignatureStatus: async () => ({ err: null }),
    };
    const outcome = await confirmSubmittedSignature(transport, SIG);
    expect(outcome).toEqual({ kind: "confirmed-success", signature: SIG });
  });

  it("classifies an on-chain transaction failure returned by the confirmation", async () => {
    const transport: ConfirmationTransport = {
      confirmTransaction: async () => ({ value: { err: { InstructionError: [1, "Custom"] } } }),
      getSignatureStatus: async () => ({ err: { InstructionError: [1, "Custom"] } }),
    };
    const outcome = await confirmSubmittedSignature(transport, SIG);
    expect(outcome.kind).toBe("confirmed-failure");
    if (outcome.kind === "confirmed-failure") {
      expect(outcome.signature).toBe(SIG);
      expect(outcome.error).toContain("InstructionError");
    }
  });

  it("falls back to signature status when the confirmation notification never arrives", async () => {
    const transport: ConfirmationTransport = {
      confirmTransaction: async () => {
        throw new Error("websocket closed");
      },
      getSignatureStatus: async () => ({ err: null }),
    };
    const outcome = await confirmSubmittedSignature(transport, SIG, 250);
    expect(outcome.kind).toBe("confirmed-success");
  });

  it("reports unknown when the RPC has never seen the signature", async () => {
    const transport: ConfirmationTransport = {
      confirmTransaction: async () => {
        throw new Error("block height exceeded");
      },
      getSignatureStatus: async () => null,
    };
    const outcome = await confirmSubmittedSignature(transport, SIG, 250);
    expect(outcome).toEqual({ kind: "unknown", signature: SIG, reason: "timeout" });
  });

  it("reports unknown when both confirmation and the status read fail", async () => {
    const transport: ConfirmationTransport = {
      confirmTransaction: async () => {
        throw new Error("fetch failed");
      },
      getSignatureStatus: async () => {
        throw new Error("fetch failed");
      },
    };
    const outcome = await confirmSubmittedSignature(transport, SIG, 250);
    expect(outcome.kind).toBe("unknown");
  });

  it("prefers the transaction error from signature status over a clean timeout", async () => {
    const transport: ConfirmationTransport = {
      confirmTransaction: async () => {
        throw new Error("confirmation-window-elapsed");
      },
      getSignatureStatus: async () => ({ err: "AccountInUse" }),
    };
    const outcome = await confirmSubmittedSignature(transport, SIG, 250);
    expect(outcome.kind).toBe("confirmed-failure");
  });
});

describe("pollForBalanceIncrease", () => {
  const sleep = () => Promise.resolve();

  it("observes the increase once the balance meets the minimum", async () => {
    let call = 0;
    const transport = {
      readTokenBalance: async () => {
        call += 1;
        return call < 3 ? 0n : 43_500n;
      },
    };
    const result = await pollForBalanceIncrease(transport, "acct", 0n, 42_910n, { pollMs: 1, budgetMs: 5_000, sleep });
    expect(result).toEqual({ observed: true, after: 43_500n });
  });

  it("returns pending when the budget elapses without an increase", async () => {
    const transport = { readTokenBalance: async () => 0n };
    const result = await pollForBalanceIncrease(transport, "acct", 0n, 42_910n, { pollMs: 1, budgetMs: 30, sleep });
    expect(result).toEqual({ observed: false, after: 0n });
  });

  it("treats missing accounts as no increase rather than throwing", async () => {
    const transport = { readTokenBalance: async () => null };
    const result = await pollForBalanceIncrease(transport, "acct", 0n, 42_910n, { pollMs: 1, budgetMs: 30, sleep });
    expect(result.observed).toBe(false);
  });
});
