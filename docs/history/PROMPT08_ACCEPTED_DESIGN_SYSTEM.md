# Design system

## Identity: Pastel Playful Professional

NovAir is a small Persian digital studio with a deliberately crafted, approachable identity. Prompt 02 uses an orbital “idea workshop”: a mint ribbon echoes the existing N monogram, a tilted construction window suggests the web, and a small cloud/arrow, rounded stars and curved strokes add personality. This is decorative artwork, not a product screenshot or invented completed project. No faces, emoji, stock illustration, large bitmap, heavy effect or animation library is required.

The composition is consistent across Hero, service scenes, portfolio empty state, editorial studio introduction, process, FAQ, final CTA and footer. Prompt 03 completes this public experience using the same tokens and artwork grammar; no second design system or palette was introduced. Content remains specific and truthful.

## Final semantic palette

All tokens live in `src/app/globals.css`. Tailwind's inline theme maps background, text, surface, primary, muted, border and font to the same semantic variables. Components consume variables; new sections should not introduce isolated hardcoded color schemes.

| Role | Pastel Dream (light) | Midnight Candy (dark) |
| --- | --- | --- |
| Background | `#f9f7ff` | `#161525` |
| Surface | `#f0edf7` | `#242238` |
| Elevated surface | `#fffdfb` | `#2c2940` |
| Primary text | `#29253f` | `#f6f0ff` |
| Secondary text | `#555168` | `#d6cde6` |
| Muted text | `#676174` | `#b9b0c9` |
| Primary action | `#594279` | `#ccb5f6` |
| On primary | `#fffdfb` | `#292137` |
| Primary hover | `#45325f` | `#ddcafb` |
| Lavender surface / text | `#e9ddfc` / `#594279` | `#3b304f` / `#e1cffc` |
| Mint surface / text | `#def1eb` / `#315e4b` | `#253e3c` / `#c0e3dc` |
| Coral surface / text | `#f9e0dc` / `#814539` | `#46313e` / `#f7b8c7` |
| Decorative border | `#e0d9eb` | `#47405d` |
| Control border | `#888091` | `#94869f` |
| Focus | `#7655a3` | `#c7a5f1` |

The dark palette uses ink/plum and restrained pastel accents; it is not an inversion. Success, warning, danger and information retain separate readable foreground/surface pairs. Interactive/error states use these roles, not decorative artwork colors. Borders defining form controls use `--control-border`, while section separators use the softer decorative border. Focus is a 3px outline with a 4px offset.

Artwork has its own roles so it can adapt without changing functional UI contrast:

| Artwork token | Light | Dark |
| --- | --- | --- |
| `--art-field` | `#e9ddfc` | `#2d2842` |
| `--art-underlay` | `#cbb9e6` | `#48405f` |
| `--art-canvas` | `#f4eefb` | `#231f35` |
| `--art-grid` | `#e0d4ef` | `#39314d` |
| `--art-line` | `#746185` | `#b39fcb` |
| `--art-orbit` | `#b2a2c7` | `#6f6189` |
| `--art-lavender` | `#b69cf3` | `#b9a0f5` |
| `--art-mint` | `#bdebe4` | `#8dc8be` |
| `--art-coral` | `#ffcfcb` | `#e8a8b4` |
| `--art-ribbon-edge` | `#79b7a6` | `#4a8f84` |
| `--art-ribbon-shine` | `#eafcf6` | `#c5eade` |

Radius steps are 12/20/28/40px. Spacing remains 4/8/12/16/24/32/48/64px. Small/elevated shadows are restrained and independently defined in each theme. Transitions use shared 150/220ms durations and easing. Large scrolling surfaces have no blur/backdrop filter.

## Typography and RTL

Preserve the locally hosted Vazirmatn variable WOFF2 Arabic/Persian and Latin subsets through `next/font/local`; the SIL Open Font License 1.1 remains in `public/fonts/LICENSE`. No remote font/CDN request is introduced. Main weights are 400/500/550/700/850. Body is 16px with 1.9 line height; Hero descriptions use 2.1. No extra letter spacing or artificial kashida is applied to Persian.

The Hero headline has two deliberate block lines and a fluid `clamp(2.4rem, 5.4vw, 4.9rem)` scale with 1.65 line height. It can wrap naturally when text grows; no fixed height clips it. The hand-drawn mint line is decorative. Root `lang="fa" dir="rtl"`, logical properties and DOM reading order remain authoritative. Use `TechnicalValue` / `bdi dir="ltr"` for future technical names, URLs and emails. Functional arrow icons are selected for RTL rather than globally mirrored.

## SVG grammar

- `BrandMark`: established rounded N monogram, reused by header/footer/byline.
- `Sparkle`: rounded four-point star for small identity accents.
- `HandDrawnLine`: two restrained curved strokes below the Hero's accent line.
- `HeroWorkshop`: original 560×480 composition, 4,374 bytes of source; ribbon, grid, browser fragment, code fragment, cloud/arrow and orbital strokes form one family.
- Existing `StudioShapes` remains an available foundation asset; it is not redundantly rendered beside the signature Hero.
- `ServiceScene` in `landing-details.tsx`: four small related web/bot/dashboard/workflow scenes, using shared browser fragments, rounded connectors and geometric marks. They illustrate capabilities, not completed work.
- `PortfolioSketch`: a compact picture-frame/star composition for the honest empty/unavailable portfolio presentation.
- `IdeaCompanion`: the recurring cloud/arrow from the Hero, reused at the final CTA without introducing another mascot.

Keep proportions rounded, decorative strokes around 1.5–3.5 units and functional Lucide icons optically consistent. Inline SVGs use currentColor or semantic variables, explicit viewBox/intrinsic geometry, deterministic markup and no remote resources, IDs or filters. Decorative vectors are `aria-hidden`; meaningful future illustrations must have unique accessible names. Artwork does not capture pointer input. Do not encode essential information only in color.

Motion consists of a single short star entrance and gentle hover translations of two SVG groups. There is no continuous background movement, pointer tracking, parallax or timer. All transitions/animations are disabled under reduced motion, and the static composition remains complete.

## Layout and interactions

The container is fluid with a 75rem cap. The preserved Hero stacks content before artwork by default and becomes an RTL content/art pair at 1024px. Mobile artwork is bounded and cannot dominate the first CTA. Prompt 03 replaces the compact capabilities preview with one detailed four-group services presentation. Cards use alternating existing surface/elevated roles, factual examples and small themed scenes. A two-column desktop composition becomes spacious mobile cards with flexible copy/art wrapping; there is no duplicate services grid. Auto-fit constraints and flexible header/footer wrapping accommodate increased text.

Section order is Hero, services, selected work, studio approach, collaboration, FAQ, final CTA, footer. Portfolio empty state is one compact outlined composition, never fake project cards. Real published items automatically use a responsive list, optional local imagery and safely handled links. Why NovAir uses an editorial heading beside three separated notes. The numbered four-step ordered list is horizontal on desktop, two columns on tablet and a vertical connected timeline on mobile. Steps need no interaction. The FAQ pairs a small introduction with outlined question rows; one answer opens at a time. The final lavender CTA and mint cloud conclude the page. No fabricated client metrics, testimonials, policies or contact channels appear.

Header navigation links only to rendered anchors. Below desktop, a compact Radix dialog supplies the mobile menu, with focus trap, initial close-button focus, Escape, outside dismissal, close-on-selection and desktop resize behavior. At the smallest widths, the project CTA is inside that menu as well as in the Hero; at 480px and above it also fits in the header. The header stays in normal flow. The footer includes only real navigation/account links and a server-computed Persian year.

Primary/secondary/ghost buttons have deliberate hover, keyboard focus, active and disabled styles. Links remain anchors; the project action reaches the protected reserved request area through real login, with explicit availability copy. Native form primitives, FormField, Card, Badge, Container, Section, Lead, loading/empty/error feedback and the existing studio dialog remain reusable. No fake loading state or inactive business action is rendered.

FAQ triggers are at least 44px tall, keyboard operated and associated with labelled answer regions. Enter/Space toggle; ArrowUp/Down, Home/End move focus. A rotated Plus distinguishes expanded state along with `aria-expanded`, rather than relying on color. Triggers are disabled only until real hydration attaches their handlers; `aria-busy` exposes that pending state. A short answer translation respects reduced motion. Prompt 04 removed the earlier opacity fade after a repeated axe check found it temporarily reduced text contrast; text now remains fully opaque throughout. The skip link is absolute while hidden and fixed only when focused, keeping it available to keyboard users without overlaying scrolled section captures. Anchors use the existing scroll margin; the header remains non-sticky.

ThemeToggle uses a stable Persian accessible name with pressed state. A guarded head script applies saved choice before paint, light remains default, and storage failures still allow switching. Subscription-time reconciliation prevents an early cross-tab preference change from being lost before hydration. The same root tokens apply to public pages, working account forms and both role dashboards.

## Executed accessibility and responsive review

Prompt 04 now uses AccountPage/AccountForm for real login and registration. The existing cloud companion, local font and semantic palette are reused; no additional SVG, animation library or palette was introduced. Main form precedes the quiet illustrated aside in mobile/DOM order; desktop uses two columns. All fields have visible labels, associated Persian errors, focus transfer, correct autocomplete and password controls with 44px targets. Explicit POST and disabled pre-hydration fields prevent credentials entering GET URLs before handlers attach. Pending, failure and success states reflect actual server operations.

DashboardShell uses the same surfaces with restrained decoration, a wrapping mobile navigation and bounded desktop sidebar. Account facts wrap long LTR-isolated email values. The native details account menu supports keyboard/Escape restoration; logout is a real action. The password-change form uses current/new/confirmation fields, reauthentication guidance and actual session-revocation feedback. Requests now have real customer views; tickets and admin management tools remain labelled unavailable, without dummy data or false working controls.

Automated matrices cover login/registration and authenticated USER/profile/ADMIN views at 320, 375, 430, 768, 1024, 1440 and 1920px in both themes, with 200% root text checks. Actual final results, screenshots opened for inspection and remaining limitations are recorded in TESTING.md; automated zero-violation checks are not accessibility certification.

Prompt 02's historical checks are preserved in `history/PROMPT02_STATUS.md`. Prompt 03 extends the same coverage to the completed page and expanded FAQ: seven requested widths in both themes, 200% root text at all seven widths, touch targets, landscape menu, keyboard controls, theme persistence and cross-tab synchronization. Actual results, screenshot review and remaining limitations are recorded in `IMPLEMENTATION_STATUS.md` and `TESTING.md`. Automated smoke coverage is not a complete WCAG, assistive-technology or cross-browser certification.

## Prompt 05 customer experience

RequestForm reuses native Input/Textarea/Select/FormField, semantic focus/error/success roles, 44px actions and pre-hydration safety. Required fields are explicit Persian labels; optional budget/time selects explain that preferences are not prices or guarantees. Mobile uses a single reading column; preference controls become two columns from 768px. Native controls remain keyboard accessible; no animation/package or palette was added.

RequestItems adapts from compact mobile cards to an efficient desktop list. Status badges pair a Lucide icon with the Persian status label and semantic surface/text colors; color is never the sole meaning. RequestTimeline is a semantic ordered list with real timestamps and safe actor labels. Long titles, IDs, URLs and Persian descriptions wrap; technical values are bidi-isolated. Confirmation reports only persisted identity/status and gives real detail/list/new-request actions. Empty lists use the original lightweight RequestSketch vector, the same rounded document/star/mint grammar as the Hero, aria-hidden and noninteractive.

Seven-width/both-theme matrices cover form, empty/list/detail, confirmed result and real dashboard summary, with 200% root text checks. Error, expiration, network-recovery and rate-limit feedback use the same system; exact executed axe/screenshot results are in TESTING.md. No visual or accessibility certification is inferred from static tokens alone.

## Prompt 06 management components

ManagementForm reuses existing native fields, semantic tokens and Persian validation. Review, conversion and execution changes use the installed Radix confirmation dialog: initial focus is the safe cancel action, Escape dismisses, focus returns to the submit trigger, and confirmation awaits the real server commit. Note and metadata forms submit directly with pending feedback, retained inputs, operation recovery and explicit stale-state refresh. No new dependency, SVG family, animation or palette is introduced.

Management request/project lists use responsive wrapping cards and bounded filters instead of wide tables. Metrics use actual linked counts. Shared status chips combine text/icons with existing theme colors; metadata audits and private notes are separate semantic lists. Author names, timestamps and mixed technical values use the existing bidi isolation/wrapping conventions. Private-note labels explain their audience. RequestSketch is reused for genuine empty lists.

Date controls use an auto-fit grid whose minimum shrinks to available space, including increased text sizing. Long Persian labels/headings and identifiers wrap without forcing layout width. Dialogs retain the existing scrollable viewport-constrained surface. Notes/audit/history caps are disclosed rather than hiding truncation. Actual browser, axe, screenshot and theme verification is recorded in TESTING.md; design intent alone is not verification.

## Prompt 07 customer project presentation

CustomerProjectStatus pairs the five existing execution states with distinct CalendarDays/PlayCircle/PauseCircle/CircleCheck/CircleX icons, Persian labels and the existing semantic badge colors. Concise factual stage descriptions replace invented progress figures. Plans are date-only Persian-calendar displays; real event timestamps retain the shared Tehran formatter. Internal description is omitted and original requirements remain accessible through the owned request link.

ProjectSketch is original small rounded construction artwork using existing art variables, aria-hidden and noninteractive, with no filters, bitmap, external assets or animation. Compact wrapping project cards, a six-metric real-data dashboard and bounded recent lists reuse account/request surfaces. Technical values are bidi-isolated, headings/statuses wrap, native filters and existing focus/reduced-motion rules remain. Profile adds the enabled-account status without fake editing or verification.

Approved Chrome MCP verified twelve views in seven widths/both themes with 200% text, 168 matrix checks plus two spot checks and zero detected axe violations. At that initial attempt screenshots did not return. Prompt 07 acceptance recovery later captured/inspected 44 portal images and passed 52 fresh axe checks; its current recovery report in TESTING.md supersedes the earlier visual blocker.


## Prompt 08 support presentation

Support reuses the exact existing semantic palette, local Vazirmatn, rounded cards, focus rings and RTL logical layout. Ticket status chips pair MessageSquare/CircleCheck icons with Persian labels and semantic lavender/coral/mint roles; no color-only state or online/typing fiction exists. Public messages are plain wrapping text with a restrained support-side border/surface, real role byline and timestamp. Mixed body text uses plaintext bidi handling; IDs and emails use LTR isolation. Private ADMIN notes have a separately labelled dashed section and never a customer message bubble.

The small original speech-window/star SVG in EmptySupport uses art variables with aria-hidden semantics and no external asset/filter/animation. USER/ADMIN empty copy differs truthfully by role. Native fields/labels/helper/errors, client-ready disabled states, real pending feedback, open-form draft retention and explicit result recovery reuse account/request primitives. Radix state confirmation initially focuses Cancel and restores the invoking submit on Escape/close. Dashboards add restrained genuine support facts/recent links, no charts or fabricated metrics. Both themes, seven viewport widths, reduced motion, 200% text and actual screenshots are recorded in TESTING.md. No second design system or package was added.
