const STORAGE_KEY = 'mpc-projects';

export async function loadProjects() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { /* fall through */ }
  }
  const res = await fetch('data/projects.json');
  if (!res.ok) throw new Error('Failed to load projects.json');
  const data = await res.json();
  return data.projects;
}

export const CATEGORY_LABELS = {
  residential: { es: 'Residencial', en: 'Residential' },
  commercial:  { es: 'Comercial',   en: 'Commercial'  },
  industrial:  { es: 'Industrial',  en: 'Industrial'  },
  cabin:       { es: 'Cabañas',     en: 'Cabins'      }
};

const ZOOM_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;

export function buildGalleryItem(project, lang) {
  const title    = project.title?.[lang] || project.title?.es || '';
  const catLabel = CATEGORY_LABELS[project.category]?.[lang] || project.category;

  const el = document.createElement('a');
  el.href  = `proyecto.html?slug=${encodeURIComponent(project.slug)}`;
  el.className = 'gallery-item';
  el.setAttribute('data-category', project.category);
  el.setAttribute('data-caption', title);
  el.innerHTML = `
    <img src="${project.cover}" alt="${title}" loading="lazy">
    <div class="gallery-item__overlay">
      <span class="badge gallery-item__category">${catLabel}</span>
      <h3 class="gallery-item__title">${title}</h3>
    </div>
    <div class="gallery-item__zoom" aria-hidden="true">${ZOOM_ICON}</div>
  `;
  return el;
}

export function renderGallery(container, projects, lang) {
  container.innerHTML = '';
  projects.forEach(p => container.appendChild(buildGalleryItem(p, lang)));
}

export function renderFeatured(container, projects, lang) {
  let featured = projects.filter(p => p.featured);
  if (featured.length < 3) {
    const rest = projects.filter(p => !p.featured);
    featured = [...featured, ...rest].slice(0, 3);
  } else {
    featured = featured.slice(0, 3);
  }
  container.innerHTML = '';
  featured.forEach(p => {
    const el = buildGalleryItem(p, lang);
    el.classList.add('reveal');
    container.appendChild(el);
  });
}
