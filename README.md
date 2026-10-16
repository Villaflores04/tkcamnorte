# TK Cam Norte

Private member hub for Teatro Kristiano Camarines Norte. Static ES modules, Vercel serverless APIs, Supabase Postgres and Storage; JWT + bcrypt authentication.

## Premium hub release

- One white, navy/blue and yellow design system across login, registration, dashboard, announcements, schedule, detail, account and coordinator screens.
- Four member destinations: Home, Announcements, Schedule, Account. Desktop sidebar and mobile bottom navigation.
- Dashboard with next activity, unread updates, acknowledgment requests and upcoming dates. Searchable feed with categories and client-side pagination.
- Server-stored read and acknowledgment versions. An edited announcement becomes unread and requires a fresh acknowledgment. Reading does not acknowledge attendance.
- Activity dates and deadlines are separate; call time is explicitly Philippine time. Calendar no longer stretches an activity to its deadline or treats pins as ongoing events.
- Coordinator templates, local draft save/restore, content preview, venue/call time, acknowledgment reports and duplicate-submit protection.
- No globe dependency or layered legacy CSS.

## Required deployment steps (before merging into production)

1. Apply `migrations/003_premium_hub.sql` in the connected Supabase SQL editor. For a new database, run `schema.sql`. The migration only adds fields and a receipts table; existing posts remain intact.
2. Confirm a coordinator has a secure, non-default password. The old published bootstrap password is deliberately rejected, and the automatic admin reset is removed. If needed, run `node scripts/reset-coordinator.mjs` in a trusted local environment with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TK_COORDINATOR_USERNAME`, and a new `TK_COORDINATOR_PASSWORD`. It updates an existing coordinator only, prints no credentials, and must never be deployed as an API. Clear the temporary password environment variable afterward.
3. Configure Vercel's `MEMBER_INVITE_CODE` with a strong random invitation code and give it only to invited members. When absent, registration stays closed. Rotate it when necessary. It is not an admin credential.
4. Keep `JWT_SECRET`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` configured. Deploy the branch to a preview/staging environment first. All legacy tokens are invalidated by the new token version, so users must sign in again.
5. Verify real login, create/edit with files, calendar dates, read/acknowledgment persistence across devices, and coordinator role changes against the migrated database. Then merge/deploy.

Protected requests check the current account and role. Deletion, demotion and password changes take effect on subsequent requests; database failures fail closed. Credentials belong in environment settings, never in the repository. The Supabase service role must remain server-only.

Existing storage buckets `announcement-attachments` and `profile-images` retain their current public-URL behavior. Login protection does not make those URLs private. Moving attachments to private buckets and signed links needs a separate storage migration.

## Verification

```sh
npm ci
npm run check
npm test
```

The checks parse all API, browser module and inline-page JavaScript. Tests cover Manila date rollover, activity/deadline separation, stale acknowledgments, input validation, token revocation and immediate role enforcement. Tests use a stub database and do not touch production.

## Deliberate scope

Drafts are stored on the current device and do not retain selected files. Shared devices should clear drafts when finished. The preview covers text and schedule fields; uploaded-media preview is not included. Notifications are in-app unread updates, not push notifications. Audience targeting, attendance RSVP, scheduled publishing, automatic archiving, durable login rate limiting and server-side feed pagination remain future work. The legacy Groups URL remains informational and is removed from primary navigation until real groups are configured.
