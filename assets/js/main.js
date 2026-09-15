'use strict';

// Fungsi bersama untuk seluruh halaman. Penyimpanan selalu memiliki fallback.
window.portfolioStorage = {
  get(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  }
};
const storage = window.portfolioStorage;
let currentLang = storage.get('wahyu-lang', 'id') === 'en' ? 'en' : 'id';
const languageButton = document.getElementById('langToggle');
const themeButton = document.getElementById('themeToggle');
const menuButton = document.getElementById('menuToggle');
const menu = document.getElementById('navMenu');
const modal = document.getElementById('detailModal');
let activeDetail = null;
let previousFocus = null;
let detailGallery = null;

window.portfolioText = (id, en) => currentLang === 'en' ? en : id;
const t = window.portfolioText;

// Gunakan pengganti hanya bila berkas gambar terkait belum tersedia.
function prepareImages(scope = document) {
  scope.querySelectorAll('img').forEach(img => {
    if (img.dataset.fallbackReady) return;
    img.dataset.fallbackReady = 'true';
    function fallback() {
      if (img.dataset.missing) return;
      img.dataset.missing = 'true';
      img.alt = t('Gambar belum tersedia: ', 'Image not supplied: ') + img.alt;
      img.src = img.dataset.fallback || 'assets/image-placeholder.svg';
    }
    img.addEventListener('error', fallback, { once: true });
    if (img.complete && img.naturalWidth === 0) fallback();
  });
}

function updateThemeButton() {
  const dark = document.documentElement.classList.contains('dark');
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.setAttribute('aria-label', dark ? t('Aktifkan mode terang', 'Enable light mode') : t('Aktifkan mode gelap', 'Enable dark mode'));
  themeButton.innerHTML = `<i class="fa-solid fa-${dark ? 'sun' : 'moon'}" aria-hidden="true"></i>`;
}
themeButton.addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  storage.set('wahyu-theme', dark ? 'dark' : 'light');
  updateThemeButton();
});

function setMenu(open) {
  menu.classList.toggle('hidden', !open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? t('Tutup menu', 'Close menu') : t('Buka menu', 'Open menu'));
}
// Tanpa JS, tautan navigasi tetap terlihat. Dengan JS, menu HP bisa dilipat.
menu.classList.add('lg:flex');
menuButton.hidden = false;
setMenu(false);
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    setMenu(false); menuButton.focus();
  }
});

function translatePage() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('.tr[data-en]').forEach(el => {
    // Hanya HTML terjemahan dari source milik kita; input pengguna tidak dimasukkan ke innerHTML.
    if (el.dataset.id === undefined) el.dataset.id = el.innerHTML;
    el.innerHTML = currentLang === 'en' ? el.dataset.en : el.dataset.id;
  });
  languageButton.textContent = currentLang === 'id' ? 'EN' : 'ID';
  languageButton.setAttribute('aria-label', t('Switch to English', 'Ganti ke Bahasa Indonesia'));
  document.querySelector('nav').setAttribute('aria-label', t('Navigasi utama', 'Main navigation'));
  document.getElementById('closeModal').setAttribute('aria-label', t('Tutup detail', 'Close details'));
  updateThemeButton();
  setMenu(menuButton.getAttribute('aria-expanded') === 'true');
  if (activeDetail) renderDetail(activeDetail);
  document.dispatchEvent(new CustomEvent('portfolio:languagechange'));
}
languageButton.addEventListener('click', () => {
  currentLang = currentLang === 'id' ? 'en' : 'id';
  storage.set('wahyu-lang', currentLang);
  translatePage();
});

// <dialog> memberikan fokus terperangkap di dalam modal dan dukungan tombol Escape.
function renderDetail(id) {
  const data = window.portfolioDetails?.[id];
  if (!data) return;
  const title = currentLang === 'en' ? (data.title_en || data.title) : data.title;
  document.getElementById('modalTitle').textContent = title;
  const desc = document.getElementById('modalDesc');
  desc.innerHTML = currentLang === 'en' ? (data.desc_en || data.desc) : data.desc;
  desc.querySelectorAll('a[target="_blank"]').forEach(a => a.rel = 'noopener noreferrer');
  const images = document.getElementById('modalImages');
  detailGallery?.destroy();
  const sources = data.images || (data.img ? [data.img] : []);
  images.hidden = !sources.length;
  detailGallery = window.createMediaGallery(images, sources, title, t);
  prepareImages(images);
  const link = document.getElementById('modalLink');
  link.hidden = !data.link;
  if (data.link) {
    link.href = data.link;
    link.innerHTML = currentLang === 'en' ? (data.linkText_en || data.linkText || 'Open link ↗') : (data.linkText || 'Buka tautan ↗');
  } else { link.removeAttribute('href'); }
}
function openDetail(id, trigger) {
  if (!window.portfolioDetails?.[id]) return;
  activeDetail = id;
  previousFocus = trigger || document.activeElement;
  renderDetail(id);
  modal.showModal();
  document.body.style.overflow = 'hidden';
  modal.scrollTop = 0;
  document.dispatchEvent(new CustomEvent('portfolio:modalchange', { detail: { open: true } }));
}
document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-detail]');
  if (trigger) openDetail(trigger.dataset.detail, trigger);
});
document.getElementById('closeModal').addEventListener('click', () => modal.close());
modal.addEventListener('click', event => {
  if (event.target !== modal) return;
  const rect = modal.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close();
});
modal.addEventListener('close', () => {
  detailGallery?.destroy();
  detailGallery = null;
  activeDetail = null;
  document.body.style.overflow = '';
  previousFocus?.focus();
  document.dispatchEvent(new CustomEvent('portfolio:modalchange', { detail: { open: false } }));
});
modal.addEventListener('keydown', event => {
  if (event.target.closest('input, textarea, pre, code')) return;
  if (detailGallery?.multiple && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    detailGallery.move(event.key === 'ArrowRight' ? 1 : -1);
  }
});
function openLinkedProject() {
  const id = location.hash.slice(1);
  const trigger = document.querySelector(`[data-detail="${CSS.escape(id)}"]`);
  if (trigger && window.portfolioDetails?.[id]) openDetail(id, trigger);
}
window.addEventListener('hashchange', openLinkedProject);
translatePage();
prepareImages();
openLinkedProject();
