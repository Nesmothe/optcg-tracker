-- Migration 3: structured leader cards
-- Run this in the Supabase SQL editor AFTER schema.sql and migration_2_profiles.sql.

-- Decks: keep the existing `leader` text column (now populated from a real
-- card name via search instead of free typing), and add the card reference
-- + art so it's available for display later (e.g. in the win/loss rings).
alter table decks add column if not exists leader_card_id text;
alter table decks add column if not exists leader_image_url text;

-- Matches: the opponent's leader is still free text in `opponent_deck` (since
-- opponents aren't necessarily app users), but when it's picked from the
-- search box we also capture the card reference + art for future display.
alter table matches add column if not exists opponent_leader_card_id text;
alter table matches add column if not exists opponent_leader_image_url text;
