export function BrandMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className={className}>
    <rect x="1" y="1" width="38" height="38" rx="14" fill="var(--lavender)" />
    <path d="M10 27V16a4 4 0 0 1 7-2.65L26 24V13" stroke="var(--accent-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="29" cy="11" r="3" fill="var(--coral-strong)" />
  </svg>;
}

export function Sparkle({ className }: { className?: string }) {
  return <svg viewBox="0 0 64 64" aria-hidden="true" className={className} fill="currentColor">
    <path d="M32 3c4 0 5 15 10 20s19 5 19 9-14 4-19 9-6 20-10 20-5-15-10-20S3 36 3 32s14-4 19-9S28 3 32 3Z" />
  </svg>;
}

export function HandDrawnLine() {
  return (
    <svg className="hand-drawn-line" viewBox="0 0 300 22" fill="none" aria-hidden="true" focusable="false">
      <path d="M6 13C72 2 189 2 293 10M40 20c74-9 149-9 213-5" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function StudioShapes() {
  return <svg className="studio-shapes" viewBox="0 0 260 200" fill="none" aria-hidden="true">
    <path d="M38 137c-19-31-5-70 22-88 30-19 47-6 71-12 33-8 59 5 66 30 7 28 24 31 22 55-2 33-42 53-84 49-43-4-77-1-97-34Z" fill="var(--lavender)" />
    <rect x="66" y="64" width="132" height="91" rx="17" fill="var(--surface-elevated)" stroke="var(--illustration-stroke)" strokeWidth="2" transform="rotate(-6 66 64)" />
    <path d="m85 89 91-10" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="84" cy="77" r="3" fill="var(--coral-strong)" />
    <circle cx="95" cy="76" r="3" fill="var(--mint-strong)" />
    <path d="m110 106-12 12 14 8m34-25 14 9-12 12m-22-20-5 25" stroke="var(--accent-text)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M204 32c2 0 3 10 6 13s13 3 13 6-10 3-13 6-4 13-6 13-3-10-6-13-13-4-13-6 10-3 13-6 4-13 6-13Z" fill="var(--coral)" stroke="var(--illustration-stroke)" strokeWidth="1.5" />
    <circle cx="49" cy="137" r="18" fill="var(--mint)" stroke="var(--illustration-stroke)" strokeWidth="1.5" />
    <path d="m41 137 5 5 10-11" stroke="var(--mint-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m77 28 4-7m-13 4-3-7m-2 15-7-1" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" />
    <path d="M200 165c7 7 15 7 22 0" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}
