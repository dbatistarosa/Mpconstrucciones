export function initForms(formEl) {
  formEl.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateForm(formEl)) return;

    const data    = new FormData(formEl);
    const name    = data.get('name') || '';
    const phone   = data.get('phone') || '';
    const service = data.get('service') || '';
    const message = data.get('message') || '';

    const number = formEl.getAttribute('data-wa') || '18295550000';
    const text   = encodeURIComponent(
      `Hola, soy ${name}.\n\nServicio de interés: ${service}\n\n${message}\n\nTeléfono: ${phone}`
    );
    window.open(`https://wa.me/${number}?text=${text}`, '_blank', 'noopener');
  });
}

function validateForm(formEl) {
  let valid = true;
  formEl.querySelectorAll('[required]').forEach(field => {
    const empty = !field.value.trim();
    field.classList.toggle('is-invalid', empty);
    if (empty) valid = false;
  });
  formEl.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', () => field.classList.remove('is-invalid'), { once: true });
  });
  return valid;
}
