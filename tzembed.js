/* tzembed.js — tampilkan fitur panel Tim di halaman lain (mode embed team.html).
 *   tzSummary({aplikasi, bucket, bulan, tahun, label})
 *       → jendela Summary Bucket (semua fitur), data dimuat saat dibuka. ✕ / Esc menutup.
 *   tzCompare(hostEl, {aplikasi, bucket, bulan, tahun})
 *       → bagian "⚖️ Compare" (Compare TL & Compare Agent) panel Tim di dalam hostEl,
 *         dibatasi ke aplikasi+bucket itu; dimuat saat terlihat di layar, tinggi ikut isi.
 */
(function () {
  function src(mode, o) {
    return 'team.html?embed=' + mode + '&aplikasi=' + encodeURIComponent(o.aplikasi || '') + '&bucket=' + encodeURIComponent(o.bucket || '') +
      '&bulan=' + encodeURIComponent(o.bulan || '') + '&tahun=' + encodeURIComponent(o.tahun || '');
  }
  const css = document.createElement('style');
  css.textContent = `#tzBsmModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:950;align-items:center;justify-content:center;padding:24px 12px}
#tzBsmModal.open{display:flex}
#tzBsmModal .bx{background:var(--surface,#fff);border-radius:12px;width:100%;max-width:1400px;height:calc(100vh - 48px);display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden}
#tzBsmModal.full{padding:0}#tzBsmModal.full .bx{max-width:none;height:100vh;border-radius:0}
#tzBsmModal .hd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border,#e5e7eb)}
#tzBsmModal .tt{font-size:15px;font-weight:700;color:var(--text,#111)}#tzBsmModal .st{font-size:11.5px;color:var(--text3,#888)}
#tzBsmModal .bt{border:1px solid var(--border,#e5e7eb);background:var(--surface,#fff);color:var(--text2,#444);border-radius:8px;padding:6px 12px;font-size:12.5px;font-weight:600;cursor:pointer}
#tzBsmModal iframe{flex:1;width:100%;border:0}`;
  document.head.appendChild(css);

  window.tzSummary = function (o) {
    let m = document.getElementById('tzBsmModal');
    if (!m) {
      m = document.createElement('div'); m.id = 'tzBsmModal';
      m.innerHTML = '<div class="bx"><div class="hd"><div><div class="tt" id="tzBsmTtl"></div><div class="st">Summary Bucket dari panel Tim · data internal (All Data) · semua fitur Summary tersedia di sini</div></div>' +
        '<div style="display:flex;gap:6px"><button class="bt" id="tzBsmFs" title="Layar penuh">⛶ Layar penuh</button><button class="bt" id="tzBsmX">✕</button></div></div><iframe id="tzBsmFrame" title="Summary Bucket"></iframe></div>';
      document.body.appendChild(m);
      const close = () => { m.classList.remove('open'); document.body.style.overflow = ''; };
      m.querySelector('#tzBsmX').onclick = close;
      m.querySelector('#tzBsmFs').onclick = () => { const on = m.classList.toggle('full'); m.querySelector('#tzBsmFs').textContent = on ? '⊠ Keluar layar penuh' : '⛶ Layar penuh'; };
      window.addEventListener('message', e => { const f = document.getElementById('tzBsmFrame'); if (f && e.source === f.contentWindow && e.data && e.data.tzBsm === 'close') close(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && m.classList.contains('open')) close(); });
    }
    document.getElementById('tzBsmTtl').textContent = '📊 Summary Bucket ' + (o.label || o.bucket) + ' · ' + o.aplikasi + ' · ' + o.bulan + ' ' + o.tahun;
    const f = document.getElementById('tzBsmFrame'), s = src('bsm', o);
    if (f.dataset.src !== s) { f.dataset.src = s; f.src = s; }
    m.classList.add('open'); document.body.style.overflow = 'hidden';
  };

  window.tzCompare = function (host, o) {
    if (!host) return;
    const s = src('cmp', o);
    host.innerHTML = '<div class="tzcmp-wait" style="padding:16px;text-align:center;color:var(--text3,#888);font-size:13px">Compare dimuat saat bagian ini terlihat…</div>';
    const f = document.createElement('iframe');
    f.className = 'tzcmp-frame'; f.title = 'Compare TL & Agent'; f.dataset.src = s;
    f.style.cssText = 'width:100%;height:520px;border:0;display:block;background:transparent';
    host.appendChild(f);
    if (!window.__tzCmpMsg) {
      window.__tzCmpMsg = true;
      window.addEventListener('message', e => {
        if (!e.data || e.data.tzEmbed !== 'cmp' || !(e.data.h > 0)) return;
        document.querySelectorAll('iframe.tzcmp-frame').forEach(fr => {
          if (e.source === fr.contentWindow) {
            fr.style.height = Math.max(160, Math.min(6000, e.data.h)) + 'px';
            const w = fr.parentNode && fr.parentNode.querySelector('.tzcmp-wait'); if (w) w.remove();
          }
        });
      });
    }
    const go = () => { if (!f.getAttribute('src')) { f.src = s; const w = host.querySelector('.tzcmp-wait'); if (w) w.textContent = 'Memuat data internal (±20–30 detik pertama kali)…'; } };
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '200px' }); io.observe(host); } else go();
    f.reload = () => { f.removeAttribute('src'); f.src = s; };
    return f;
  };
})();
