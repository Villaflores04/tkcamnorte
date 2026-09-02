# TK Cam Norte

Private announcement board for **Teatro Kristiano Camarines Norte** (MCGI theater and dance chapter).

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

## First coordinator login

1. Register at `/register.html`
2. In Supabase SQL:

```sql
update public.users set role = 'admin' where username = 'YOUR_USERNAME';
```

3. Log out and log in again. JWT stores role for 7 days.

After the first coordinator exists, use **Coordinator → Members → Promote**. That person must log in again.

## Reactions table

Run `schema.sql` in the Supabase SQL editor so Amen / Love / Clap works.

Create public storage buckets if missing:

- `announcement-attachments`
- `profile-images`
