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


## Secret-code user management

1. In Vercel → Project Settings → Environment Variables, add `OWNER_ACCESS_CODE` with a private **6-digit numeric code** (digits only, for example `123456`; use your own). Configure Production and Preview as needed, then redeploy. The existing `JWT_SECRET` must also remain configured. No code is embedded in the frontend or repository, and management remains locked when the variable is missing or is not exactly 6 digits.
2. Open **Secret code** at the bottom of Sign in / Create account, or in the member menu. Enter the code at `/access.html`. Success opens `/user-management.html`.
3. Create and edit users, set initial/replacement passwords, promote members to Admin, demote admins, and remove eligible accounts. Admins sign in through the normal member form; **Coordinator → Compose** lets them publish announcements. Admins can read the member directory, but role changes and user CRUD now require the separate secret-code session.
4. Use **Lock session** when finished. Management expires after 15 minutes. Rotating `OWNER_ACCESS_CODE` invalidates existing management sessions after redeployment. This code is separate from `MEMBER_INVITE_CODE`, which permits member registration only.

The management session uses a signed, short-lived, HttpOnly/Secure/SameSite=Strict cookie scoped to `/api/users`. It is not saved in localStorage or sessionStorage. Every user-management request verifies the cookie; writes also verify the request origin. Ordinary member/admin bearer tokens cannot substitute for it. The existing `/api/users/promote` function serves the unlock/session and CRUD routes, so this feature adds no serverless function or database migration.

User lists never include password hashes. New passwords are hashed; changing them invalidates old member sessions. Deletion is a single database statement, using existing cascading foreign keys. Accounts referenced by announcement history cannot be removed; their records and attribution are preserved. Promote another user before removing or demoting the final admin. The pre-check is a convenience safeguard, not a transactional lock across concurrent management requests; the independent secret-code console can restore an admin if needed.

Failed-code attempts have bounded per-instance burst protection (five failures per minute). This is not a distributed rate limiter; use a long random secret and configure platform-level limits if needed. User-management sessions are independent of member sign-in. Locking removes the browser's cookie; existing copies expire after 15 minutes or are invalidated when the code rotates.

## Sign-in and registration refresh

The public entrance now uses a blue-and-gold desktop layout with layered TK artwork, a compact mobile banner, clearer forms, accessible password toggles, invitation-code guidance and a quiet Secret code link at the bottom. Member invitation validation is retained. Incorrect credentials display their error without being mistaken for an expired session.

## Reload and drawer fixes

Home and Announcements now start the account check and a shared hub snapshot in parallel. The notification bell consumes that same snapshot, reducing initial requests from five to two. The snapshot is held in page memory for 15 seconds after completion and invalidated around writes and account-token changes; it is never persisted across reloads. GETs in progress are coalesced, failed snapshots are discarded, and slow reads offer a retry. Authorization still checks the live account on every request. Profile data and coordinator checks reuse that same request's verified account, not a cross-request role cache.

The hub API loads posts and receipts concurrently and omits unused comment-count reads. These changes reduce request/query work; no production database latency benchmark was taken. The mobile menu is mounted outside the sticky header's stacking context, above its backdrop, with a close button and focus restoration. No database migration or new environment variable is needed for this patch.
