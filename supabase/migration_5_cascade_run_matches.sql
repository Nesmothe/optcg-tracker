-- Migration 5: deleting a tournament run also deletes the matches logged in it.
-- Run this in the Supabase SQL editor. Safe to run more than once.
--
-- Migration 4 linked matches to runs with "on delete set null", which kept
-- the matches (just unlinked) when a run was deleted. This switches the link
-- to "on delete cascade" so the database itself removes the run's matches,
-- regardless of which version of the app deleted the run.

alter table matches drop constraint if exists matches_tournament_id_fkey;

alter table matches
  add constraint matches_tournament_id_fkey
  foreign key (tournament_id) references tournaments(id) on delete cascade;
