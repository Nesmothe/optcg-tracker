-- Migration 6: save the decklist used in each match
-- Run this in the Supabase SQL editor. Safe to run more than once.
--
-- A match stores its OWN copy (a snapshot) of the deck's decklist at the moment
-- it is logged, in the same [{ "id": "OP01-001", "count": 4 }, ...] format as
-- decks.decklist. That way a match keeps the list you actually played even if
-- you later replace the deck's list with a newer one.
alter table matches add column if not exists decklist jsonb;

-- OPTIONAL — backfill matches you logged BEFORE this migration with their
-- deck's CURRENT decklist. Only do this if your lists haven't changed much,
-- since it can't know what the list looked like at the time. To run it,
-- remove the two leading dashes from each line below.
--
-- update matches m
--    set decklist = d.decklist
--   from decks d
--  where m.deck_id = d.id
--    and m.decklist is null
--    and d.decklist is not null;
