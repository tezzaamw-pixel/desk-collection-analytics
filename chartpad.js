/* chartpad.js — pelengkap Chart.js untuk semua grafik di halaman yang memuatnya.
 *
 * 1) Ruang kosong otomatis di ujung sumbu Y (supaya titik/angka teratas tidak terpotong).
 *    Berlaku untuk SEMUA grafik (termasuk grafik baru) tanpa perlu diatur satu-satu.
 *    Atur per grafik lewat opsi sumbu:  scales: { y: { tzPad: 0.2 } }   (20% dari rentang data)
 *                                       scales: { y: { tzPad: false } } (matikan)
 *    Default seluruh halaman:           Chart.defaults.plugins.tzHeadroom.pad = 0.15
 *    Sumbu dengan max (atau min untuk sumbu terbalik) yang ditulis manual tidak diubah.
 *
 * 2) tzLegend(chart, el, opt) — legend berupa ceklis: centang seri yang mau dibandingkan.
 *    opt.key     : nama penyimpanan pilihan (localStorage) — pilihan diingat per browser
 *    opt.only    : [{label:'Hanya EDN', ids:['EDN']}] tombol cepat tambahan
 *    Tiap dataset boleh punya `tzId` (kunci tetap); kalau tidak ada dipakai `label`.
 */
(function () {
  function register() {
    if (!window.Chart || window.Chart.__tzPad) return !!window.Chart;
    window.Chart.__tzPad = true;
    window.Chart.register({
      id: 'tzHeadroom',
      defaults: { pad: 0.12 },
      afterDataLimits(chart, args, opts) {
        const s = args && args.scale;
        if (!s || s.axis !== 'y' || s.type !== 'linear') return;
        const o = s.options || {};
        if (o.tzPad === false || (opts && opts.pad === false)) return;
        const pad = typeof o.tzPad === 'number' ? o.tzPad : (opts && typeof opts.pad === 'number' ? opts.pad : 0.12);
        if (!(pad > 0)) return;
        const min = s.min, max = s.max;
        if (!isFinite(min) || !isFinite(max)) return;
        const range = (max - min) || Math.abs(max) || 1;
        if (o.reverse) { if (o.min === undefined || o.min === null) s.min = min - range * pad; }
        else if (o.max === undefined || o.max === null) s.max = max + range * pad;
      }
    });
    return true;
  }
  if (!register()) document.addEventListener('DOMContentLoaded', register);

  const css = document.createElement('style');
  css.textContent = `.tzlg{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;justify-content:center;margin-top:8px;font-size:12px}
.tzlg label{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border:1px solid var(--border,#e5e7eb);border-radius:999px;cursor:pointer;user-select:none;background:var(--surface,#fff);color:var(--text,#111)}
.tzlg label.off{opacity:.45}
.tzlg input{margin:0;cursor:pointer;accent-color:var(--accent,#1d60c8)}
.tzlg i{display:inline-block;width:12px;height:12px;border-radius:3px}
.tzlg .q{border:0;background:none;color:var(--accent,#1d60c8);font-size:11.5px;font-weight:700;cursor:pointer;padding:2px 4px}
.tzlg .sep{width:1px;height:16px;background:var(--border,#e5e7eb)}`;
  document.head.appendChild(css);

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  window.tzLegend = function (chart, el, opt) {
    opt = opt || {};
    if (!chart || !el) return;
    const key = opt.key ? 'tz_lg_' + opt.key : null;
    const ds = chart.data.datasets;
    const idOf = d => String(d.tzId != null ? d.tzId : d.label);
    let hidden = [];
    try { if (key) hidden = JSON.parse(localStorage.getItem(key) || '[]') || []; } catch (e) { hidden = []; }
    const save = () => { try { if (key) localStorage.setItem(key, JSON.stringify(hidden)); } catch (e) {} };
    const apply = () => {
      ds.forEach((d, i) => chart.setDatasetVisibility(i, hidden.indexOf(idOf(d)) < 0));
      if (!ds.some((d, i) => chart.isDatasetVisible(i))) { hidden = []; ds.forEach((d, i) => chart.setDatasetVisibility(i, true)); }
    };
    if (chart.options.plugins && chart.options.plugins.legend) chart.options.plugins.legend.display = false;
    apply(); chart.update('none');
    function draw() {
      const quick = [`<button type="button" class="q" data-q="all">Semua</button>`]
        .concat((opt.only || []).map((q, i) => `<button type="button" class="q" data-q="o${i}">${esc(q.label)}</button>`));
      el.className = (el.className.replace(/\btzlg\b/g, '') + ' tzlg').trim();
      el.innerHTML = quick.join('') + '<span class="sep"></span>' + ds.map((d, i) => {
        const on = chart.isDatasetVisible(i), c = d.tzColor || d.borderColor || d.backgroundColor || '#888';
        return `<label class="${on ? '' : 'off'}" title="Centang untuk tampilkan / bandingkan"><input type="checkbox" data-i="${i}" ${on ? 'checked' : ''}><i style="background:${esc(c)}"></i>${esc(d.label)}</label>`;
      }).join('');
    }
    el.onclick = function (e) {
      const b = e.target.closest && e.target.closest('button.q');
      if (!b) return;
      const q = b.getAttribute('data-q');
      if (q === 'all') hidden = [];
      else { const o = (opt.only || [])[+q.slice(1)]; if (o) { const keep = o.ids.map(String); hidden = ds.map(idOf).filter(id => keep.indexOf(id) < 0); } }
      save(); apply(); chart.update(); draw();
    };
    el.onchange = function (e) {
      const t = e.target; if (!t || t.type !== 'checkbox') return;
      const id = idOf(ds[+t.getAttribute('data-i')]);
      hidden = hidden.filter(x => x !== id);
      if (!t.checked) hidden.push(id);
      save(); apply(); chart.update(); draw();
    };
    draw();
  };
})();
