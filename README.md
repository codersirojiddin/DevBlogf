# Ither — Developer Blog Platform

A community platform for developers to publish articles, share projects, and discuss code.  
Live at → **[ither.online](https://ither.online)**

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | Vanilla HTML/CSS/JS (static)      |
| Backend  | Supabase (Auth + PostgreSQL + Storage) |
| Deploy   | Cloudflare Pages + Functions      |
| Domain   | ither.online                      |

---

## Project Structure

```
ither-blog/
│
├── 📁 assets/               # Global styles
│   ├── style.css            # Main stylesheet
│   └── admin.css            # Admin panel styles
│
├── 📁 lib/                  # Shared JS libraries (loaded on every page)
│   ├── supabase.js          # Supabase client — auth, fetch, realtime
│   ├── posts.js             # Blog post CRUD helpers
│   ├── interactions.js      # Likes, comments, follows
│   ├── project.js           # Project showcase helpers
│   ├── user-menu.js         # Nav user dropdown logic
│   ├── header.js            # Site-wide header renderer
│   └── env.js               # ENV guard (reads window.__ENV__)
│
├── 📁 functions/            # Cloudflare Pages Functions
│   └── _middleware.js       # Injects ENV vars into every HTML response
│
├── 📁 pages/                # Public pages
│   ├── index.html           # Home
│   ├── articles/            # Article listing
│   ├── article-detail/      # Single article view
│   ├── code/                # Code snippets
│   ├── news/                # Tech news
│   ├── community/           # Community posts
│   ├── showcase/            # Project showcase
│   ├── submit-project/      # Submit a project
│   ├── publish/             # Write an article
│   ├── profile/             # User profile
│   ├── login/               # Auth page
│   ├── about/               # About page
│   └── contact/             # Contact page
│
├── 📁 iamadmin/             # Admin panel (protected by Supabase Auth)
│   ├── index.html
│   └── admin.js
│
├── .env.example             # ← Copy this to .env.local for local dev
├── .gitignore
├── CNAME                    # ither.online
├── robots.txt
├── sitemap.xml
└── ads.txt
```

---

## Getting Started

### 1. Clone & setup env

```bash
git clone https://github.com/your-username/ither-blog.git
cd ither-blog
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local
```

### 2. Local development

No build step needed. Just serve the root folder:

```bash
# Python
python3 -m http.server 3000

# Node
npx serve . -p 3000

# VS Code: install "Live Server" extension, right-click index.html → Open with Live Server
```

Then open `http://localhost:3000`

> **Note:** For ENV injection to work locally, create `lib/env.local.js` (already gitignored):
> ```js
> window.__ENV__ = {
>   SUPABASE_URL: "https://xxxx.supabase.co",
>   SUPABASE_ANON_KEY: "eyJ..."
> };
> ```
> And add `<script src="/lib/env.local.js"></script>` before `<script src="/lib/env.js"></script>` in `index.html` temporarily.

---

## Deploy to Cloudflare Pages

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

### Step 2 — Create Cloudflare Pages project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** → **Create a project**
2. Connect your GitHub repository
3. Build settings:
   - **Framework preset:** `None`
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` *(root)*
4. **Environment Variables** → Add:
   ```
   SUPABASE_URL      = https://xxxx.supabase.co
   SUPABASE_ANON_KEY = eyJ...
   ```
5. Click **Save and Deploy**

### Step 3 — Connect custom domain

Pages → your project → **Custom domains** → Add `ither.online`

---

## Supabase Setup

### Required tables

```sql
-- Profiles (auto-created on signup via trigger)
create table profiles (
  id uuid references auth.users primary key,
  username text unique,
  bio text,
  avatar_url text,
  is_admin boolean default false,
  trust_score int default 0,
  banned boolean default false,
  created_at timestamptz default now()
);

-- Posts (admin-only write)
create table posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  type text check (type in ('article', 'news', 'code')),
  highlighted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Community posts (any authenticated user)
create table community_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  type text,
  content text,
  created_at timestamptz default now()
);

-- Projects
create table projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  tagline text,
  status text,
  thumbnail_url text,
  created_at timestamptz default now()
);

-- Site settings (announcement banner, etc.)
create table site_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
insert into site_settings (key, value) values ('announcement', '');
```

### Make yourself admin

```sql
-- After signing up on the site, run this in Supabase SQL Editor:
update profiles set is_admin = true where id = '<your-user-id>';
```

---

## Environment Variables

| Variable           | Where to get it                              |
|--------------------|----------------------------------------------|
| `SUPABASE_URL`     | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY`| Supabase → Project Settings → API → anon key |

These are **never** committed to git. They are injected at request time by `functions/_middleware.js`.

---

## Admin Panel

URL: `/iamadmin/`

Login with your Supabase email + password. Your account must have `is_admin = true` in the `profiles` table.

Features: manage articles, projects, community posts, users (ban/unban, trust score), announcement banner.
