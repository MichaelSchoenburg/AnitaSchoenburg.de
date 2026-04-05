# Spec: Kommentar- und Reaktionssystem

**Datum:** 2026-04-05  
**Status:** Fertig (Supabase-Version)

---

## Ziel

Ein vollständiges, datenschutzkonformes Kommentar- und Reaktionssystem für die Galerie-Website von Anita Schönburg. Besucher können sich mit Google oder E-Mail+Passwort anmelden und auf Gemälde/Videos reagieren sowie verschachtelte Kommentare hinterlassen.

---

## Technologie-Stack

- **Frontend:** Reines HTML/CSS/JavaScript (kein Build-Prozess, kein Framework)
- **Auth:** Supabase Auth (Google OAuth + E-Mail+Passwort)
- **Datenbank:** Supabase PostgreSQL (Region: `eu-central-1` Frankfurt für DSGVO)
- **Sicherheit:** Row Level Security (RLS) Policies
- **Zähler-Updates:** PostgreSQL Trigger-Funktionen (serverlos, kein Deploy nötig)
- **E-Mail-Benachrichtigungen:** Supabase Edge Function (Deno) + Resend
- **JS-SDK:** `@supabase/supabase-js` v2 via CDN (ES-Modul, kein Build nötig)

---

## Authentifizierung

- **Google OAuth:** Redirect-Flow via Supabase Auth
- **E-Mail + Passwort:** Registrierung mit frei wählbarem Anzeigenamen
- **Profilbild:** Vom Google-Konto übernommen; bei E-Mail-Registrierung: Initials-Avatar
- **Anzeigename:** Vom Google-Konto übernommen; bei E-Mail-Registrierung: frei wählbar
- Nur eingeloggte Nutzer können kommentieren und reagieren
- Nicht eingeloggte Nutzer sehen Kommentare und Reaktionen (read-only)

---

## Detail-Seiten (neue Seiten pro Gemälde)

Jedes Gemälde/Video bekommt eine eigene statische HTML-Seite:

| Painting-ID | Pfad |
|---|---|
| `ohne-titel-i` | `gemälde/ohne-titel-i.html` |
| `ohne-titel-ii` | `gemälde/ohne-titel-ii.html` |
| `ohne-titel-iii` | `gemälde/ohne-titel-iii.html` |
| `ohne-titel-iv` | `gemälde/ohne-titel-iv.html` |
| `ki-bild-i` | `gemälde/ki-bild-i.html` |
| `youtube-kanalbild` | `gemälde/youtube-kanalbild.html` |
| `kupfergruen-altem-stein` | `gemälde/kupfergruen-altem-stein.html` |

Jede Detailseite zeigt:
- Das Bild/Video (groß)
- Titel, Technik, Beschreibung
- Reaktions-Bar (Emoji-Picker + aggregierte Reaktionen)
- Kommentarbereich (mit Login-Aufforderung für nicht eingeloggte Nutzer)

Vom Galerie-Grid verlinkt jede Painting-Karte auf die Detailseite.

---

## Reaktionen

- **Ziel:** Gemälde, Videos und einzelne Kommentare
- **Picker:** Vollständiger Emoji-Picker (alle Unicode-Emojis via emoji-mart)
- **Regel:** Jeder Nutzer kann pro Ziel genau ein Emoji vergeben; erneutes Klicken auf dasselbe Emoji entfernt die Reaktion; ein anderes Emoji ersetzt die vorherige Reaktion
- **Anzeige:** Emojis mit Zählern gruppiert; Tooltip zeigt Nutzer-Namen
- **Nicht eingeloggt:** Picker zeigt Login-Hinweis statt Emoji-Auswahl

---

## Kommentare

### Struktur
- Verschachtelung bis **10 Ebenen** tief
- Unbegrenzte Antworten pro Ebene
- Zeichenlimit: **10.000 Zeichen** pro Kommentar

### Regeln
- **Keine Links:** URLs werden beim Absenden herausgefiltert (Regex). Kommentar wird nicht gespeichert, Fehlermeldung erscheint.
- **Kein HTML:** Text wird escaped, kein Markdown, keine Formatierung

### Sortierung (Top-Level-Kommentare)
- Beliebt (reaction_count DESC) — **Standard**
- Neueste zuerst (created_at DESC)
- Älteste zuerst (created_at ASC)
- Antworten innerhalb eines Threads immer: älteste zuerst

### Laden
- **Infinite Scroll:** Initial 10 Top-Level-Kommentare; beim Scrollen ans Ende automatisch 10 weitere nachladen
- Antworten werden beim Aufklappen eines Threads lazy geladen

### Bearbeiten & Löschen
- Eigene Kommentare können **unbegrenzt** bearbeitet werden
- Bearbeitete Kommentare zeigen „(bearbeitet)"
- Löschen: **Soft-Delete** — Text wird durch „Kommentar wurde gelöscht" ersetzt, Antworten bleiben sichtbar
- Admins können jeden Kommentar löschen

### E-Mail-Benachrichtigung
- Wenn jemand auf einen Kommentar antwortet, bekommt der Autor des Elternkommentars eine E-Mail
- E-Mail enthält: Antwort-Text (gekürzt auf 200 Zeichen), Link zur Detailseite
- Nutzer können Benachrichtigungen in Supabase-Profil deaktivieren (`email_notifications`-Flag)

---

## Kommentarzähler in der Galerie

- Auf jeder Painting-Karte in `galerie.html` wird die Kommentaranzahl angezeigt
- Zähler wird beim Laden der Galerie-Seite aus der `paintings`-Tabelle geladen (denormalisierter Counter, via Postgres-Trigger aktuell gehalten)
- Format: `💬 3` oder `Noch keine Kommentare`

---

## Admin-Moderation

- Anita bekommt `is_admin = true` in der `users`-Tabelle (via Supabase Dashboard)
- Admins sehen bei jedem Kommentar einen „Löschen"-Button
- Kein separates Admin-Interface — Moderation direkt auf der Detailseite

---

## PostgreSQL-Datenmodell

```sql
-- Nutzer (ergänzt auth.users von Supabase)
create table public.users (
  id          uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url  text,
  email       text not null,
  is_admin    boolean not null default false,
  email_notifications boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Gemälde-Metadaten (Zähler)
create table public.paintings (
  id              text primary key,
  comment_count   integer not null default 0,
  reaction_counts jsonb not null default '{}'::jsonb
);

-- Kommentare
create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  painting_id  text not null references public.paintings(id),
  parent_id    uuid references public.comments(id),
  depth        integer not null default 0 check (depth between 0 and 9),
  author_id    uuid not null references public.users(id),
  author_name  text not null,
  author_avatar text,
  text         text not null check (char_length(text) between 1 and 10000),
  created_at   timestamptz not null default now(),
  edited_at    timestamptz,
  deleted      boolean not null default false,
  reaction_count integer not null default 0,
  child_count  integer not null default 0
);

-- Reaktionen (ein Emoji pro Nutzer pro Ziel)
create table public.reactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  target_id   text not null,
  target_type text not null check (target_type in ('painting', 'comment')),
  emoji       text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, target_id)
);
```

### PostgreSQL Indexes

```sql
create index on public.comments (painting_id, parent_id, created_at desc);
create index on public.comments (painting_id, parent_id, reaction_count desc);
create index on public.reactions (target_id);
```

### PostgreSQL Trigger-Funktionen (Zähler)

```sql
-- comment_count auf paintings aktuell halten
create or replace function handle_comment_count() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.paintings(id, comment_count)
    values (NEW.painting_id, 1)
    on conflict (id) do update set comment_count = public.paintings.comment_count + 1;
  elsif TG_OP = 'UPDATE' and OLD.deleted = false and NEW.deleted = true then
    update public.paintings set comment_count = greatest(comment_count - 1, 0)
    where id = NEW.painting_id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_comment_count
after insert or update on public.comments
for each row execute function handle_comment_count();

-- child_count auf Elternkommentar aktuell halten
create or replace function handle_child_count() returns trigger as $$
begin
  if NEW.parent_id is not null then
    update public.comments set child_count = child_count + 1
    where id = NEW.parent_id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_child_count
after insert on public.comments
for each row execute function handle_child_count();
```

---

## Row Level Security (RLS)

```sql
alter table public.users    enable row level security;
alter table public.paintings enable row level security;
alter table public.comments  enable row level security;
alter table public.reactions enable row level security;

-- users: alle lesen; nur eigenes Dokument schreiben (is_admin nicht selbst setzen)
create policy "users_select" on public.users for select using (true);
create policy "users_insert" on public.users for insert
  with check (auth.uid() = id and is_admin = false);
create policy "users_update" on public.users for update
  using (auth.uid() = id)
  with check (is_admin = (select is_admin from public.users where id = auth.uid()));

-- paintings: alle lesen; niemand schreibt direkt (nur Triggers/Service Role)
create policy "paintings_select" on public.paintings for select using (true);

-- comments: alle lesen
create policy "comments_select" on public.comments for select using (true);
-- eingeloggte Nutzer erstellen (eigene author_id, depth <= 9)
create policy "comments_insert" on public.comments for insert
  with check (auth.uid() = author_id and depth <= 9);
-- Autor oder Admin können updaten (strukturelle Felder gesperrt via App-Logik)
create policy "comments_update" on public.comments for update
  using (
    auth.uid() = author_id or
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- reactions: alle lesen
create policy "reactions_select" on public.reactions for select using (true);
-- eigene Reaktion erstellen
create policy "reactions_insert" on public.reactions for insert
  with check (auth.uid() = user_id);
-- eigene Reaktion löschen
create policy "reactions_delete" on public.reactions for delete
  using (auth.uid() = user_id);
```

---

## Supabase Edge Function (E-Mail-Benachrichtigung)

- **Name:** `notify-comment-reply`
- **Trigger:** Database Webhook auf INSERT in `public.comments`
- **Laufzeit:** Deno (Supabase Edge Functions)
- **E-Mail-Dienst:** Resend (resend.com, kostenlos bis 3.000 E-Mails/Monat)
- **Ablauf:**
  1. Prüfen ob `parent_id` vorhanden
  2. Elternkommentar und dessen Autor laden
  3. Prüfen ob `email_notifications = true`
  4. E-Mail via Resend senden

---

## Dateien

### Neue Dateien
| Datei | Verantwortung |
|---|---|
| `js/supabase-config.js` | Supabase-Client-Initialisierung |
| `js/auth-ui.js` | Login-Dialog (Google + E-Mail+Passwort) |
| `js/reactions.js` | Emoji-Picker, Reaktion speichern/löschen |
| `js/comments.js` | Kommentare laden, rendern, threading |
| `js/comment-form.js` | Formular: Erstellen, Bearbeiten, URL-Filter |
| `js/gallery-counts.js` | Kommentarzähler auf Galerie-Karten |
| `css/comments.css` | Kommentar-System-Stile (Brand Identity) |
| `gemälde/*.html` | 7 Detailseiten |
| `supabase/migrations/001_initial.sql` | Vollständiges DB-Schema |
| `supabase/functions/notify-comment-reply/index.ts` | Edge Function |

### Geänderte Dateien
| Datei | Änderung |
|---|---|
| `galerie.html` | Links auf Detailseiten, Kommentarzähler-Elemente |
| `css/gallery.css` | `a.painting`-Stil |
| `impressum.html` | DSGVO-Abschnitt: Supabase + Resend |

---

## DSGVO

- Supabase-Region: `eu-central-1` (Frankfurt)
- Supabase hat einen DSGVO-konformen DPA
- Resend (E-Mail): Server in der EU wählbar; DPA vorhanden
- Datenschutzerklärung auf `impressum.html` muss ergänzt werden
