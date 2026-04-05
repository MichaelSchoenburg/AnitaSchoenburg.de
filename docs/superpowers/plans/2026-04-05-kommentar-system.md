# Kommentar- und Reaktionssystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein vollständiges Kommentar- und Reaktionssystem mit Supabase Auth (Google OAuth + E-Mail+Passwort), verschachtelten Kommentaren (10 Ebenen), Emoji-Reaktionen und E-Mail-Benachrichtigungen für die statische Künstler-Website.

**Architecture:** Supabase (Auth + PostgreSQL + Edge Functions) als Backend-as-a-Service, direkt aus dem Browser via CDN-SDK angesprochen. Jedes Gemälde bekommt eine eigene statische HTML-Detailseite. PostgreSQL-Trigger übernehmen Zähler-Updates. Eine Edge Function übernimmt E-Mail-Versand via Resend.

**Tech Stack:** Supabase JS SDK v2 (CDN ESM), emoji-mart 5 (CDN), Resend (E-Mail), reines HTML/CSS/JS ohne Build-Prozess, Supabase CLI für Edge Function Deploy.

---

## Dateiübersicht

### Neue Dateien
| Datei | Verantwortung |
|---|---|
| `js/supabase-config.js` | Supabase-Client, exportiert `supabase` |
| `js/auth-ui.js` | Login-Dialog (Google + E-Mail+Passwort), Logout, User-State |
| `js/reactions.js` | Emoji-Picker, Reaktion speichern/löschen, Zähler anzeigen |
| `js/comments.js` | Kommentare laden (Infinite Scroll, Sortierung), rendern, threading |
| `js/comment-form.js` | Kommentar-Formular: Erstellen, Bearbeiten, URL-Filter |
| `js/gallery-counts.js` | Kommentarzähler auf Galerie-Karten laden |
| `css/comments.css` | Alle Stile für Auth-Dialog + Kommentarsystem (Brand Identity) |
| `gemälde/ohne-titel-i.html` | Detailseite Gemälde 1 |
| `gemälde/ohne-titel-ii.html` | Detailseite Gemälde 2 |
| `gemälde/ohne-titel-iii.html` | Detailseite Gemälde 3 |
| `gemälde/ohne-titel-iv.html` | Detailseite Gemälde 4 |
| `gemälde/ki-bild-i.html` | Detailseite KI-Bild I |
| `gemälde/youtube-kanalbild.html` | Detailseite YouTube-Kanalbild |
| `gemälde/kupfergruen-altem-stein.html` | Detailseite Video |
| `supabase/migrations/001_initial.sql` | Vollständiges DB-Schema inkl. Triggers und RLS |
| `supabase/functions/notify-comment-reply/index.ts` | Edge Function für E-Mail |

### Geänderte Dateien
| Datei | Änderung |
|---|---|
| `galerie.html` | Links auf Detailseiten, Kommentarzähler-Elemente, Lightbox entfernt |
| `css/gallery.css` | `a.painting`-Stil ergänzen |
| `impressum.html` | DSGVO-Abschnitt ergänzen |

---

## Task 1: Supabase-Projekt anlegen & konfigurieren

**Files:**
- Create: `js/supabase-config.js`

- [ ] **Schritt 1: Supabase-Projekt erstellen**

  Gehe zu https://supabase.com → „New project" → Organisation wählen → Name: `anitaschoenburg-de` → Passwort notieren → Region: **`eu-central-1` (Frankfurt)** → „Create new project".

- [ ] **Schritt 2: Google OAuth aktivieren**

  Supabase Dashboard → Authentication → Providers → Google → aktivieren.
  
  Dann Google Cloud Console (https://console.cloud.google.com):
  - Neues Projekt oder bestehendes nutzen → APIs & Services → Credentials → „Create Credentials" → OAuth 2.0 Client ID → Web application
  - Authorized redirect URI: `https://DEIN-PROJECT-REF.supabase.co/auth/v1/callback`
  - Client ID und Client Secret in Supabase eintragen → Save

- [ ] **Schritt 3: E-Mail-Auth konfigurieren**

  Supabase Dashboard → Authentication → Providers → Email → aktiviert lassen (Standard).
  
  Authentication → Email Templates → „Confirm signup": Betreff und Absender auf Deutsch anpassen (optional).

- [ ] **Schritt 4: Projekt-URL und Anon-Key notieren**

  Supabase Dashboard → Settings → API:
  - `Project URL`: z.B. `https://xyzxyzxyz.supabase.co`
  - `anon public key`: langer JWT-String

- [ ] **Schritt 5: `js/supabase-config.js` anlegen**

  Ersetze `DEINE_URL` und `DEIN_ANON_KEY` mit den Werten aus Schritt 4:

```js
// js/supabase-config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(
  'DEINE_URL',
  'DEIN_ANON_KEY'
);
```

- [ ] **Schritt 6: Commit**

```bash
git add js/supabase-config.js
git commit -m "feat: Supabase-Konfiguration"
```

---

## Task 2: Datenbankschema, Trigger & RLS

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Schritt 1: `supabase/migrations/001_initial.sql` anlegen**

```sql
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
```

- [ ] **Schritt 2: Migration in Supabase ausführen**

  Supabase Dashboard → SQL Editor → Inhalt von `supabase/migrations/001_initial.sql` einfügen → „Run".
  
  Erwartete Ausgabe: `Success. No rows returned.`

- [ ] **Schritt 3: Prüfen**

  Supabase Dashboard → Table Editor: Die Tabellen `users`, `paintings`, `comments`, `reactions` müssen vorhanden sein. `paintings` enthält 7 Zeilen.

- [ ] **Schritt 4: Commit**

```bash
git add supabase/migrations/001_initial.sql
git commit -m "feat: Datenbankschema, Trigger und RLS"
```

---

## Task 3: Authentication UI

**Files:**
- Create: `js/auth-ui.js`
- Create: `css/comments.css` (Auth-Dialog-Stile)

- [ ] **Schritt 1: `js/auth-ui.js` anlegen**

```js
// js/auth-ui.js
import { supabase } from './supabase-config.js';

// ── User-Profil in public.users anlegen ───────────────────
async function ensureUserProfile(user) {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!existing) {
    const meta = user.user_metadata;
    await supabase.from('users').insert({
      id: user.id,
      display_name: meta.full_name || meta.name || meta.email?.split('@')[0] || 'Anonym',
      avatar_url: meta.avatar_url || null,
      email: user.email
    });
  }
}

// ── Google OAuth ──────────────────────────────────────────
export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
  if (error) throw error;
}

// ── E-Mail Registrierung ──────────────────────────────────
export async function registerWithEmail(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: displayName } }
  });
  if (error) throw error;
  if (data.user) await ensureUserProfile(data.user);
}

// ── E-Mail Login ──────────────────────────────────────────
export async function loginWithEmail(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// ── Logout ────────────────────────────────────────────────
export async function logout() {
  await supabase.auth.signOut();
}

// ── Auth-State beobachten ─────────────────────────────────
export function onUserChanged(callback) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(session?.user ?? null);
  });
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user ?? null;
    if (user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
      await ensureUserProfile(user);
    }
    callback(user);
  });
  return () => subscription.unsubscribe();
}

// ── Nutzer-Profil aus public.users laden ──────────────────
export async function getUserProfile(userId) {
  const { data } = await supabase
    .from('users')
    .select('display_name, avatar_url, is_admin, email_notifications')
    .eq('id', userId)
    .single();
  return data;
}

// ── Auth-Dialog rendern ───────────────────────────────────
export function renderAuthDialog(container) {
  container.innerHTML = `
    <div class="auth-dialog" id="authDialog">
      <div class="auth-dialog__inner" onclick="event.stopPropagation()">
        <button class="auth-dialog__close" id="authDialogClose">&times;</button>
        <h2 class="auth-dialog__title">Anmelden</h2>

        <button class="btn auth-btn-google" id="authGoogle">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Mit Google anmelden
        </button>

        <div class="auth-divider"><span>oder</span></div>

        <div class="auth-tabs">
          <button class="auth-tab is-active" data-tab="login">Anmelden</button>
          <button class="auth-tab" data-tab="register">Registrieren</button>
        </div>

        <form class="auth-form" id="authFormLogin">
          <input class="auth-input" type="email" id="loginEmail" placeholder="E-Mail" required autocomplete="email">
          <input class="auth-input" type="password" id="loginPassword" placeholder="Passwort" required autocomplete="current-password">
          <p class="auth-error" id="loginError"></p>
          <button class="btn" type="submit">Anmelden</button>
        </form>

        <form class="auth-form auth-form--hidden" id="authFormRegister">
          <input class="auth-input" type="text" id="regName" placeholder="Anzeigename" required maxlength="50" autocomplete="nickname">
          <input class="auth-input" type="email" id="regEmail" placeholder="E-Mail" required autocomplete="email">
          <input class="auth-input" type="password" id="regPassword" placeholder="Passwort (mind. 6 Zeichen)" required minlength="6" autocomplete="new-password">
          <p class="auth-error" id="regError"></p>
          <button class="btn" type="submit">Registrieren</button>
        </form>
      </div>
    </div>
  `;

  const dialog = container.querySelector('#authDialog');
  container.querySelector('#authDialogClose').addEventListener('click', () => container.innerHTML = '');
  dialog.addEventListener('click', e => { if (e.target === dialog) container.innerHTML = ''; });

  container.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const isLogin = tab.dataset.tab === 'login';
      container.querySelector('#authFormLogin').classList.toggle('auth-form--hidden', !isLogin);
      container.querySelector('#authFormRegister').classList.toggle('auth-form--hidden', isLogin);
    });
  });

  container.querySelector('#authGoogle').addEventListener('click', async () => {
    try { await loginWithGoogle(); }
    catch (e) { console.error(e); }
  });

  container.querySelector('#authFormLogin').addEventListener('submit', async e => {
    e.preventDefault();
    const errorEl = container.querySelector('#loginError');
    try {
      await loginWithEmail(
        container.querySelector('#loginEmail').value,
        container.querySelector('#loginPassword').value
      );
      container.innerHTML = '';
    } catch {
      errorEl.textContent = 'Anmeldung fehlgeschlagen. Bitte prüfe E-Mail und Passwort.';
    }
  });

  container.querySelector('#authFormRegister').addEventListener('submit', async e => {
    e.preventDefault();
    const errorEl = container.querySelector('#regError');
    try {
      await registerWithEmail(
        container.querySelector('#regEmail').value,
        container.querySelector('#regPassword').value,
        container.querySelector('#regName').value.trim()
      );
      container.innerHTML = '';
      errorEl.textContent = 'Bitte bestätige deine E-Mail-Adresse.';
    } catch (err) {
      errorEl.textContent = err.message?.includes('already registered')
        ? 'Diese E-Mail ist bereits registriert.'
        : 'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
    }
  });
}
```

- [ ] **Schritt 2: `css/comments.css` anlegen**

```css
/* css/comments.css */

/* ── Auth-Dialog ───────────────────────────────────────── */
.auth-dialog {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
}

.auth-dialog__inner {
  background: var(--color-creme);
  border: 1px solid var(--color-beige);
  border-radius: 4px;
  padding: var(--spacing-lg);
  width: 100%;
  max-width: 400px;
  position: relative;
}

.auth-dialog__close {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-md);
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-pflaume);
  cursor: pointer;
  line-height: 1;
}

.auth-dialog__title {
  font-family: var(--font-body);
  font-size: 1.25rem;
  color: var(--color-pflaume);
  margin: 0 0 var(--spacing-md);
}

.auth-btn-google {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  justify-content: center;
  background: #fff;
  border: 1px solid var(--color-beige);
  color: var(--color-text);
}

.auth-btn-google:hover { border-color: var(--color-pflaume); background: #fff; }

.auth-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--color-beige);
  font-size: 0.85rem;
  margin: var(--spacing-sm) 0;
}
.auth-divider::before, .auth-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--color-beige);
}

.auth-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-beige);
  margin-bottom: var(--spacing-sm);
}

.auth-tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0.4rem 1rem;
  cursor: pointer;
  color: var(--color-text);
  font-family: var(--font-body);
  margin-bottom: -1px;
}

.auth-tab.is-active { color: var(--color-pflaume); border-bottom-color: var(--color-pflaume); }

.auth-form { display: flex; flex-direction: column; gap: 0.6rem; margin-top: var(--spacing-sm); }
.auth-form--hidden { display: none; }

.auth-input {
  border: 1px solid var(--color-beige);
  background: #fff;
  padding: 0.5rem 0.75rem;
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--color-text);
  border-radius: 2px;
  width: 100%;
  box-sizing: border-box;
}
.auth-input:focus { outline: none; border-color: var(--color-pflaume); }

.auth-error { color: #b00020; font-size: 0.85rem; min-height: 1.2em; margin: 0; }

/* ── Kommentar-Bereich ─────────────────────────────────── */
.comments-section { max-width: 760px; margin: var(--spacing-xl) auto; padding: 0 var(--spacing-md); }

.comments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-beige);
  padding-bottom: var(--spacing-sm);
}

.comments-title { font-family: var(--font-body); font-size: 1.1rem; color: var(--color-pflaume); margin: 0; }

.comments-sort { display: flex; gap: 0.25rem; }

.comments-sort-btn {
  background: none;
  border: 1px solid var(--color-beige);
  border-radius: 2px;
  padding: 0.25rem 0.6rem;
  font-family: var(--font-body);
  font-size: 0.85rem;
  color: var(--color-text);
  cursor: pointer;
}
.comments-sort-btn.is-active { background: var(--color-pflaume); color: var(--color-creme); border-color: var(--color-pflaume); }

.comments-login-prompt {
  text-align: center;
  padding: var(--spacing-lg);
  border: 1px solid var(--color-beige);
  background: var(--color-creme);
  border-radius: 4px;
  margin-bottom: var(--spacing-md);
  color: var(--color-text);
}

/* ── Kommentar-Formular ────────────────────────────────── */
.comment-form { margin-bottom: var(--spacing-md); }

.comment-form__user { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem; }

.comment-form__avatar,
.comment__avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--color-pflaume); color: var(--color-creme);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.85rem; font-family: var(--font-body);
  overflow: hidden; flex-shrink: 0;
}
.comment-form__avatar img, .comment__avatar img { width: 100%; height: 100%; object-fit: cover; }

.comment-form__name { font-family: var(--font-body); font-size: 0.9rem; color: var(--color-pflaume); }

.comment-form__textarea {
  width: 100%; min-height: 80px;
  border: 1px solid var(--color-beige); background: #fff;
  padding: 0.6rem 0.75rem;
  font-family: var(--font-body); font-size: 1rem; color: var(--color-text);
  resize: vertical; border-radius: 2px; box-sizing: border-box;
}
.comment-form__textarea:focus { outline: none; border-color: var(--color-pflaume); }

.comment-form__footer { display: flex; align-items: center; justify-content: space-between; margin-top: 0.4rem; }
.comment-form__chars { font-size: 0.8rem; color: var(--color-beige); }
.comment-form__chars.is-warning { color: #b00020; }
.comment-form__error { color: #b00020; font-size: 0.85rem; margin: 0.3rem 0 0; }

/* ── Kommentar ─────────────────────────────────────────── */
.comment-list { list-style: none; padding: 0; margin: 0; }

.comment { display: flex; gap: 0.75rem; margin-bottom: var(--spacing-sm); }

.comment__body { flex: 1; min-width: 0; }

.comment__header { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.2rem; flex-wrap: wrap; }
.comment__author { font-family: var(--font-body); font-size: 0.9rem; color: var(--color-pflaume); }
.comment__time { font-size: 0.78rem; color: #999; }
.comment__edited { font-size: 0.75rem; color: #999; font-style: italic; }

.comment__text {
  font-family: var(--font-body); font-size: 1rem; color: var(--color-text);
  line-height: 1.6; margin: 0 0 0.4rem;
  white-space: pre-wrap; word-break: break-word;
}
.comment__text--deleted { color: #999; font-style: italic; }

.comment__actions { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }

.comment__action-btn {
  background: none; border: none; padding: 0;
  font-family: var(--font-body); font-size: 0.82rem;
  color: var(--color-pflaume); cursor: pointer;
  text-decoration: underline; text-underline-offset: 2px;
}
.comment__action-btn:hover { color: var(--color-gold); }
.comment__action-btn--danger { color: #b00020; }
.comment__action-btn--danger:hover { color: #7a0014; }

.comment__replies { margin-top: var(--spacing-sm); padding-left: 1.5rem; border-left: 2px solid var(--color-beige); }

.comments-load-more { text-align: center; padding: var(--spacing-sm); color: #999; font-size: 0.85rem; font-family: var(--font-body); }

/* ── Reaktionen ────────────────────────────────────────── */
.reactions-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin: var(--spacing-sm) 0; }

.reaction-pill {
  display: inline-flex; align-items: center; gap: 0.3rem;
  border: 1px solid var(--color-beige); border-radius: 999px;
  padding: 0.2rem 0.6rem; font-size: 0.9rem; cursor: pointer;
  background: var(--color-creme); color: var(--color-text);
  transition: border-color 0.15s; font-family: var(--font-body);
}
.reaction-pill:hover, .reaction-pill.is-mine { border-color: var(--color-gold); background: #fff8e8; }
.reaction-pill__count { font-size: 0.78rem; color: var(--color-text); }

.reaction-add-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: 1px dashed var(--color-beige);
  border-radius: 50%; background: none; cursor: pointer;
  font-size: 1rem; color: var(--color-text); transition: border-color 0.15s;
}
.reaction-add-btn:hover { border-color: var(--color-gold); }

em-emoji-picker {
  --border-radius: 4px;
  --background-rgb: 250, 248, 245;
  position: fixed;
  z-index: 500;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

/* ── Galerie-Kommentarzähler ───────────────────────────── */
.painting-comment-count { font-family: var(--font-body); font-size: 0.8rem; color: var(--color-text); margin-top: 0.25rem; }
```

- [ ] **Schritt 3: Manuell testen**

  Starte `python -m http.server 8080`. Binde testweise in `index.html` ein:
  ```html
  <script type="module">
    import { renderAuthDialog } from './js/auth-ui.js';
    import { onUserChanged } from './js/auth-ui.js';
    const div = document.createElement('div');
    document.body.appendChild(div);
    renderAuthDialog(div);
    onUserChanged(u => console.log('User:', u?.email));
  </script>
  <link rel="stylesheet" href="css/comments.css">
  ```
  Erwartetes Ergebnis: Dialog erscheint, Google-Login leitet weiter und zurück, Konsole zeigt E-Mail. Test-Code danach entfernen.

- [ ] **Schritt 4: Commit**

```bash
git add js/auth-ui.js css/comments.css
git commit -m "feat: Authentication UI und Kommentar-Stile"
```

---

## Task 4: Reaktionen

**Files:**
- Create: `js/reactions.js`

- [ ] **Schritt 1: `js/reactions.js` anlegen**

```js
// js/reactions.js
import { supabase } from './supabase-config.js';

export async function loadReactions(targetId) {
  const { data } = await supabase
    .from('reactions')
    .select('emoji, user_id')
    .eq('target_id', targetId);

  const map = {};
  for (const row of data ?? []) {
    if (!map[row.emoji]) map[row.emoji] = { count: 0, users: [] };
    map[row.emoji].count++;
    map[row.emoji].users.push(row.user_id);
  }
  return map;
}

export async function setReaction(userId, targetId, targetType, emoji) {
  // Bestehende Reaktion dieses Nutzers laden
  const { data: existing } = await supabase
    .from('reactions')
    .select('id, emoji')
    .eq('user_id', userId)
    .eq('target_id', targetId)
    .maybeSingle();

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id);
    await updateReactionCount(targetId, targetType, existing.emoji, -1);
    if (existing.emoji === emoji) return; // Toggle: entfernen
  }

  await supabase.from('reactions').insert({ user_id: userId, target_id: targetId, target_type: targetType, emoji });
  await updateReactionCount(targetId, targetType, emoji, 1);
}

async function updateReactionCount(targetId, targetType, emoji, delta) {
  if (targetType === 'painting') {
    const { data } = await supabase.from('paintings').select('reaction_counts').eq('id', targetId).single();
    const counts = data?.reaction_counts ?? {};
    counts[emoji] = Math.max(0, (counts[emoji] ?? 0) + delta);
    if (counts[emoji] === 0) delete counts[emoji];
    await supabase.from('paintings').update({ reaction_counts: counts }).eq('id', targetId);
  } else {
    const { data } = await supabase.from('comments').select('reaction_count').eq('id', targetId).single();
    const newCount = Math.max(0, (data?.reaction_count ?? 0) + delta);
    await supabase.from('comments').update({ reaction_count: newCount }).eq('id', targetId);
  }
}

export function renderReactionsBar(container, targetId, targetType, currentUserId) {
  container.innerHTML = '<div class="reactions-bar" data-reactions-bar></div>';
  const bar = container.querySelector('[data-reactions-bar]');

  async function refresh() {
    const reactions = await loadReactions(targetId);
    bar.innerHTML = '';

    for (const [emoji, { count, users }] of Object.entries(reactions)) {
      if (count === 0) continue;
      const isMine = currentUserId && users.includes(currentUserId);
      const pill = document.createElement('button');
      pill.className = 'reaction-pill' + (isMine ? ' is-mine' : '');
      pill.title = users.join(', ');
      pill.innerHTML = `${emoji} <span class="reaction-pill__count">${count}</span>`;
      if (currentUserId) {
        pill.addEventListener('click', async () => {
          await setReaction(currentUserId, targetId, targetType, emoji);
          await refresh();
        });
      }
      bar.appendChild(pill);
    }

    if (currentUserId) {
      const addBtn = document.createElement('button');
      addBtn.className = 'reaction-add-btn';
      addBtn.title = 'Reaktion hinzufügen';
      addBtn.textContent = '😊';
      addBtn.addEventListener('click', e => {
        e.stopPropagation();
        openEmojiPicker(addBtn, async emoji => {
          await setReaction(currentUserId, targetId, targetType, emoji);
          await refresh();
        });
      });
      bar.appendChild(addBtn);
    }
  }

  refresh();
}

let pickerEl = null;

function openEmojiPicker(anchor, onSelect) {
  if (pickerEl) { pickerEl.remove(); pickerEl = null; }

  const doShow = () => {
    pickerEl = document.createElement('em-emoji-picker');
    pickerEl.setAttribute('locale', 'de');
    pickerEl.setAttribute('theme', 'light');

    const rect = anchor.getBoundingClientRect();
    pickerEl.style.top = (rect.bottom + 4) + 'px';
    pickerEl.style.left = rect.left + 'px';

    pickerEl.addEventListener('emoji-click', e => {
      onSelect(e.detail.unicode);
      pickerEl.remove(); pickerEl = null;
    });

    setTimeout(() => {
      document.addEventListener('click', () => {
        if (pickerEl) { pickerEl.remove(); pickerEl = null; }
      }, { once: true });
    }, 0);

    document.body.appendChild(pickerEl);
  };

  if (!customElements.get('em-emoji-picker')) {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://cdn.jsdelivr.net/npm/emoji-mart@5/dist/browser.js';
    script.onload = doShow;
    document.head.appendChild(script);
  } else {
    doShow();
  }
}
```

- [ ] **Schritt 2: Commit**

```bash
git add js/reactions.js
git commit -m "feat: Emoji-Reaktionen"
```

---

## Task 5: Kommentar-Formular

**Files:**
- Create: `js/comment-form.js`

- [ ] **Schritt 1: `js/comment-form.js` anlegen**

```js
// js/comment-form.js
import { supabase } from './supabase-config.js';

const URL_PATTERN = /((https?:\/\/|www\.)\S+)|(\S+\.(de|com|net|org|io|at|ch|eu|info|biz|app|dev)\b)/gi;

function avatarInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function renderCommentForm(container, { paintingId, parentId = null, depth = 0, user, profile, onSuccess, onCancel = null }) {
  const isReply = parentId !== null;

  container.innerHTML = `
    <form class="comment-form" data-comment-form>
      <div class="comment-form__user">
        <div class="comment-form__avatar">
          ${profile?.avatar_url
            ? `<img src="${profile.avatar_url}" alt="${profile.display_name}">`
            : avatarInitials(profile?.display_name)}
        </div>
        <span class="comment-form__name">${profile?.display_name ?? ''}</span>
      </div>
      <textarea
        class="comment-form__textarea"
        placeholder="${isReply ? 'Deine Antwort …' : 'Dein Kommentar …'}"
        maxlength="10000"
        rows="${isReply ? 3 : 4}"
      ></textarea>
      <div class="comment-form__footer">
        <span class="comment-form__chars">0 / 10.000</span>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          ${onCancel ? '<button type="button" class="comment-form__cancel">Abbrechen</button>' : ''}
          <button class="btn" type="submit">${isReply ? 'Antworten' : 'Kommentieren'}</button>
        </div>
      </div>
      <p class="comment-form__error"></p>
    </form>
  `;

  const form = container.querySelector('[data-comment-form]');
  const textarea = form.querySelector('textarea');
  const charsEl = form.querySelector('.comment-form__chars');
  const errorEl = form.querySelector('.comment-form__error');

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    charsEl.textContent = `${len.toLocaleString('de')} / 10.000`;
    charsEl.classList.toggle('is-warning', len > 9500);
  });

  form.querySelector('.comment-form__cancel')?.addEventListener('click', onCancel);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text) return;

    URL_PATTERN.lastIndex = 0;
    if (URL_PATTERN.test(text)) {
      errorEl.textContent = 'Links sind in Kommentaren nicht erlaubt.';
      return;
    }

    errorEl.textContent = '';
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;

    const { error } = await supabase.from('comments').insert({
      painting_id: paintingId,
      parent_id: parentId,
      depth,
      author_id: user.id,
      author_name: profile?.display_name ?? 'Anonym',
      author_avatar: profile?.avatar_url ?? null,
      text
    });

    btn.disabled = false;

    if (error) {
      errorEl.textContent = 'Fehler beim Speichern. Bitte versuche es erneut.';
      return;
    }

    textarea.value = '';
    charsEl.textContent = '0 / 10.000';
    onSuccess();
  });
}
```

- [ ] **Schritt 2: Commit**

```bash
git add js/comment-form.js
git commit -m "feat: Kommentar-Formular mit URL-Filter"
```

---

## Task 6: Kommentare laden & anzeigen

**Files:**
- Create: `js/comments.js`

- [ ] **Schritt 1: `js/comments.js` anlegen**

```js
// js/comments.js
import { supabase } from './supabase-config.js';
import { renderCommentForm } from './comment-form.js';
import { renderReactionsBar } from './reactions.js';
import { renderAuthDialog } from './auth-ui.js';

const PAGE_SIZE = 10;

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  return new Date(isoString).toLocaleDateString('de-DE');
}

function avatarInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function sortQuery(q, sort) {
  if (sort === 'popular') return q.order('reaction_count', { ascending: false });
  if (sort === 'newest')  return q.order('created_at', { ascending: false });
  return q.order('created_at', { ascending: true });
}

async function loadReplies(paintingId, parentId, container, user, profile, isAdmin, maxDepth) {
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('painting_id', paintingId)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });

  if (!data?.length) return;
  const list = document.createElement('ul');
  list.className = 'comment-list';
  for (const row of data) {
    list.appendChild(renderCommentItem(row, user, profile, paintingId, isAdmin, maxDepth));
  }
  container.appendChild(list);
}

function renderCommentItem(row, user, profile, paintingId, isAdmin, maxDepth) {
  const li = document.createElement('li');
  li.className = 'comment';
  li.dataset.commentId = row.id;

  const isOwner = user && user.id === row.author_id;
  const canDelete = isOwner || isAdmin;
  const canReply = row.depth < maxDepth;

  li.innerHTML = `
    <div class="comment__avatar">
      ${row.author_avatar
        ? `<img src="${row.author_avatar}" alt="${row.author_name}">`
        : avatarInitials(row.author_name)}
    </div>
    <div class="comment__body">
      <div class="comment__header">
        <span class="comment__author">${escapeHtml(row.author_name)}</span>
        <span class="comment__time">${timeAgo(row.created_at)}</span>
        ${row.edited_at ? '<span class="comment__edited">(bearbeitet)</span>' : ''}
      </div>
      <p class="comment__text${row.deleted ? ' comment__text--deleted' : ''}">
        ${row.deleted ? 'Kommentar wurde gelöscht.' : escapeHtml(row.text)}
      </p>
      ${!row.deleted ? '<div data-reactions></div>' : ''}
      <div class="comment__actions">
        ${!row.deleted && canReply ? '<button class="comment__action-btn" data-action="reply">Antworten</button>' : ''}
        ${!row.deleted && isOwner ? '<button class="comment__action-btn" data-action="edit">Bearbeiten</button>' : ''}
        ${!row.deleted && canDelete ? '<button class="comment__action-btn comment__action-btn--danger" data-action="delete">Löschen</button>' : ''}
      </div>
      <div data-reply-form></div>
      <div data-replies class="comment__replies"></div>
    </div>
  `;

  if (!row.deleted) {
    renderReactionsBar(li.querySelector('[data-reactions]'), row.id, 'comment', user?.id ?? null);
  }

  if (row.child_count > 0) {
    loadReplies(paintingId, row.id, li.querySelector('[data-replies]'), user, profile, isAdmin, maxDepth);
  }

  li.querySelector('[data-action="reply"]')?.addEventListener('click', () => {
    const formEl = li.querySelector('[data-reply-form]');
    if (formEl.children.length) { formEl.innerHTML = ''; return; }
    renderCommentForm(formEl, {
      paintingId, parentId: row.id, depth: row.depth + 1, user, profile,
      onSuccess: () => {
        formEl.innerHTML = '';
        const repliesEl = li.querySelector('[data-replies]');
        repliesEl.innerHTML = '';
        loadReplies(paintingId, row.id, repliesEl, user, profile, isAdmin, maxDepth);
      },
      onCancel: () => formEl.innerHTML = ''
    });
  });

  li.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
    const textEl = li.querySelector('.comment__text');
    textEl.innerHTML = `
      <textarea class="comment-form__textarea" style="width:100%;min-height:80px;">${escapeHtml(row.text)}</textarea>
      <div style="display:flex;gap:0.5rem;margin-top:0.4rem;">
        <button class="btn" data-save>Speichern</button>
        <button style="background:none;border:none;cursor:pointer;color:#999;font-family:var(--font-body);" data-cancel>Abbrechen</button>
      </div>
      <p class="comment-form__error"></p>
    `;
    textEl.querySelector('[data-cancel]').addEventListener('click', () => {
      textEl.className = 'comment__text';
      textEl.textContent = row.text;
    });
    textEl.querySelector('[data-save]').addEventListener('click', async () => {
      const newText = textEl.querySelector('textarea').value.trim();
      const errEl = textEl.querySelector('.comment-form__error');
      if (!newText) return;
      const URL_PATTERN = /((https?:\/\/|www\.)\S+)|(\S+\.(de|com|net|org|io|at|ch|eu|info|biz|app|dev)\b)/gi;
      if (URL_PATTERN.test(newText)) { errEl.textContent = 'Links sind nicht erlaubt.'; return; }
      const { error } = await supabase.from('comments').update({ text: newText, edited_at: new Date().toISOString() }).eq('id', row.id);
      if (error) { errEl.textContent = 'Fehler beim Speichern.'; return; }
      row.text = newText;
      row.edited_at = new Date().toISOString();
      textEl.className = 'comment__text';
      textEl.textContent = newText;
      if (!li.querySelector('.comment__edited')) {
        const span = document.createElement('span');
        span.className = 'comment__edited';
        span.textContent = '(bearbeitet)';
        li.querySelector('.comment__header').appendChild(span);
      }
    });
  });

  li.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
    if (!confirm('Kommentar wirklich löschen?')) return;
    await supabase.from('comments').update({ deleted: true }).eq('id', row.id);
    li.querySelector('.comment__text').className = 'comment__text comment__text--deleted';
    li.querySelector('.comment__text').textContent = 'Kommentar wurde gelöscht.';
    li.querySelector('[data-reactions]')?.remove();
    li.querySelector('.comment__actions').innerHTML = '';
  });

  return li;
}

export function renderCommentsSection(container, { paintingId, user, profile, isAdmin }) {
  const maxDepth = 9;
  let currentSort = 'popular';
  let currentPage = 0;
  let loading = false;
  let allLoaded = false;

  container.innerHTML = `
    <section class="comments-section">
      <div class="comments-header">
        <h2 class="comments-title">Kommentare</h2>
        <div class="comments-sort">
          <button class="comments-sort-btn is-active" data-sort="popular">Beliebt</button>
          <button class="comments-sort-btn" data-sort="newest">Neueste</button>
          <button class="comments-sort-btn" data-sort="oldest">Älteste</button>
        </div>
      </div>
      <div id="commentFormArea"></div>
      <ul class="comment-list" id="commentList"></ul>
      <div class="comments-load-more" id="loadMoreSentinel"></div>
    </section>
  `;

  const formArea = container.querySelector('#commentFormArea');
  const list = container.querySelector('#commentList');
  const sentinel = container.querySelector('#loadMoreSentinel');

  if (user) {
    renderCommentForm(formArea, {
      paintingId, parentId: null, depth: 0, user, profile,
      onSuccess: () => reload()
    });
  } else {
    formArea.innerHTML = `
      <div class="comments-login-prompt">
        <p>Möchtest du einen Kommentar hinterlassen?</p>
        <button class="btn" id="commentLoginBtn">Jetzt anmelden</button>
      </div>
    `;
    formArea.querySelector('#commentLoginBtn').addEventListener('click', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);
      renderAuthDialog(div);
    });
  }

  container.querySelectorAll('.comments-sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.comments-sort-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentSort = btn.dataset.sort;
      reload();
    });
  });

  async function reload() {
    list.innerHTML = '';
    currentPage = 0;
    allLoaded = false;
    await loadPage();
  }

  async function loadPage() {
    if (loading || allLoaded) return;
    loading = true;
    sentinel.textContent = 'Lade …';

    let q = supabase
      .from('comments')
      .select('*')
      .eq('painting_id', paintingId)
      .is('parent_id', null)
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    q = sortQuery(q, currentSort);
    const { data } = await q;

    if (!data?.length || data.length < PAGE_SIZE) allLoaded = true;
    currentPage++;

    for (const row of data ?? []) {
      list.appendChild(renderCommentItem(row, user, profile, paintingId, isAdmin, maxDepth));
    }

    sentinel.textContent = '';
    loading = false;
  }

  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) loadPage();
  }, { threshold: 0.1 }).observe(sentinel);

  reload();
}
```

- [ ] **Schritt 2: Commit**

```bash
git add js/comments.js
git commit -m "feat: Kommentare laden, Threading, Sortierung, Infinite Scroll"
```

---

## Task 7: Detailseiten

**Files:**
- Create: `gemälde/ohne-titel-i.html` (und 6 weitere)

- [ ] **Schritt 1: Ordner anlegen**

```bash
mkdir gemälde
```

- [ ] **Schritt 2: `gemälde/ohne-titel-i.html` anlegen**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ohne Titel I – Anita Schönburg</title>
  <link rel="icon" type="image/png" href="../assets/images/logo/icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cormorant+Garamond:ital,wght@0,300;1,300&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/variables.css">
  <link rel="stylesheet" href="../css/base.css">
  <link rel="stylesheet" href="../css/layout.css">
  <link rel="stylesheet" href="../css/components.css">
  <link rel="stylesheet" href="../css/comments.css">
</head>
<body>

  <header class="site-header">
    <div class="nav-inner">
      <a href="../index.html" class="site-logo">
        <img src="../assets/images/logo/icon.png" alt="" class="site-logo-img" width="40" height="35"> Anita Schönburg
      </a>
      <button class="nav-toggle" id="navToggle" aria-label="Menü öffnen">
        <span></span><span></span><span></span>
      </button>
      <nav>
        <ul class="site-nav" id="siteNav">
          <li><a href="../index.html">Start</a></li>
          <li><a href="../galerie.html">Galerie</a></li>
          <li><a href="../index.html#ueber-mich">Über mich</a></li>
          <li><a href="../index.html#dialog">Dialog</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main>
    <section class="section">
      <div class="container" style="max-width:900px;">
        <a href="../galerie.html" style="display:inline-block;margin-bottom:var(--spacing-md);font-family:var(--font-body);color:var(--color-pflaume);">← Zurück zur Galerie</a>

        <div style="display:flex;flex-wrap:wrap;gap:var(--spacing-lg);align-items:flex-start;">
          <div style="flex:1 1 400px;">
            <img
              src="../assets/images/gemälde/Gemälde_1.jpg"
              alt="Ohne Titel I – Gemälde von Anita Schönburg"
              style="width:100%;border:var(--border-gold);"
              onerror="this.style.background='#E8D5C0';this.style.minHeight='400px';this.removeAttribute('src')"
            >
            <div id="paintingReactions"></div>
          </div>
          <div style="flex:0 0 260px;">
            <h1 class="section-title" style="text-align:left;margin-bottom:var(--spacing-sm);">Ohne Titel I</h1>
            <p style="font-family:var(--font-body);color:var(--color-text);">Mischtechnik auf Leinwand</p>
            <div id="authArea" style="margin-top:var(--spacing-md);"></div>
          </div>
        </div>

        <div id="commentsArea" style="margin-top:var(--spacing-xl);"></div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <p class="footer-copy">© <span id="year"></span> Anita Schönburg · Alle Rechte vorbehalten</p>
      <nav class="footer-legal"><a href="../impressum.html">Impressum</a></nav>
    </div>
  </footer>

  <script src="../js/main.js"></script>
  <script type="module">
    import { onUserChanged, getUserProfile, logout, renderAuthDialog } from '../js/auth-ui.js';
    import { renderCommentsSection } from '../js/comments.js';
    import { renderReactionsBar } from '../js/reactions.js';

    const PAINTING_ID = 'ohne-titel-i';
    const authArea = document.getElementById('authArea');

    onUserChanged(async user => {
      let profile = null;
      if (user) profile = await getUserProfile(user.id);

      // Auth-Bereich
      if (user) {
        authArea.innerHTML = `
          <p style="font-family:var(--font-body);font-size:0.9rem;color:var(--color-pflaume);">
            Angemeldet als ${profile?.display_name ?? user.email}
          </p>
          <button class="btn" id="logoutBtn" style="margin-top:0.4rem;">Abmelden</button>
        `;
        authArea.querySelector('#logoutBtn').addEventListener('click', logout);
      } else {
        authArea.innerHTML = '<button class="btn" id="loginBtn">Anmelden</button>';
        authArea.querySelector('#loginBtn').addEventListener('click', () => {
          const div = document.createElement('div');
          document.body.appendChild(div);
          renderAuthDialog(div);
        });
      }

      renderReactionsBar(document.getElementById('paintingReactions'), PAINTING_ID, 'painting', user?.id ?? null);

      renderCommentsSection(document.getElementById('commentsArea'), {
        paintingId: PAINTING_ID,
        user,
        profile,
        isAdmin: profile?.is_admin === true
      });
    });
  </script>
</body>
</html>
```

- [ ] **Schritt 3: Weitere 6 Detailseiten anlegen**

  Kopiere `ohne-titel-i.html` und passe jeweils an:

  | Datei | `PAINTING_ID` | `<title>` / `<h1>` | Bildpfad | Technik |
  |---|---|---|---|---|
  | `ohne-titel-ii.html` | `ohne-titel-ii` | Ohne Titel II | `../assets/images/gemälde/Gemälde_2.jpg` | Acryl auf Leinwand |
  | `ohne-titel-iii.html` | `ohne-titel-iii` | Ohne Titel III | `../assets/images/gemälde/Gemälde_3.jpg` | Öl auf Leinwand |
  | `ohne-titel-iv.html` | `ohne-titel-iv` | Ohne Titel IV | `../assets/images/gemälde/Gemälde_4.jpg` | Mischtechnik auf Leinwand |
  | `ki-bild-i.html` | `ki-bild-i` | KI-Bild I | `../assets/images/ai-images/ai-image_1.jpg` | KI-generiert |
  | `youtube-kanalbild.html` | `youtube-kanalbild` | YouTube-Kanalbild | `../assets/images/ai-images/ai-image_2.jpg` | KI-generiert |

  Für `kupfergruen-altem-stein.html` (`PAINTING_ID = 'kupfergruen-altem-stein'`): ersetze `<img>` durch:
  ```html
  <video src="../assets/video/Kupfergrün_auf_altem_Stein.mp4" controls style="width:100%;border:var(--border-gold);"></video>
  ```

- [ ] **Schritt 4: Commit**

```bash
git add gemälde/
git commit -m "feat: Detailseiten für alle Gemälde und Videos"
```

---

## Task 8: Galerie-Karten verlinken & Kommentarzähler

**Files:**
- Create: `js/gallery-counts.js`
- Modify: `galerie.html`
- Modify: `css/gallery.css`

- [ ] **Schritt 1: `js/gallery-counts.js` anlegen**

```js
// js/gallery-counts.js
import { supabase } from './supabase-config.js';

export async function loadCommentCounts(paintingIds) {
  const { data } = await supabase
    .from('paintings')
    .select('id, comment_count')
    .in('id', paintingIds);

  const counts = {};
  for (const row of data ?? []) counts[row.id] = row.comment_count;
  return counts;
}
```

- [ ] **Schritt 2: Galerie-Karten in `galerie.html` auf `<a>`-Links umstellen**

  Ersetze jede `.painting`-Karte: `onclick="openLightbox(this)"` entfernen, als `<a href="gemälde/PAINTING_ID.html" class="painting" data-painting-id="PAINTING_ID">` umschreiben, Zähler-Element einfügen.

  Beispiel für „Ohne Titel I":
  ```html
  <a href="gemälde/ohne-titel-i.html" class="painting" data-painting-id="ohne-titel-i">
    <img src="assets/images/gemälde/Gemälde_1.jpg" alt="Gemälde von Anita Schönburg"
      onerror="this.style.background='#E8D5C0'; this.style.minHeight='350px'; this.removeAttribute('src')">
    <div class="painting-info">
      <h3>Ohne Titel I</h3>
      <p>Mischtechnik auf Leinwand</p>
      <p class="painting-comment-count" data-count-id="ohne-titel-i">💬 –</p>
    </div>
  </a>
  ```

  Gleiches Muster für alle 7 Karten. Lightbox-bezogene `onclick`-Attribute entfernen.

- [ ] **Schritt 3: Zähler-Script am Ende von `galerie.html` einfügen** (vor `</body>`):

```html
<script type="module">
  import { loadCommentCounts } from './js/gallery-counts.js';
  const ids = ['ohne-titel-i','ohne-titel-ii','ohne-titel-iii','ohne-titel-iv','ki-bild-i','youtube-kanalbild','kupfergruen-altem-stein'];
  loadCommentCounts(ids).then(counts => {
    for (const [id, count] of Object.entries(counts)) {
      const el = document.querySelector(`[data-count-id="${id}"]`);
      if (el) el.textContent = count === 0 ? 'Noch keine Kommentare' : `💬 ${count}`;
    }
  });
</script>
```

- [ ] **Schritt 4: `a.painting`-Stil in `css/gallery.css` ergänzen**

```css
a.painting {
  text-decoration: none;
  color: inherit;
  display: block;
}
```

- [ ] **Schritt 5: Commit**

```bash
git add js/gallery-counts.js galerie.html css/gallery.css
git commit -m "feat: Galerie-Karten verlinken und Kommentarzähler"
```

---

## Task 9: Edge Function – E-Mail-Benachrichtigung

**Files:**
- Create: `supabase/functions/notify-comment-reply/index.ts`

- [ ] **Schritt 1: Resend-Account anlegen**

  Gehe zu https://resend.com → kostenloses Konto → API-Keys → „Create API Key" → Key notieren.
  
  Domain verifizieren (optional für Produktion) oder Absender `onboarding@resend.dev` für Tests nutzen.

- [ ] **Schritt 2: Supabase CLI installieren**

```bash
npm install -g supabase
supabase login
supabase link --project-ref DEIN-PROJECT-REF
```

  `DEIN-PROJECT-REF` steht in Supabase Dashboard → Settings → General → Reference ID.

- [ ] **Schritt 3: `supabase/functions/notify-comment-reply/index.ts` anlegen**

```ts
// supabase/functions/notify-comment-reply/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SITE_URL = 'https://www.anitaschoenburg.de';

Deno.serve(async (req) => {
  const payload = await req.json();
  const record = payload.record;

  if (!record.parent_id) return new Response('no parent', { status: 200 });

  // Elternkommentar laden
  const { data: parent } = await supabase
    .from('comments')
    .select('author_id')
    .eq('id', record.parent_id)
    .single();

  if (!parent) return new Response('parent not found', { status: 200 });
  if (parent.author_id === record.author_id) return new Response('same author', { status: 200 });

  // Nutzer-Profil des Eltern-Autors laden
  const { data: user } = await supabase
    .from('users')
    .select('email, display_name, email_notifications')
    .eq('id', parent.author_id)
    .single();

  if (!user?.email_notifications || !user?.email) return new Response('notifications off', { status: 200 });

  const preview = record.text.length > 200 ? record.text.slice(0, 200) + '…' : record.text;
  const paintingUrl = `${SITE_URL}/gemälde/${record.painting_id}.html`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Anita Schönburg <noreply@anitaschoenburg.de>',
      to: user.email,
      subject: `${record.author_name} hat auf deinen Kommentar geantwortet`,
      text: `Hallo ${user.display_name},\n\n${record.author_name} hat geantwortet:\n\n„${preview}"\n\nZum Kommentar: ${paintingUrl}\n\n– Anita Schönburg`,
      html: `<p>Hallo ${user.display_name},</p><p><strong>${record.author_name}</strong> hat auf deinen Kommentar geantwortet:</p><blockquote style="border-left:3px solid #D4AF37;padding-left:1rem;color:#3A3A3A;">${preview}</blockquote><p><a href="${paintingUrl}" style="color:#521040;">Zum Kommentar →</a></p><p style="color:#999;font-size:0.85em;">– Anita Schönburg</p>`
    })
  });

  return new Response('sent', { status: 200 });
});
```

- [ ] **Schritt 4: Edge Function deployen**

```bash
supabase secrets set RESEND_API_KEY=dein_resend_key
supabase functions deploy notify-comment-reply
```

- [ ] **Schritt 5: Database Webhook einrichten**

  Supabase Dashboard → Database → Webhooks → „Create a new hook":
  - Name: `on_comment_insert`
  - Table: `comments`
  - Events: `INSERT`
  - Type: Supabase Edge Functions
  - Function: `notify-comment-reply`
  - → Save

- [ ] **Schritt 6: Commit**

```bash
git add supabase/functions/
git commit -m "feat: Edge Function für E-Mail-Benachrichtigungen via Resend"
```

---

## Task 10: Admin-Flag für Anita setzen

- [ ] **Schritt 1: Anita anmelden**

  Starte `python -m http.server 8080`, öffne `http://localhost:8080/gemälde/ohne-titel-i.html`, melde dich mit Anitas Konto an.

- [ ] **Schritt 2: Admin-Flag setzen**

  Supabase Dashboard → Table Editor → `users` → Anitas Zeile → `is_admin` auf `true` setzen → Speichern.

- [ ] **Schritt 3: Testen**

  Seite neu laden: bei allen Kommentaren sollte ein „Löschen"-Button erscheinen.

---

## Task 11: DSGVO — Datenschutzerklärung

**Files:**
- Modify: `impressum.html`

- [ ] **Schritt 1: DSGVO-Abschnitt zu `impressum.html` hinzufügen**

```html
<section class="section">
  <div class="container" style="max-width:760px;">
    <h2>Datenschutzerklärung</h2>

    <h3>Kommentarfunktion</h3>
    <p>Für die Kommentarfunktion nutzen wir <strong>Supabase</strong> (Supabase Inc., 970 Toa Payoh North, Singapur — Datenspeicherung auf EU-Servern, Region Frankfurt/eu-central-1). Beim Anlegen eines Kontos werden Anzeigename und E-Mail-Adresse verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Daten können jederzeit durch Kontolöschung entfernt werden.</p>

    <h3>E-Mail-Benachrichtigungen</h3>
    <p>Für den Versand von Benachrichtigungs-E-Mails nutzen wir <strong>Resend</strong> (Resend Inc.). Die E-Mail-Adresse wird ausschließlich für den Benachrichtigungsversand genutzt. Benachrichtigungen können jederzeit nach dem Login deaktiviert werden.</p>

    <h3>Auskunft und Löschung</h3>
    <p>Du hast das Recht auf Auskunft, Berichtigung und Löschung deiner Daten. Kontakt: <a href="mailto:anita@anitaschoenburg.de">anita@anitaschoenburg.de</a></p>
  </div>
</section>
```

- [ ] **Schritt 2: Commit**

```bash
git add impressum.html
git commit -m "feat: Datenschutzerklärung für Supabase und Resend"
```

---

## Task 12: Abschluss & Test

- [ ] **Vollständige Test-Checkliste**

  - [ ] Google-Login (Redirect funktioniert, Nutzer landet zurück auf Seite)
  - [ ] E-Mail-Registrierung mit Anzeigename
  - [ ] E-Mail-Bestätigung (Supabase sendet E-Mail)
  - [ ] Kommentar erstellen (Top-Level)
  - [ ] Antwort auf Kommentar (Verschachtelung)
  - [ ] Link in Kommentar → Fehlermeldung erscheint
  - [ ] Kommentar bearbeiten
  - [ ] Kommentar löschen (Soft-Delete)
  - [ ] Emoji-Reaktion auf Bild
  - [ ] Emoji-Reaktion auf Kommentar
  - [ ] Reaktion wechseln / entfernen (Toggle)
  - [ ] Sortierung: Beliebt / Neueste / Älteste
  - [ ] Infinite Scroll lädt weitere Kommentare
  - [ ] Kommentarzähler auf Galerie-Karten wird angezeigt
  - [ ] E-Mail-Benachrichtigung bei Antwort
  - [ ] Admin (Anita) sieht Löschen-Button bei allen Kommentaren

- [ ] **Finaler Commit und Push**

```bash
git add .
git commit -m "feat: Kommentar- und Reaktionssystem vollständig (Supabase)"
git push origin HEAD
```
