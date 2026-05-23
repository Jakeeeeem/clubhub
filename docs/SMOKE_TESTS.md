Smoke tests

Run the lightweight smoke tests (unit-level) locally.

Commands:

```bash
# Run bracket helper test
npm run test:bracket

# Run email-service mocked test
npm run test:email

# Run both (smoke)
npm run test:smoke
```

Notes:

- These smoke tests are intentionally lightweight and do not require a running Postgres instance.
- For full integration smoke tests (API endpoints, DB migrations), run the server with a test database and follow the manual checklist in SETUP.md.
