// js/main.js

// ── Aktuelles Jahr im Footer ──────────────────────────────
document.querySelectorAll('#year').forEach(el => {
  el.textContent = new Date().getFullYear();
});

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
const lightboxVideo   = document.getElementById('lightboxVideo');
const lightboxCaption = document.getElementById('lightboxCaption');

function openLightbox(paintingEl) {
  const img     = paintingEl.querySelector('img');
  const caption = paintingEl.dataset.caption || '';
  lightboxImg.src              = img.src;
  lightboxImg.alt              = img.alt;
  lightboxCaption.textContent  = caption;
  lightboxImg.hidden           = false;
  if (lightboxVideo) lightboxVideo.hidden = true;
  lightbox.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function openVideoLightbox(paintingEl) {
  const src     = paintingEl.dataset.video || '';
  const caption = paintingEl.dataset.caption || '';
  lightboxVideo.src            = src;
  lightboxCaption.textContent  = caption;
  lightboxImg.hidden           = true;
  lightboxVideo.hidden         = false;
  lightbox.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  lightboxVideo.play();
}

function closeLightbox(event) {
  // Aufgerufen ohne Argument (X-Button onclick): immer schließen
  if (!event) {
    _doCloseLightbox();
    return;
  }
  // Aufgerufen vom lightbox-onclick: nur schließen wenn Klick auf den Hintergrund
  if (event.target === lightbox) {
    _doCloseLightbox();
  }
}

function _doCloseLightbox() {
  lightbox.classList.remove('is-open');
  document.body.style.overflow = '';
  if (lightboxVideo && !lightboxVideo.hidden) {
    lightboxVideo.pause();
    lightboxVideo.src = '';
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    _doCloseLightbox();
  }
});

// ── Scroll-Animationen (Intersection Observer) ───────────
const animatedEls = document.querySelectorAll('[data-animate]');
if (animatedEls.length) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay || 0, 10);
        setTimeout(() => {
          entry.target.classList.add('is-visible');
        }, delay);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  animatedEls.forEach(el => revealObserver.observe(el));
}

// ── Aktiver Nav-Link ─────────────────────────────────────
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.site-nav a').forEach(link => {
  const href = link.getAttribute('href');
  let isActive = false;

  if (currentPage === 'galerie.html' && href === 'galerie.html') {
    isActive = true;
  } else if (currentPage === 'index.html' || currentPage === '') {
    if (href === '#willkommen' || href === 'index.html') {
      isActive = true;
    }
  }

  if (isActive) link.classList.add('is-active');
});
