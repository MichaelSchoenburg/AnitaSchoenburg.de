-- ── Tabellen ──────────────────────────────────────────────

create table public.users (
  id               uuid primary key references auth.users on delete cascade,
  display_name     text not null,
  avatar_url       text,
  email            text not null,
  is_admin         boolean not null default false,
  email_notifications boolean not null default true,
  created_at       timestamptz not null default now()
);

create table public.paintings (
  id               text primary key,
  comment_count    integer not null default 0,
  reaction_counts  jsonb not null default '{}'::jsonb
);

create table public.comments (
  id             uuid primary key default gen_random_uuid(),
  painting_id    text not null references public.paintings(id),
  parent_id      uuid references public.comments(id),
  depth          integer not null default 0 check (depth between 0 and 9),
  author_id      uuid not null references public.users(id),
  author_name    text not null,
  author_avatar  text,
  text           text not null check (char_length(text) between 1 and 10000),
  created_at     timestamptz not null default now(),
  edited_at      timestamptz,
  deleted        boolean not null default false,
  reaction_count integer not null default 0,
  child_count    integer not null default 0
);

create table public.reactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  target_id    text not null,
  target_type  text not null check (target_type in ('painting', 'comment')),
  emoji        text not null,
  created_at   timestamptz not null default now(),
  unique (user_id, target_id)
);

-- ── Indexes ───────────────────────────────────────────────

create index on public.comments (painting_id, parent_id, created_at desc);
create index on public.comments (painting_id, parent_id, reaction_count desc);
create index on public.reactions (target_id);

-- ── Initiale Gemälde-Einträge ─────────────────────────────

insert into public.paintings (id) values
  ('ohne-titel-i'),
  ('ohne-titel-ii'),
  ('ohne-titel-iii'),
  ('ohne-titel-iv'),
  ('ki-bild-i'),
  ('youtube-kanalbild'),
  ('kupfergruen-altem-stein');

-- ── Trigger: comment_count ────────────────────────────────

create or replace function handle_comment_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.paintings
    set comment_count = comment_count + 1
    where id = NEW.painting_id;
  elsif TG_OP = 'UPDATE' and OLD.deleted = false and NEW.deleted = true then
    update public.paintings
    set comment_count = greatest(comment_count - 1, 0)
    where id = NEW.painting_id;
  end if;
  return NEW;
end;
$$;

create trigger trg_comment_count
after insert or update on public.comments
for each row execute function handle_comment_count();

-- ── Trigger: child_count ──────────────────────────────────

create or replace function handle_child_count()
returns trigger language plpgsql security definer as $$
begin
  if NEW.parent_id is not null then
    update public.comments
    set child_count = child_count + 1
    where id = NEW.parent_id;
  end if;
  return NEW;
end;
$$;

create trigger trg_child_count
after insert on public.comments
for each row execute function handle_child_count();

-- ── Row Level Security ────────────────────────────────────

alter table public.users     enable row level security;
alter table public.paintings enable row level security;
alter table public.comments  enable row level security;
alter table public.reactions enable row level security;

-- users
create policy "users_select" on public.users
  for select using (true);

create policy "users_insert" on public.users
  for insert with check (auth.uid() = id and is_admin = false);

create policy "users_update" on public.users
  for update using (auth.uid() = id)
  with check (
    is_admin = (select is_admin from public.users where id = auth.uid())
  );

-- paintings (nur lesen; Schreiben nur via Trigger/Service Role)
create policy "paintings_select" on public.paintings
  for select using (true);

-- comments
create policy "comments_select" on public.comments
  for select using (true);

create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = author_id and depth <= 9);

create policy "comments_update" on public.comments
  for update using (
    auth.uid() = author_id or
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- reactions
create policy "reactions_select" on public.reactions
  for select using (true);

create policy "reactions_insert" on public.reactions
  for insert with check (auth.uid() = user_id);

create policy "reactions_delete" on public.reactions
  for delete using (auth.uid() = user_id);
