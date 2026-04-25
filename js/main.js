import { initI18n }       from './i18n.js';
import { initNav }        from './nav.js';
import { initAnimations } from './animations.js';
import { initCounters }   from './counter.js';
import { initGallery }    from './gallery.js';
import { initForms }      from './forms.js';
import { loadProjects, renderGallery, renderFeatured } from './projects.js';

document.addEventListener('DOMContentLoaded', async () => {
  await initI18n();
  initNav();
  initAnimations();

  const lang = () => document.documentElement.lang || 'es';

  // Stat counters (home page)
  const statsSection = document.getElementById('stats');
  if (statsSection) initCounters(statsSection);

  // Project gallery page — load dynamically from JSON
  const galleryGrid = document.getElementById('gallery-grid');
  if (galleryGrid) {
    const projects = await loadProjects();
    renderGallery(galleryGrid, projects, lang());
    initGallery(); // sets up filter; lightbox inactive (no #lightbox on proyectos.html)

    document.addEventListener('langchange', async e => {
      const ps = await loadProjects();
      renderGallery(galleryGrid, ps, e.detail.lang);
      initGallery();
    });
  }

  // Home page — featured projects preview
  const featuredGrid = document.getElementById('featured-projects-grid');
  if (featuredGrid) {
    const projects = await loadProjects();
    renderFeatured(featuredGrid, projects, lang());

    document.addEventListener('langchange', async e => {
      const ps = await loadProjects();
      renderFeatured(featuredGrid, ps, e.detail.lang);
    });
  }

  // Project detail page
  if (document.getElementById('proj-content') !== null) {
    const { initProyecto } = await import('./proyecto.js');
    await initProyecto();
  }

  // Contact form
  const contactForm = document.getElementById('contact-form');
  if (contactForm) initForms(contactForm);

  // Hero zoom-in on load
  const hero = document.querySelector('.hero');
  if (hero) requestAnimationFrame(() => hero.classList.add('is-loaded'));
});
