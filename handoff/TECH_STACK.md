ClubHub - Tech Stack (short)

- Node.js (v16+ recommended) — backend and scripts
- Express.js — HTTP API server
- PostgreSQL 15 — primary relational DB (Docker image `postgres:15-alpine`)
- Docker Compose — used to run `db` and `backend` services locally
- Jest — test runner for backend tests
- Puppeteer — screenshot capture automation
- live-server / static server — frontend dev server during screenshot capture
- NPM — package manager; `npm run test:local` convenience script included

Key env vars (see `backend/.env`):
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`, `FRONTEND_URL`

Local ports used in this workspace:
- Frontend dev: `127.0.0.1:8080`
- Backend API: `127.0.0.1:3000`
- Postgres (host mapped): `127.0.0.1:5436` -> container 5432
