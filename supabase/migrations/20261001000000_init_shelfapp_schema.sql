-- ==============================================================================
-- ShelfApp - Initial Database Schema & Security Policies
-- Architecture: Supabase Postgres + Auth + RLS + Storage
-- ==============================================================================

-- 1. Enable required extensions
create extension if not exists pgcrypto;

-- 2. Table: discogs_tokens
-- Stores encrypted personal access tokens for Discogs per authenticated user.
-- The token is encrypted using pgcrypto so that plain text never leaks in raw DB dumps.
create table if not exists public.discogs_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references auth.users(id) on delete cascade,
    token_encrypted text not null,
    discogs_username text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Table: collection_items
-- Stores user's physical media items (vinyls, CDs, cassettes) linked to Discogs releases.
create table if not exists public.collection_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    release_id bigint not null,
    master_id bigint,
    title text not null,
    artist text not null,
    year integer,
    format text not null default 'Vinyl', -- e.g. 'Vinyl', 'CD', 'Cassette'
    format_details jsonb not null default '[]'::jsonb, -- e.g. ["LP", "Album", "Reissue", "Gatefold"]
    label text,
    catno text,
    genres jsonb not null default '[]'::jsonb,
    styles jsonb not null default '[]'::jsonb,
    cover_url_official text,
    cover_url_custom text, -- Supabase Storage public URL if user uploaded a scan/photo
    tracklist jsonb not null default '[]'::jsonb, -- [{ position: "A1", title: "...", duration: "3:45" }]
    notes text,
    rating smallint check (rating >= 1 and rating <= 5),
    shelf_section text not null default 'Vinyl', -- Categorization on shelf (e.g. 'Vinyl', 'CD', 'Favoris')
    shelf_position integer not null default 0, -- Custom ordering on shelf
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Indexes for lightning fast lookups & sorting
create index if not exists idx_collection_items_user_id on public.collection_items(user_id);
create index if not exists idx_collection_items_shelf on public.collection_items(user_id, shelf_section, shelf_position);
create index if not exists idx_collection_items_release_id on public.collection_items(release_id);
create index if not exists idx_discogs_tokens_user_id on public.discogs_tokens(user_id);

-- 4. Automatic updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create or replace trigger tr_discogs_tokens_updated_at
    before update on public.discogs_tokens
    for each row execute function public.handle_updated_at();

create or replace trigger tr_collection_items_updated_at
    before update on public.collection_items
    for each row execute function public.handle_updated_at();

-- 5. Row Level Security (RLS)
alter table public.discogs_tokens enable row level security;
alter table public.collection_items enable row level security;

-- Policies for discogs_tokens
-- User can insert their own token
create policy "Users can insert their own token"
    on public.discogs_tokens for insert
    with check (auth.uid() = user_id);

-- User can update their own token
create policy "Users can update their own token"
    on public.discogs_tokens for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- User can delete their own token
create policy "Users can delete their own token"
    on public.discogs_tokens for delete
    using (auth.uid() = user_id);

-- User can check if token exists (we only expose metadata via view or direct select for owner)
create policy "Users can select their own token record"
    on public.discogs_tokens for select
    using (auth.uid() = user_id);

-- Policies for collection_items
create policy "Users can select their own collection items"
    on public.collection_items for select
    using (auth.uid() = user_id);

create policy "Users can insert their own collection items"
    on public.collection_items for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own collection items"
    on public.collection_items for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own collection items"
    on public.collection_items for delete
    using (auth.uid() = user_id);

-- 6. Storage Bucket for custom covers
-- Create 'covers' bucket if it doesn't exist yet
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'covers',
    'covers',
    true,
    5242880, -- 5 MB max per image
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS: Users can upload and manage their own covers in covers/<user_id>/...
create policy "Public read access to media covers"
    on storage.objects for select
    using (bucket_id = 'covers');

create policy "Users can upload their own media covers"
    on storage.objects for insert
    with check (
        bucket_id = 'covers'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Users can update their own media covers"
    on storage.objects for update
    using (
        bucket_id = 'covers'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Users can delete their own media covers"
    on storage.objects for delete
    using (
        bucket_id = 'covers'
        and auth.uid()::text = (storage.foldername(name))[1]
    );
