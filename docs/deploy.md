# Deploy Guide (MVP)

This app runs in two modes:
- Demo mode: no backend; services fall back to in-memory mocks. Good for preview.
- Backend mode: connected to Supabase; reads/writes persist and audit logs are recorded.

## 1) Vercel (Demo mode)
1. Import the Git repo into Vercel.
2. Build command: default (Vite). No env vars set.
3. Deploy. You’ll see a demo banner in the app indicating no backend is configured.

## 2) Provision Supabase
1. Create a Supabase project.
2. In SQL Editor, run the contents of `database/init.sql`.
   - Creates tables, policies, seed data.
   - Admin user: username `admin`, PIN `1234` (bcrypt hash in SQL seed).

## 3) Connect app to Supabase
Set these env vars in Vercel Project Settings → Environment Variables:
- VITE_SUPABASE_URL = your Supabase project URL
- VITE_SUPABASE_ANON_KEY = your anon key

Redeploy. The app will automatically switch out of demo mode.

## 4) Smoke test (prod)
- Login with `admin` / `1234`.
- PriceEntry: edit a few prices and save; expect success toast.
- CityConfig: update 3 buyables; expect success toast.
- Compute: verify plan renders; staleness indicator visible.
- Admin: see pending users list when there are unapproved users.

## Notes
- If backend isn’t reachable or env vars missing, the app gracefully falls back to demo mode.
- RLS policies in `init.sql` assume JWT claims for admin/approved; for MVP, reads/writes that require elevated permissions should be performed via Admin user or service role as needed.
- For performance: target <100ms compute; price polling every 60s is enabled.
