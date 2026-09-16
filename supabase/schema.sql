-- OPTCG Logbook schema
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)

-- Decks: one row per deck a player owns/pilots
create table if not exists decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null,
  name text not null,
  leader text not null,
  color text,
  archived boolean default false,
  created_at timestamptz default now()
);

-- Matches: one row per game played
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references auth.users(id) not null,
  deck_id uuid references decks(id) not null,
  opponent_deck text not null,       -- free text: opponent's leader/deck name (opponent may not be a user)
  opponent_player text,              -- optional: which friend you played against
  result text not null check (result in ('win', 'loss')),
  went_first boolean,
  notes text,
  played_at timestamptz default now()
);

-- Matchup notes: strategy notes tied to a (your deck, opponent deck) pairing, shared with the group
create table if not exists matchup_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) not null,
  your_deck text not null,           -- leader name, so notes apply across whoever pilots that deck
  opponent_deck text not null,
  note text not null,
  created_at timestamptz default now()
);

-- Row Level Security: everyone in the group can read everything (shared stats/notes),
-- but you can only write/edit your own rows.
alter table decks enable row level security;
alter table matches enable row level security;
alter table matchup_notes enable row level security;

create policy "decks are readable by any logged-in user" on decks
  for select using (auth.role() = 'authenticated');
create policy "users manage their own decks" on decks
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "matches are readable by any logged-in user" on matches
  for select using (auth.role() = 'authenticated');
create policy "users manage their own matches" on matches
  for all using (auth.uid() = player_id) with check (auth.uid() = player_id);

create policy "matchup notes are readable by any logged-in user" on matchup_notes
  for select using (auth.role() = 'authenticated');
create policy "users manage their own matchup notes" on matchup_notes
  for all using (auth.uid() = author_id) with check (auth.uid() = author_id);
