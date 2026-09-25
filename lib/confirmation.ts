// Trustworthy post-submission confirmation and balance observation.
//
// The wallet adapter's sendTransaction result does not expose the blockhash it
// used, so confirmation must be signature-based; pairing the submitted
// signature with a blockhash fetched after submission would be wrong. These
// helpers also distinguish confirmed-success, confirmed-failure (the
// transaction executed and failed on-chain), and confirmation-unknown (the
// transaction may still land) so a signed transaction is never mislabelled.

export type ConfirmationOutcome =
  | { kind: "confirmed-success"; signature: string }
  | { kind: "confirmed-failure"; signature: string; error: string }
  | { kind: "unknown"; signature: string; reason: "timeout" | "rpc" };

export interface ConfirmationTransport {
  confirmTransaction(signature: string, commitment: string): Promise<{ value: { err: unknown } }>;
  /** Null when the RPC has no status for the signature yet. */
  getSignatureStatus(signature: string): Promise<{ err: unknown } | null>;
}

const DEFAULT_CONFIRM_TIMEOUT_MS = 90_000;

function errText(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    try {
      return JSON.stringify(err);
    } catch {
      // fall through
    }
  }
  return "unknown transaction error";
}

export async function confirmSubmittedSignature(
  transport: ConfirmationTransport,
  signature: string,
  timeoutMs = DEFAULT_CONFIRM_TIMEOUT_MS,
): Promise<ConfirmationOutcome> {
  let timedOut = false;
  try {
    const result = await Promise.race([
      transport.confirmTransaction(signature, "confirmed"),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          timedOut = true;
          reject(new Error("confirmation-window-elapsed"));
        }, timeoutMs);
        // Let the Node process exit if nothing else is pending.
        if (typeof timer === "object" && timer && "unref" in timer) (timer as { unref(): void }).unref();
      }),
    ]);
    // The transaction confirmed; inspect the returned transaction error.
    if (result.value.err) {
      return { kind: "confirmed-failure", signature, error: errText(result.value.err) };
    }
  } catch (cause) {
    // Confirmation notification never arrived (expired, dropped websocket, or
    // timeout). Classify expiry-shaped errors as a timeout; the status read
    // below is the authoritative check either way.
    const message = cause instanceof Error ? cause.message : String(cause);
    if (timedOut || /block height|expired|timeout|timed out/i.test(message)) {
      timedOut = true;
    }
  }

  try {
    const status = await transport.getSignatureStatus(signature);
    if (status === null) {
      return { kind: "unknown", signature, reason: timedOut ? "timeout" : "rpc" };
    }
    if (status.err) {
      return { kind: "confirmed-failure", signature, error: errText(status.err) };
    }
    return { kind: "confirmed-success", signature };
  } catch {
    return { kind: "unknown", signature, reason: "rpc" };
  }
}

export interface BalancePollResult {
  observed: boolean;
  after: bigint;
}

export interface BalanceTransport {
  /** Null when the account does not exist or the RPC read failed. */
  readTokenBalance(account: string): Promise<bigint | null>;
}

export async function pollForBalanceIncrease(
  transport: BalanceTransport,
  account: string,
  before: bigint,
  minimum: bigint,
  options: {
    pollMs?: number;
    budgetMs?: number;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<BalancePollResult> {
  const pollMs = options.pollMs ?? 1_500;
  const budgetMs = options.budgetMs ?? 60_000;
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const deadline = Date.now() + budgetMs;
  let attempt = 0;
  let last = before;
  while (Date.now() < deadline) {
    const after = await transport.readTokenBalance(account);
    if (after !== null) {
      last = after;
      if (after - before >= minimum) return { observed: true, after };
    }
    await sleep(Math.min(pollMs * (attempt + 1), 5_000));
    attempt += 1;
  }
  const finalRead = await transport.readTokenBalance(account);
  if (finalRead !== null) last = finalRead;
  return { observed: false, after: last };
}
