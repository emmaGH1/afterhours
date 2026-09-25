"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import poolManifest from "../public/pool-manifest.json";
import styles from "./landing.module.css";

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M3 17 17 3M7 3h10v10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const freshnessOptions = ["fresh", "aging", "stale"] as const;
type FreshnessState = (typeof freshnessOptions)[number];

const freshnessLabels: Record<FreshnessState, string> = {
  fresh: "FRESH / OPEN",
  aging: "AGING / LIMITED",
  stale: "STALE / PAUSED",
};

function FreshnessControls({ freshness, setFreshness, controlsClass }: { freshness: FreshnessState; setFreshness: (state: FreshnessState) => void; controlsClass: string }) {
  return (
    <div className={controlsClass} role="group" aria-label="Reference freshness state selector">
      {freshnessOptions.map((option) => (
        <button
          key={option}
          type="button"
          className={styles.scaleButton}
          aria-pressed={freshness === option}
          onClick={() => setFreshness(option)}
        >
          {freshnessLabels[option]}
        </button>
      ))}
    </div>
  );
}

function RouteDrawing() {
  const [freshness, setFreshness] = useState<FreshnessState>("fresh");

  return (
    <figure className={styles.drawing} id="route">
      <div className={styles.drawingTop}>
        <span>FIG. 01 / THE AFTERHOURS ROUTE</span>
        <span>DEVNET CONCEPT MODEL</span>
      </div>
      <div className={styles.diagramWrap}>
        <svg className={styles.diagram} viewBox="0 0 680 472" role="img" aria-labelledby="route-title route-desc" data-state={freshness}>
        <title id="route-title">A reference-aware stock-token swap route</title>
        <desc id="route-desc">Proposed mechanism: an AAPL reference update informs a risk gate, which would permit, limit, or pause a test-token swap through a Solana pool. Live Pyth verification and the on-chain guard are pending.</desc>
        <defs>
          <pattern id="draftGrid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M 34 0 L 0 0 0 34" fill="none" stroke="#b3b3af" strokeOpacity=".35" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="12" y="12" width="656" height="448" fill="url(#draftGrid)" />
        <path className={styles.guide} d="M20 96H660M20 335H660M130 30V443M340 30V443M550 30V443" />
        <path className={styles.ticks} d="M20 26h10m-5-5v10M650 26h10m-5-5v10M20 446h10m-5-5v10M650 446h10m-5-5v10" />

        <text className={styles.diagramLabel} x="42" y="62">01 / INPUT</text>
        <text className={styles.diagramLabel} x="263" y="62">02 / POLICY</text>
        <text className={styles.diagramLabel} x="490" y="62">03 / EXECUTION</text>

        <rect className={styles.node} x="42" y="147" width="176" height="136" />
        <text className={styles.nodeSmall} x="57" y="173">REFERENCE FEED</text>
        <text className={styles.nodeLarge} x="57" y="218">AAPL</text>
        <path className={styles.nodeRule} d="M57 233H203" />
        <text className={styles.nodeDetail} x="57" y="254">SESSION / AGE</text>
        <text className={styles.nodeDetail} x="57" y="272">CONFIDENCE</text>

        <path className={styles.routeLine} d="M218 215H253" />
        <path className={styles.arrow} d="m245 207 8 8-8 8" />

        <rect className={styles.gate} x="253" y="133" width="174" height="164" />
        <text className={styles.nodeSmall} x="270" y="161">RISK GATE</text>
        <text className={styles.gateWord} data-active={freshness === "fresh"} x="270" y="208">OPEN</text>
        <text className={styles.gateWord} data-active={freshness === "aging"} x="270" y="243">LIMIT</text>
        <text className={styles.gateWord} data-active={freshness === "stale"} x="270" y="278">PAUSE</text>
        <rect x="409" y="146" width="6" height="6" fill="#fa3600" />
        <rect x="409" y="262" width="6" height="6" fill="#fa3600" />

        <path className={styles.routeLine} d="M427 215H462" />
        <path className={styles.arrow} d="m454 207 8 8-8 8" />
        <path className={styles.routeLineB} d="M427 215H462" />
        <path className={styles.arrowB} d="m454 207 8 8-8 8" />

        <rect className={styles.node} x="462" y="147" width="176" height="136" />
        <text className={styles.nodeSmall} x="477" y="173">SOLANA TEST POOL</text>
        <text className={styles.nodeLarge} x="477" y="217">SWAP</text>
        <path className={styles.nodeRule} d="M477 233H623" />
        <text className={styles.nodeDetail} x="477" y="254">USDC-TEST</text>
        <text className={styles.nodeDetail} x="477" y="272">→ AAPLX-TEST</text>
        <text className={styles.capText} x="477" y="297">CAP 500 → 50 → 0 USDC</text>

        <text className={styles.diagramLabel} x="42" y="379">REFERENCE FRESHNESS</text>
        <path className={styles.scaleLine} d="M42 392H638" />
        <circle cx="42" cy="392" r="4" fill="#282828" />
        <circle cx="340" cy="392" r="4" fill="#fa3600" />
        <circle cx="638" cy="392" r="4" fill="#282828" />
        <path className={styles.pauseStrike} d="M427 215H462" />
        <text className={styles.scaleText} x="42" y="417">FRESH / OPEN</text>
        <text className={styles.scaleText} x="340" y="417" textAnchor="middle">AGING / LIMITED</text>
        <text className={styles.scaleText} x="638" y="417" textAnchor="end">STALE / PAUSED</text>
      </svg>
        <FreshnessControls freshness={freshness} setFreshness={setFreshness} controlsClass={styles.scaleControls} />
      </div>
      <FreshnessControls freshness={freshness} setFreshness={setFreshness} controlsClass={styles.scaleControlsMobile} />
      <div className={styles.mobileRoute} data-state={freshness}>
        <div><span>01 / REFERENCE</span><strong>AAPL</strong><small>SESSION · AGE · CONFIDENCE</small></div>
        <span className={styles.mobileArrow} aria-hidden="true">↓</span>
        <div><span>02 / POLICY</span><strong>OPEN / LIMIT / PAUSE</strong><small className={styles.mobileStateNote}>CAP 500 → 50 → 0 USDC</small></div>
        <span className={styles.mobileArrow} aria-hidden="true">↓</span>
        <div><span>03 / EXECUTION</span><strong>TEST SWAP</strong><small>USDC-TEST → AAPLX-TEST</small></div>
      </div>
      <figcaption className={styles.drawingCaption}>
        <span>PROPOSED: REFERENCE CONDITIONS SET THE ROUTE LIMIT.</span>
        <span>NOT A PRICE GUARANTEE.</span>
      </figcaption>
    </figure>
  );
}

function LaserCrosshair() {
  const laserXRef = useRef<HTMLDivElement | null>(null);
  const laserYRef = useRef<HTMLDivElement | null>(null);
  const coordXRef = useRef<HTMLDivElement | null>(null);
  const coordYRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const laserX = laserXRef.current;
    const laserY = laserYRef.current;
    const coordX = coordXRef.current;
    const coordY = coordYRef.current;
    if (!laserX || !laserY || !coordX || !coordY) return;

    const elements = [laserX, laserY, coordX, coordY];
    const fine = window.matchMedia("(pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId = 0;
    let nextX = -1;
    let nextY = -1;

    const setActive = (active: boolean) => {
      for (const el of elements) el.dataset.active = active ? "true" : "false";
    };

    const paint = () => {
      frameId = 0;
      if (nextX < 0) return;
      laserX.style.transform = `translateX(${nextX}px)`;
      laserY.style.transform = `translateY(${nextY}px)`;
      coordX.style.transform = `translateX(${nextX}px)`;
      coordY.style.transform = `translateY(${nextY}px)`;
      coordX.textContent = `X ${String(nextX).padStart(4, "0")}`;
      coordY.textContent = `Y ${String(nextY).padStart(4, "0")}`;
    };

    const onMove = (event: PointerEvent) => {
      nextX = Math.round(event.clientX);
      nextY = Math.round(event.clientY);
      setActive(true);
      if (reduced.matches) {
        paint();
        return;
      }
      if (!frameId) frameId = requestAnimationFrame(paint);
    };

    const onLeave = () => setActive(false);

    const sync = () => {
      if (fine.matches) {
        window.addEventListener("pointermove", onMove);
        document.documentElement.addEventListener("pointerleave", onLeave);
      } else {
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        setActive(false);
      }
    };

    sync();
    fine.addEventListener("change", sync);

    return () => {
      fine.removeEventListener("change", sync);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div aria-hidden="true">
      <div ref={laserXRef} className={styles.laserX} data-active="false" />
      <div ref={laserYRef} className={styles.laserY} data-active="false" />
      <div ref={coordXRef} className={styles.coordX} data-active="false" />
      <div ref={coordYRef} className={styles.coordY} data-active="false" />
    </div>
  );
}

const RECEIPT_URL = poolManifest.proof.explorerUrl;
const PROGRAM_URL = `https://explorer.solana.com/address/${poolManifest.programId}?cluster=devnet`;
const POOL_URL = `https://explorer.solana.com/address/${poolManifest.poolAddress}?cluster=devnet`;
// Verified script-receipt slot. It is part of the recorded proof and is not a manifest field.
const RECEIPT_SLOT = "503568283";

function formatBaseUnits(amount: string, decimals: number) {
  const padded = amount.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function groupThousands(amount: string) {
  return amount.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function shortenAddress(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

const swapLine = `${formatBaseUnits(poolManifest.proof.input.requestedAmount, poolManifest.mints.usdcTest.decimals)} ${poolManifest.proof.input.symbol.toUpperCase()} → ${formatBaseUnits(poolManifest.proof.output.amount, poolManifest.mints.aaplxTest.decimals)} ${poolManifest.proof.output.symbol.toUpperCase()}`;
const minimumOutput = groupThousands(poolManifest.proof.minimumOutput);
const filledOutput = groupThousands(poolManifest.proof.output.amount);
const networkLabel = poolManifest.network === "devnet" ? "SOLANA DEVNET" : poolManifest.network.toUpperCase();

const tickerItems = [
  "POOL FEE 30 BPS",
  "USDC-TEST → AAPLX-TEST",
  "MIN OUT 42,910 / FILLED 43,344",
  "10 USDC-TEST → 0.043344 AAPLX-TEST",
];

function DataTicker() {
  return (
    <div className={styles.ticker} aria-hidden="true">
      <div className={styles.tickerTrack}>
        {[...tickerItems, ...tickerItems].map((item, index) => (
          <span key={index} className={styles.tickerItem}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function formatElapsed(ms: number) {
  const total = Math.floor(ms / 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

function isUsDstObserving(date: Date): boolean {
  const year = date.getUTCFullYear();
  const firstSunday = (month: number) => {
    const first = new Date(Date.UTC(year, month, 1));
    return 1 + ((7 - first.getUTCDay()) % 7);
  };
  const dstStart = Date.UTC(year, 2, firstSunday(2) + 7, 7);
  const dstEnd = Date.UTC(year, 10, firstSunday(10), 6);
  return date.getTime() >= dstStart && date.getTime() < dstEnd;
}

function etOffsetHours(date: Date): number {
  return isUsDstObserving(date) ? -4 : -5;
}

// US equity session: 9:30–16:00 ET on weekdays. Exchange holidays are not excluded.
function isUsEquityOpen(now: Date): boolean {
  const shifted = new Date(now.getTime() + etOffsetHours(now) * 3_600_000);
  const weekday = shifted.getUTCDay() >= 1 && shifted.getUTCDay() <= 5;
  const minutesOfDay = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  return weekday && minutesOfDay >= 570 && minutesOfDay < 960;
}

function mostRecentCloseEpoch(now: Date): number {
  for (let back = 0; back < 8; back++) {
    const day = new Date(now.getTime() - back * 86_400_000);
    if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;
    const close =
      Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 16, 0, 0) -
      etOffsetHours(day) * 3_600_000;
    if (close <= now.getTime()) return close;
  }
  return now.getTime();
}

function DecayClock() {
  const [elapsed, setElapsed] = useState<number | null>(() => {
    const now = new Date();
    return isUsEquityOpen(now) ? null : now.getTime() - mostRecentCloseEpoch(now);
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setElapsed(isUsEquityOpen(now) ? null : now.getTime() - mostRecentCloseEpoch(now));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className={styles.refClock} suppressHydrationWarning>
      {elapsed === null ? "US REGULAR-HOURS WINDOW" : `OFF-HOURS · T+${formatElapsed(elapsed)} SINCE SCHEDULED CLOSE`}
    </span>
  );
}

const builtWithItems = [
  { name: "SOLANA", tag: "DEVNET" },
  { name: "SPL TOKEN SWAP", tag: "V3" },
  { name: "SOLANA KIT", tag: null },
  { name: "WALLET STANDARD", tag: null },
  { name: "NEXT.JS", tag: null },
];

function BuiltWith() {
  return (
    <section className={styles.builtWith} aria-label="Built with">
      <div
        className={styles.builtViewport}
        role="group"
        aria-label="Technologies used in this prototype"
        tabIndex={0}
      >
        <div className={styles.builtTrack}>
          {Array.from({ length: 6 }, (_, copy) =>
            builtWithItems.map((item, index) => (
              <span
                key={`${copy}-${index}`}
                className={styles.builtItem}
                aria-hidden={copy > 0 || undefined}
              >
                <strong>{item.name}</strong>
                {item.tag ? <small>{item.tag}</small> : null}
              </span>
            )),
          )}
        </div>
      </div>
    </section>
  );
}

const gateStates = [
  {
    index: "01",
    state: "OPEN",
    condition: "Reference current",
    cap: "500 TEST USDC",
  },
  {
    index: "02",
    state: "GUARDED",
    condition: "Carried-forward reference, up to 24h",
    cap: "50 TEST USDC",
  },
  {
    index: "03",
    state: "GUARDED",
    condition: "Over 24h through 72h",
    cap: "10 TEST USDC",
  },
  {
    index: "04",
    state: "PAUSED",
    condition: "Over 72h, invalid data, divergence, or stale message",
    cap: "0 · BLOCKED",
  },
];

function ProblemMechanism() {
  const figRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = figRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.dataset.armed = "true";
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          el.dataset.drawn = "true";
          io.disconnect();
        }
      },
      { threshold: 0.28 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className={styles.mechanism} id="problem" aria-labelledby="problem-heading">
      <div className={styles.mechTop}>
        <p className={styles.mechTopline}>
          <span>02 / THE PROBLEM, THE MECHANISM</span>
          <span>SIMULATED SCENARIOS · INTERFACE-LEVEL CHECK</span>
        </p>
        <div className={styles.mechRuler} aria-hidden="true"><span>+</span><span>+</span></div>
      </div>

      <div className={styles.mechStage}>
        <div className={styles.mechCopy}>
          <h2 className={styles.mechHeading} id="problem-heading">
            THE TOKEN TRADES.
            <br />
            THE REFERENCE <em>DOES NOT.</em>
          </h2>
          <p className={styles.mechLede}>
            A stock token can keep changing hands after its equity reference stops updating. The proposed route reads that gap and cuts the permitted size at fixed thresholds.
          </p>
        </div>

        <figure className={styles.sheet} ref={figRef} aria-labelledby="sheet-title schedule-title">
          <figcaption className={styles.sheetCaption}>
            <span id="sheet-title">FIG. 02 / REFERENCE → POLICY → SIZE</span>
            <span>CONSTRUCTION</span>
          </figcaption>

          <div className={styles.chainField}>
            <ol className={styles.chainList}>
              <li>
                <span>01</span>
                <strong>REFERENCE</strong>
                <small>FRESHNESS OF THE EQUITY PRINT</small>
              </li>
              <li>
                <span>02</span>
                <strong>POLICY</strong>
                <small>OPEN · GUARDED · PAUSED</small>
              </li>
              <li>
                <span>03</span>
                <strong>PERMITTED SIZE</strong>
                <small>TEST USDC CAP</small>
              </li>
            </ol>
            <div className={styles.chainDraft} aria-hidden="true">
              <span className={styles.chainRule} />
              <i /><i /><i />
            </div>
          </div>

          <div className={styles.scheduleHead}>
            <span id="schedule-title">PROTOTYPE CAP SCHEDULE</span>
            <span>NOT TO SCALE</span>
          </div>
          <div className={styles.plot}>
            <span className={styles.hour24}>24H</span>
            <span className={styles.hour72}>72H</span>
            <div className={styles.stair} aria-hidden="true">
              <i className={styles.dim} data-n="24" />
              <i className={styles.dim} data-n="72" />
              <i className={styles.tread} data-n="1" />
              <i className={styles.riser} data-n="1" />
              <i className={styles.tread} data-n="2" />
              <i className={styles.riser} data-n="2" />
              <i className={styles.tread} data-n="3" />
              <i className={styles.riser} data-n="3" />
              <i className={styles.tread} data-n="4" />
              <i className={styles.pauseMark} />
            </div>
            <div className={styles.stepLabels}>
              <span><b>OPEN</b><small>/ 500</small></span>
              <span><b>GUARDED</b><small>/ 50</small></span>
              <span><b>GUARDED</b><small>/ 10</small></span>
              <span><b>PAUSED</b><small>/ 0</small></span>
            </div>
          </div>
        </figure>
      </div>

      <div className={styles.bays}>
        {gateStates.map((row) => (
          <article key={row.index} className={row.state === "PAUSED" ? styles.bayPaused : styles.bay}>
            <span className={styles.bayIndex}>{row.index}</span>
            <h3>{row.state}</h3>
            <p>{row.condition}</p>
            <p className={styles.bayCap}>{row.cap}</p>
          </article>
        ))}
      </div>
      <p className={styles.mechBoundary}>
        Interface-level check only. No on-chain guard and no Pyth verification. The devnet pool can still be called directly.
      </p>
    </section>
  );
}

const proofStatus = [
  ["BROWSER WALLET SWAP", "IMPLEMENTED, AWAITING CONFIRMATION"],
  ["PYTH VERIFICATION", "PENDING"],
  ["ON-CHAIN GUARD", "PENDING"],
];

function ProofCta() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.dataset.armed = "true";
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          el.dataset.drawn = "true";
          io.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className={styles.proofCta} id="proof" ref={sectionRef} aria-labelledby="proof-heading">
      <div className={styles.proofTop}>
        <p className={styles.proofTopline}>
          <span>03 / THE PROOF, AND WHAT IT IS NOT</span>
          <span>DEVNET · TEST ASSETS ONLY</span>
        </p>
        <div className={styles.mechRuler} aria-hidden="true"><span>+</span><span>+</span></div>
      </div>

      <div className={styles.proofStage}>
        <h2 className={styles.proofHeading} id="proof-heading">
          ONE SWAP, SETTLED.
          <br />
          <em>ON THE PUBLIC RECORD.</em>
        </h2>
        <div className={styles.evidence}>
          <a
            className={styles.receiptSheet}
            href={RECEIPT_URL}
            target="_blank"
            rel="noreferrer"
            title={poolManifest.proof.signature}
            aria-label="Open the Explorer receipt for the script-signed devnet pool swap"
          >
            <span className={styles.receiptTop}>
              <span>03.A / EXHIBIT A · SCRIPT-SIGNED POOL SWAP</span>
              <span>EXPLORER <Arrow /></span>
            </span>
            <span className={styles.receiptId}>
              <span>TXN</span>
              <strong>{poolManifest.proof.signature}</strong>
              <span>CLUSTER DEVNET · DIRECT POOL SWAP</span>
            </span>
            <dl className={styles.receiptFacts}>
              <div><dt><i>A1</i>SLOT</dt><dd>{RECEIPT_SLOT}</dd></div>
              <div><dt><i>A2</i>SWAP</dt><dd>{swapLine}</dd></div>
              <div><dt><i>A3</i>MIN OUT</dt><dd>{minimumOutput} / FILLED {filledOutput} BASE UNITS</dd></div>
              <div><dt><i>A4</i>POOL FEE</dt><dd>{poolManifest.poolFee.basisPoints} BPS</dd></div>
            </dl>
            <span className={styles.receiptNote}>
              Signed and submitted by the proof script. This shows the devnet pool settling a direct swap. It is not a browser-wallet action.
            </span>
          </a>
          <div className={styles.proofJoin} aria-hidden="true">
            <span /><span /><span />
          </div>
          <div className={styles.ledger}>
            <p className={styles.ledgerCaption}>
              <span>03.B / STATUS LEDGER</span>
              <span>OPEN ITEMS</span>
            </p>
            <ol className={styles.statusRows}>
              {proofStatus.map(([name, state]) => (
                <li key={name} className={styles.statusRow}>
                  <b>{name}</b>
                  <span>{state}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className={styles.actionRail}>
        <Link className={`${styles.primaryAction} ${styles.railAction}`} href="/workspace">
          <span>OPEN WORKSPACE</span>
          <Arrow />
        </Link>
        <p className={styles.ctaNote}>
          Quotes derive from on-chain reserves. The interface check runs before the wallet signs.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <p className={styles.footerTopline}>
          <span>CLOSE / SYSTEM RECORD</span>
          <span>FINAL SECTION</span>
        </p>
        <div className={styles.footerRuler} aria-hidden="true"><span>+</span><span>+</span></div>
      </div>

      <div className={styles.closeStage}>
        <p className={styles.closeWord} aria-hidden="true">AFTERHOURS</p>
        <h2 className={styles.closeStatement}>
          UNCERTAINTY,
          <br />
          MADE VISIBLE.
        </h2>
        <div className={styles.closeActions}>
          <Link className={styles.primaryAction} href="/workspace">
            <span>OPEN WORKSPACE</span>
            <Arrow />
          </Link>
          <a className={styles.closeReceipt} href={RECEIPT_URL} target="_blank" rel="noreferrer">
            VIEW SCRIPT RECEIPT <Arrow />
          </a>
        </div>
      </div>

      <dl className={styles.systemLedger}>
        <div>
          <dt>NETWORK</dt>
          <dd>{networkLabel}</dd>
        </div>
        <div>
          <dt>PROGRAM</dt>
          <dd>
            <a
              href={PROGRAM_URL}
              target="_blank"
              rel="noreferrer"
              title={poolManifest.programId}
              aria-label={`SPL Token Swap v3 program ${poolManifest.programId} on Solana Explorer`}
            >
              SPL TOKEN SWAP V3
            </a>
          </dd>
        </div>
        <div>
          <dt>POOL</dt>
          <dd>
            <a
              href={POOL_URL}
              target="_blank"
              rel="noreferrer"
              title={poolManifest.poolAddress}
              aria-label={`Devnet pool ${poolManifest.poolAddress} on Solana Explorer`}
            >
              {shortenAddress(poolManifest.poolAddress)}
            </a>
          </dd>
        </div>
        <div>
          <dt>RECEIPT</dt>
          <dd>
            <a
              href={RECEIPT_URL}
              target="_blank"
              rel="noreferrer"
              title={poolManifest.proof.signature}
              aria-label={`Script receipt slot ${RECEIPT_SLOT} on Solana Explorer`}
            >
              SLOT {RECEIPT_SLOT}
            </a>
          </dd>
        </div>
      </dl>

      <div className={styles.footerBar}>
        <nav className={styles.footerNav} aria-label="Footer">
          <Link href="/workspace">WORKSPACE</Link>
          <a href="#problem">MECHANISM</a>
          <a href="#proof">PROOF</a>
        </nav>
        <p>
          <span>AFTERHOURS / STOCKLANA 2026</span>
          <span>DEVNET TEST ASSETS ONLY</span>
          <span>TEST TOKENS ARE NOT BACKED SHARES</span>
          <span>INTERFACE-LEVEL PROTOTYPE</span>
          <a href="https://heronaiapp.com/" target="_blank" rel="noreferrer">DESIGN REFERENCE · HERON AI</a>
        </p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main className={styles.frame}>
      <LaserCrosshair />
      <div className={styles.shell}>
        <header className={styles.nav}>
          <Link className={styles.brand} href="/" aria-label="AfterHours home">
            <span className={styles.brandMark} aria-hidden="true"><i /><i /><i /></span>
            <span>AFTER<span className={styles.brandAccent}>HOURS</span></span>
          </Link>
          <nav className={styles.navLinks} aria-label="Main navigation">
            <a href="#problem"><span className={styles.navText}><span>THE MECHANISM</span><span aria-hidden="true">THE MECHANISM</span></span><span className={styles.navCorner} aria-hidden="true">⌟</span></a>
            <a href="#proof"><span className={styles.navText}><span>THE PROOF</span><span aria-hidden="true">THE PROOF</span></span><span className={styles.navCorner} aria-hidden="true">⌟</span></a>
          </nav>
          <Link className={styles.navAction} href="/workspace">OPEN WORKSPACE <Arrow /></Link>
        </header>

        <div className={styles.ruler} aria-hidden="true"><span>+</span><span>+</span></div>

        <DataTicker />

        <section className={styles.hero} id="idea" aria-labelledby="hero-heading">
          <div className={styles.heroTopline}>
            <span>01 / A REFERENCE-AWARE ROUTE PROTOTYPE</span>
            <DecayClock />
          </div>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.overline}><span aria-hidden="true" /> AFTER THE CLOSING BELL</p>
              <h1 id="hero-heading">STOCK-TOKEN<br />SWAPS.<br /><em>AFTER HOURS.</em></h1>
              <p className={styles.lede}>Stock tokens keep trading while the underlying stock reference can grow stale. AfterHours explores a route that tightens trade limits or pauses as reference quality weakens.</p>
              <div className={styles.proofRow}>
                <a
                  className={styles.proofChip}
                  href={RECEIPT_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className={styles.proofDot} aria-hidden="true" />
                  SCRIPT-SIGNED SWAP VERIFIED · SLOT {RECEIPT_SLOT}
                  <span aria-hidden="true">↗</span>
                </a>
                <span className={styles.pendingTag}>PYTH + ON-CHAIN GUARD PENDING</span>
              </div>
              <div className={styles.heroActions}>
                <Link className={styles.primaryAction} href="/workspace"><span>OPEN WORKSPACE</span><Arrow /></Link>
                <a className={styles.secondaryAction} href="#route">EXPLORE THE ROUTE DESIGN <span aria-hidden="true">↓</span></a>
              </div>
              <p className={styles.heroFootnote}>DEVNET TEST ASSETS · NOT BACKED SHARES</p>
            </div>
            <RouteDrawing />
          </div>
          <div className={styles.bottomRail}>
            <span>REFERENCE / DECISION / EXECUTION</span>
            <span>DESIGNED FOR UNCERTAIN MARKET HOURS</span>
          </div>
        </section>

        <BuiltWith />

        <ProblemMechanism />

        <ProofCta />
        <Footer />
      </div>
    </main>
  );
}
