'use strict';
/* Interaksi horizontal bersama: mouse drag; touch memakai swipe native browser. */
window.attachHorizontalDrag = (track, onTakeOver = () => {}) => {
  const controller = new AbortController();
  const { signal } = controller;
  let start = null;
  let dragged = false;
  let suppressUntil = 0;
  track.addEventListener('dragstart', event => event.preventDefault(), { signal });
  track.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    if (event.pointerType !== 'mouse') { onTakeOver(); return; }
    start = { id: event.pointerId, x: event.clientX, y: event.clientY, scroll: track.scrollLeft };
    dragged = false;
  }, { signal });
  track.addEventListener('pointermove', event => {
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.x;
    if (!dragged && Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
      dragged = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
      onTakeOver();
    }
    if (dragged) {
      event.preventDefault();
      track.scrollLeft = start.scroll - dx;
    }
  }, { signal });
  function release(event) {
    if (!start || event.pointerId !== start.id) return;
    if (dragged) suppressUntil = performance.now() + 250;
    if (track.hasPointerCapture(start.id)) track.releasePointerCapture(start.id);
    start = null;
    track.classList.remove('is-dragging');
  }
  window.addEventListener('pointerup', release, { signal });
  window.addEventListener('pointercancel', release, { signal });
  track.addEventListener('click', event => {
    // Drag melewati kartu tidak boleh membuka modal secara tidak sengaja.
    if (performance.now() < suppressUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, { capture: true, signal });
  return () => controller.abort();
};

window.createMediaGallery = (root, sources, title, t) => {
  root.replaceChildren();
  const controller = new AbortController();
  const { signal } = controller;
  const multiple = sources.length > 1;
  let index = 0;
  let dragCleanup = () => {};
  let resizeObserver;
  let frame = 0;
  const destroy = () => { controller.abort(); dragCleanup(); resizeObserver?.disconnect(); cancelAnimationFrame(frame); };
  if (!sources.length) return { multiple: false, destroy };
  root.className = 'detail-gallery mb-6';
  const track = document.createElement('div');
  track.className = 'detail-photo-track';
  track.setAttribute('role', 'region');
  track.setAttribute('aria-label', t('Foto dokumentasi', 'Documentation photos'));
  if (multiple) {
    track.tabIndex = 0;
    track.setAttribute('aria-roledescription', 'carousel');
  }
  sources.forEach((src, i) => {
    const slide = document.createElement('figure');
    slide.className = 'detail-photo-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-label', t(`Foto ${i + 1} dari ${sources.length}`, `Photo ${i + 1} of ${sources.length}`));
    const img = document.createElement('img');
    img.src = src;
    img.alt = `${title} — ${i + 1} / ${sources.length}`;
    img.draggable = false;
    img.className = 'detail-photo';
    slide.appendChild(img);
    track.appendChild(slide);
  });
  root.appendChild(track);
  let prev, next, count, dots = [];
  function update() {
    index = track.clientWidth ? Math.round(track.scrollLeft / track.clientWidth) : 0;
    index = Math.max(0, Math.min(sources.length - 1, index));
    if (!multiple) return;
    prev.disabled = index === 0;
    next.disabled = index === sources.length - 1;
    count.textContent = t(`Foto ${index + 1} dari ${sources.length}`, `Photo ${index + 1} of ${sources.length}`);
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
  }
  function goTo(i, behavior) {
    const target = Math.max(0, Math.min(sources.length - 1, i));
    track.scrollTo({ left: target * track.clientWidth, behavior: behavior || (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth') });
  }
  if (multiple) {
    const controls = document.createElement('div');
    controls.className = 'detail-photo-controls';
    const makeButton = (label, symbol) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'icon-button';
      button.setAttribute('aria-label', label);
      button.innerHTML = `<i class="fa-solid fa-arrow-${symbol}" aria-hidden="true"></i>`;
      return button;
    };
    prev = makeButton(t('Foto sebelumnya', 'Previous photo'), 'left');
    next = makeButton(t('Foto berikutnya', 'Next photo'), 'right');
    count = document.createElement('p');
    count.className = 'detail-photo-count'; count.setAttribute('aria-live', 'polite');
    const center = document.createElement('div');
    center.className = 'detail-photo-position'; center.appendChild(count);
    const dotGroup = document.createElement('div'); dotGroup.className = 'detail-photo-dots';
    sources.forEach((src, i) => {
      const dot = document.createElement('button');
      dot.type = 'button'; dot.className = 'detail-photo-dot';
      dot.setAttribute('aria-label', t(`Buka foto ${i + 1}`, `Open photo ${i + 1}`));
      dot.addEventListener('click', () => goTo(i), { signal });
      dots.push(dot); dotGroup.appendChild(dot);
    });
    center.appendChild(dotGroup); controls.append(prev, center, next); root.appendChild(controls);
    prev.addEventListener('click', () => goTo(index - 1), { signal });
    next.addEventListener('click', () => goTo(index + 1), { signal });
    track.addEventListener('scroll', update, { passive: true, signal });
    dragCleanup = window.attachHorizontalDrag(track);
    resizeObserver = new ResizeObserver(() => {
      const target = index;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { goTo(target, 'instant'); update(); });
    });
    resizeObserver.observe(track);
  }
  update();
  return { multiple, destroy, move: direction => goTo(index + direction) };
};
