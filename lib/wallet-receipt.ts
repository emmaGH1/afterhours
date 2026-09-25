// Non-secret evidence for the browser-wallet workspace swap. Persisted in
// localStorage so a refresh does not erase it. Never store keys, seeds, or
// authority material here — only public chain evidence.
export interface BrowserReceipt {
  version: 1;
  walletAddress: string;
  signature: string;
  explorerUrl: string;
  confirmed: boolean;
  /** Raw base-unit amounts and their human-readable renderings. */
  inputAmount: string;
  outputAmount: string;
  usdcBefore: string;
  usdcAfter: string;
  aaplxBefore: string;
  aaplxAfter: string;
  aaplxIncrease: string;
  confirmedAtMs: number;
  recordedAtMs: number;
}

const STORAGE_KEY = "afterhours:browser-swap-receipt";
/** Fired on window whenever a receipt is saved or cleared, so open cards update without a refresh. */
const RECEIPT_EVENT = "afterhours:browser-swap-receipt-changed";
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;

function isDecimalString(value: unknown): value is string {
  return typeof value === "string" && /^\d+$/.test(value);
}

export function isValidBrowserReceipt(value: unknown): value is BrowserReceipt {
  if (typeof value !== "object" || value === null) return false;
  const receipt = value as Record<string, unknown>;
  return receipt.version === 1
    && typeof receipt.walletAddress === "string" && BASE58.test(receipt.walletAddress)
    && typeof receipt.signature === "string" && BASE58.test(receipt.signature)
    && typeof receipt.explorerUrl === "string" && receipt.explorerUrl.startsWith("https://explorer.solana.com/tx/")
    && typeof receipt.confirmed === "boolean"
    && isDecimalString(receipt.inputAmount)
    && isDecimalString(receipt.outputAmount)
    && isDecimalString(receipt.usdcBefore)
    && isDecimalString(receipt.usdcAfter)
    && isDecimalString(receipt.aaplxBefore)
    && isDecimalString(receipt.aaplxAfter)
    && isDecimalString(receipt.aaplxIncrease)
    && typeof receipt.confirmedAtMs === "number" && Number.isFinite(receipt.confirmedAtMs) && receipt.confirmedAtMs > 0
    && typeof receipt.recordedAtMs === "number" && Number.isFinite(receipt.recordedAtMs) && receipt.recordedAtMs > 0;
}

export function loadBrowserReceipt(): BrowserReceipt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isValidBrowserReceipt(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveBrowserReceipt(receipt: BrowserReceipt): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(receipt));
    window.dispatchEvent(new Event(RECEIPT_EVENT));
  } catch {
    // Storage may be unavailable (private mode, quota); the in-page receipt stays visible.
  }
}

export function clearBrowserReceipt(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(RECEIPT_EVENT));
  } catch {
    // Nothing to recover.
  }
}

/** Subscribe to receipt changes (same-tab event + cross-tab storage event). */
export function onBrowserReceiptChange(listener: (receipt: BrowserReceipt | null) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const notify = () => listener(loadBrowserReceipt());
  window.addEventListener(RECEIPT_EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(RECEIPT_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

export function formatTokenUnits(raw: string, decimals: number): string {
  if (!isDecimalString(raw)) return "—";
  if (decimals === 0) return raw;
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}
