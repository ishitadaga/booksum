# Minimal discovery landing page

The homepage centers BookSum, a single search box, and rotating discovery copy led by Margin's “Start with a story you love. Find the threads that connect it to your next.” The other messages are “One good book leads to another.” and “Start with a book you love. Discover what to read next.” Messages change every eight seconds, pause on hover/focus, have pause/next controls, and do not auto-rotate with reduced motion. The grid reserves the tallest message's space to prevent layout shifts.

Light, Dark, and System options are available in navigation throughout the app. System is the default. The `booksum-theme` browser preference persists across reloads and tabs, tracks operating-system changes, and is applied before first paint. Semantic color tokens cover the landing/search UI, auth, playlists, social/profile routes, graph controls, details, and tooltips. Canvas edges and selection colors repaint without resetting graph positions, zoom, or selection. Embeddings and similarity calculations are unchanged.

The restrained indigo accent, three example searches, and minimal layout replace decorative genre tiles and feature cards. Home navigation remains available on phones. The graph legend is collapsible, and its controls/detail panel fit narrow screens.

The shared search component supports a landing variant, keyboard selection with Arrow keys and Enter, Escape dismissal, clear, loading/empty/error/retry states, and accessible listbox semantics. Search requests are cancelled when superseded and time out after 30 seconds; late results cannot replace a newer query. The initial `/api/auth/me` 401 response no longer redirects a guest away from public discovery. Other 401 redirects remain in place. No backend, embedding, ranking, dataset, or deployment changes are part of this patch.

## Local preview

Use `.env.example` as the template for a local `.env.local`, then run `npm ci` and `npm run dev -- --port 3001`. The API URL is the public Fly.io endpoint discovered in the existing production frontend. The backend must allow the preview's origin; its availability is independent of the UI.

## Verification

Run `npx tsc --noEmit` and `npm run build`. `scripts/check-landing.mjs` uses an existing Playwright installation and fixtures for API responses to test guest access, example search, keyboard/touch selection, encoded graph routes, stale responses, empty/error/retry states, shared graph-page search, and layouts at desktop, phone, tablet, landscape, reduced motion, and enlarged text. `scripts/check-themes.mjs` checks all three modes, persistence, system changes, cross-tab sync, text contrast, rotation/pause/reduced motion, graph repaint/state preservation, routes and modal styling. Screenshots are written to temporary directories for visual review.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
BROWSER_EXECUTABLE=/absolute/path/to/chromium \
node scripts/check-landing.mjs
```

Both variables are optional if Playwright and its browser are already available. Set `BOOKSUM_URL` to override `http://127.0.0.1:3001`. These are fixture-based UI checks, not proof of live backend availability or a full assistive-technology audit.

Verified on 2026-09-05: production build (including lint/type checks), standalone TypeScript check, whitespace check, and both browser suites passed. Earlier local requests timed out; a subsequent live Fly.io Dune search returned HTTP 200 with `has_embedding: true`, and a graph request with `top_n=5` returned 5 neighbors and 15 edges. CORS responses allowed the deployed frontend and localhost:3001. These small live checks do not establish catalog-wide reliability or latency. No Fly.io configuration was changed.

## Dependency security maintenance

Before publishing, Next.js and eslint-config-next were updated from 15.1.0 to 15.5.25, staying on the same major version. React/React DOM resolve to 19.2.8; compatible audit fixes also update Axios and transitive tooling. PostCSS is constrained to a patched 8.5.x version through an override because Next 15 otherwise retains an older nested copy. `npm audit` reports zero vulnerabilities at verification time. See the [Next.js August security release](https://nextjs.org/blog/august-2026-security-release) for the critical fixes motivating the framework update. The production build and browser suites were rerun after these changes.
