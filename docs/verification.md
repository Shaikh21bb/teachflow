# Platform Verification

Run with Node 22.12+ or Node 24:

```sh
npm ci
npm ci --prefix server
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The backend tests use temporary SQLite databases. Browser tests start their own
API on port 3101 and Vite on port 4173. They do not connect to production Turso,
send email, or call paid AI providers. Test AI responses are controlled fixtures.

Coverage includes registration credits, access between accounts, student data,
lesson persistence, attachments, failed AI requests, concurrent credit spending,
homework submission and manual review, quiz scoring and duplicate submissions,
marketplace purchases, parent links, live polls, ad rewards, legacy migrations,
and the principal teacher pages. Playwright checks desktop and mobile layouts,
light and dark themes, image uploads without Cloudinary, and session refresh.
Screenshots and traces are written to `test-results/`.

## External Services

Configure frontend variables in the root Vite environment and backend variables
in `server/.env` or the hosting provider. `.env.example` lists supported settings.

- Images have a bounded inline fallback when Cloudinary is not configured.
  Video, PDF, and document uploads still require Cloudinary credentials.
- Homework waits for teacher review when AI cannot produce a valid assessment.
  No AI credit is charged for that pending submission.
- Starter AI credits are granted once at registration. Existing balances are
  preserved during migration and restart.
- Online payment requires an actual payment-provider integration. Test payment
  confirmation is disabled in production. Paid plans can be arranged through
  the support action on the pricing page.
- Optional Google Sheets export uses `GOOGLE_SCRIPT_URL`; it is disabled when
  the variable is empty. Administrator bootstrapping requires `ADMIN_EMAILS`
  and `ADMIN_PASSWORD_HASH` explicitly.
- Schema changes must increment `SCHEMA_VERSION` in `server/db/database.js`.
  An applied version skips repeated schema initialization on cold starts.

GitHub Actions repeats lint, API tests, production build, and browser tests for
pull requests and changes to `main`.

The games section has additional reliability, renderer and payload checks;
see [Bilim Arena](./arena.md) for rules, deployment settings and verification limits.

Independent pupil accounts, quest progression and classroom assignment are
documented in [Student Quests](./student-quests.md), including the local-only
classroom batch test and production verification limits.
