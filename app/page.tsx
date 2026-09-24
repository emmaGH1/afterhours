import Link from "next/link";
import styles from "./landing.module.css";

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M3 17 17 3M7 3h10v10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function RouteDrawing() {
  return (
    <figure className={styles.drawing} id="route">
      <div className={styles.drawingTop}>
        <span>FIG. 01 / THE AFTERHOURS ROUTE</span>
        <span>DEVNET CONCEPT MODEL</span>
      </div>
      <svg className={styles.diagram} viewBox="0 0 680 472" role="img" aria-labelledby="route-title route-desc">
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
        <text className={styles.gateLarge} x="270" y="208">OPEN</text>
        <text className={styles.gateLarge} x="270" y="243">LIMIT</text>
        <text className={styles.gateLarge} x="270" y="278">PAUSE</text>
        <rect x="409" y="146" width="6" height="6" fill="#fa3600" />
        <rect x="409" y="262" width="6" height="6" fill="#fa3600" />

        <path className={styles.routeLine} d="M427 215H462" />
        <path className={styles.arrow} d="m454 207 8 8-8 8" />

        <rect className={styles.node} x="462" y="147" width="176" height="136" />
        <text className={styles.nodeSmall} x="477" y="173">SOLANA TEST POOL</text>
        <text className={styles.nodeLarge} x="477" y="217">SWAP</text>
        <path className={styles.nodeRule} d="M477 233H623" />
        <text className={styles.nodeDetail} x="477" y="254">USDC-TEST</text>
        <text className={styles.nodeDetail} x="477" y="272">→ AAPLX-TEST</text>

        <text className={styles.diagramLabel} x="42" y="379">REFERENCE FRESHNESS</text>
        <path className={styles.scaleLine} d="M42 392H638" />
        <circle cx="42" cy="392" r="4" fill="#282828" />
        <circle cx="340" cy="392" r="4" fill="#fa3600" />
        <circle cx="638" cy="392" r="4" fill="#282828" />
        <text className={styles.scaleText} x="42" y="417">FRESH / OPEN</text>
        <text className={styles.scaleText} x="340" y="417" textAnchor="middle">AGING / LIMITED</text>
        <text className={styles.scaleText} x="638" y="417" textAnchor="end">STALE / PAUSED</text>
      </svg>
      <div className={styles.mobileRoute}>
        <div><span>01 / REFERENCE</span><strong>AAPL</strong><small>SESSION · AGE · CONFIDENCE</small></div>
        <span className={styles.mobileArrow} aria-hidden="true">↓</span>
        <div><span>02 / POLICY</span><strong>OPEN / LIMIT / PAUSE</strong><small>FRESHNESS CHANGES THE CAP</small></div>
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

export default function Home() {
  return (
    <main className={styles.frame}>
      <div className={styles.shell}>
        <header className={styles.nav}>
          <Link className={styles.brand} href="/" aria-label="AfterHours home">
            <span className={styles.brandMark} aria-hidden="true"><i /><i /><i /></span>
            <span>AFTER<span className={styles.brandAccent}>HOURS</span></span>
          </Link>
          <nav className={styles.navLinks} aria-label="Main navigation">
            <a href="#idea">THE IDEA<span aria-hidden="true">⌟</span></a>
            <a href="#route">THE ROUTE<span aria-hidden="true">⌟</span></a>
            <Link href="/workspace">WORKSPACE<span aria-hidden="true">⌟</span></Link>
          </nav>
          <Link className={styles.navAction} href="/workspace">OPEN WORKSPACE <Arrow /></Link>
        </header>

        <div className={styles.ruler} aria-hidden="true"><span>+</span><span>+</span></div>

        <section className={styles.hero} id="idea" aria-labelledby="hero-heading">
          <div className={styles.heroTopline}>
            <span>01 / A REFERENCE-AWARE ROUTE PROTOTYPE</span>
            <span>BUILT ON SOLANA · DEVNET PROTOTYPE</span>
          </div>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.overline}><span aria-hidden="true" /> AFTER THE CLOSING BELL</p>
              <h1 id="hero-heading">STOCK-TOKEN<br />SWAPS.<br /><em>AFTER HOURS.</em></h1>
              <p className={styles.lede}>Stock tokens keep trading while the underlying stock reference can grow stale. AfterHours explores a route that tightens trade limits or pauses as reference quality weakens.</p>
              <p className={styles.prototypeStatus}>Current prototype: devnet pool swap proven. Live Pyth verification and on-chain guard pending.</p>
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
      </div>
    </main>
  );
}
