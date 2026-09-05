# Minimal discovery landing page

The homepage centers BookSum, a single search box, and the subtitle: “Start with a book you love. Discover what to read next.” It keeps the existing dark background, introduces a restrained indigo accent, and replaces decorative genre tiles and feature cards with three working example searches. Home navigation remains available on phones; other routes retain their existing header layout.

The shared search component supports a landing variant, keyboard selection with Arrow keys and Enter, Escape dismissal, clear, loading/empty/error/retry states, and accessible listbox semantics. Search requests are cancelled when superseded and time out after 30 seconds; late results cannot replace a newer query. The initial `/api/auth/me` 401 response no longer redirects a guest away from public discovery. Other 401 redirects remain in place. No backend, embedding, ranking, dataset, or deployment changes are part of this patch.

## Local preview

Use `.env.example` as the template for a local `.env.local`, then run `npm ci` and `npm run dev -- --port 3001`. The API URL is the public Fly.io endpoint discovered in the existing production frontend. The backend must allow the preview's origin; its availability is independent of the UI.

## Verification

Run `npx tsc --noEmit` and `npm run build`. `scripts/check-landing.mjs` uses an existing Playwright installation and fixtures for API responses to test guest access, example search, keyboard/touch selection, encoded graph routes, stale responses, empty/error/retry states, shared graph-page search, and layouts at desktop, phone, tablet, landscape, reduced motion, and enlarged text. Screenshots are written to a temporary directory for visual review.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
BROWSER_EXECUTABLE=/absolute/path/to/chromium \
node scripts/check-landing.mjs
```

Both variables are optional if Playwright and its browser are already available. Set `BOOKSUM_URL` to override `http://127.0.0.1:3001`. These are fixture-based UI checks, not proof of live backend availability or a full assistive-technology audit.

Verified on 2026-09-05: production build (including lint/type checks), standalone TypeScript check, whitespace check, and the browser suite passed. Live Dune searches from both localhost and 127.0.0.1 did not complete successfully; the UI displayed its retry state. Live backend integration remains unverified. No Fly.io configuration was changed.

## Existing dependency note

The locked Next.js 15.1.0 dependency emits a security deprecation warning during installation. A framework security update should be handled before production deployment. This UI change does not upgrade dependencies or alter the lockfile.
