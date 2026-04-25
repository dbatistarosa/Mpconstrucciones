/* ═══════════════════════════════════════════════════
   Admin Dashboard — Mejía Peralta Construcciones
═══════════════════════════════════════════════════ */

const STORAGE_KEY  = 'mpc-projects';
const AUTH_KEY     = 'mpc-admin-authed';
const PASSWORD_KEY = 'mpc-admin-password';
const DEFAULT_PWD  = 'mpc2024';

let projects            = [];
let editingSlug         = null;
let coverDataUrl        = null;
let galleryDataUrls     = [];
let existingGallerySrcs = [];

// ── Auth ──────────────────────────────────────────────────────────────────────

function isAuthed()   { return sessionStorage.getItem(AUTH_KEY) === '1'; }

function login(pwd) {
  const correct = localStorage.getItem(PASSWORD_KEY) || DEFAULT_PWD;
  if (pwd === correct) { sessionStorage.setItem(AUTH_KEY, '1'); showDashboard(); return true; }
  return false;
}

function logout() { sessionStorage.removeItem(AUTH_KEY); showLogin(); }

// ── Screens ───────────────────────────────────────────────────────────────────

function showLogin() {
  document.getElementById('screen-login').hidden     = false;
  document.getElementById('screen-dashboard').hidden = true;
}

function showDashboard() {
  document.getElementById('screen-login').hidden     = true;
  document.getElementById('screen-dashboard').hidden = false;
  renderStats();
  renderTable();
}

// ── Projects persistence ──────────────────────────────────────────────────────

async function loadProjects() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { projects = JSON.parse(stored); return; } catch (e) { /* fall through */ }
  }
  try {
    const res  = await fetch('../data/projects.json');
    const data = await res.json();
    projects   = data.projects || [];
    saveProjects();
  } catch (err) {
    console.error('[admin] Could not load projects.json:', err);
    projects = [];
  }
}

function saveProjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

function deleteProject(slug) {
  if (!confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) return;
  projects = projects.filter(p => p.slug !== slug);
  saveProjects();
  renderStats();
  renderTable();
  showToast('Proyecto eliminado');
}

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

  let slug = document.getElementById('f-slug').value.trim() || toSlug(titleEs);

  // Ensure slug uniqueness (allow same slug when editing same project)
  const collision = projects.find(p => p.slug === slug && p.slug !== editingSlug);
  if (collision) slug = slug + '-' + Date.now().toString(36).slice(-4);

  // Cover
  let cover = coverDataUrl;
  if (!cover && editingSlug) {
    cover = projects.find(p => p.slug === editingSlug)?.cover || '';
  }

  // Gallery = existing (kept) + new uploads
  const gallery = [...existingGallerySrcs, ...galleryDataUrls];
  if (cover && !gallery.includes(cover)) gallery.unshift(cover);

  const now = new Date().toISOString();
  const existing = editingSlug ? projects.find(p => p.slug === editingSlug) : null;

  const projectData = {
    id:          existing?.id || generateId(),
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
    cover:       cover || '',
    gallery,
    createdAt:   existing?.createdAt || now,
    updatedAt:   now
  };

  if (editingSlug) {
    const idx = projects.findIndex(p => p.slug === editingSlug);
    if (idx !== -1) projects[idx] = projectData;
    else projects.push(projectData);
  } else {
    projects.push(projectData);
  }

  saveProjects();
  renderStats();
  renderTable();
  closeModal();
  showToast(editingSlug ? 'Proyecto actualizado correctamente' : 'Proyecto creado correctamente');
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openModal(slug) {
  editingSlug         = slug || null;
  coverDataUrl        = null;
  galleryDataUrls     = [];
  existingGallerySrcs = [];

  const form = document.getElementById('project-form');
  form.reset();

  const prevImg = document.getElementById('cover-preview-img');
  prevImg.src   = '';
  prevImg.style.display = 'none';
  document.getElementById('cover-placeholder').style.display = 'flex';
  document.getElementById('gallery-preview-grid').innerHTML  = '';

  if (slug) {
    const p = projects.find(pr => pr.slug === slug);
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

    if (p.cover) {
      prevImg.src = p.cover;
      prevImg.style.display = 'block';
      document.getElementById('cover-placeholder').style.display = 'none';
    }

    existingGallerySrcs = [...(p.gallery || [])];
    renderGalleryPreview();
  } else {
    document.getElementById('modal-title').textContent      = 'Nuevo Proyecto';
    document.getElementById('f-location').value             = 'La Vega, RD';
    document.getElementById('f-year').value                 = new Date().getFullYear().toString();
  }

  document.getElementById('modal-project').hidden = false;
  document.body.classList.add('no-scroll');
  document.getElementById('f-title-es').focus();
}

function closeModal() {
  document.getElementById('modal-project').hidden = true;
  document.body.classList.remove('no-scroll');
  editingSlug = null; coverDataUrl = null; galleryDataUrls = []; existingGallerySrcs = [];
}

// ── Image handling ────────────────────────────────────────────────────────────

function readFileAsDataUrl(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

async function handleCoverChange(input) {
  const file = input.files[0];
  if (!file) return;
  coverDataUrl = await readFileAsDataUrl(file);
  const img = document.getElementById('cover-preview-img');
  img.src   = coverDataUrl;
  img.style.display = 'block';
  document.getElementById('cover-placeholder').style.display = 'none';
}

async function handleGalleryChange(input) {
  for (const file of [...input.files]) {
    if (file.type.startsWith('image/')) {
      galleryDataUrls.push(await readFileAsDataUrl(file));
    }
  }
  renderGalleryPreview();
  input.value = '';
}

function renderGalleryPreview() {
  const grid = document.getElementById('gallery-preview-grid');
  grid.innerHTML = '';

  existingGallerySrcs.forEach((src, i) => {
    grid.appendChild(makePreviewItem(src, false, () => {
      existingGallerySrcs.splice(i, 1);
      renderGalleryPreview();
    }));
  });

  galleryDataUrls.forEach((src, i) => {
    grid.appendChild(makePreviewItem(src, true, () => {
      galleryDataUrls.splice(i, 1);
      renderGalleryPreview();
    }));
  });
}

function makePreviewItem(src, isNew, onRemove) {
  const div = document.createElement('div');
  div.className = 'gallery-preview-item' + (isNew ? ' gallery-preview-item--new' : '');
  div.innerHTML = `
    <img src="${src}" alt="">
    <button type="button" class="gallery-preview-item__remove" aria-label="Eliminar">✕</button>
    ${isNew ? '<span class="gallery-preview-item__badge">Nuevo</span>' : ''}
  `;
  div.querySelector('.gallery-preview-item__remove').addEventListener('click', onRemove);
  return div;
}

// ── Auto-slug ─────────────────────────────────────────────────────────────────

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

// ── Table render ──────────────────────────────────────────────────────────────

const CAT_LABELS = { residential: 'Residencial', commercial: 'Comercial', industrial: 'Industrial', cabin: 'Cabañas' };

function renderTable() {
  const tbody = document.getElementById('projects-tbody');
  tbody.innerHTML = '';

  if (!projects.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">No hay proyectos aún. Crea el primero usando el botón "Nuevo Proyecto".</td></tr>`;
    return;
  }

  [...projects].reverse().forEach(p => {
    const finished = p.status === 'finished';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="admin-table__cover-cell">
        ${p.cover
          ? `<img src="${p.cover}" alt="" class="admin-table__thumb">`
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
        <a href="../proyecto.html?slug=${encodeURIComponent(p.slug)}" target="_blank"
           class="admin-btn admin-btn--sm admin-btn--ghost" title="Ver página pública">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
        <button class="admin-btn admin-btn--sm admin-btn--secondary js-edit"
                data-slug="${escAttr(p.slug)}">Editar</button>
        <button class="admin-btn admin-btn--sm admin-btn--danger js-delete"
                data-slug="${escAttr(p.slug)}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.js-edit').forEach(btn =>
    btn.addEventListener('click', () => openModal(btn.dataset.slug)));
  tbody.querySelectorAll('.js-delete').forEach(btn =>
    btn.addEventListener('click', () => deleteProject(btn.dataset.slug)));
}

function renderStats() {
  document.getElementById('stat-total').textContent    = projects.length;
  document.getElementById('stat-finished').textContent = projects.filter(p => p.status === 'finished').length;
  document.getElementById('stat-progress').textContent = projects.filter(p => p.status === 'under_construction').length;
}

// ── View navigation ───────────────────────────────────────────────────────────

function switchView(viewName) {
  document.querySelectorAll('.admin-view').forEach(v => v.hidden = true);
  document.querySelectorAll('.admin-nav__link').forEach(l => l.classList.remove('is-active'));

  const view = document.getElementById('view-' + viewName);
  if (view) view.hidden = false;
  const link = document.querySelector(`.admin-nav__link[data-view="${viewName}"]`);
  if (link) link.classList.add('is-active');

  const titles = { projects: 'Proyectos', settings: 'Configuración' };
  document.getElementById('topbar-title').textContent = titles[viewName] || viewName;

  // Show/hide toolbar buttons based on view
  const isProjects = viewName === 'projects';
  document.getElementById('new-project-btn').style.display = isProjects ? '' : 'none';
  document.getElementById('export-btn').style.display      = isProjects ? '' : 'none';
}

// ── Export / Reset ────────────────────────────────────────────────────────────

function exportJSON() {
  const blob = new Blob([JSON.stringify({ projects }, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'projects.json' });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Descargado projects.json — reemplaza el archivo en el servidor para publicar los cambios');
}

async function resetToOriginal() {
  if (!confirm('¿Restaurar los proyectos originales? Se perderán todos los cambios locales.')) return;
  localStorage.removeItem(STORAGE_KEY);
  await loadProjects();
  renderStats();
  renderTable();
  showToast('Proyectos restaurados al estado original');
}

// ── Settings ──────────────────────────────────────────────────────────────────

function handleChangePassword(e) {
  e.preventDefault();
  const newPwd = document.getElementById('new-password').value;
  const confPwd = document.getElementById('confirm-password').value;
  if (newPwd.length < 4)   { showToast('La contraseña debe tener al menos 4 caracteres', 'error'); return; }
  if (newPwd !== confPwd)  { showToast('Las contraseñas no coinciden', 'error'); return; }
  localStorage.setItem(PASSWORD_KEY, newPwd);
  document.getElementById('change-password-form').reset();
  showToast('Contraseña actualizada correctamente');
}

// ── Drag & Drop upload zone ───────────────────────────────────────────────────

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

// ── Toast ─────────────────────────────────────────────────────────────────────

let toastTimer;
function showToast(message, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.className   = `admin-toast admin-toast--${type} admin-toast--visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('admin-toast--visible'), 3500);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function toSlug(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateId()        { return 'proj-' + Date.now().toString(36); }
function escHtml(str)        { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(str)        { return String(str).replace(/"/g,'&quot;'); }

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadProjects();

  isAuthed() ? showDashboard() : showLogin();

  // Auth
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const pwd = document.getElementById('password-input').value;
    if (!login(pwd)) {
      document.getElementById('login-error').hidden = false;
      document.getElementById('password-input').value = '';
      document.getElementById('password-input').focus();
    }
  });
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Nav
  document.querySelectorAll('.admin-nav__link[data-view]').forEach(link =>
    link.addEventListener('click', e => { e.preventDefault(); switchView(link.dataset.view); }));

  // Toolbar
  document.getElementById('new-project-btn').addEventListener('click', () => openModal(null));
  document.getElementById('export-btn').addEventListener('click', exportJSON);
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', resetToOriginal);

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', closeModal);
  document.getElementById('project-form').addEventListener('submit', handleFormSubmit);

  // File inputs
  document.getElementById('f-cover').addEventListener('change', function () { handleCoverChange(this); });
  document.getElementById('f-gallery').addEventListener('change', function () { handleGalleryChange(this); });

  // Drop zones
  setupDropZone(
    document.getElementById('cover-upload-area'),
    document.getElementById('f-cover'),
    async files => {
      const img = files.find(f => f.type.startsWith('image/'));
      if (img) {
        coverDataUrl = await readFileAsDataUrl(img);
        const el = document.getElementById('cover-preview-img');
        el.src = coverDataUrl; el.style.display = 'block';
        document.getElementById('cover-placeholder').style.display = 'none';
      }
    }
  );
  setupDropZone(
    document.getElementById('gallery-upload-area'),
    document.getElementById('f-gallery'),
    async files => {
      for (const f of files) {
        if (f.type.startsWith('image/')) galleryDataUrls.push(await readFileAsDataUrl(f));
      }
      renderGalleryPreview();
    }
  );

  // Auto-slug
  setupAutoSlug();

  // Settings
  document.getElementById('change-password-form').addEventListener('submit', handleChangePassword);

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('modal-project').hidden) closeModal();
  });
});
