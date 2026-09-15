'use strict';
// Situs statis: menyiapkan mailto, tanpa mengklaim telah mengirim pesan.
(() => {
  const form = document.getElementById('contactForm');
  const feedback = document.getElementById('contactFeedback');
  const draft = document.getElementById('preparedEmail');
  const t = window.portfolioText;
  form.querySelector('button[type="submit"]').disabled = false;
  const inputs = [...form.querySelectorAll('input, textarea')];
  inputs.forEach(input => input.addEventListener('input', () => {
    input.setCustomValidity('');
    feedback.textContent = '';
    draft.hidden = true;
    draft.removeAttribute('href');
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    inputs.forEach(input => {
      input.value = input.value.trim();
      const invalid = !input.value || (input.name === 'message' && input.value.length < 10);
      input.setCustomValidity(invalid ? t('Isi bagian ini dengan benar. Pesan minimal 10 karakter.', 'Complete this field. Message must contain at least 10 characters.') : '');
    });
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const body = `Nama: ${data.get('name')}\nEmail: ${data.get('email')}\n\n${data.get('message')}`;
    const href = `mailto:ardiawahyu7@gmail.com?subject=${encodeURIComponent(data.get('subject'))}&body=${encodeURIComponent(body)}`;
    draft.href = href;
    draft.hidden = false;
    feedback.textContent = t('Draf siap. Klik tautan berikut untuk membuka aplikasi email, periksa isi pesan, lalu kirim dari sana.', 'Draft ready. Open your email app below, review the message, then send it there.');
    draft.focus();
  });
  document.addEventListener('portfolio:languagechange', () => {
    inputs.forEach(input => input.setCustomValidity(''));
    feedback.textContent = '';
    draft.hidden = true;
  });
})();
