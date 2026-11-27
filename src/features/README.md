# Feature boundaries

Place future business features here (auth, requests, projects, tickets, content management). Keep server-only authorization and database reads in `src/server`. Prompt 03 public read-only content access lives in `src/server/content`, factual editorial copy in `src/content`, and landing sections in `src/components/home`. These are not a CMS or an authentication implementation. Do not add simulated business records or session state.
