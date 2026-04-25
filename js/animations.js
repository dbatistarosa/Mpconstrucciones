export function initAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        if (!entry.target.hasAttribute('data-repeat')) {
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  // Apply stagger delays to children inside .reveal-group
  document.querySelectorAll('.reveal-group').forEach(group => {
    group.querySelectorAll(':scope > .reveal').forEach((child, i) => {
      if (!child.style.getPropertyValue('--delay')) {
        child.style.setProperty('--delay', `${i * 90}ms`);
      }
    });
  });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
