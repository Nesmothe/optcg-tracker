# Logbook — OPTCG Winrate Tracker

A small shared web app for you and your friends to log One Piece TCG match results,
see winrate breakdowns by deck and matchup, and keep shared notes per matchup.

## Stack
- React + Vite (frontend)
- Supabase (Postgres database + auth) — free tier
- Recharts (charts)

## 1. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) and create a free account/project.
2. In the project dashboard, go to **SQL Editor → New query**, paste the contents of
   `supabase/schema.sql`, and run it. This creates the `decks`, `matches`, and
   `matchup_notes` tables plus row-level security policies (everyone in your group can
   read all data; each person can only edit their own entries).
3. Go to **Project Settings → API**. Copy the **Project URL** and the **anon public key**.
4. Go to **Authentication → Providers** and make sure **Email** is enabled (it is by
   default). Optionally, under **Authentication → Settings**, turn off "Confirm email"
   if you want friends to sign up without checking their inbox first — fine for a small
   private group.

## 2. Run it locally
```bash
npm install
cp .env.example .env
# paste your Project URL and anon key into .env
npm run dev
```
Open the local URL it prints. Sign up with an email + password — do this once per
friend who'll use the app.

## 3. Deploy for free (so friends can use it without your laptop running)
Easiest path is Vercel:
1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com), "Add New Project", import the repo.
3. In the project's Environment Variables, add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (same values as your `.env`).
4. Deploy. Vercel gives you a free `*.vercel.app` URL to share with your crew.

Netlify works the same way if you prefer it.

## Updating an already-deployed app (usernames + colors)

If you already set this up before usernames existed, you need to run one more
SQL migration and redeploy:

1. In Supabase, go to **SQL Editor → New query**, paste the contents of
   `supabase/migration_2_profiles.sql`, and run it. This adds a `profiles`
   table, gives every existing account a placeholder username (derived from
   their email), and links decks/matches/notes to it.
2. Pull the latest code, commit, and push to GitHub — Vercel will redeploy
   automatically.
3. Next time each person logs in, they'll get a **one-time "pick a
   username"** prompt (this also fires for accounts that already existed
   before this update, replacing their placeholder). After that, their name
   shows up — consistently color-coded, like WhatsApp — next to every deck,
   match, and matchup note across the app.

## Updating for leader search (CROCO integration)

Leader fields across the app (deck creation, opponent leader on match logging,
and the matchup-notes deck fields) are now a live search box backed by your
CROCO backend's card data, instead of free text.

This talks to CROCO through a small relay function that lives in this
project (`/api/croco/[...path].js`) and runs on Vercel's servers — the
browser never calls CROCO directly, so **CROCO's own code and repo never
need to change**, including no CORS setup on its end.

Setup:
1. In Vercel, go to this project → **Settings → Environment Variables** and
   add `CROCO_API_URL` set to your CROCO backend's Render URL (e.g.
   `https://your-croco-backend.onrender.com`). No `VITE_` prefix — this one
   stays server-side only.
2. In Supabase's SQL editor, run `supabase/migration_3_leader_cards.sql` — it
   adds columns to store the selected card's id and art alongside the
   existing text fields.
3. Push this code to GitHub as usual; Vercel redeploys automatically.

Note: this feature only works on the **deployed** Vercel site, not in plain
local `npm run dev` — local Vite doesn't run the `/api` serverless function.
Everything else in the app still works locally as normal; just test the
leader search itself on the live URL. (If you want it locally too, install
the Vercel CLI and run `vercel dev` instead of `npm run dev`.)

If the CROCO API is unreachable or a leader isn't found (e.g. a brand-new
set CROCO hasn't indexed yet), the field just behaves like a normal text box
— nothing is blocked, it just won't have the search dropdown or stored art
for that entry.

## Notes on the data model
- **Decks** belong to one owner (you can't log matches for a deck you didn't create).
- **Matches** record your deck, the opponent's deck (free text — they don't need an
  account), win/loss, and optional notes.
- **Matchup notes** are keyed by leader name (not deck ID) so a note like "Purple Luffy
  vs Red Kid" applies group-wide, even if two different people pilot Purple Luffy.
- Everyone with an account can see everyone's matches and notes (shared stats), but can
  only edit their own — enforced by Postgres row-level security, not just the UI.

## Free tier reality check
Supabase's free tier (500 MB DB, 50k monthly active users, 5 GB bandwidth) is vastly
more than a friend-group tracker will ever use. The one quirk: a free project pauses
after 7 days with zero requests, and takes ~10-30s to wake up on the next visit. Not a
problem for regular use — just don't be surprised by a slow first load after a quiet
week.

## Ideas for later
- Deck archetypes/colors as a proper dropdown instead of free text
- Per-player leaderboard view
- CSV export of match history
- Reuse CROCO's card-lookup API for autocomplete on deck/leader names
