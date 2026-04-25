import { supabase, SUPABASE_URL } from './supabase.js';

const CONFIGURED = SUPABASE_URL !== 'YOUR_SUPABASE_URL';

function normalizeRow(row) {
  return {
    id:          row.id,
    slug:        row.slug,
    title:       { es: row.title_es, en: row.title_en  || row.title_es },
    description: { es: row.description_es || '', en: row.description_en || row.description_es || '' },
    category:    row.category,
    status:      row.status,
    year:        row.year     || '',
    location:    row.location || '',
    area:        row.area     || '',
    client:      row.client   || '',
    featured:    row.featured || false,
    cover:       row.cover_url || '',
    gallery:     row.gallery_urls || [],
    createdAt:   row.created_at,
    updatedAt:   row.updated_at
  };
}

async function loadFromJson() {
  const res = await fetch('/data/projects.json');
  if (!res.ok) throw new Error('Failed to load projects.json');
  const data = await res.json();
  return data.projects;
}

export async function loadProjects() {
  if (!CONFIGURED) return loadFromJson();

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(normalizeRow);
  } catch (err) {
    console.warn('[projects] Supabase unavailable, falling back to JSON:', err.message);
    return loadFromJson();
  }
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
  el.href  = `/proyecto.html?slug=${encodeURIComponent(project.slug)}`;
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
