// Original NovAir vector composition. Interface fragments are symbolic artwork, not product UI.
// No filters, random IDs, remote resources, SVG text, or animation timers.
export function HeroWorkshop() {
  return (
    <svg
      className="hero-workshop"
      viewBox="0 0 560 480"
      width="560"
      height="480"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M111 114C164 59 277 45 355 89c79 45 118 133 87 213-30 76-141 120-230 94C117 369 43 242 78 171c9-19 18-39 33-57Z"
        fill="var(--art-field)"
      />
      <path
        d="M80 297C22 230 106 131 232 96c122-34 245-8 263 62 10 37-20 78-74 110"
        stroke="var(--art-orbit)"
        strokeWidth="1.5"
        strokeDasharray="4 7"
        strokeLinecap="round"
      />
      <path
        d="M85 295c56 61 186 72 288 36 60-21 110-56 128-94"
        stroke="var(--art-orbit)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <g className="workshop-board" transform="rotate(-7 280 230)">
        <rect x="117" y="139" width="333" height="241" rx="24" fill="var(--art-underlay)" />
        <rect x="102" y="121" width="333" height="241" rx="24" fill="var(--surface-elevated)" stroke="var(--art-line)" strokeWidth="2" />
        <path d="M103 167h331" stroke="var(--border)" strokeWidth="1.5" />
        <circle cx="125" cy="144" r="4" fill="var(--coral-strong)" />
        <circle cx="140" cy="144" r="4" fill="var(--mint-strong)" />
        <circle cx="155" cy="144" r="4" fill="var(--art-lavender)" />
        <rect x="336" y="139" width="69" height="9" rx="4.5" fill="var(--lavender)" />
        <rect x="125" y="188" width="285" height="149" rx="13" fill="var(--art-canvas)" />
        <path d="M142 314h249m-249-21h249m-249-21h249m-249-21h249m-249-21h249m-249-21h249M164 195v135m26-135v135m26-135v135m26-135v135m26-135v135m26-135v135m26-135v135m26-135v135m26-135v135" stroke="var(--art-grid)" strokeWidth="1" />
        <path d="M189 296v-66c0-14 17-19 25-8l67 76c9 10 25 5 25-9v-68" stroke="var(--art-ribbon-edge)" strokeWidth="33" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M189 291v-66c0-14 17-19 25-8l67 76c9 10 25 5 25-9v-68" stroke="var(--art-mint)" strokeWidth="29" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m200 223 23 27m54 19 16 18" stroke="var(--art-ribbon-shine)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="306" cy="199" r="12" fill="var(--art-coral)" stroke="var(--art-line)" strokeWidth="1.5" />
        <path d="m353 209 12 12-12 12m-193 68-11 11 11 11" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className="workshop-piece" transform="rotate(10 118 113)">
        <rect x="57" y="69" width="122" height="90" rx="19" fill="var(--surface-elevated)" stroke="var(--art-line)" strokeWidth="1.5" />
        <path d="m84 111 15-15m-15 15 15 15m50-15-15-15m15 15-15 15m-17-37-8 44" stroke="var(--accent-text)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className="workshop-star">
        <path d="M419 59c5 0 6 23 14 31s31 9 31 14-23 6-31 14-9 31-14 31-6-23-14-31-31-9-31-14 23-6 31-14 9-31 14-31Z" fill="var(--art-coral)" stroke="var(--art-line)" strokeWidth="1.5" />
        <path d="m408 101 6 3m13 4 5 2" stroke="var(--coral-text)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g transform="rotate(8 418 355)">
        <path d="M377 374c-16 0-25-9-25-22 0-12 9-22 21-24 2-18 15-31 32-31 16 0 27 9 31 22 17-4 33 7 33 23 12 1 20 9 20 19 0 12-9 21-23 21Z" fill="var(--art-mint)" stroke="var(--art-line)" strokeWidth="1.5" />
        <path d="M386 352c13-11 25-11 38 0m-18-11 18 11-18 11" stroke="var(--mint-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path d="M74 359c2 0 3 12 7 16s16 5 16 7-12 3-16 7-5 16-7 16-3-12-7-16-16-5-16-7 12-3 16-7 5-16 7-16Z" fill="var(--art-lavender)" />
      <path d="m264 56 3-12m-15 17-8-7m29 11 10-4m214 144 10-3m-15 15 8 5" stroke="var(--art-line)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="94" cy="265" r="5" fill="var(--art-coral)" />
      <circle cx="491" cy="190" r="4" fill="var(--art-mint)" />
      <path d="M216 424c17 8 45 9 63 0" stroke="var(--art-orbit)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
