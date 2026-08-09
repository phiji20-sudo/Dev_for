-- Enable pgcrypto for UUID generation
create extension if not exists "pgcrypto";

-- Table: gallery_images
create table if not exists public.gallery_images (
  id bigserial primary key,
  uuid uuid default gen_random_uuid() not null,
  image_url text not null,
  storage_path text,
  text text,
  container_index integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists gallery_images_container_idx on public.gallery_images (container_index);
create index if not exists gallery_images_created_idx on public.gallery_images (created_at);

-- Table: site_settings (singleton)
create table if not exists public.site_settings (
  id integer primary key default 1,
  hero_image_url text,
  updated_at timestamptz default now()
);

-- Ensure single row exists with id = 1
insert into public.site_settings (id) values (1)
on conflict (id) do nothing;

-- Enable Row Level Security (RLS)
alter table public.gallery_images enable row level security;
alter table public.site_settings enable row level security;

-- PUBLIC policies for gallery_images (permissive; see notes)
create policy "public_select_gallery_images" on public.gallery_images
  for select
  using (true);

create policy "public_insert_gallery_images" on public.gallery_images
  for insert
  with check (true);

create policy "public_delete_gallery_images" on public.gallery_images
  for delete
  using (true);

create policy "public_update_gallery_images" on public.gallery_images
  for update
  using (true)
  with check (true);

-- PUBLIC policies for site_settings
create policy "public_select_site_settings" on public.site_settings
  for select
  using (true);

create policy "public_insert_site_settings" on public.site_settings
  for insert
  with check (true);

create policy "public_update_site_settings" on public.site_settings
  for update
  using (true)
  with check (true);
