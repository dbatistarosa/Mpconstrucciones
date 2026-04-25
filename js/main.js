import { initI18n }       from './i18n.js';
import { initNav }        from './nav.js';
import { initAnimations } from './animations.js';
import { initCounters }   from './counter.js';
import { initGallery }    from './gallery.js';
import { initForms }      from './forms.js';

document.addEventListener('DOMContentLoaded', async () => {
  await initI18n();
  initNav();
  initAnimations();

  const statsSection = document.getElementById('stats');
  if (statsSection) initCounters(statsSection);

  const gallerySection = document.getElementById('gallery-grid');
  if (gallerySection) initGallery();

  const contactForm = document.getElementById('contact-form');
  if (contactForm) initForms(contactForm);

  // Hero bg zoom-in on load
  const hero = document.querySelector('.hero');
  if (hero) requestAnimationFrame(() => hero.classList.add('is-loaded'));
});
