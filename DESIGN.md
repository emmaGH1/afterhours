# AfterHours SERV edition — current design direction

This section supersedes the historical reference extraction below for product flow. User approved a full landing/workspace revamp on September 27, 2026. Read .hackathon/SERV_BUILD_BRIEF.md and lib/review-contract.ts.

Design a decision desk, not a trading dashboard with an AI card attached. Primary hierarchy: user's intent and amount; dated evidence; three feasible/infeasible alternatives; SERV's selected plan and explanation; application validation; optional wallet action. Show actual tool/completion provenance without pretending to expose internal reasoning. Landing mechanism must place SERV comparison visibly between evidence gathering and validated plan. Lead proof with the new review workflow; old script settlement is supplementary.

Retain the original AfterHours mark, warm paper, charcoal, vermilion action, square geometry, hairlines, open fonts and restrained motion. Reorganize layouts and copy substantially. Color change is not a priority. Use readable body copy and short mono metadata; prioritize clarity over implementation jargon. Errors, unavailable evidence, waiting, expiry and loading are designed states. Respect reduced motion and keyboard access. Mobile should remain a complete decision flow. No proprietary Heron assets/fonts/copy.

Refinement September 27: white small-text primary actions use darker vermilion #d92c00 (4.87:1 against white), with #bd2700 hover. Large vermilion accents keep the existing brand color. Make scenario illustrations distinct from actual review evidence, show structural checks beside the plan, and finish the desk with explicit next steps and a readable boundary ledger.

The following is historical visual research, not product copy or permission to reuse proprietary assets.
---
name: "Heron AI"
description: "An AI agent that works inside your design tools (Revit, Rhino, ArchiCAD, SketchUp) to spot code and constructability problems and execute edits directly in BIM/CAD models."
url: "https://heronaiapp.com/"
version: "1.0.0"
extractedWith: "hyperbrowser-app-examples (designmd-url)"
colors:
  brand: "#FA3600"
  brandSecondary: "#F15534"
  primary: "#282828"
  secondary: "#414140"
  tertiary: "rgba(40, 40, 40, 0.72)"
  surface: "#72726F"
  graniteGray: "#626260"
  border: "#B3B3AF"
  disable: "#B4B4B0"
  background: "#F8F8F6"
  backgroundDark: "#282828"
  white: "#FFFFFF"
  accent: "#0000EE"
  selection: "#E15C46"
typography:
  heading:
    fontFamily: "BT Grotesk"
    fallback: "Arial, sans-serif"
    weights: [400, 500, 600, 700]
  body:
    fontFamily: "BT Grotesk"
    fallback: "Arial, sans-serif"
    weights: [400, 500]
  mono:
    fontFamily: "Geistmono"
    fallback: "Courier, monospace"
    weights: [500]
spacing:
  baseUnit: 4
  borderRadius: "0px"
  borderWidth: "max(1px, 0.1rem)"
personality:
  tone: "precision-engineered, architectural, technical, utilitarian"
  energy: "focused, high-utility"
  targetAudience: "Architects, structural engineers, computational designers, and BIM managers"
---

# Heron AI Design System (DESIGN.md)

Extracted from [heronaiapp.com](https://heronaiapp.com/) using **Hyperbrowser** (`@hyperbrowser/sdk` `web.fetch` branding engine) and live Webflow runtime stylesheet analysis. Follows the [Google open DESIGN.md standard](https://github.com/google-labs-code/design.md).

---

## 1. Design Philosophy: Architectural Utilitarianism

Heron AI's design language reflects its target domain: architecture, structural engineering, and building information modeling (BIM). It synthesizes Swiss Modernism and CAD blueprint aesthetics:
- **Sharp Geometry (0px Radius)**: Every card, button, modal, and input features strictly squared `0px` border-radii, echoing architectural drafts and drafting paper.
- **Structural Hairlines**: Visual hierarchy is maintained using strict `1px` structural hairline grid dividers (`--content--border: #B3B3AF`) and dashed technical lines instead of soft shadows or blur effects.
- **Restrained Neutral Palette with High-Contrast Vermilion**: The interface is anchored in warm industrial grays and charcoals (`#282828`), punctuated with a high-visibility architectural safety vermilion (`#FA3600`).
- **Precision Dual-Type System**: Humanist technical neo-grotesque (`BT Grotesk`) paired with a high-legibility developer monospace (`Geistmono`) for metadata, coordinates, and technical badges.

---

## 2. Color System & Design Tokens

### Core Color Palette

| Token Name | Hex Code | Purpose & Application |
| :--- | :--- | :--- |
| `color-brand` | `#FA3600` | Primary call-to-actions, active highlights, key brand accents, alert indicators |
| `color-brand-secondary` | `#F15534` | Hover states for brand elements, secondary highlights |
| `color-primary` | `#282828` | Main text color, primary dark structural fills, headings |
| `color-secondary` | `#414140` | Secondary copy, subheading labels |
| `color-tertiary` | `rgba(40, 40, 40, 0.72)` | Captions, subtle technical descriptors, muted copy |
| `color-surface` | `#72726F` | Intermediate neutral surfaces, disabled icons |
| `color-granite-gray` | `#626260` | Architectural accents, secondary borders |
| `color-border` | `#B3B3AF` | Grid structural borders, horizontal/vertical divider hairlines |
| `color-disable` | `#B4B4B0` | Inactive states, disabled input borders |
| `color-background` | `#F8F8F6` | Light theme blueprint canvas background |
| `color-background-dark`| `#282828` | Dark contrast sections, footer blocks, immersive preview panels |
| `color-white` | `#FFFFFF` | Text on brand backgrounds, card surfaces |
| `color-selection` | `#E15C46` | Text selection highlight (`::selection`) |
| `color-link` | `#0000EE` | Default unvisited web hyperlinks |

### CSS Variables Root Definition

```css
:root {
  --content--brand: #fa3600;
  --content--brand-hover: #f15534;
  --content--primary: #282828;
  --content--secondary: #414140;
  --content--terriary: rgba(40, 40, 40, 0.72);
  --content--surface: #72726f;
  --content--granite-gray: #626260;
  --content--border: #b3b3af;
  --content--disable: #b4b4b0;
  --content--white: #ffffff;
  --size--border: max(1px, 0.1rem);
  --size--padding-hero: calc(4.4rem + 1rem * 2);
  --size--max-screen-height: calc(100dvh - 1.6rem);
  --bg-img: url('https://cdn.prod.website-files.com/68f73a0fbae6fa626a19135c/6900476d411e3ea05889428f_bg.svg');
  --bg-grid: url('https://cdn.prod.website-files.com/68f73a0fbae6fa626a19135c/68faf70718094e7433046fcc_bg-deco.svg');
}

::selection {
  background-color: #e15c46;
  color: #ffffff;
}
```

---

## 3. Typography Scale & Hierarchy

### Font Families
1. **Primary / Display / Heading**: `BT Grotesk`
   - Formats: `.woff2` (Regular 400, Medium 500, SemiBold 600, Bold 700 + Italics)
   - Fallback: `Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
   - Letter Spacing: `-0.02em`
2. **Monospace / Technical Metadata**: `Geistmono`
   - Formats: `.woff2` (Medium 500)
   - Fallback: `SFMono-Regular, Menlo, Monaco, Consolas, monospace`
   - Transformation: `uppercase` with tracking `0em`

### Type Hierarchy Scale

| Level | Size (rem / px equiv.) | Weight | Line Height | Case / Tracking | Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero H1** | `5.6rem` (56px) | Bold (700) | `1.0` | Uppercase, `-0.02em` | Homepage hero headline |
| **Section H2** | `4.8rem` (48px) | SemiBold (600) | `1.0` | Uppercase, `-0.02em` | Major section titles |
| **Card H3** | `4.0rem` (40px) | SemiBold (600) | `1.0` | Uppercase, `-0.02em` | Feature hero titles |
| **H4** | `3.2rem` (32px) | SemiBold (600) | `1.0` | Uppercase, `-0.02em` | Group headers |
| **H5** | `2.8rem` (28px) | SemiBold (600) | `1.0` | Uppercase, `-0.02em` | Module titles |
| **H6 / Subhead**| `2.4rem` (24px) | SemiBold (600) | `1.1` | Uppercase, `-0.02em` | Modal headers, subheads |
| **Large Body** | `2.0rem` (20px) | Medium (500) | `1.2` | Normal, `-0.02em` | Hero lead paragraph |
| **Standard Body**| `1.6rem` (16px) | Medium (500) | `1.3` | Normal, `-0.02em` | Main body paragraphs, inputs |
| **Small Body** | `1.4rem` (14px) | Regular / Med | `1.4` | Normal, `-0.02em` | Secondary descriptions |
| **Mono Label** | `1.2rem` (12px) | Medium (500) | `1.2` | Uppercase, `Geistmono` | Table numbers, status tags |
| **Mono Badge** | `1.0rem` (10px) | Medium (500) | `1.3` | Uppercase, `Geistmono` | Footnotes, coordinate tags |

---

## 4. Spacing, Grid Geometry & Border Lines

### Fluid Scaling Formula
Heron AI uses a proportional viewport-scaled rem model on desktop:
```css
html {
  font-size: 0.5787037037vw; /* Sets 1rem ~ 10px on a 1728px viewport */
  -webkit-font-smoothing: antialiased;
}

@media only screen and (max-width: 991px) {
  html {
    font-size: 1.1990407674vw;
  }
}

@media only screen and (max-width: 767px) {
  html {
    font-size: 2.5445292621vw;
  }
}
```

### The Architectural Hairline Grid
Rather than using card drop shadows (`box-shadow: none`), layout containers are bounded by explicit hairline borders:
- **Solid Vertical & Horizontal Hairlines**:
  - Border width: `var(--size--border): max(1px, 0.1rem)`
  - Color: `var(--content--border): #B3B3AF`
- **Dashed Hairlines (Blueprint Grid)**:
  - SVG Repeat: `url(https://cdn.prod.website-files.com/6a4b5161f0d11f1602cc3bbf/6a4b5161f0d11f1602cc3c0e_border.svg)`
  - Pattern: `0.1rem 1.6rem` repeat-y / `1.6rem 0.1rem` repeat-x

---

## 5. Component Patterns & Interaction Design

### A. Primary Brand Action Button (`.btn-bg-brand`)
```html
<a href="/get-started" class="btn-bg-brand">
  <span>Request Access</span>
  <svg class="btn-ic" viewBox="0 0 16 16">...</svg>
</a>
```
- **Normal**: Background `#FA3600`, text `#FFFFFF`, 0px border radius, uppercase typography, padding `1.2rem 2.4rem`.
- **Hover**: Transitions background to `#282828` or `#F15534`, arrow icon translates diagonally `translate(2px, -2px)`.

### B. Precision Dot Button (`.btn-dot`)
Dual-layer text that swaps vertically on hover with corner coordinate micro-icons:
```css
.btn-dot:hover .btn-dot-txt:first-child {
  transform: translateY(-100%);
}
.btn-dot:hover .btn-dot-txt:last-child {
  transform: translateY(0%);
}
.btn-dot:hover .btn-ic.top.left {
  transform: translate(0, 0);
}
```

### C. Technical Input Fields
- Background: `transparent`
- Text: `#282828` (1.6rem, font-weight 500)
- Border: `1px solid #B3B3AF`
- Border-radius: `0px`
- Focus State: Border color `#282828`, `outline: none`

### D. Continuous Marquee Ticker
```css
@keyframes marqueeLeft {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}
.marquee-left.anim {
  animation: marqueeLeft 30s linear infinite;
}
```

---

## 6. Brand Identity & Vector Assets

### Official Wordmark (SVG)
```xml
<svg width="122" height="20" viewBox="0 0 122 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M118.393 0.0989723H122V19.901H118.393V0.0989723Z" fill="#282828"/>
  <path d="M99.4956 7.82174L105.007 0.0989723H109.842L115.354 7.82174C115.742 8.3663 115.855 8.76234 115.855 9.45541V19.901H112.247V15.0618H102.602V19.901H98.9946V9.45541C98.9946 8.76234 99.1073 8.3663 99.4956 7.82174ZM102.602 11.8688H112.247V10.3341C112.247 9.93808 112.172 9.71531 111.846 9.24501L107.525 2.92075H107.324L103.003 9.24501C102.677 9.71531 102.602 9.93808 102.602 10.3341V11.8688Z" fill="#282828"/>
  <path d="M73.3252 19.901V0.0989723H76.9327L86.2646 9.59155H86.465V0.0989723H90.0725V19.901H86.465V15.594C86.465 14.901 86.3273 14.5049 85.8638 14.0099L77.1332 5.24749H76.9327V19.901H73.3252Z" fill="#282828"/>
  <path d="M58.5232 20C57.2205 20 55.6171 18.8614 54.2267 17.3639C52.899 15.9158 52.16 14.5297 52.16 13.3787V6.63366C52.16 5.4703 52.899 4.08416 54.2267 2.64851C55.6171 1.13861 57.2205 0 58.5232 0H64.6609C65.9636 0 67.567 1.13861 68.9574 2.64851C70.2851 4.08416 71.0242 5.4703 71.0242 6.63366V13.3787C71.0242 14.5297 70.2851 15.9158 68.9574 17.3639C67.567 18.8614 65.9636 20 64.6609 20H58.5232ZM63.5211 16.6708C64.3979 16.6708 65.187 16.1262 65.9636 15.3465C66.8154 14.5173 67.3666 13.5149 67.3666 12.5495V7.46287C67.3666 6.48515 66.8154 5.50742 65.9636 4.66584C65.187 3.88614 64.3979 3.32921 63.5211 3.32921H59.6631C58.7862 3.32921 57.9971 3.88614 57.2205 4.66584C56.3812 5.49505 55.8176 6.48515 55.8176 7.46287V12.5495C55.8176 13.5149 56.3687 14.5173 57.2205 15.3465C57.9971 16.1262 58.7862 16.6708 59.6631 16.6708H63.5211Z" fill="#282828"/>
  <path d="M35.5984 19.901V0.0989723H45.7946C47.9866 0.0989723 50.3039 2.43808 50.3039 4.25739V7.90838C50.3039 9.46778 48.4877 11.6584 46.6714 12.2648V12.4133L50.9929 19.7029V19.901H46.7841L42.5378 12.4257H39.2059V19.901H35.5984ZM44.2414 9.10887C45.8948 9.10887 46.6213 8.25491 46.6213 7.21531V5.37125C46.6213 4.23264 45.8948 3.4158 44.2414 3.4158H39.2059V9.10887H44.2414Z" fill="#282828"/>
  <path d="M23.5474 16.5965H33.3177V19.901H19.9399V0.0989723H33.2175V3.4158H23.5474V7.98264H32.3657V11.2871H23.5474V16.5965Z" fill="#282828"/>
  <path d="M0 19.901V0.0989723H3.6075V7.98264H13.4404V0.0989723H17.0479V19.901H13.4404V11.2871H3.6075V19.901H0Z" fill="#282828"/>
</svg>
```

### Brand Media Assets
- **Favicon (Light Mode)**: `https://cdn.prod.website-files.com/6a4b5161f0d11f1602cc3bbf/6a69ba2640fdb174e5b57241_favicon-light.png`
- **Favicon (Dark Mode)**: `https://cdn.prod.website-files.com/6a4b5161f0d11f1602cc3bbf/6a6b2ed0ea684adcb57a2262_favicon-dark.png`
- **Webclip (180x180)**: `https://cdn.prod.website-files.com/6a4b5161f0d11f1602cc3bbf/6a68537337dfbd2cb268f8f0_webclip.png`
- **OpenGraph Image**: `https://cdn.prod.website-files.com/6a4b5161f0d11f1602cc3bbf/6a6b2eee5ed9e07d1513ca80_OG.jpg`
- **Background Texture**: `https://cdn.prod.website-files.com/68f73a0fbae6fa626a19135c/6900476d411e3ea05889428f_bg.svg`

---

## 7. Tailwind CSS Configuration Preset

Developers implementing the Heron AI design system in Tailwind CSS can paste this configuration:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FA3600',
          hover: '#F15534',
        },
        surface: {
          DEFAULT: '#72726F',
          dark: '#282828',
          light: '#F8F8F6',
        },
        border: {
          hairline: '#B3B3AF',
          disabled: '#B4B4B0',
        },
        primary: '#282828',
        secondary: '#414140',
        tertiary: 'rgba(40, 40, 40, 0.72)',
      },
      fontFamily: {
        sans: ['"BT Grotesk"', 'Arial', 'sans-serif'],
        heading: ['"BT Grotesk"', 'Arial', 'sans-serif'],
        mono: ['"Geistmono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        full: '9999px',
      },
      borderWidth: {
        hairline: 'max(1px, 0.1rem)',
      },
    },
  },
  plugins: [],
};
```

---

## 8. Motion Design, Interactive Mechanics & Animation Architecture

Heron AI’s visual immersion comes from a tightly choreographed motion architecture built with **GSAP 3**, **ScrollTrigger**, **SplitText**, **Lenis Smooth Scroll**, and custom **SVG Ink-Mask / Blueprint Reveal** shaders. The entire experience simulates an active CAD drafting session and architectural drawing board.

### A. The "Architectural Sketch / Drawing" Reveal Engine

The site's signature effect—where 3D BIM models, diagrams, and sections appear as if they are being hand-drawn onto drafting paper—is powered by a custom SVG dynamic mask pipeline:

1. **SVG Ink-Mask System (`.ink-mask`, `p0` Engine)**:
   - **Mask Asset**: Driven by `https://heronai-bp.netlify.app/assets/pixel-mask.svg` and procedural SVG filter chains (`<feTurbulence>`, `<feFuncA>`, `maskUnits="userSpaceOnUse"`).
   - **Dynamic Aspect Ratio Calculation**:
     ```javascript
     const s = 1000;
     const r = this.DOM.el.offsetWidth;
     const c = this.DOM.el.offsetHeight;
     const ratio = (c / r) * s;
     this.DOM.svg.setAttribute("viewBox", `0 0 ${s} ${ratio}`);
     ```
   - **Mask Clipping**: Images are nested under an SVG `<mask id="mask-[index]">` and bound with `-webkit-mask-image: url(#mask-[index])`.
   - **Progressive Reveal Tween**:
     ```javascript
      gsap.fromTo(element,
       { "--trans-percent": "100%", "--mask-percent": "50%" },
       { "--trans-percent": "0%", "--mask-percent": "0%", duration: 0.8, ease: "power2.inOut" }
     );
     ```
2. **Hairline Line Drawing (`.line-horizital`, `.line-vertical`)**:
   - Structural dividers don't fade in; they "draw" across coordinates:
     - Vertical lines: `scaleY: 0 -> 1` with `transformOrigin: "top left"` (or `center center` when center-aligned).
     - Horizontal lines: `scaleX: 0 -> 1` with `transformOrigin: "top left"`.
     - Duration: `1.2s`, ease: `none` or `expo.out`.

### B. CAD Precision Crosshair Cursor System

The cursor is not a standard pointer; it acts as a digital drafting crosshair that interacts with the entire grid:

1. **Canvas Cursor & Laser Lines (`#canvas-cursor`, `#canvas-cursor-hover`)**:
   - Two viewport-wide coordinate laser lines follow the pointer:
     - `.home-hero-cursor-line.line-vertical`: Follows `mousePos.x` across the X-axis.
     - `.home-hero-cursor-line.line-horizital`: Follows `mousePos.y` across the Y-axis.
   - Micro-blend mode: `mix-blend-mode: difference`, opacity: `0.2`.
2. **Cursor States & Attributes**:
   - `[data-cursor="hidden"]`: Suppresses the custom pointer on technical embeds.
   - `[data-cursor-theme="dark"]` / `[data-logo-theme="black"]`: Inverts cursor token colors when traversing high-contrast charcoal surfaces (`#282828`).
   - `.cursor-drag`: Activates grabbing crosshairs when hovering over carousel and model viewers.

### C. SplitText Ignited Typographic Reveals

Headers do not use generic fades. Words ignite in brand vermilion before crystallizing into charcoal:

1. **Word & Character Splitting**:
   ```javascript
   SplitText.create(headingElement, { type: "lines, words" });
   ```
2. **Three-Keyframe Color Wave (`fromColor -> brandOrange -> toColor`)**:
   ```javascript
   gsap.to(split.words, {
     keyframes: {
       color: [
         "rgba(40, 40, 40, 0.2)", // Muted drafting trace
         "#FA3600",                 // Brand vermilion ignition flash
         "#282828"                  // Settled dark graphite text
       ],
       easeEach: "power2.in",
       ease: "power1.out"
     },
     duration: 0.8,
     stagger: 0.03, // or 0.08s on slower cinematic sections
     scrollTrigger: {
       trigger: headingElement,
       start: "top+=40% bottom",
       once: true
     }
   });
   ```
3. **Interactive Terminal Typing**:
   - Chat simulations use an alternating blink cursor:
     `<span class="typed-text"></span><span class="chat-cursor" style="opacity: 1;">|</span>`
   - Emulates live AI prompt generation with variable keystroke delays (`speed: 3`).

### D. Metric Counters & Index Tickers (`.number-index`, `data-number`)

Rating cards and statistical callouts count up smoothly upon entering viewport:
- **Zero-Padding Formatting**: Formatted with architectural index numbering (`01`, `02`, `03`):
  ```javascript
  const formatted = index <= 9 ? "0" + index : String(index);
  ```
- **Scroll Scrubbing**: Coupled with ScrollTrigger to animate numbers in sync with user scrolling velocity.

### E. Interactive Footer & Hover Mechanics

1. **Interactive Blueprint Overlay (`.footer-img-inner`)**:
   - Default state shows the wireframe blueprint illustration.
   - Hovering triggers a crossfade to `.footer-img-item.item2` (`opacity: 1; transition: opacity 0.4s ease;`), revealing the finished rendered architectural facade.
   - Corner plus-marker icons (`.footer-img-plus`) translate outward on hover by `+4px` in each diagonal quadrant.
2. **Dashed Hover Underlines (`.line-dash`)**:
   - Links feature an invisible dashed SVG stroke (`border-black.svg`) that animates into view on hover via `opacity: 0 -> 1; transition: opacity 0.4s`.

### F. Lenis Smooth Scroll & ScrollTrigger Orchestration

The buttery, deliberate scroll feel is powered by a fine-tuned Lenis instance tied to GSAP:
```javascript
const lenis = new Lenis({
  wrapper: document.querySelector('.main-wrap') || window,
  content: document.querySelector('.main-content') || document.body,
  syncTouch: true,
  smoothWheel: true,
  smoothTouch: false,
  infinite: false
});

lenis.on('scroll', (e) => {
  ScrollTrigger.update();
});

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);
```

---

## 9. Structural Architecture & Immersion Mechanics ("The Hidden Engine")

Beyond colors and individual animations, Heron AI’s tactile presence relies on six architectural pillars that separate it from typical marketing websites:

### A. The 100dvh Software Frame Shell (`.body-inner`)
- **Structure**: The page is wrapped in a rigid outer shell:
  ```css
  .body-inner {
    height: 100dvh;
    padding: 0.8rem; /* 8px continuous physical margin */
    overflow: hidden;
  }
  .main-wrap {
    height: 100dvh;
    contain: paint;
    overflow: hidden;
  }
  ```
- **Psychological Effect**: The page never touches the native browser window edges. This creates the unmistakable perception of an installed native CAD application (Revit / Rhino / AutoCAD) rather than an open web tab.

### B. The 1728px Proportion-Locked Fluid Unit Formula
- **The Formula**:
  ```css
  html {
    font-size: 0.5787037037vw; /* (10px / 1728px) * 100 */
    -webkit-font-smoothing: antialiased;
    font-kerning: none;
  }
  ```
- **Proportional Scaling**: Because `100vw / 1728px = 0.05787vw`, `1rem` equals exactly `10px` on a standard 1728px desktop screen. Every spacing, margin, button width, and font size on the site is declared in `rem`.
- **Zero Breakage**: The entire layout scales smoothly up and down like an SVG architectural drawing without collapsing grids, wrapping headlines awkwardly, or misaligning hairlines.

### C. Continuous Drafting Paper Noise Texture
- Flat digital colors (`#FFFFFF` or `#282828`) feel sterile. Heron AI textures every background with an architectural paper tooth:
  ```css
  :root {
    --bg-img: url('https://cdn.prod.website-files.com/68f73a0fbae6fa626a19135c/6900476d411e3ea05889428f_bg.svg');
    --bg-grid: url('https://cdn.prod.website-files.com/68f73a0fbae6fa626a19135c/68faf70718094e7433046fcc_bg-deco.svg');
  }
  .body, .bg-global, .loading-main {
    background-image: var(--bg-img) !important;
    background-repeat: repeat;
    background-size: auto;
  }
  ```

### D. The Live Coordinate Ruler System (`rulerController`)
- **Perimeter Ticks**: Around the hero and preloader, perimeter measuring rulers (`.home-hero-ruler-item`, `.loading-ruler-line`) mimic blueprint borders.
- **Coordinate Tracking**: The JavaScript `ox` ruler controller tracks cursor position across the canvas and outputs real-time coordinate numbers into `.coordi` and `+` marks:
  ```javascript
  this.rulerController = new ox({
    wrapper: ".loading-ruler",
    container: ".loading-main",
    verticalLine: ".loading-ruler-line.line-vertical",
    horizontalLine: ".loading-ruler-line.line-horizital",
    plus: ".loading-ruler-plus",
    coordi: ".loading-ruler-coordi",
    pauseOutside: true
  });
  ```

### E. Zero-White-Flash SPA Page Transitions (Barba.js)
- Driven by `@barba/core` and `@barba/prefetch`.
- Clicking internal links does not trigger browser reloads. Instead:
  1. **`leaveAnim`**: The existing view masks out diagonally via `--trans-percent: 0% -> 100%`.
  2. **`enterPlay`**: The next page container is injected and drawn into view with the SVG ink-mask reveal.
  3. The persistent `Lenis` instance and cursor state survive page switches without resetting.

### F. Tabular Alignment & Micro-Kerning
- Text blocks disable browser kerning jitter: `font-kerning: none`.
- All numbers, counters, timestamps, and metadata tags use `Geistmono` with tabular numbers (`font-variant-numeric: tabular-nums`). When numbers scrub or count up during scroll, elements to the right never vibrate or jitter.
