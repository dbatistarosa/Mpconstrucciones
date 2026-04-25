export function initNav() {
  initStickyHeader();
  initMobileMenu();
  initActiveLinks();
}

function initStickyHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;
  const THRESHOLD = 60;
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > THRESHOLD);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initMobileMenu() {
  const toggle  = document.querySelector('.js-nav-toggle');
  const menu    = document.querySelector('.nav__menu');
  const overlay = document.querySelector('.js-nav-overlay');
  if (!toggle || !menu) return;

  const close = () => {
    toggle.classList.remove('is-active');
    menu.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-visible');
    document.body.classList.remove('no-scroll');
    toggle.setAttribute('aria-expanded', 'false');
  };

  const open = () => {
    toggle.classList.add('is-active');
    menu.classList.add('is-open');
    if (overlay) overlay.classList.add('is-visible');
    document.body.classList.add('no-scroll');
    toggle.setAttribute('aria-expanded', 'true');
  };

  toggle.addEventListener('click', () => {
    menu.classList.contains('is-open') ? close() : open();
  });

  if (overlay) overlay.addEventListener('click', close);
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', close));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) close();
  });
}

function initActiveLinks() {
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(link => {
    const href = (link.getAttribute('href') || '').replace('./', '');
    const isHome = (href === 'index.html' || href === '') && (currentFile === 'index.html' || currentFile === '');
    link.classList.toggle('is-active', href === currentFile || isHome);
  });
}
