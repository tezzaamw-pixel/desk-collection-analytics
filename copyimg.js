/* Tombol "📋 Gambar" otomatis di setiap kartu (.card-head / .vcard-h).
 * Klik → kartu difoto (html2canvas) lalu disalin ke clipboard sebagai gambar,
 * siap di-paste di WhatsApp Web / chat. Kalau browser tidak mengizinkan,
 * gambar diunduh sebagai PNG. */
(function () {
  const SRC = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  let P = null;
  function lib() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (!P) P = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = SRC;
      s.onload = () => res(window.html2canvas);
      s.onerror = () => { P = null; rej(new Error('library gambar gagal dimuat')); };
      document.head.appendChild(s);
    });
    return P;
  }
  const css = document.createElement('style');
  css.textContent = `.cpimg{border:1px solid var(--border);background:var(--surface);color:var(--text2);border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer;white-space:nowrap;line-height:1.4}
.cpimg:hover{color:var(--accent);border-color:var(--accent)}
.cpimg-wrap{display:inline-flex;gap:6px;align-items:center;margin-left:auto}
.cpshot .tbl-wrap{overflow:visible!important;max-height:none!important}
.cpshot .tbl-wrap table{width:auto}
@media print{.cpimg{display:none!important}}`;
  document.head.appendChild(css);

  async function shoot(target, btn) {
    const old = btn.textContent; btn.textContent = '⏳'; btn.disabled = true;
    try {
      const h2c = await lib();
      const bg = getComputedStyle(target).backgroundColor;
      target.classList.add('cpshot');
      const w = Math.max(target.scrollWidth, target.offsetWidth);
      const canvas = await h2c(target, {
        scale: 2, backgroundColor: bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : getComputedStyle(document.body).backgroundColor,
        useCORS: true, logging: false, windowWidth: Math.max(document.documentElement.clientWidth, w + 80),
        ignoreElements: el => !!(el.classList && (el.classList.contains('noprint') || el.classList.contains('cpimg') || el.classList.contains('fsbtn')))
      });
      target.classList.remove('cpshot');
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      let copied = false;
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          copied = true;
        }
      } catch (e) { copied = false; }
      if (!copied) {
        const a = document.createElement('a');
        const title = (target.querySelector('.card-title,.g') || {}).textContent || 'kartu';
        a.download = title.replace(/[^\w\- ]+/g, '').trim().slice(0, 40).replace(/\s+/g, '_') + '.png';
        a.href = URL.createObjectURL(blob); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      btn.textContent = copied ? '✅ Tersalin — paste di WA' : '⬇ Diunduh (PNG)';
    } catch (e) {
      target.classList.remove('cpshot');
      btn.textContent = '❌ Gagal'; console.error(e);
    }
    setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 2200);
  }

  function add(head, target) {
    if (!head || !target || head.querySelector(':scope > .cpimg-wrap, :scope .cpimg')) return;
    if (target.closest('.modal') || target.closest('.lock-overlay')) return;
    const b = document.createElement('button');
    b.className = 'cpimg'; b.type = 'button'; b.textContent = '📋 Gambar';
    b.title = 'Salin kartu ini sebagai gambar (paste di WhatsApp/chat)';
    b.addEventListener('click', ev => { ev.stopPropagation(); shoot(target, b); });
    const rt = head.querySelector(':scope > .rt');
    if (rt) { rt.insertBefore(b, rt.firstChild); return; }
    const kids = head.children, last = kids[kids.length - 1];
    if (kids.length > 1 && last.tagName === 'DIV') {
      // wadah tombol yang sudah ada (mis. Harian/Bulanan, layar penuh) → taruh di depannya
      if (getComputedStyle(last).display.indexOf('flex') < 0) { last.style.display = 'flex'; last.style.gap = '8px'; last.style.alignItems = 'center'; last.style.flexWrap = 'wrap'; }
      last.insertBefore(b, last.firstChild); return;
    }
    const w = document.createElement('span'); w.className = 'cpimg-wrap'; w.appendChild(b);
    if (kids.length > 1 && last.tagName !== 'DIV') { head.insertBefore(w, last); w.appendChild(last); w.insertBefore(b, last); }
    else head.appendChild(w);
  }
  function scan() {
    document.querySelectorAll('.card > .card-head').forEach(h => add(h, h.parentElement));
    document.querySelectorAll('.vcard > .vcard-h').forEach(h => add(h, h.parentElement));
  }
  const mo = new MutationObserver(() => { clearTimeout(mo.t); mo.t = setTimeout(scan, 60); });
  document.addEventListener('DOMContentLoaded', () => { scan(); mo.observe(document.body, { childList: true, subtree: true }); });
  if (document.readyState !== 'loading') { scan(); mo.observe(document.body, { childList: true, subtree: true }); }
  window.tzCopyCard = shoot;
})();
