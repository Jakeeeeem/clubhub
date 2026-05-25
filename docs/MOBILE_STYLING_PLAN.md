Mobile UI Styling Plan
======================

Goal
- Ensure all frontend mobile layouts render correctly on common device widths (360px, 412px, 768px) with minimal JavaScript changes, then regenerate consistent screenshots.

Phases
1. Inventory: find all `frontend/*.html` pages and note which include `meta name="viewport"` and which use mobile-specific classes or `@media` CSS rules.
2. Quick fixes: add missing viewport meta where appropriate and centralize small mobile CSS rules into `frontend/css/mobile.css` (create if missing).
3. Styling plan: prefer CSS-only solutions using media queries and utility classes. Avoid DOM-rewriting JS for layout except where necessary; if JS is used to create mobile-card lists, keep that as progressive enhancement.
4. Visual QA: run a headless screenshot script (Cypress or Puppeteer) to capture pages at target breakpoints, compare to baseline, and store outputs under `review_screenshots/mobile/`.
5. Iterate: fix layout regressions, re-run screenshots until acceptable.

Checklist & Recommendations
- Add or verify `meta name="viewport" content="width=device-width, initial-scale=1.0"` in page `<head>` for all pages intended to be responsive.
- Consolidate mobile rules into `frontend/css/mobile.css` and include it in the head of all pages via a single `<link>` to reduce duplication.
- Use `@media (max-width: 768px)` and smaller breakpoints for layout changes; avoid inline `!important` where possible.
- Use CSS grid/flexbox with `min-width`/`max-width` breakpoints rather than JS table-to-card conversions when feasible.
- Gate debug-only features (e.g., `UnifiedNav Debug`) behind `ENABLE_UNIFIEDNAV_DEBUG` env flag rather than leaving them enabled.

Commands (examples)
- Run local dev server (if you use `npm`):
```bash
npm install
npm run dev
```
- Run Cypress to capture screenshots (example):
```bash
npx cypress open
# or headless
npx cypress run --spec "cypress/e2e/mobile_spec.cy.js" --env configFile=mobile
```

Automated checks I can run now
- Generate an inventory of which `frontend/*.html` pages are missing the viewport meta and produce a patch to add it.
- Search the repo for `UnifiedNav Debug` occurrences and propose a gated removal patch.

Deliverables I will produce if you approve
- `docs/MOBILE_STYLING_PLAN.md` (this file)
- An inventory CSV/list of frontend pages and mobile status
- Optional patch that: (a) adds missing viewport meta tags, (b) adds/updates `frontend/css/mobile.css`, and (c) wires the link into page heads.
- A Cypress (or Puppeteer) script to capture mobile screenshots and a small README with commands.

Questions / Decisions
- Do you prefer Cypress (already in repo) or Puppeteer for screenshot capture? (Cypress is recommended; it exists here.)
- Should I auto-patch missing viewport meta tags and add a single `mobile.css` include, or produce the patch for your review first?

Last updated: 2026-05-25
