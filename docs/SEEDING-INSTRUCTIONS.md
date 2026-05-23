Seeding instructions for ClubHub (local + cloud)

Overview

- This repository includes several seeding scripts. The "master" seeder is `backend/scripts/seed-master-demo.js` (comprehensive). There is also a lightweight tournament seeder `backend/seed-tournaments-lite.js` and smaller demo seeders (`backend/seed-demo.js`).

Local (developer laptop)

1. Ensure Postgres is running and `clubhub_dev_db` is reachable per `backend/.env` or `backend/clubhub-dev.env`.
2. Apply migrations (if needed):

```bash
node backend/run-sql-file.js backend/migrations/sqls/20260130000000-add-org-types-only-up.sql
node backend/run-sql-file.js backend/migrations/sqls/20260412-add-staff-permission-flags-up.sql
# apply any other needed migration files in backend/migrations/sqls
```

3. Run master seeder (comprehensive):

```bash
node backend/scripts/seed-master-demo.js
```

4. Optional: run lightweight tournament seeder (quick):

```bash
node backend/seed-tournaments-lite.js
```

5. Verify with DB check:

```bash
node backend/check-seed-status.js
```

Cloud / Production-like server (recommendations)

- Use a managed PG instance with proper backups and do NOT run the full master seeder against production.
- Instead, create a dedicated staging database and run the master seeder there.

Steps for cloud/staging

1. Provision DB and configure environment variables (ensure `DATABASE_URL` or `PGHOST` etc are set).
2. Upload migration SQL files and apply them (use your CI or run `psql`):

```bash
psql $DATABASE_URL -f backend/migrations/sqls/20260130000000-add-org-types-only-up.sql
psql $DATABASE_URL -f backend/migrations/sqls/20260412-add-staff-permission-flags-up.sql
```

3. Run seed scripts in order (from the app server or CI runner):

```bash
node backend/scripts/seed-master-demo.js
```

Notes & troubleshooting

- `GroupSwitcher` depends on `/auth/context` API; if group switching UI doesn't open, check network console for failing `/auth/context` or missing `apiService`.
- The unified nav is injected by `frontend/unified-nav.js`. Role-specific sidebar entries are assembled there. If a menu item doesn't appear for a role, it's likely because `localStorage.userType` or `currentUser` lacks the expected `account_type` or `userType`.
- Tournament data is stored in `events` rows with `event_type='tournament'` (there is no separate `tournaments` table in the current schema). Use `node backend/check-seed-status.js` to inspect.

If you'd like, I can:

- Produce a CI-ready script to apply migrations and run seeds on staging.
- Create a backup dump of the seeded DB for importing into cloud staging.
