# AnitaSchoenburg.de — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine statische Künstler-Portfolio-Webseite für Anita Schönburg mit Hauptseite, separater Galerie-Seite und Kontakt-Dialog.

**Architecture:** Reines HTML/CSS + Vanilla JS. Keine Build-Tools, kein Framework. Alle Seiten sind eigenständige `.html`-Dateien, die gemeinsame CSS-Dateien einbinden. CSS Custom Properties (Variablen) zentral in `css/variables.css` — eine Änderung dort wirkt auf die gesamte Seite.

**Tech Stack:** HTML5, CSS3 (Custom Properties, Grid, Flexbox), Vanilla JS (Mobile-Nav, Lightbox), Google Fonts (Great Vibes + Cormorant Garamond)

---

## Dateistruktur

```
AnitaSchoenburg.de/
├── index.html              ← Hauptseite (Hero, Über mich, Galerie-Vorschau, Dialog)
├── galerie.html            ← Galerie-Seite (alle Gemälde)
├── css/
│   ├── variables.css       ← Farben, Schriften, Abstände als CSS Custom Properties
│   ├── base.css            ← Reset, Body, Typografie-Grundlagen
│   ├── layout.css          ← Navigation, Footer, Sektions-Container
│   ├── components.css      ← Buttons, Trennlinien, Bild-Karten
│   └── gallery.css         ← Galerie-Grid, Lightbox
├── js/
│   └── main.js             ← Mobile-Navigation (Hamburger), Lightbox-Logik
└── assets/
    └── images/
        ├── logo/           ← Logo-Dateien (sobald vorhanden)
        └── gemälde/        ← Anitas Gemälde (JPG/WebP)
```

---

## Task 1: Projekt-Setup & CSS-Variablen

**Files:**
- Create: `css/variables.css`
- Create: `css/base.css`

- [ ] **Schritt 1: `css/variables.css` anlegen**

```css
/* css/variables.css */
:root {
  /* Farben */
  --color-karmesin:  #8B1A2B;
  --color-gold:      #D4AF37;
  --color-creme:     #FAF8F5;
  --color-text:      #3A3A3A;
  --color-beige:     #E8D5C0;
  --color-gold-soft: rgba(212, 175, 55, 0.3);

  /* Schriften */
  --font-heading: 'Great Vibes', cursive;
  --font-body:    'Cormorant Garamond', serif;

  /* Abstände */
  --spacing-xs:  0.5rem;
  --spacing-sm:  1rem;
  --spacing-md:  2rem;
  --spacing-lg:  4rem;
  --spacing-xl:  6rem;

  /* Typografie-Größen */
  --size-hero:     4rem;
  --size-section:  2.8rem;
  --size-subtitle: 1.3rem;
  --size-body:     1.05rem;
  --size-small:    0.85rem;

  /* Sonstiges */
  --max-width: 1100px;
  --border-gold: 1px solid var(--color-gold);
  --transition: 0.25s ease;
}
```

- [ ] **Schritt 2: `css/base.css` anlegen**

```css
/* css/base.css */
@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Cormorant+Garamond:ital,wght@0,300;1,300&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--color-creme);
  color: var(--color-text);
  font-family: var(--font-body);
  font-weight: 300;
  font-size: var(--size-body);
  line-height: 1.85;
}

h1, h2, h3 {
  font-family: var(--font-heading);
  font-weight: 400;
  color: var(--color-karmesin);
  line-height: 1.2;
}

h1 { font-size: var(--size-hero); }
h2 { font-size: var(--size-section); }
h3 { font-size: 1.8rem; }

p { margin-bottom: var(--spacing-sm); }
p:last-child { margin-bottom: 0; }

img {
  max-width: 100%;
  display: block;
}

a {
  color: var(--color-karmesin);
  text-decoration: none;
  transition: color var(--transition);
}
a:hover { color: var(--color-gold); }
```

- [ ] **Schritt 3: Im Browser prüfen**

Erstelle eine temporäre `test.html` mit folgendem Inhalt und öffne sie im Browser:
```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="css/variables.css">
  <link rel="stylesheet" href="css/base.css">
</head>
<body>
  <h1>Willkommen</h1>
  <h2>Meine Arbeiten</h2>
  <p>Für mich ist Kunst gleich die Kunst des Lebens.</p>
</body>
</html>
```
Erwartetes Ergebnis: Great Vibes Schrift für h1/h2 (handgeschrieben), Cormorant Garamond für p, Creme-Hintergrund, Karmesin-Farbe für Überschriften.

- [ ] **Schritt 4: `test.html` löschen, commit**

```bash
rm test.html
git add css/variables.css css/base.css
git commit -m "feat: CSS-Variablen und Basis-Styles"
```

---

## Task 2: Navigation & Layout-Grundstruktur

**Files:**
- Create: `css/layout.css`
- Create: `css/components.css`

- [ ] **Schritt 1: `css/layout.css` anlegen**

```css
/* css/layout.css */

/* ── Navigation ── */
.site-header {
  background-color: var(--color-karmesin);
  padding: var(--spacing-sm) var(--spacing-md);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 12px rgba(0,0,0,0.2);
}

.nav-inner {
  max-width: var(--max-width);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.site-logo {
  font-family: var(--font-heading);
  font-size: 2.2rem;
  color: var(--color-gold);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.site-logo span.rose { font-size: 1.4rem; }

.site-nav {
  display: flex;
  gap: var(--spacing-md);
  list-style: none;
}

.site-nav a {
  font-family: var(--font-body);
  font-weight: 300;
  font-size: var(--size-small);
  color: var(--color-gold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.2rem 0;
  border-bottom: 1px solid transparent;
  transition: border-color var(--transition);
}

.site-nav a:hover {
  color: var(--color-gold);
  border-bottom-color: var(--color-gold);
}

/* Hamburger (Mobile) */
.nav-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  flex-direction: column;
  gap: 5px;
  padding: 0.3rem;
}
.nav-toggle span {
  display: block;
  width: 24px;
  height: 2px;
  background: var(--color-gold);
  transition: var(--transition);
}

/* ── Sektions-Container ── */
.section {
  padding: var(--spacing-xl) var(--spacing-md);
}

.section--dark {
  background-color: var(--color-karmesin);
  color: var(--color-creme);
}
.section--dark h2 { color: var(--color-gold); }

.container {
  max-width: var(--max-width);
  margin: 0 auto;
}

.section-title {
  margin-bottom: var(--spacing-md);
  text-align: center;
}

.divider {
  width: 80px;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--color-gold), transparent);
  margin: var(--spacing-sm) auto var(--spacing-md);
}

/* ── Footer ── */
.site-footer {
  background-color: var(--color-karmesin);
  color: var(--color-gold);
  text-align: center;
  padding: var(--spacing-md);
  font-family: var(--font-body);
  font-size: var(--size-small);
  letter-spacing: 0.05em;
}
```

- [ ] **Schritt 2: `css/components.css` anlegen**

```css
/* css/components.css */

/* ── Buttons ── */
.btn {
  display: inline-block;
  padding: 0.7rem 1.8rem;
  font-family: var(--font-body);
  font-size: var(--size-small);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: 1px solid;
  cursor: pointer;
  transition: background-color var(--transition), color var(--transition);
  text-decoration: none;
}

.btn--primary {
  background-color: var(--color-karmesin);
  color: var(--color-gold);
  border-color: var(--color-karmesin);
}
.btn--primary:hover {
  background-color: transparent;
  color: var(--color-karmesin);
}

.btn--outline {
  background-color: transparent;
  color: var(--color-karmesin);
  border-color: var(--color-karmesin);
}
.btn--outline:hover {
  background-color: var(--color-karmesin);
  color: var(--color-gold);
}

.btn--gold {
  background-color: transparent;
  color: var(--color-gold);
  border-color: var(--color-gold);
}
.btn--gold:hover {
  background-color: var(--color-gold);
  color: var(--color-karmesin);
}

/* ── Zitat-Block ── */
.quote {
  font-style: italic;
  font-size: var(--size-subtitle);
  color: var(--color-karmesin);
  border-left: 3px solid var(--color-gold);
  padding-left: var(--spacing-sm);
  margin: var(--spacing-md) 0;
  line-height: 1.6;
}
```

- [ ] **Schritt 3: commit**

```bash
git add css/layout.css css/components.css
git commit -m "feat: Navigation und Komponenten-Styles"
```

---

## Task 3: Hauptseite — Grundstruktur (index.html)

**Files:**
- Create: `index.html`

- [ ] **Schritt 1: `index.html` anlegen**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Anita Schönburg – Malerei und Gedanken. Ein Raum zum Verweilen, Nachdenken und Austauschen.">
  <title>Anita Schönburg – Malerei & Gedanken</title>
  <link rel="stylesheet" href="css/variables.css">
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/layout.css">
  <link rel="stylesheet" href="css/components.css">
</head>
<body>

  <!-- NAVIGATION -->
  <header class="site-header">
    <div class="nav-inner">
      <a href="index.html" class="site-logo">
        <span class="rose">🌹</span> Anita Schönburg
      </a>
      <button class="nav-toggle" id="navToggle" aria-label="Menü öffnen">
        <span></span><span></span><span></span>
      </button>
      <nav>
        <ul class="site-nav" id="siteNav">
          <li><a href="#willkommen">Start</a></li>
          <li><a href="galerie.html">Galerie</a></li>
          <li><a href="#ueber-mich">Über mich</a></li>
          <li><a href="#dialog">Dialog</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main>
    <!-- HERO -->
    <section class="section" id="willkommen">
      <div class="container" style="text-align: center; max-width: 780px;">
        <h1>Willkommen</h1>
        <div class="divider"></div>
        <p>
          Ich heiße euch hier recht herzlich willkommen in diesem Raum der vielen Gedanken –
          zu denen meine Gemälde euch inspirieren sollen. Ich möchte anregen, zum Nachdenken
          einladen und diesen Raum dafür zur Verfügung stellen. Schön, dass ihr da seid!
        </p>
      </div>
    </section>

    <!-- ÜBER MICH -->
    <section class="section section--alt" id="ueber-mich" style="background-color: var(--color-beige);">
      <div class="container" style="max-width: 780px;">
        <h2 class="section-title">Wer bin ich?</h2>
        <div class="divider"></div>
        <p>
          Mein Name ist Anita Schönburg – und ich freue mich über jeden, der hier verweilen mag.
          Für mich ist Kunst gleich die Kunst des Lebens: das, was von innen nach außen drängt
          und sich offenbaren möchte. Meine Bilder entstehen meist aus dem heraus, was mich
          gerade innerlich beschäftigt – sie sind ein Spiegel meiner Gedanken, Gefühle und Erlebnisse.
        </p>
      </div>
    </section>

    <!-- GALERIE-VORSCHAU -->
    <section class="section" id="galerie-vorschau">
      <div class="container">
        <h2 class="section-title">Meine Arbeiten</h2>
        <div class="divider"></div>
        <p style="text-align:center; max-width:600px; margin: 0 auto var(--spacing-md);">
          Jedes Bild erzählt eine eigene Geschichte. Mal ruhig, mal lebendig – aber immer ehrlich.
          Schau dich gerne um und lass die Bilder auf dich wirken.
        </p>
        <!-- Galerie-Vorschau: 3 Bilder (Platzhalter bis echte Gemälde vorliegen) -->
        <div class="gallery-preview" id="galleryPreview">
          <!-- Wird in Task 5 mit echten Bildern befüllt -->
        </div>
        <div style="text-align:center; margin-top: var(--spacing-md);">
          <a href="galerie.html" class="btn btn--primary">Zur Galerie →</a>
        </div>
      </div>
    </section>

    <!-- DIALOG -->
    <section class="section section--dark" id="dialog">
      <div class="container" style="max-width: 780px;">
        <h2 class="section-title">Ins Gespräch kommen</h2>
        <div class="divider"></div>
        <p>
          Wenn du gerne diskutierst, dich mit anderen austauscht und vielleicht auch gerne
          philosophierst – dann bist du hier genau richtig! Dieser Raum soll nicht nur den
          Gemälden gehören, sondern auch den großen Fragen unserer Zeit. Zum Beispiel: Was
          bedeutet der Einzug der Künstlichen Intelligenz für unser Leben? Welche Ängste und
          Sorgen bewegt uns – und wie gehen wir damit um? Ich glaube, solche Themen brauchen
          genau das: einen offenen, ehrlichen Austausch unter Menschen.
        </p>
        <blockquote class="quote" style="color: var(--color-gold); border-left-color: var(--color-gold);">
          Ohne Licht kein Schatten, Schatten nur mit Licht. Beides gehört zusammen.
          Oder wie denkst du darüber?
        </blockquote>
        <blockquote class="quote" style="color: var(--color-gold); border-left-color: var(--color-gold);">
          Wie denkst du über KI?
        </blockquote>
        <div style="margin-top: var(--spacing-md);">
          <a href="mailto:anita@anitaschoenburg.de" class="btn btn--gold">Schreib mir deine Gedanken</a>
        </div>
      </div>
    </section>
  </main>

  <!-- FOOTER -->
  <footer class="site-footer">
    <p>© <span id="year"></span> Anita Schönburg · Alle Rechte vorbehalten</p>
  </footer>

  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Schritt 2: Im Browser öffnen und prüfen**

Öffne `index.html` direkt im Browser (Doppelklick oder `open index.html`).

Prüfe:
- Logo und Navigation sichtbar, Karmesin-Hintergrund, Goldschrift
- Alle 4 Sektionen vorhanden (Willkommen, Über mich, Galerie, Dialog)
- Great Vibes Schrift für Überschriften (benötigt Internetverbindung für Google Fonts)
- Kein roter Text oder Fehlermeldungen in der Browser-Konsole

- [ ] **Schritt 3: commit**

```bash
git add index.html
git commit -m "feat: Hauptseite Grundstruktur mit allen 4 Sektionen"
```

---

## Task 4: JavaScript — Mobile Navigation

**Files:**
- Create: `js/main.js`

- [ ] **Schritt 1: `js/main.js` anlegen**

```js
// js/main.js

// ── Aktuelles Jahr im Footer ──────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();

// ── Mobile Navigation (Hamburger) ────────────────────────
const navToggle = document.getElementById('navToggle');
const siteNav   = document.getElementById('siteNav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', isOpen);
    navToggle.setAttribute('aria-label', isOpen ? 'Menü schließen' : 'Menü öffnen');
  });

  // Menü schließen wenn ein Link geklickt wird
  siteNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Menü öffnen');
    });
  });
}
```

- [ ] **Schritt 2: Mobile Nav CSS ergänzen in `css/layout.css`**

Füge am Ende von `css/layout.css` hinzu:

```css
/* ── Mobile Navigation ── */
@media (max-width: 680px) {
  .nav-inner {
    flex-direction: row;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .nav-toggle {
    display: flex;
  }

  .site-nav {
    display: none;
    flex-direction: column;
    width: 100%;
    gap: 0;
    padding: var(--spacing-sm) 0;
  }

  .site-nav.is-open {
    display: flex;
  }

  .site-nav a {
    padding: 0.6rem 0;
    border-bottom: 1px solid rgba(212, 175, 55, 0.2);
  }
  .site-nav a:last-child { border-bottom: none; }
}
```

- [ ] **Schritt 3: Im Browser auf Mobilgröße prüfen**

Öffne `index.html`, drücke F12 → Toggle Device Toolbar (Handy-Symbol) → setze Breite auf 375px.

Prüfe:
- Hamburger-Button erscheint
- Klick öffnet/schließt das Menü
- Klick auf Nav-Link schließt das Menü

- [ ] **Schritt 4: commit**

```bash
git add js/main.js css/layout.css
git commit -m "feat: Mobile Navigation mit Hamburger-Menü"
```

---

## Task 5: Galerie-Vorschau auf der Hauptseite

**Files:**
- Create: `css/gallery.css`
- Modify: `index.html` (gallery-preview Div befüllen)

- [ ] **Schritt 1: `css/gallery.css` anlegen**

```css
/* css/gallery.css */

/* ── Galerie-Vorschau (Hauptseite: 3 Bilder) ── */
.gallery-preview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
  max-width: 900px;
  margin: 0 auto;
}

.gallery-preview .painting {
  position: relative;
  overflow: hidden;
  border: var(--border-gold);
  aspect-ratio: 3 / 4;
  cursor: pointer;
}

.gallery-preview .painting img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.gallery-preview .painting:hover img {
  transform: scale(1.04);
}

.painting-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(139, 26, 43, 0.85);
  color: var(--color-gold);
  font-style: italic;
  font-size: var(--size-small);
  padding: 0.5rem 0.75rem;
  text-align: center;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.gallery-preview .painting:hover .painting-caption {
  transform: translateY(0);
}

/* ── Galerie-Seite (alle Bilder) ── */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.gallery-grid .painting {
  position: relative;
  overflow: hidden;
  border: var(--border-gold);
  cursor: pointer;
}

.gallery-grid .painting img {
  width: 100%;
  display: block;
  transition: transform 0.4s ease;
}

.gallery-grid .painting:hover img {
  transform: scale(1.03);
}

.gallery-grid .painting-info {
  padding: 0.75rem;
  background: var(--color-creme);
  border-top: var(--border-gold);
}

.gallery-grid .painting-info h3 {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 1rem;
  color: var(--color-karmesin);
  margin-bottom: 0.2rem;
}

.gallery-grid .painting-info p {
  font-size: var(--size-small);
  color: #888;
  margin: 0;
}

/* ── Lightbox ── */
.lightbox {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: var(--spacing-md);
}

.lightbox.is-open {
  display: flex;
}

.lightbox img {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  border: var(--border-gold);
}

.lightbox-caption {
  color: var(--color-gold);
  font-style: italic;
  margin-top: var(--spacing-sm);
  font-size: var(--size-subtitle);
}

.lightbox-close {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-md);
  color: var(--color-gold);
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  line-height: 1;
}
.lightbox-close:hover { color: #fff; }

/* ── Responsive Galerie ── */
@media (max-width: 680px) {
  .gallery-preview {
    grid-template-columns: 1fr 1fr;
  }
  .gallery-preview .painting:last-child {
    display: none;
  }
}
```

- [ ] **Schritt 2: Platzhalter-Bilder in `index.html` einfügen**

Ersetze den Kommentar `<!-- Wird in Task 5 ... -->` im `gallery-preview` Div durch:

```html
<div class="painting" data-caption="Ohne Titel I" onclick="openLightbox(this)">
  <img src="assets/images/gemälde/bild-1.jpg"
       alt="Gemälde von Anita Schönburg"
       onerror="this.style.background='#E8D5C0'; this.style.minHeight='250px'; this.removeAttribute('src')">
  <div class="painting-caption">Ohne Titel I</div>
</div>
<div class="painting" data-caption="Ohne Titel II" onclick="openLightbox(this)">
  <img src="assets/images/gemälde/bild-2.jpg"
       alt="Gemälde von Anita Schönburg"
       onerror="this.style.background='#D4C5B0'; this.style.minHeight='250px'; this.removeAttribute('src')">
  <div class="painting-caption">Ohne Titel II</div>
</div>
<div class="painting" data-caption="Ohne Titel III" onclick="openLightbox(this)">
  <img src="assets/images/gemälde/bild-3.jpg"
       alt="Gemälde von Anita Schönburg"
       onerror="this.style.background='#C8B5A0'; this.style.minHeight='250px'; this.removeAttribute('src')">
  <div class="painting-caption">Ohne Titel III</div>
</div>
```

Füge außerdem vor dem schließenden `</body>` Tag folgendes ein (nach dem script-Tag):

```html
<!-- LIGHTBOX -->
<div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
  <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
  <img id="lightboxImg" src="" alt="">
  <p class="lightbox-caption" id="lightboxCaption"></p>
</div>
```

Und füge `css/gallery.css` im `<head>` ein:
```html
<link rel="stylesheet" href="css/gallery.css">
```

- [ ] **Schritt 3: Lightbox-Logik in `js/main.js` ergänzen**

Füge am Ende von `js/main.js` hinzu:

```js
// ── Lightbox ─────────────────────────────────────────────
const lightbox        = document.getElementById('lightbox');
const lightboxImg     = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');

function openLightbox(paintingEl) {
  const img     = paintingEl.querySelector('img');
  const caption = paintingEl.dataset.caption || '';
  lightboxImg.src         = img.src;
  lightboxImg.alt         = img.alt;
  lightboxCaption.textContent = caption;
  lightbox.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(event) {
  if (event && event.target !== lightbox && event.target !== document.querySelector('.lightbox-close')) return;
  lightbox.classList.remove('is-open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox({ target: lightbox });
});
```

- [ ] **Schritt 4: Im Browser prüfen**

- Galerie-Vorschau zeigt 3 Platzhalter-Rechtecke in Beigetönen (wenn keine echten Bilder vorhanden)
- Hover zeigt den Bildtitel
- Klick auf ein Bild öffnet die Lightbox
- Lightbox schließt mit Klick auf X, Klick außerhalb oder Escape-Taste

- [ ] **Schritt 5: commit**

```bash
git add css/gallery.css index.html js/main.js
git commit -m "feat: Galerie-Vorschau und Lightbox"
```

---

## Task 6: Galerie-Seite (galerie.html)

**Files:**
- Create: `galerie.html`

- [ ] **Schritt 1: `galerie.html` anlegen**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Galerie – alle Gemälde von Anita Schönburg">
  <title>Galerie – Anita Schönburg</title>
  <link rel="stylesheet" href="css/variables.css">
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/layout.css">
  <link rel="stylesheet" href="css/components.css">
  <link rel="stylesheet" href="css/gallery.css">
</head>
<body>

  <header class="site-header">
    <div class="nav-inner">
      <a href="index.html" class="site-logo">
        <span class="rose">🌹</span> Anita Schönburg
      </a>
      <button class="nav-toggle" id="navToggle" aria-label="Menü öffnen">
        <span></span><span></span><span></span>
      </button>
      <nav>
        <ul class="site-nav" id="siteNav">
          <li><a href="index.html">Start</a></li>
          <li><a href="galerie.html">Galerie</a></li>
          <li><a href="index.html#ueber-mich">Über mich</a></li>
          <li><a href="index.html#dialog">Dialog</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main>
    <section class="section">
      <div class="container">
        <h1 class="section-title">Meine Arbeiten</h1>
        <div class="divider"></div>
        <p style="text-align:center; max-width:600px; margin: 0 auto var(--spacing-lg);">
          Jedes Bild erzählt eine eigene Geschichte. Mal ruhig, mal lebendig – aber immer ehrlich.
          Lass die Bilder auf dich wirken.
        </p>

        <div class="gallery-grid">
          <!-- Bild 1 -->
          <div class="painting" data-caption="Ohne Titel I" onclick="openLightbox(this)">
            <img src="assets/images/gemälde/bild-1.jpg" alt="Gemälde von Anita Schönburg"
                 onerror="this.style.background='#E8D5C0'; this.style.minHeight='350px'; this.removeAttribute('src')">
            <div class="painting-info">
              <h3>Ohne Titel I</h3>
              <p>Mischtechnik auf Leinwand</p>
            </div>
          </div>
          <!-- Bild 2 -->
          <div class="painting" data-caption="Ohne Titel II" onclick="openLightbox(this)">
            <img src="assets/images/gemälde/bild-2.jpg" alt="Gemälde von Anita Schönburg"
                 onerror="this.style.background='#D4C5B0'; this.style.minHeight='350px'; this.removeAttribute('src')">
            <div class="painting-info">
              <h3>Ohne Titel II</h3>
              <p>Acryl auf Leinwand</p>
            </div>
          </div>
          <!-- Bild 3 -->
          <div class="painting" data-caption="Ohne Titel III" onclick="openLightbox(this)">
            <img src="assets/images/gemälde/bild-3.jpg" alt="Gemälde von Anita Schönburg"
                 onerror="this.style.background='#C8B5A0'; this.style.minHeight='350px'; this.removeAttribute('src')">
            <div class="painting-info">
              <h3>Ohne Titel III</h3>
              <p>Öl auf Leinwand</p>
            </div>
          </div>
          <!-- Weitere Bilder hier einfügen — dasselbe Muster wie oben -->
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <p>© <span id="year"></span> Anita Schönburg · Alle Rechte vorbehalten</p>
  </footer>

  <!-- LIGHTBOX -->
  <div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
    <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
    <img id="lightboxImg" src="" alt="">
    <p class="lightbox-caption" id="lightboxCaption"></p>
  </div>

  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Schritt 2: Im Browser prüfen**

- Navigation funktioniert (Links zu `index.html` und Ankern)
- Galerie-Grid zeigt Platzhalter oder echte Bilder
- Lightbox funktioniert

- [ ] **Schritt 3: commit**

```bash
git add galerie.html
git commit -m "feat: Galerie-Seite mit Grid und Lightbox"
```

---

## Task 7: Echte Gemälde einbinden

**Files:**
- Modify: `assets/images/gemälde/` (Bilder hinzufügen)
- Modify: `index.html`, `galerie.html` (Dateinamen + Titel anpassen)

- [ ] **Schritt 1: Gemälde vorbereiten**

Fotografiere oder scanne Anitas Gemälde. Speichere sie als:
- Format: JPG oder WebP
- Größe: mindestens 1200px auf der längsten Seite
- Dateigröße: max. 800 KB pro Bild (komprimieren mit https://squoosh.app oder TinyPNG)
- Benennung: `bild-1.jpg`, `bild-2.jpg`, etc. oder sprechende Namen wie `rose-und-licht.jpg`

Lege sie in `assets/images/gemälde/` ab.

- [ ] **Schritt 2: Dateinamen und Titel in HTML anpassen**

In `index.html` und `galerie.html`: Ersetze `bild-1.jpg`, `bild-2.jpg`, `bild-3.jpg` durch die echten Dateinamen. Ersetze `Ohne Titel I`, `Ohne Titel II`, `Ohne Titel III` durch die echten Bildtitel (falls vorhanden).

- [ ] **Schritt 3: Im Browser prüfen**

Alle Bilder laden korrekt. Kein verzerrtes oder pixeliges Bild.

- [ ] **Schritt 4: commit**

```bash
git add assets/images/gemälde/ index.html galerie.html
git commit -m "feat: echte Gemälde eingebunden"
```

---

## Task 8: Hosting einrichten

**Optionen (wähle eine):**

### Option A: GitHub Pages (kostenlos, einfach)

- [ ] Repository auf GitHub erstellen (public)
- [ ] Code pushen: `git push origin main`
- [ ] Auf GitHub: Settings → Pages → Branch: `main`, Ordner: `/ (root)` → Save
- [ ] Nach 1–2 Minuten: Seite erreichbar unter `https://[username].github.io/[repo-name]`
- [ ] Für eigene Domain: In GitHub Pages Settings "Custom domain" eintragen → DNS beim Domain-Anbieter: CNAME-Eintrag auf `[username].github.io` setzen

### Option B: Netlify (kostenlos, empfohlen für eigene Domain)

- [ ] Auf netlify.com anmelden → "Add new site" → "Import from Git"
- [ ] Repository verbinden → Build-Einstellungen: Build command leer lassen, Publish directory: `.`
- [ ] Deploy → Seite ist sofort erreichbar
- [ ] Eigene Domain: Site settings → Domain management → Add custom domain → DNS beim Anbieter anpassen

### Option C: Eigener Webserver

- [ ] Alle Dateien per FTP/SFTP auf den Server hochladen (z. B. mit FileZilla)
- [ ] Sicherstellen, dass `index.html` im Web-Root liegt

---

## Schnellreferenz: Neues Gemälde hinzufügen

Für jedes neue Gemälde in `galerie.html` folgendes Block einfügen (vor dem schließenden `</div>` des `.gallery-grid`):

```html
<div class="painting" data-caption="BILDTITEL" onclick="openLightbox(this)">
  <img src="assets/images/gemälde/DATEINAME.jpg" alt="Gemälde von Anita Schönburg"
       onerror="this.style.background='#E8D5C0'; this.style.minHeight='350px'; this.removeAttribute('src')">
  <div class="painting-info">
    <h3>BILDTITEL</h3>
    <p>TECHNIK auf Leinwand</p>
  </div>
</div>
```
