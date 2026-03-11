# VCC Backend Setup Guide
**Decisions:** D-108 through D-114 | **Date:** 2026-03-11

## Quick Start (15 minutes)

### 1. Create a Supabase Project

Go to [supabase.com](https://supabase.com), create a new project. Note your:
- **Project URL** (e.g. `https://xyzabc.supabase.co`)
- **Anon/public key** (Settings > API > Project API keys > `anon` `public`)

### 2. Run the Database Migration

In Supabase Dashboard > SQL Editor, paste the contents of:
```
supabase/migrations/001_initial_schema.sql
```
Click "Run". This creates the `projects` and `project_access` tables with Row Level Security.

### 3. Configure Authentication

In Supabase Dashboard > Authentication > Providers:
- **Email:** Enable "Magic Link" (already enabled by default)
- **Google:** Enable, add your Google OAuth client ID and secret
  - Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com)
  - Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`

### 4. Set Environment Variables

Copy `.env.example` to `.env.local` in `packages/frontend/`:
```bash
cp packages/frontend/.env.example packages/frontend/.env.local
```

Edit `.env.local` with your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here
```

### 5. Install Dependencies

```bash
cd packages/frontend
npm install @supabase/supabase-js
```

### 6. Run

```bash
npm run dev
```

You should see the login page. Sign in with Google or magic link email.

## How It Works

### Local Mode (No Supabase)
If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set, VCC runs in **local mode** — the original single-user file-based experience. No login required.

### Multi-User Mode (With Supabase)
When Supabase is configured:
1. Users sign in via Google OAuth or magic link
2. Projects are stored in Supabase Postgres (JSONB bundles)
3. Row Level Security ensures users only see their own projects
4. Auto-save: changes are debounce-saved to Supabase 2 seconds after edit
5. Optimistic locking: revision counter prevents lost updates

### Architecture (D-108)
```
Browser (React SPA)
  ├── Supabase Client → Supabase Postgres (projects, auth)
  ├── Vercel Edge Runtime → Anthropic API (LLM pipeline)
  └── Local state (Zustand) ← syncs to/from Supabase
```

### New Files
```
packages/frontend/src/
  lib/supabase.ts           — Supabase client singleton
  types/database.ts         — Database type definitions
  store/auth-store.ts       — Auth state (Zustand)
  store/project-store.ts    — Project CRUD (Zustand + Supabase)
  components/LoginPage.tsx  — Auth UI
  components/ProjectList.tsx — Project list with module selection
  App.tsx                   — Updated with auth gate + project routing

supabase/migrations/
  001_initial_schema.sql    — Tables, RLS policies, triggers
```

## Vercel Deployment

Add these environment variables to your Vercel project:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY` (already set)

The build command stays the same: `npm run build`.

## Next Steps (Phase 2)

- [ ] Project sharing (invite by email, view/edit permissions)
- [ ] Module-specific panel visibility
- [ ] Visual polish for sales team trial
- [ ] Conflict detection UI (when optimistic lock fails)
