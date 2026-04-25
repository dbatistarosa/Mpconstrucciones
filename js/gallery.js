export function initGallery() {
  initFilter();
  initLightbox();
}

function initFilter() {
  const btns  = document.querySelectorAll('.js-filter-btn');
  const items = document.querySelectorAll('.gallery-item');
  if (!btns.length) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');
      btns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      items.forEach(item => {
        const cats = item.getAttribute('data-category') || '';
        item.classList.toggle('is-hidden', filter !== 'all' && !cats.includes(filter));
      });
    });
  });
}

function initLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;

  const imgEl     = lb.querySelector('.lightbox__img');
  const captionEl = lb.querySelector('.lightbox__caption');
  const closeBtn  = lb.querySelector('.js-lightbox-close');
  const prevBtn   = lb.querySelector('.js-lightbox-prev');
  const nextBtn   = lb.querySelector('.js-lightbox-next');
  let items = [];
  let idx   = 0;

  const render = () => {
    const item   = items[idx];
    const src    = item.getAttribute('data-full') || item.querySelector('img')?.src || '';
    const alt    = item.getAttribute('data-caption') || '';
    imgEl.src              = src;
    imgEl.alt              = alt;
    captionEl.textContent  = alt;
    prevBtn.disabled       = idx === 0;
    nextBtn.disabled       = idx === items.length - 1;
  };

  const open = (all, i) => {
    items = all;
    idx   = i;
    render();
    lb.classList.add('is-open');
    document.body.classList.add('no-scroll');
    closeBtn.focus();
  };

  const close = () => {
    lb.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  };

  const navigate = dir => {
    idx = Math.max(0, Math.min(items.length - 1, idx + dir));
    render();
  };

  document.querySelectorAll('.gallery-item').forEach((item, _, all) => {
    item.addEventListener('click', () => {
      const visible = [...all].filter(el => !el.classList.contains('is-hidden'));
      open(visible, visible.indexOf(item));
    });
  });

  closeBtn?.addEventListener('click', close);
  prevBtn?.addEventListener('click', () => navigate(-1));
  nextBtn?.addEventListener('click', () => navigate(1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });

  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });
}
