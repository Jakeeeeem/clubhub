# ClubHub Hand-off Package

Contents:
- `review_screenshots.zip` — full set of desktop + mobile screenshots (organized by role folders).
- `pages_list.txt` — grouped pages list used to capture screenshots.
- `pages_manifest.txt` — mapping of each page to Desktop/Mobile screenshot files (or MISSING).
- `jest-results.json` — Jest run output (current results JSON).
- `backend/tests/messages.test.js` — the test file modified during triage (kept as reference).
- `TECH_STACK.md` — short tech stack and runtime notes.
- `FAILED_TESTS_SUMMARY.txt` — short summary of failing tests and actions taken.
- `assemble_handoff.sh` — script used to build this package (in `scripts/`).

Quick walkthrough:

1. Unzip the package or inspect files in the `handoff-package` directory.
2. Review `TECH_STACK.md` for runtime requirements.
3. To reproduce tests locally (assumes Docker Compose is used for DB):

```bash
# From repository root
docker compose up -d db backend
# ensure DB is ready, then run:
DB_HOST=127.0.0.1 DB_PORT=5436 DB_USER=clubhub_dev_db_user DB_PASSWORD=hwkX8WjJLKyPRnPrMrBxetxPXRYpBuRQ DB_NAME=clubhub_dev_db npm run test:local
```

4. To re-generate screenshots locally:

```bash
# start frontend dev server (127.0.0.1:8080)
cd frontend
npx live-server --port=8080 --host=127.0.0.1 .
# then run screenshot script from repo root
BASE_URL=http://127.0.0.1:8080 node take_screenshots.js
```

Notes:
- `jest-results.json` contains the full JSON output from Jest runs.
- `pages_manifest.txt` was generated from `pages_list.txt` and lists missing screenshots if any.

Contact: developer on project for follow-up and CI questions.
