/* ═══════════════════════════════════════════════════
   Admin Dashboard — Mejía Peralta Construcciones
   Backed by Supabase (auth + database + storage)
═══════════════════════════════════════════════════ */

import { supabase } from '../js/supabase.js';

const BUCKET = 'project-images';

// ── State ─────────────────────────────────────────────────────
let allProjects         = [];
let editingId           = null;
let pendingCoverFile    = null;
let pendingGalleryFiles = [];
let existingCoverUrl    = null;
let existingGalleryUrls = [];

// ── Auth ──────────────────────────────────────────────────────

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

async function logout() {
  await supabase.auth.signOut();
  showLogin();
}

// ── Screens ───────────────────────────────────────────────────

function showLogin() {
  document.getElementById('screen-login').hidden     = false;
  document.getElementById('screen-dashboard').hidden = true;
}

async function showDashboard() {
  document.getElementById('screen-login').hidden     = true;
  document.getElementById('screen-dashboard').hidden = false;
  await refreshProjects();
}

// ── Data helpers ──────────────────────────────────────────────

function flatToProject(row) {
  return {
    id:          row.id,
    slug:        row.slug,
    title:       { es: row.title_es, en: row.title_en || row.title_es },
    description: { es: row.description_es || '', en: row.description_en || row.description_es || '' },
    category:    row.category,
    status:      row.status,
    year:        row.year        || '',
    location:    row.location    || '',
    area:        row.area        || '',
    client:      row.client      || '',
    featured:    row.featured    || false,
    cover:       row.cover_url   || '',
    gallery:     row.gallery_urls || [],
    createdAt:   row.created_at,
    updatedAt:   row.updated_at
  };
}

function projectToFlat(p) {
  return {
    slug:          p.slug,
    title_es:      p.title.es,
    title_en:      p.title.en || null,
    description_es: p.description.es,
    description_en: p.description.en || null,
    category:      p.category,
    status:        p.status,
    year:          p.year     || null,
    location:      p.location || null,
    area:          p.area     || null,
    client:        p.client   || null,
    featured:      p.featured || false,
    cover_url:     p.cover    || null,
    gallery_urls:  p.gallery  || []
  };
}

// ── Image upload ──────────────────────────────────────────────

async function uploadImage(file, prefix) {
  const ext  = file.name.split('.').pop().toLowerCase() || 'jpg';
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// ── CRUD ──────────────────────────────────────────────────────

async function refreshProjects() {
  setTableLoading(true);
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Error al cargar proyectos: ' + error.message, 'error');
    allProjects = [];
  } else {
    allProjects = (data || []).map(flatToProject);
  }

  renderStats();
  renderTable();
  setTableLoading(false);
}

async function persistProject(projectData) {
  const flat = projectToFlat(projectData);

  if (editingId) {
    const { error } = await supabase.from('projects').update(flat).eq('id', editingId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('projects').insert([flat]);
    if (error) throw new Error(error.message);
  }
}

async function removeProject(id, slug) {
  if (!confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) return;

  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) { showToast('Error al eliminar: ' + error.message, 'error'); return; }

  showToast('Proyecto eliminado');
  await refreshProjects();
}

// ── Form submit ───────────────────────────────────────────────

async function handleFormSubmit(e) {
  e.preventDefault();

  const titleEs = document.getElementById('f-title-es').value.trim();
  const titleEn = document.getElementById('f-title-en').value.trim();
  const descEs  = document.getElementById('f-desc-es').value.trim();
  const descEn  = document.getElementById('f-desc-en').value.trim();

  if (!titleEs || !descEs) {
    showToast('El título y descripción en español son obligatorios', 'error');
    return;
  }

  const submitBtn = e.target.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Guardando…';

  try {
    // Upload cover if a new file was selected
    let coverUrl = existingCoverUrl;
    if (pendingCoverFile) {
      coverUrl = await uploadImage(pendingCoverFile, 'cover');
    }

    // Upload new gallery images
    const newGalleryUrls = [];
    for (const file of pendingGalleryFiles) {
      newGalleryUrls.push(await uploadImage(file, 'gallery'));
    }

    let slug = document.getElementById('f-slug').value.trim() || toSlug(titleEs);
    // Ensure uniqueness when creating (allow same slug when editing)
    const collision = allProjects.find(p => p.slug === slug && p.id !== editingId);
    if (collision) slug = slug + '-' + Date.now().toString(36).slice(-4);

    const gallery = [...existingGalleryUrls, ...newGalleryUrls];
    if (coverUrl && !gallery.includes(coverUrl)) gallery.unshift(coverUrl);

    const projectData = {
      slug,
      title:       { es: titleEs, en: titleEn || titleEs },
      description: { es: descEs,  en: descEn  || descEs  },
      category:    document.getElementById('f-category').value,
      status:      document.getElementById('f-status').value,
      year:        document.getElementById('f-year').value.trim(),
      location:    document.getElementById('f-location').value.trim(),
      area:        document.getElementById('f-area').value.trim(),
      client:      document.getElementById('f-client').value.trim(),
      featured:    document.getElementById('f-featured').checked,
      cover:       coverUrl || '',
      gallery
    };

    await persistProject(projectData);
    closeModal();
    showToast(editingId ? 'Proyecto actualizado' : 'Proyecto creado correctamente');
    await refreshProjects();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" width="14" height="14">
      <polyline points="20 6 9 17 4 12"/></svg> Guardar Proyecto`;
  }
}

// ── Modal ─────────────────────────────────────────────────────

function openModal(id) {
  editingId           = id || null;
  pendingCoverFile    = null;
  pendingGalleryFiles = [];
  existingCoverUrl    = null;
  existingGalleryUrls = [];

  const form = document.getElementById('project-form');
  form.reset();

  const prevImg = document.getElementById('cover-preview-img');
  prevImg.src   = '';
  prevImg.style.display = 'none';
  document.getElementById('cover-placeholder').style.display    = 'flex';
  document.getElementById('gallery-preview-grid').innerHTML     = '';

  if (id) {
    const p = allProjects.find(pr => pr.id === id);
    if (!p) return;

    document.getElementById('modal-title').textContent = 'Editar Proyecto';
    document.getElementById('f-title-es').value  = p.title?.es || '';
    document.getElementById('f-title-en').value  = p.title?.en || '';
    document.getElementById('f-desc-es').value   = p.description?.es || '';
    document.getElementById('f-desc-en').value   = p.description?.en || '';
    document.getElementById('f-category').value  = p.category  || 'residential';
    document.getElementById('f-status').value    = p.status    || 'finished';
    document.getElementById('f-year').value      = p.year      || '';
    document.getElementById('f-area').value      = p.area      || '';
    document.getElementById('f-location').value  = p.location  || '';
    document.getElementById('f-client').value    = p.client    || '';
    document.getElementById('f-featured').checked = !!p.featured;
    document.getElementById('f-slug').value      = p.slug      || '';

    existingCoverUrl = p.cover || null;
    if (p.cover) {
      prevImg.src = p.cover;
      prevImg.style.display = 'block';
      document.getElementById('cover-placeholder').style.display = 'none';
    }

    existingGalleryUrls = [...(p.gallery || []).filter(u => u !== p.cover)];
    renderGalleryPreview();
  } else {
    document.getElementById('modal-title').textContent  = 'Nuevo Proyecto';
    document.getElementById('f-location').value         = 'La Vega, RD';
    document.getElementById('f-year').value             = new Date().getFullYear().toString();
  }

  document.getElementById('modal-project').hidden = false;
  document.body.classList.add('no-scroll');
  document.getElementById('f-title-es').focus();
}

function closeModal() {
  document.getElementById('modal-project').hidden = true;
  document.body.classList.remove('no-scroll');
  editingId = null; pendingCoverFile = null;
  pendingGalleryFiles = []; existingCoverUrl = null; existingGalleryUrls = [];
}

// ── Image handling ────────────────────────────────────────────

async function handleCoverChange(input) {
  const file = input.files[0];
  if (!file) return;
  pendingCoverFile = file;
  const objectUrl = URL.createObjectURL(file);
  const img = document.getElementById('cover-preview-img');
  img.src   = objectUrl;
  img.style.display = 'block';
  document.getElementById('cover-placeholder').style.display = 'none';
}

async function handleGalleryChange(input) {
  for (const file of [...input.files]) {
    if (file.type.startsWith('image/')) pendingGalleryFiles.push(file);
  }
  renderGalleryPreview();
  input.value = '';
}

function renderGalleryPreview() {
  const grid = document.getElementById('gallery-preview-grid');
  grid.innerHTML = '';

  existingGalleryUrls.forEach((src, i) => {
    grid.appendChild(makePreviewItem(src, false, () => {
      existingGalleryUrls.splice(i, 1);
      renderGalleryPreview();
    }));
  });

  pendingGalleryFiles.forEach((file, i) => {
    const url = URL.createObjectURL(file);
    grid.appendChild(makePreviewItem(url, true, () => {
      pendingGalleryFiles.splice(i, 1);
      renderGalleryPreview();
    }));
  });
}

function makePreviewItem(src, isNew, onRemove) {
  const div = document.createElement('div');
  div.className = 'gallery-preview-item' + (isNew ? ' gallery-preview-item--new' : '');
  div.innerHTML = `
    <img src="${escHtml(src)}" alt="">
    <button type="button" class="gallery-preview-item__remove" aria-label="Eliminar">&times;</button>
    ${isNew ? '<span class="gallery-preview-item__badge">Nuevo</span>' : ''}
  `;
  div.querySelector('.gallery-preview-item__remove').addEventListener('click', onRemove);
  return div;
}

// ── Table render ──────────────────────────────────────────────

const CAT_LABELS = {
  residential: 'Residencial',
  commercial:  'Comercial',
  industrial:  'Industrial',
  cabin:       'Cabañas'
};

function getFilteredProjects() {
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  const cat    = document.getElementById('filter-category')?.value || '';
  const status = document.getElementById('filter-status')?.value   || '';

  return allProjects.filter(p => {
    if (cat    && p.category !== cat)    return false;
    if (status && p.status   !== status) return false;
    if (search) {
      const hay = [p.title?.es, p.title?.en, p.slug, p.location, p.year].join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function renderTable() {
  const tbody    = document.getElementById('projects-tbody');
  const filtered = getFilteredProjects();
  tbody.innerHTML = '';

  if (!filtered.length) {
    const msg = allProjects.length
      ? 'No se encontraron proyectos con ese filtro.'
      : 'No hay proyectos aún. Crea el primero usando el botón "Nuevo Proyecto".';
    tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">${msg}</td></tr>`;
    return;
  }

  filtered.forEach(p => {
    const finished = p.status === 'finished';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="admin-table__cover-cell">
        ${p.cover
          ? `<img src="${escHtml(p.cover)}" alt="" class="admin-table__thumb">`
          : `<div class="admin-table__thumb admin-table__thumb--empty"></div>`}
      </td>
      <td>
        <div class="admin-table__project-name">${escHtml(p.title?.es || '')}</div>
        <div class="admin-table__project-slug">${escHtml(p.slug)}</div>
      </td>
      <td><span class="admin-badge admin-badge--category">${CAT_LABELS[p.category] || p.category}</span></td>
      <td><span class="admin-badge admin-badge--${finished ? 'finished' : 'progress'}">${finished ? 'Terminado' : 'En Construcción'}</span></td>
      <td>${escHtml(p.year || '—')}</td>
      <td class="admin-table__actions">
        <a href="/proyecto.html?slug=${encodeURIComponent(p.slug)}" target="_blank"
           class="admin-btn admin-btn--sm admin-btn--ghost" title="Ver en el sitio">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" width="13" height="13">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
        <button class="admin-btn admin-btn--sm admin-btn--secondary js-edit"
                data-id="${escAttr(p.id)}">Editar</button>
        <button class="admin-btn admin-btn--sm admin-btn--danger js-delete"
                data-id="${escAttr(p.id)}" data-slug="${escAttr(p.slug)}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.js-edit').forEach(btn =>
    btn.addEventListener('click', () => openModal(btn.dataset.id)));
  tbody.querySelectorAll('.js-delete').forEach(btn =>
    btn.addEventListener('click', () => removeProject(btn.dataset.id, btn.dataset.slug)));

  document.getElementById('table-count').textContent =
    `${filtered.length} proyecto${filtered.length !== 1 ? 's' : ''}`;
}

function renderStats() {
  document.getElementById('stat-total').textContent    = allProjects.length;
  document.getElementById('stat-featured').textContent = allProjects.filter(p => p.featured).length;
  document.getElementById('stat-finished').textContent = allProjects.filter(p => p.status === 'finished').length;
  document.getElementById('stat-progress').textContent = allProjects.filter(p => p.status === 'under_construction').length;
}

function setTableLoading(on) {
  const wrap = document.getElementById('table-loading');
  if (wrap) wrap.hidden = !on;
  const table = document.getElementById('projects-table-wrap');
  if (table) table.style.opacity = on ? '0.4' : '1';
}

// ── Auto-slug ─────────────────────────────────────────────────

function setupAutoSlug() {
  const titleInput = document.getElementById('f-title-es');
  const slugInput  = document.getElementById('f-slug');
  let userEdited   = false;

  slugInput.addEventListener('input',  () => { userEdited = true; });
  slugInput.addEventListener('blur',   () => { if (!slugInput.value.trim()) userEdited = false; });
  titleInput.addEventListener('input', () => {
    if (!userEdited) slugInput.value = toSlug(titleInput.value);
  });
}

// ── Drop zones ────────────────────────────────────────────────

function setupDropZone(area, input, onFiles) {
  area.addEventListener('click',     () => input.click());
  area.addEventListener('dragover',  e => { e.preventDefault(); area.classList.add('is-dragging'); });
  area.addEventListener('dragleave', () => area.classList.remove('is-dragging'));
  area.addEventListener('drop', e => {
    e.preventDefault();
    area.classList.remove('is-dragging');
    onFiles([...e.dataTransfer.files]);
  });
}

// ── View navigation ───────────────────────────────────────────

function switchView(viewName) {
  document.querySelectorAll('.admin-view').forEach(v  => v.hidden = true);
  document.querySelectorAll('.admin-nav__link').forEach(l => l.classList.remove('is-active'));

  const view = document.getElementById('view-' + viewName);
  if (view) view.hidden = false;
  const link = document.querySelector(`.admin-nav__link[data-view="${viewName}"]`);
  if (link) link.classList.add('is-active');

  const titles = { projects: 'Proyectos', settings: 'Configuración' };
  document.getElementById('topbar-title').textContent = titles[viewName] || viewName;

  const isProjects = viewName === 'projects';
  document.getElementById('new-project-btn').style.display = isProjects ? '' : 'none';
}

// ── Toast ─────────────────────────────────────────────────────

let toastTimer;
function showToast(message, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.className   = `admin-toast admin-toast--${type} admin-toast--visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('admin-toast--visible'), 3500);
}

// ── Utilities ─────────────────────────────────────────────────

function toSlug(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) { return String(str).replace(/"/g, '&quot;'); }

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {

  const authed = await checkSession();
  authed ? showDashboard() : showLogin();

  // ── Login
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email-input').value.trim();
    const pwd   = document.getElementById('password-input').value;
    const btn   = e.target.querySelector('button[type="submit"]');

    btn.disabled    = true;
    btn.textContent = 'Iniciando sesión…';
    document.getElementById('login-error').hidden = true;

    const result = await login(email, pwd);
    if (result.ok) {
      showDashboard();
    } else {
      const errEl = document.getElementById('login-error');
      errEl.textContent = result.message.includes('Invalid') || result.message.includes('credentials')
        ? 'Correo o contraseña incorrectos.'
        : result.message;
      errEl.hidden = false;
      document.getElementById('password-input').value = '';
      document.getElementById('password-input').focus();
    }

    btn.disabled    = false;
    btn.textContent = 'Ingresar';
  });

  document.getElementById('logout-btn').addEventListener('click', logout);

  // ── Nav
  document.querySelectorAll('.admin-nav__link[data-view]').forEach(link =>
    link.addEventListener('click', e => { e.preventDefault(); switchView(link.dataset.view); }));

  // ── Toolbar
  document.getElementById('new-project-btn').addEventListener('click', () => openModal(null));
  document.getElementById('refresh-btn').addEventListener('click', refreshProjects);

  // ── Search / filter
  ['search-input', 'filter-category', 'filter-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderTable);
  });

  // ── Modal
  document.getElementById('modal-close').addEventListener('click',    closeModal);
  document.getElementById('cancel-btn').addEventListener('click',     closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', closeModal);
  document.getElementById('project-form').addEventListener('submit',  handleFormSubmit);

  // ── File inputs
  document.getElementById('f-cover').addEventListener('change', function () { handleCoverChange(this); });
  document.getElementById('f-gallery').addEventListener('change', function () { handleGalleryChange(this); });

  // ── Drop zones
  setupDropZone(
    document.getElementById('cover-upload-area'),
    document.getElementById('f-cover'),
    async files => {
      const img = files.find(f => f.type.startsWith('image/'));
      if (img) {
        pendingCoverFile = img;
        const el = document.getElementById('cover-preview-img');
        el.src = URL.createObjectURL(img);
        el.style.display = 'block';
        document.getElementById('cover-placeholder').style.display = 'none';
      }
    }
  );
  setupDropZone(
    document.getElementById('gallery-upload-area'),
    document.getElementById('f-gallery'),
    async files => {
      for (const f of files) {
        if (f.type.startsWith('image/')) pendingGalleryFiles.push(f);
      }
      renderGalleryPreview();
    }
  );

  // ── Auto-slug
  setupAutoSlug();

  // ── Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('modal-project').hidden) closeModal();
  });
});
