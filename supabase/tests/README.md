# Database checks

Run the migrations in an in-memory Postgres (PGlite) and check the security rules.

```bash
cd supabase/tests
npm init -y >/dev/null && npm install @electric-sql/pglite
M=../migrations
node safety.test.mjs $M/0001_unmute_schema.sql $M/0002_comment_privacy.sql $M/0003_safety.sql $M/0004_notifications.sql
node notifications.test.mjs $M/0001_unmute_schema.sql $M/0002_comment_privacy.sql $M/0003_safety.sql $M/0004_notifications.sql
```

Each prints `N passed, 0 failed`. Add a test file for every new migration.
