import { afterEach, describe, expect, it } from "vitest";
import {
  clearBrowserReceipt,
  formatTokenUnits,
  isValidBrowserReceipt,
  loadBrowserReceipt,
  onBrowserReceiptChange,
  saveBrowserReceipt,
  type BrowserReceipt,
} from "../lib/wallet-receipt";

const ADDRESS = "VxJ3GiSSmefjfUnGnqtV2yNHSBskgpRDykzzpkzMX1F";
const SIG = "5qRPZVjqCoRGyJqAKSRL9owHSTmZavnAeHuK76vdGESafiKDPzPdd4Ktg2sMEnnHVysiKjdnqxuhbCmduXgLMWMy";

const validReceipt: BrowserReceipt = {
  version: 1,
  walletAddress: ADDRESS,
  signature: SIG,
  explorerUrl: `https://explorer.solana.com/tx/${SIG}?cluster=devnet`,
  confirmed: true,
  inputAmount: "10000000",
  outputAmount: "43344",
  usdcBefore: "100000000",
  usdcAfter: "90000000",
  aaplxBefore: "0",
  aaplxAfter: "43344",
  aaplxIncrease: "43344",
  confirmedAtMs: 1_700_000_000_000,
  recordedAtMs: 1_700_000_000_000,
};

// Minimal window/localStorage stub so the module's browser guards run under
// Vitest's node environment without pulling in jsdom.
class FakeEvent<T = unknown> {
  readonly type: string;
  payload?: T;
  constructor(type: string) {
    this.type = type;
  }
}
type Listener = (event: unknown) => void;

function installFakeWindow() {
  const store = new Map<string, string>();
  const listeners = new Map<string, Set<Listener>>();
  const storage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => void store.clear(),
  };
  const fakeWindow = {
    localStorage: storage,
    dispatchEvent: (event: FakeEvent) => {
      for (const listener of listeners.get(event.type) ?? []) listener(event);
      return true;
    },
    addEventListener: (type: string, listener: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener: (type: string, listener: Listener) => {
      listeners.get(type)?.delete(listener);
    },
  };
  (globalThis as Record<string, unknown>).window = fakeWindow;
  (globalThis as Record<string, unknown>).Event = FakeEvent;
  return { store, fakeWindow };
}

describe("isValidBrowserReceipt", () => {
  it("accepts a well-formed verified receipt", () => {
    expect(isValidBrowserReceipt(validReceipt)).toBe(true);
  });

  it("rejects tampered or malformed receipts", () => {
    expect(isValidBrowserReceipt({ ...validReceipt, signature: "not-base58!!" })).toBe(false);
    expect(isValidBrowserReceipt({ ...validReceipt, version: 2 })).toBe(false);
    expect(isValidBrowserReceipt({ ...validReceipt, explorerUrl: "https://evil.example/tx" })).toBe(false);
    expect(isValidBrowserReceipt({ ...validReceipt, aaplxIncrease: "-5" })).toBe(false);
    expect(isValidBrowserReceipt(null)).toBe(false);
  });
});

describe("receipt storage and change events", () => {
  let store: Map<string, string>;

  afterEach(() => {
    store.clear();
    delete (globalThis as Record<string, unknown>).window;
  });

  it("saves and reloads a receipt, and returns null after clearing", () => {
    ({ store } = installFakeWindow());
    saveBrowserReceipt(validReceipt);
    expect(loadBrowserReceipt()).toEqual(validReceipt);
    clearBrowserReceipt();
    expect(loadBrowserReceipt()).toBeNull();
  });

  it("notifies subscribers immediately on save and clear", () => {
    installFakeWindow();
    const seen: (BrowserReceipt | null)[] = [];
    const unsubscribe = onBrowserReceiptChange((receipt) => seen.push(receipt));
    saveBrowserReceipt(validReceipt);
    clearBrowserReceipt();
    unsubscribe();
    expect(seen[0]).toEqual(validReceipt);
    expect(seen[1]).toBeNull();
  });

  it("ignores corrupt stored JSON instead of throwing", () => {
    const { store: target } = installFakeWindow();
    target.set("afterhours:browser-swap-receipt", "{not json");
    expect(loadBrowserReceipt()).toBeNull();
  });

  it("is a no-op without a window (server render)", () => {
    expect(loadBrowserReceipt()).toBeNull();
    expect(() => saveBrowserReceipt(validReceipt)).not.toThrow();
    expect(() => clearBrowserReceipt()).not.toThrow();
  });
});

describe("formatTokenUnits", () => {
  it("renders human-readable amounts from base units", () => {
    expect(formatTokenUnits("43344", 6)).toBe("0.043344");
    expect(formatTokenUnits("100000000", 6)).toBe("100");
    expect(formatTokenUnits("1000000", 6)).toBe("1");
    expect(formatTokenUnits("0", 6)).toBe("0");
  });
});
