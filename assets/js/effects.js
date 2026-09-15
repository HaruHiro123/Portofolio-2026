'use strict';
/* Animasi ringan: tidak menunda navigasi dan tidak mengubah susunan halaman. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let observer;
  function showEverything() {
    observer?.disconnect();
    document.querySelectorAll('.reveal-pending').forEach(el => el.classList.remove('reveal-pending'));
  }
  if (!reduced.matches && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll('.hero-wash > div > div, main header, main article:not(.museum-artwork), main .feature-panel, #skills li, main aside, #contactForm, body > footer');
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('reveal-visible');
      entry.target.classList.remove('reveal-pending');
      observer.unobserve(entry.target);
    }), { threshold: 0.07, rootMargin: '0px 0px 36px 0px' });
    targets.forEach(el => {
      const siblings = [...el.parentElement.children];
      el.style.setProperty('--reveal-delay', `${(siblings.indexOf(el) % 3) * 65}ms`);
      el.classList.add('reveal-element', 'reveal-pending');
      observer.observe(el);
    });
    document.querySelector('body > header')?.classList.add('nav-enter');
    // Konten yang dituju dengan keyboard tetap terlihat meskipun belum teramati.
    document.addEventListener('focusin', event => {
      event.target.closest('.reveal-pending')?.classList.remove('reveal-pending');
    });
  }
  reduced.addEventListener('change', () => { if (reduced.matches) showEverything(); updateCursorMode(); });
  window.addEventListener('pageshow', event => { if (event.persisted) showEverything(); });

  const trail = document.createElement('div');
  trail.className = 'cursor-trail';
  trail.setAttribute('aria-hidden', 'true');
  document.body.appendChild(trail);
  let x = 0, y = 0, targetX = 0, targetY = 0, frame = 0, enabled = false, seen = false;
  function updateCursorMode() {
    enabled = finePointer.matches && !reduced.matches;
    document.body.classList.toggle('cursor-enabled', enabled);
    if (!enabled) { cancelAnimationFrame(frame); frame = 0; trail.classList.remove('is-visible'); }
  }
  function animateCursor() {
    frame = 0;
    x += (targetX - x) * 0.22; y += (targetY - y) * 0.22;
    trail.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (enabled && Math.abs(targetX - x) + Math.abs(targetY - y) > 0.2) frame = requestAnimationFrame(animateCursor);
  }
  document.addEventListener('pointermove', event => {
    if (!enabled || event.pointerType !== 'mouse') return;
    targetX = event.clientX; targetY = event.clientY;
    if (!seen) { x = targetX; y = targetY; seen = true; }
    const typing = event.target.closest('input, textarea, pre, code');
    const dialog = document.getElementById('detailModal');
    trail.classList.toggle('is-visible', !typing && !dialog?.open);
    trail.classList.toggle('is-hovering', !!event.target.closest('a, button, [data-cursor="drag"], .detail-photo-track'));
    if (!frame) frame = requestAnimationFrame(animateCursor);
  }, { passive: true });
  document.addEventListener('pointerdown', () => trail.classList.add('is-pressed'));
  window.addEventListener('pointerup', () => trail.classList.remove('is-pressed'));
  document.documentElement.addEventListener('pointerleave', () => { trail.classList.remove('is-visible'); seen = false; });
  window.addEventListener('blur', () => { trail.classList.remove('is-visible'); seen = false; });
  document.addEventListener('portfolio:modalchange', () => trail.classList.remove('is-visible'));
  finePointer.addEventListener('change', updateCursorMode);
  updateCursorMode();
})();
