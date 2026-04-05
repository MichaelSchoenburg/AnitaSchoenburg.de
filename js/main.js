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
  loadGiscus(paintingEl.dataset.paintingId);
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
  loadGiscus(paintingEl.dataset.paintingId);
}

function loadGiscus(term) {
  const container = document.getElementById('giscus-container');
  if (!container || !term) return;
  container.innerHTML = '';
  const script = document.createElement('script');
  script.src = 'https://giscus.app/client.js';
  script.setAttribute('data-repo', 'MichaelSchoenburg/anitaschoenburg.de');
  script.setAttribute('data-repo-id', 'R_kgDORz4TKQ');
  script.setAttribute('data-category', 'Kommentare');
  script.setAttribute('data-category-id', 'DIC_kwDORz4TKc4C6HVj');
  script.setAttribute('data-mapping', 'specific');
  script.setAttribute('data-term', term);
  script.setAttribute('data-strict', '0');
  script.setAttribute('data-reactions-enabled', '1');
  script.setAttribute('data-emit-metadata', '0');
  script.setAttribute('data-input-position', 'bottom');
  script.setAttribute('data-theme', 'preferred_color_scheme');
  script.setAttribute('data-lang', 'de');
  script.crossOrigin = 'anonymous';
  script.async = true;
  container.appendChild(script);
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
  const giscusContainer = document.getElementById('giscus-container');
  if (giscusContainer) giscusContainer.innerHTML = '';
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
