-- ==============================================================================
-- ShelfApp - Deduplicate & Add Unique Constraint on Collection Items
-- Prevents duplicate releases for the same user
-- ==============================================================================

-- 1. Deduplicate existing records by keeping the earliest created_at / lowest id
delete from public.collection_items a
using public.collection_items b
where a.id > b.id
  and a.user_id = b.user_id
  and a.release_id = b.release_id;

-- 2. Add unique constraint so duplicates are strictly impossible at DB level
alter table public.collection_items
drop constraint if exists uq_collection_items_user_release;

alter table public.collection_items
add constraint uq_collection_items_user_release unique (user_id, release_id);
