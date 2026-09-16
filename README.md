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
