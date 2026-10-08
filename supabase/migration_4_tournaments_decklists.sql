-- Migration 4: tournament runs + decklists
-- Run this in the Supabase SQL editor AFTER the earlier migrations.

-- Tournament runs: one row per event a player enters. A run is "active"
-- while ended_at is null; matches logged during that time get linked to it.
create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references profiles(id),
  name text,
  started_at timestamptz default now(),
  ended_at timestamptz,
  final_standing text,
  created_at timestamptz default now()
);

alter table tournaments enable row level security;

create policy "tournaments are readable by any logged-in user" on tournaments
  for select using (auth.role() = 'authenticated');
create policy "users manage their own tournaments" on tournaments
  for all using (auth.uid() = player_id) with check (auth.uid() = player_id);

-- Safety net: a player can only have one run in progress at a time.
create unique index if not exists tournaments_one_active_per_player
  on tournaments (player_id) where ended_at is null;

-- Link matches to a run. Deleting a run keeps its matches in your stats
-- (they just stop belonging to a run).
alter table matches
  add column if not exists tournament_id uuid references tournaments(id) on delete set null;

-- Decklists: stored as [{ "id": "OP01-001", "count": 4 }, ...], leader first,
-- exactly the information in an OPTCG Sim export.
alter table decks add column if not exists decklist jsonb;
