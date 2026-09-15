// Dijalankan di <head> agar tema tersimpan diterapkan sebelum halaman terlihat.
try {
  const savedTheme = localStorage.getItem('wahyu-theme');
  document.documentElement.classList.toggle('dark', savedTheme === 'dark');
} catch { /* Situs tetap berjalan bila penyimpanan browser tidak tersedia. */ }
