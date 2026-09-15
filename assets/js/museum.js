'use strict';
/* Museum bergerak perlahan. Interaksi manual mematikan autoplay sampai Play ditekan. */
(() => {
  const track = document.getElementById('museumTrack');
  if (!track) return;
  const room = document.getElementById('museumRoom');
  const artworks = [...track.querySelectorAll('.museum-artwork')];
  const play = document.getElementById('museumPlay');
  const prev = document.getElementById('museumPrev');
  const next = document.getElementById('museumNext');
  const count = document.getElementById('museumCount');
  const state = document.getElementById('museumState');
  const progress = document.getElementById('museumProgress');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const t = window.portfolioText;
  let automatic = !reduced.matches;
  let inView = false, hovering = false, focused = false;
  let modalOpen = document.getElementById('detailModal').open;
  let direction = 1, frame = 0, previousTime = 0, position = 0;
  play.innerHTML = '<i aria-hidden="true"></i><span></span>';
  const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
  function currentIndex() {
    const offset = track.scrollLeft;
    let best = 0, distance = Infinity;
    artworks.forEach((art, i) => {
      const target = Math.min(maxScroll(), art.offsetLeft - artworks[0].offsetLeft);
      if (Math.abs(target - offset) < distance) { distance = Math.abs(target - offset); best = i; }
    });
    return best;
  }
  function updateProgress() {
    const index = currentIndex();
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(artworks.length).padStart(2, '0')}`;
    progress.style.transform = `scaleX(${maxScroll() ? track.scrollLeft / maxScroll() : 1})`;
    prev.disabled = track.scrollLeft < 2;
    next.disabled = track.scrollLeft >= maxScroll() - 2;
  }
  function updateLabels() {
    play.setAttribute('aria-pressed', String(automatic));
    // Pertahankan node tombol ketika fokus berpindah agar klik tidak terputus.
    play.firstElementChild.className = `fa-solid fa-${automatic ? 'pause' : 'play'}`;
    play.lastElementChild.textContent = automatic ? t('Jeda otomatis', 'Pause autoplay') : t('Putar otomatis', 'Start autoplay');
    state.textContent = automatic
      ? ((hovering || focused || modalOpen) ? t('Dijeda saat kamu melihat karya.', 'Paused while you explore.') : t('Berjalan perlahan · geser untuk kendali manual.', 'Moving slowly · drag to take control.'))
      : t('Mode manual · geser bebas atau putar kembali.', 'Manual mode · explore freely or resume autoplay.');
    prev.setAttribute('aria-label', t('Karya sebelumnya', 'Previous artwork'));
    next.setAttribute('aria-label', t('Karya berikutnya', 'Next artwork'));
    track.setAttribute('aria-label', t('Galeri karya seni; geser kiri atau kanan', 'Art gallery; swipe left or right'));
    artworks.forEach((art, i) => art.setAttribute('aria-label', t(`Karya ${i + 1} dari ${artworks.length}`, `Artwork ${i + 1} of ${artworks.length}`)));
  }
  function shouldRun() { return automatic && inView && !hovering && !focused && !modalOpen && !document.hidden && maxScroll() > 0; }
  function animate(time) {
    frame = 0;
    if (!shouldRun()) return;
    const dt = previousTime ? Math.min(48, time - previousTime) : 0;
    previousTime = time;
    // Simpan pecahan posisi agar autoplay tetap halus di layar refresh rate tinggi.
    position += direction * dt * 0.030;
    if (position >= maxScroll()) { position = maxScroll(); direction = -1; }
    if (position <= 0) { position = 0; direction = 1; }
    track.scrollLeft = position;
    updateProgress();
    frame = requestAnimationFrame(animate);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; previousTime = 0;
    position = track.scrollLeft;
    if (shouldRun()) frame = requestAnimationFrame(animate);
    updateLabels();
  }
  function takeControl() { automatic = false; sync(); }
  function step(delta) {
    takeControl();
    const current = currentIndex();
    const index = Math.max(0, Math.min(artworks.length - 1, current + delta));
    const target = artworks[index].offsetLeft - artworks[0].offsetLeft;
    track.scrollTo({ left: Math.min(target, maxScroll()), behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  window.attachHorizontalDrag(track, takeControl);
  // Touch scroll mulai secara native; hentikan autoplay agar tidak melawan jari.
  track.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') takeControl(); });
  track.addEventListener('wheel', event => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : (event.shiftKey ? event.deltaY : 0);
    if (!delta) return; // Scroll vertikal tetap menggulir halaman biasa.
    takeControl(); event.preventDefault();
    track.scrollLeft += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1);
  }, { passive: false });
  track.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); takeControl();
      if (event.key.startsWith('Arrow')) step(event.key === 'ArrowRight' ? 1 : -1);
      else track.scrollTo({ left: event.key === 'Home' ? 0 : maxScroll(), behavior: reduced.matches ? 'instant' : 'smooth' });
    }
  });
  track.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; sync(); } });
  track.addEventListener('pointerleave', () => { hovering = false; sync(); });
  track.addEventListener('focusin', () => { focused = true; sync(); });
  track.addEventListener('focusout', event => { if (!track.contains(event.relatedTarget)) { focused = false; sync(); } });
  track.addEventListener('scroll', updateProgress, { passive: true });
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  play.addEventListener('click', () => { automatic = !automatic; sync(); });
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('portfolio:languagechange', updateLabels);
  document.addEventListener('portfolio:modalchange', event => { modalOpen = event.detail.open; sync(); });
  reduced.addEventListener('change', () => { if (reduced.matches) automatic = false; sync(); });
  new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }, { threshold: 0.12 }).observe(room);
  new ResizeObserver(() => { updateProgress(); sync(); }).observe(track);
  document.getElementById('museumControls').hidden = false;
  updateLabels(); updateProgress();
})();
