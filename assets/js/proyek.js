'use strict';
/*
 * TUGAS JAVASCRIPT — PROJECT EXPLORER PORTOFOLIO
 * Konsep: DOM, event input/click/change, array, kondisi, Set, JSON, localStorage.
 * Fitur: pencarian real-time + filter kategori + favorit + hitung hasil + reset.
 * Semua filter digabung dengan logika AND, sehingga hasil selalu konsisten.
 */
(() => {
  const cards = [...document.querySelectorAll('[data-project]')];
  if (!cards.length) return;
  const search = document.getElementById('projectSearch');
  const favoriteOnly = document.getElementById('favoritesOnly');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const count = document.getElementById('projectCount');
  const feedback = document.getElementById('favoriteFeedback');
  const storage = window.portfolioStorage;
  const t = window.portfolioText;
  const key = 'wahyu-favorite-projects';
  let category = 'all';
  let favorites = new Set();

  // Data storage mungkin rusak/diubah; validasi dan kembali ke array kosong.
  try {
    const saved = JSON.parse(storage.get(key, '[]'));
    if (Array.isArray(saved)) favorites = new Set(saved.filter(id => cards.some(card => card.dataset.project === id)));
  } catch { favorites = new Set(); }

  // Indeks mencakup kedua bahasa, jadi pencarian tidak berubah saat bahasa diganti.
  const index = new Map(cards.map(card => [card.dataset.project,
    (card.querySelector('h2, h3').textContent + ' ' + card.querySelector('p').textContent + ' ' +
    [...card.querySelectorAll('.tag')].map(tag => tag.textContent).join(' ') + ' ' +
    [...card.querySelectorAll('[data-en]')].map(el => el.dataset.en.replace(/<[^>]*>/g, ' ')).join(' ')).toLowerCase()
  ]));

  function update() {
    const query = search.value.trim().toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    let visible = 0;
    cards.forEach(card => {
      const id = card.dataset.project;
      const matchesText = terms.every(term => index.get(id).includes(term));
      const matchesCategory = category === 'all' || card.dataset.category === category;
      const matchesFavorite = !favoriteOnly.checked || favorites.has(id);
      card.hidden = !(matchesText && matchesCategory && matchesFavorite);
      if (!card.hidden) visible++;
      const button = card.querySelector('[data-favorite]');
      button.setAttribute('aria-pressed', String(favorites.has(id)));
      button.setAttribute('aria-label', (favorites.has(id) ? t('Hapus favorit: ', 'Remove favorite: ') : t('Simpan proyek: ', 'Save project: ')) + card.querySelector('h2, h3').textContent);
    });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    count.textContent = t(`${visible} dari ${cards.length} proyek ditampilkan`, `${visible} of ${cards.length} projects shown`);
    document.getElementById('emptyProjects').hidden = visible !== 0;
    search.placeholder = t('Cari judul, teknologi, atau deskripsi...', 'Search titles, technologies, or descriptions...');
    document.querySelector('[role="group"]').setAttribute('aria-label', t('Filter kategori', 'Category filters'));
  }
  search.addEventListener('input', update);
  favoriteOnly.addEventListener('change', update);
  filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.filter; update(); }));
  document.getElementById('resetFilters').addEventListener('click', () => {
    search.value = ''; category = 'all'; favoriteOnly.checked = false;
    feedback.textContent = ''; update(); search.focus();
  });
  document.getElementById('projectGrid').addEventListener('click', event => {
    const button = event.target.closest('[data-favorite]');
    if (!button) return;
    const id = button.dataset.favorite;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    const stored = storage.set(key, JSON.stringify([...favorites]));
    feedback.textContent = stored
      ? t('Daftar favorit diperbarui dan tersimpan di browser ini.', 'Favorites updated and saved in this browser.')
      : t('Favorit diperbarui untuk sesi ini. Penyimpanan browser tidak tersedia.', 'Favorites updated for this session. Browser storage is unavailable.');
    update();
    // Jika kartu menghilang dari filter favorit, pindahkan fokus ke kontrol yang terlihat.
    if (button.closest('[data-project]').hidden) favoriteOnly.focus();
  });
  document.addEventListener('portfolio:languagechange', () => { feedback.textContent = ''; update(); });
  document.getElementById('projectControls').hidden = false;
  update();
})();
