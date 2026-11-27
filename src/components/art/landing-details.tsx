// Small original scenes sharing HeroWorkshop's rounded window, ribbon and orbital grammar.
export function ServiceScene({ kind }: { kind: "web" | "bots" | "systems" | "automation" }) {
  return (
    <svg className="service-scene" viewBox="0 0 180 120" width="180" height="120" fill="none" aria-hidden="true" focusable="false">
      {kind === "web" ? <>
        <rect x="25" y="21" width="132" height="84" rx="13" fill="var(--surface-elevated)" stroke="var(--art-line)" strokeWidth="1.5" transform="rotate(-5 90 60)" />
        <path d="m30 44 123-11" stroke="var(--art-line)" strokeWidth="1.2" />
        <circle cx="39" cy="32" r="2.5" fill="var(--coral-strong)" />
        <rect x="42" y="57" width="45" height="31" rx="7" fill="var(--art-mint)" />
        <path d="m103 59 35-3m-35 15 27-2m-27 14 17-1" stroke="var(--art-line)" strokeWidth="3" strokeLinecap="round" />
        <path d="m142 91 6 12m-2-10 12 2" stroke="var(--coral-strong)" strokeWidth="2" strokeLinecap="round" />
      </> : kind === "bots" ? <>
        <path d="M56 59c14-25 55-25 68 0m-68 13c14 25 55 25 68 0" stroke="var(--art-orbit)" strokeWidth="1.5" strokeDasharray="4 4" />
        <rect x="17" y="40" width="54" height="44" rx="14" fill="var(--art-mint)" stroke="var(--art-line)" strokeWidth="1.5" />
        <rect x="111" y="36" width="54" height="44" rx="14" fill="var(--surface-elevated)" stroke="var(--art-line)" strokeWidth="1.5" />
        <path d="m32 61 7 6 13-15m74-1h24m-24 10h15" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="89" cy="38" r="6" fill="var(--art-coral)" />
        <circle cx="89" cy="91" r="4" fill="var(--art-lavender)" />
      </> : kind === "systems" ? <>
        <rect x="28" y="20" width="126" height="85" rx="13" fill="var(--surface-elevated)" stroke="var(--art-line)" strokeWidth="1.5" />
        <rect x="40" y="33" width="25" height="58" rx="6" fill="var(--lavender)" />
        <rect x="77" y="33" width="65" height="17" rx="6" fill="var(--art-mint)" />
        <path d="M82 88V73m18 15V63m18 25V68m18 20V58" stroke="var(--art-lavender)" strokeWidth="7" strokeLinecap="round" />
        <path d="m15 22 6-8m-7 0 8 7" stroke="var(--coral-strong)" strokeWidth="2" strokeLinecap="round" />
      </> : <>
        <path d="M29 36h87c31 0 33 48 2 48H57" stroke="var(--art-line)" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" />
        <rect x="20" y="23" width="38" height="30" rx="9" fill="var(--surface-elevated)" stroke="var(--art-line)" strokeWidth="1.5" />
        <rect x="111" y="54" width="43" height="38" rx="12" fill="var(--art-mint)" stroke="var(--art-line)" strokeWidth="1.5" />
        <path d="m123 74 6 6 13-15m-65 4-14 15 14 13" stroke="var(--mint-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="89" cy="35" r="7" fill="var(--art-coral)" />
      </>}
    </svg>
  );
}

export function PortfolioSketch() {
  return (
    <svg className="portfolio-sketch" viewBox="0 0 220 160" width="220" height="160" fill="none" aria-hidden="true" focusable="false">
      <path d="M41 99c-16-36 4-68 44-72 31-3 37 17 57 16 40-1 52 56 23 77-34 25-102 28-124-21Z" fill="var(--lavender)" />
      <rect x="56" y="43" width="115" height="84" rx="13" fill="var(--surface-elevated)" stroke="var(--art-line)" strokeWidth="1.5" transform="rotate(-7 110 80)" />
      <path d="m71 108 23-26 17 13 17-22 25 24" stroke="var(--art-line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="85" cy="67" r="7" fill="var(--art-mint)" />
      <path d="M174 26c2 0 3 12 7 16s16 5 16 7-12 3-16 7-5 16-7 16-3-12-7-16-16-5-16-7 12-3 16-7 5-16 7-16Z" fill="var(--art-coral)" />
      <path d="m39 126 7 8m-11-1 9-7" stroke="var(--art-line)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IdeaCompanion() {
  return (
    <svg className="idea-companion" viewBox="0 0 220 160" width="220" height="160" fill="none" aria-hidden="true" focusable="false">
      <path d="M29 109c-19 0-25-27-8-37 2-22 23-36 43-26 12-36 64-31 70 6 25-8 47 10 46 34 30 2 30 41-1 41H50Z" fill="var(--art-mint)" stroke="var(--art-line)" strokeWidth="1.5" />
      <path d="M73 93c18-14 35-14 52 0m-18-13 18 13-18 13" stroke="var(--mint-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M170 11c2 0 3 11 7 15s15 5 15 7-11 3-15 7-5 15-7 15-3-11-7-15-15-5-15-7 11-3 15-7 5-15 7-15Z" fill="var(--art-coral)" />
      <path d="M61 144c35 9 79 4 110-12" stroke="var(--art-orbit)" strokeWidth="1.5" strokeDasharray="4 5" strokeLinecap="round" />
    </svg>
  );
}
