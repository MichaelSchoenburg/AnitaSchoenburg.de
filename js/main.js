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

// ── Lightbox ─────────────────────────────────────────────
const lightbox        = document.getElementById('lightbox');
const lightboxImg     = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');

function openLightbox(paintingEl) {
  const img     = paintingEl.querySelector('img');
  const caption = paintingEl.dataset.caption || '';
  lightboxImg.src              = img.src;
  lightboxImg.alt              = img.alt;
  lightboxCaption.textContent  = caption;
  lightbox.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(event) {
  // Aufgerufen ohne Argument (X-Button onclick): immer schließen
  if (!event) {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    return;
  }
  // Aufgerufen vom lightbox-onclick: nur schließen wenn Klick auf den Hintergrund
  if (event.target === lightbox) {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  }
});
