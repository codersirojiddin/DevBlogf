-- ─────────────────────────────────────────────────────────────────────────────
-- Ither Blog — Complete Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Profiles ───────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid references auth.users on delete cascade primary key,
  username    text unique,
  bio         text default '',
  avatar_url  text default '',
  is_admin    boolean default false,
  trust_score int default 0,
  banned      boolean default false,
  created_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. Posts (admin-only write) ───────────────────────────────────────────────
create table if not exists posts (
  id          uuid default gen_random_uuid() primary key,
  title       text not null,
  content     text not null,
  type        text check (type in ('article', 'news', 'code')) not null,
  highlighted boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── 3. Community Posts ────────────────────────────────────────────────────────
create table if not exists community_posts (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references profiles(id) on delete cascade not null,
  title      text not null,
  type       text,
  content    text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 4. Projects ───────────────────────────────────────────────────────────────
create table if not exists projects (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references profiles(id) on delete cascade not null,
  title         text not null,
  tagline       text,
  description   text,
  status        text default 'active',
  github_url    text,
  demo_url      text,
  thumbnail_url text,
  created_at    timestamptz default now()
);

-- ── 5. Likes ──────────────────────────────────────────────────────────────────
create table if not exists likes (
  id      uuid default gen_random_uuid() primary key,
  post_id uuid not null,
  user_id uuid references profiles(id) on delete cascade not null,
  unique (post_id, user_id)
);

-- ── 6. Comments ───────────────────────────────────────────────────────────────
create table if not exists comments (
  id         uuid default gen_random_uuid() primary key,
  post_id    uuid not null,
  user_id    uuid references profiles(id) on delete cascade not null,
  username   text,
  body       text not null,
  created_at timestamptz default now()
);

-- ── 7. Project Comments ───────────────────────────────────────────────────────
create table if not exists project_comments (
  id         uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id    uuid references profiles(id) on delete cascade not null,
  body       text not null,
  created_at timestamptz default now()
);

-- ── 8. Follows ────────────────────────────────────────────────────────────────
create table if not exists follows (
  id           uuid default gen_random_uuid() primary key,
  follower_id  uuid references profiles(id) on delete cascade not null,
  following_id uuid references profiles(id) on delete cascade not null,
  unique (follower_id, following_id)
);

-- ── 9. Bookmarks ──────────────────────────────────────────────────────────────
create table if not exists user_bookmarks (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references profiles(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  unique (user_id, project_id)
);

-- ── 10. Site Settings ─────────────────────────────────────────────────────────
create table if not exists site_settings (
  key        text primary key,
  value      text default '',
  updated_at timestamptz default now()
);

insert into site_settings (key, value)
values ('announcement', '')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS) Policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
alter table profiles         enable row level security;
alter table posts            enable row level security;
alter table community_posts  enable row level security;
alter table projects         enable row level security;
alter table likes            enable row level security;
alter table comments         enable row level security;
alter table project_comments enable row level security;
alter table follows          enable row level security;
alter table user_bookmarks   enable row level security;
alter table site_settings    enable row level security;

-- ── profiles ──────────────────────────────────────────────────────────────────
create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- ── posts (admin-only write) ──────────────────────────────────────────────────
create policy "Posts are viewable by everyone"
  on posts for select using (true);

create policy "Only admins can create posts"
  on posts for insert
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Only admins can update posts"
  on posts for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Only admins can delete posts"
  on posts for delete
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ── community_posts ───────────────────────────────────────────────────────────
create policy "Community posts viewable by everyone"
  on community_posts for select using (true);

create policy "Authenticated users can create community posts"
  on community_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own community posts"
  on community_posts for update
  using (auth.uid() = user_id);

create policy "Users or admins can delete community posts"
  on community_posts for delete
  using (
    auth.uid() = user_id or
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- ── projects ──────────────────────────────────────────────────────────────────
create policy "Projects viewable by everyone"
  on projects for select using (true);

create policy "Authenticated users can submit projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users or admins can delete projects"
  on projects for delete
  using (
    auth.uid() = user_id or
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- ── likes ─────────────────────────────────────────────────────────────────────
create policy "Likes viewable by everyone"
  on likes for select using (true);

create policy "Authenticated users can like"
  on likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike own likes"
  on likes for delete
  using (auth.uid() = user_id);

-- ── comments ──────────────────────────────────────────────────────────────────
create policy "Comments viewable by everyone"
  on comments for select using (true);

create policy "Authenticated users can comment"
  on comments for insert
  with check (auth.uid() = user_id);

create policy "Users or admins can delete comments"
  on comments for delete
  using (
    auth.uid() = user_id or
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- ── project_comments ──────────────────────────────────────────────────────────
create policy "Project comments viewable by everyone"
  on project_comments for select using (true);

create policy "Authenticated users can add project comments"
  on project_comments for insert
  with check (auth.uid() = user_id);

create policy "Users or admins can delete project comments"
  on project_comments for delete
  using (
    auth.uid() = user_id or
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- ── follows ───────────────────────────────────────────────────────────────────
create policy "Follows viewable by everyone"
  on follows for select using (true);

create policy "Authenticated users can follow"
  on follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on follows for delete
  using (auth.uid() = follower_id);

-- ── user_bookmarks ────────────────────────────────────────────────────────────
create policy "Users see own bookmarks"
  on user_bookmarks for select
  using (auth.uid() = user_id);

create policy "Authenticated users can bookmark"
  on user_bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own bookmarks"
  on user_bookmarks for delete
  using (auth.uid() = user_id);

-- ── site_settings ─────────────────────────────────────────────────────────────
create policy "Site settings viewable by everyone"
  on site_settings for select using (true);

create policy "Only admins can update site settings"
  on site_settings for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ─────────────────────────────────────────────────────────────────────────────
-- Make yourself admin (run AFTER signing up on the site)
-- ─────────────────────────────────────────────────────────────────────────────
-- update profiles set is_admin = true where id = '<paste-your-user-id-here>';
