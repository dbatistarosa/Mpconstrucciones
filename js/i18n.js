const STORAGE_KEY  = 'mpc-lang';
const DEFAULT_LANG = 'es';
let translations = {};

export async function initI18n() {
  const lang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  await loadLanguage(lang);
  updateToggle(lang);
  applyAll();
}

export async function switchLanguage(lang) {
  await loadLanguage(lang);
  updateToggle(lang);
  applyAll();
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

async function loadLanguage(lang) {
  try {
    const res = await fetch(`/lang/${lang}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    translations = await res.json();
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (err) {
    console.warn('[i18n] Could not load', lang, err);
  }
}

function applyAll() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = get(el.getAttribute('data-i18n'));
    if (val !== undefined) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const val = get(el.getAttribute('data-i18n-html'));
    if (val !== undefined) el.innerHTML = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const val = get(el.getAttribute('data-i18n-placeholder'));
    if (val !== undefined) el.placeholder = val;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const val = get(el.getAttribute('data-i18n-aria'));
    if (val !== undefined) el.setAttribute('aria-label', val);
  });
}

function get(keyPath) {
  return keyPath.split('.').reduce((obj, k) => obj?.[k], translations);
}

function updateToggle(lang) {
  document.querySelectorAll('.js-lang-toggle [data-lang]').forEach(btn => {
    btn.classList.toggle('is-active', btn.getAttribute('data-lang') === lang);
  });
}

// Wire up toggle clicks (called once, delegation)
document.addEventListener('click', async e => {
  const btn = e.target.closest('.js-lang-toggle [data-lang]');
  if (!btn) return;
  const lang = btn.getAttribute('data-lang');
  await switchLanguage(lang);
});
