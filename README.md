# TK Cam Norte

Private announcement board for **Teatro Kristiano Camarines Norte**.

Live: https://tkcamnorte.vercel.app

## Stack

- Static pages in `public/`
- Vercel serverless functions in `api/`
- Supabase Postgres + Storage
- JWT + bcrypt (not Supabase Auth)

## Environment (Vercel)

- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Default coordinator

Login:

- username: `admin`
- password: `#admin321`

The first successful login with those credentials creates (or repairs) the default admin row.

Do **not** register a member with username `admin` — it is reserved.

After other coordinators exist, use **Coordinator → Members → Promote**. That person must log in again so the JWT picks up the new role.

## SQL

Run `schema.sql` in the Supabase SQL editor (safe to re-run). Needed for:

- reactions (`announcement_reactions`)
- duration fields (`starts_at`, `ends_at`)
- cover image (`cover_image_url`)

Create public storage buckets if missing:

- `announcement-attachments`
- `profile-images`
