import { loadProjects, CATEGORY_LABELS } from './projects.js';

const STATUS_LABELS = {
  finished:           { es: 'Terminado',         en: 'Completed'           },
  under_construction: { es: 'En Construcción',    en: 'Under Construction'  }
};

const ZOOM_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;

export async function initProyecto() {
  const params = new URLSearchParams(location.search);
  const slug   = params.get('slug');

  if (!slug) { showNotFound(); return; }

  let projects;
  try {
    projects = await loadProjects();
  } catch (err) {
    console.error('[proyecto]', err);
    showNotFound();
    return;
  }

  const project = projects.find(p => p.slug === slug);
  if (!project) { showNotFound(); return; }

  const lang = document.documentElement.lang || 'es';
  renderProject(project, lang);
  initLightbox();

  document.addEventListener('langchange', e => renderProject(project, e.detail.lang));
}

function showNotFound() {
  document.getElementById('proj-loading').style.display = 'none';
  document.getElementById('proj-notfound').hidden = false;
}

function renderProject(project, lang) {
  const title = project.title?.[lang] || project.title?.es || '';
  document.title = title + ' — Mejía Peralta Construcciones';

  const coverImg = document.getElementById('proj-cover-img');
  if (coverImg) { coverImg.src = project.cover || ''; coverImg.alt = title; }

  const catLabel = CATEGORY_LABELS[project.category]?.[lang] || project.category;
  const catBadge = document.getElementById('proj-category-badge');
  if (catBadge) { catBadge.textContent = catLabel; catBadge.setAttribute('data-category', project.category); }

  const catText = document.getElementById('proj-category-text');
  if (catText) catText.textContent = catLabel;

  const statusLabel = STATUS_LABELS[project.status]?.[lang] || project.status;
  const statusBadge = document.getElementById('proj-status-badge');
  if (statusBadge) {
    statusBadge.textContent = statusLabel;
    statusBadge.className   = 'badge badge--' + (project.status === 'finished' ? 'finished' : 'progress');
  }

  const titleEl = document.getElementById('proj-title');
  if (titleEl) titleEl.textContent = title;

  const descEl = document.getElementById('proj-description');
  if (descEl) descEl.textContent = project.description?.[lang] || project.description?.es || '';

  setMeta('proj-year',     'meta-year-row',     project.year);
  setMeta('proj-area',     'meta-area-row',     project.area);
  setMeta('proj-location', 'meta-location-row', project.location);
  setMeta('proj-client',   'meta-client-row',   project.client);

  const gallerySection = document.getElementById('project-gallery-section');
  const galleryGrid    = document.getElementById('project-gallery-grid');
  if (galleryGrid && gallerySection && !galleryGrid.dataset.rendered) {
    const imgs = project.gallery || [];
    if (imgs.length > 1) {
      imgs.forEach((src, i) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.setAttribute('data-full', src);
        item.setAttribute('data-caption', `${title} — ${i + 1}`);
        item.innerHTML = `
          <img src="${src}" alt="${title} ${i + 1}" loading="lazy">
          <div class="gallery-item__overlay">
            <h3 class="gallery-item__title">${title}</h3>
          </div>
          <div class="gallery-item__zoom" aria-hidden="true">${ZOOM_ICON}</div>
        `;
        galleryGrid.appendChild(item);
      });
      gallerySection.hidden = false;
      galleryGrid.dataset.rendered = '1';
    }
  }

  document.getElementById('proj-loading').style.display = 'none';
  document.getElementById('proj-content').hidden = false;
}

function setMeta(valueId, rowId, value) {
  const row = document.getElementById(rowId);
  const el  = document.getElementById(valueId);
  if (!row || !el) return;
  if (value) { el.textContent = value; row.hidden = false; }
  else       { row.hidden = true; }
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
    const item = items[idx];
    imgEl.src             = item.getAttribute('data-full') || item.querySelector('img')?.src || '';
    imgEl.alt             = item.getAttribute('data-caption') || '';
    captionEl.textContent = item.getAttribute('data-caption') || '';
    prevBtn.disabled      = idx === 0;
    nextBtn.disabled      = idx === items.length - 1;
  };

  const open  = (all, i) => { items = all; idx = i; render(); lb.classList.add('is-open'); document.body.classList.add('no-scroll'); closeBtn.focus(); };
  const close = ()       => { lb.classList.remove('is-open'); document.body.classList.remove('no-scroll'); };
  const nav   = dir      => { idx = Math.max(0, Math.min(items.length - 1, idx + dir)); render(); };

  document.getElementById('project-gallery-grid')
    ?.querySelectorAll('.gallery-item')
    .forEach((item, _, all) => item.addEventListener('click', () => open([...all], [...all].indexOf(item))));

  closeBtn?.addEventListener('click', close);
  prevBtn?.addEventListener('click', () => nav(-1));
  nextBtn?.addEventListener('click', () => nav(1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  nav(-1);
    if (e.key === 'ArrowRight') nav(1);
  });
}
