-- Migration 2: usernames / profiles
-- Run this in the Supabase SQL editor AFTER schema.sql (safe to run once).

-- Each auth user gets one profile row holding their chosen display name.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles are readable by any logged-in user" on profiles
  for select using (auth.role() = 'authenticated');
create policy "users manage their own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Backfill: give any existing accounts (created before this migration) a
-- placeholder username derived from their email, so the foreign keys below
-- don't fail on existing rows. They can change it in-app afterwards if you
-- add a "rename" feature later; for now this just unblocks the migration.
insert into profiles (id, username)
select id, split_part(email, '@', 1)
from auth.users
on conflict (id) do nothing;

-- Link decks/matches/matchup_notes to profiles (in addition to their existing
-- link to auth.users) so we can fetch "who logged this" in one query via
-- Supabase's nested select syntax, e.g. .select('*, profiles(username)').
alter table decks
  add constraint decks_owner_profile_fkey foreign key (owner_id) references profiles(id);
alter table matches
  add constraint matches_player_profile_fkey foreign key (player_id) references profiles(id);
alter table matchup_notes
  add constraint matchup_notes_author_profile_fkey foreign key (author_id) references profiles(id);
