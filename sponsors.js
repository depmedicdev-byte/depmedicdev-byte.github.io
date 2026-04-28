// Renders the sponsor strip into #sponsor-strip on any page that includes it.
// Data source: /sponsors.json. Open slots show "your logo here" CTAs that
// link to the Polar sponsor checkout.
(function () {
  const target = document.getElementById('sponsor-strip');
  if (!target) return;

  const css = `
    .ss-wrap{margin:18px 0 22px;padding:14px 16px;background:#11151b;border:1px solid #1e242c;border-radius:10px}
    .ss-head{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 10px;font-size:13px;color:#9aa3ad;text-transform:uppercase;letter-spacing:.04em}
    .ss-head a{color:#9aa3ad}
    .ss-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
    .ss-card{background:#0b0d10;border:1px solid #1e242c;border-radius:8px;padding:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:84px;text-align:center;font-size:13px}
    .ss-card.open{border-style:dashed;color:#6f7882}
    .ss-card a{color:#6cb6ff;text-decoration:none}
    .ss-card a:hover{text-decoration:underline}
    .ss-card img{max-width:100%;max-height:48px;display:block;margin:0 auto 4px}
    .ss-card .ss-name{font-weight:500;color:#c9d1d9}
    .ss-card .ss-tag{color:#6f7882;font-size:11.5px;margin-top:2px}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  fetch('/sponsors.json', { cache: 'no-cache' })
    .then(r => r.json())
    .then(data => render(data))
    .catch(() => render({ totalSlots: 5, active: [], checkoutUrl: 'https://buy.polar.sh/polar_cl_K5xmwqIEW2pqENansk87UAU2LXkaPhWoD1JqR3kHPhe' }));

  function render(d) {
    const total = d.totalSlots || 5;
    const active = (d.active || []).slice(0, total);
    const open = Math.max(0, total - active.length);
    const checkout = d.checkoutUrl || 'https://buy.polar.sh/polar_cl_K5xmwqIEW2pqENansk87UAU2LXkaPhWoD1JqR3kHPhe';
    const cards = [];
    for (const s of active) {
      cards.push(`<div class="ss-card">${s.logo ? `<img src="${esc(s.logo)}" alt="${esc(s.name||'')}" />` : ''}<a href="${esc(s.url)}" rel="noopener sponsored"><span class="ss-name">${esc(s.name||'')}</span></a>${s.tag ? `<div class="ss-tag">${esc(s.tag)}</div>` : ''}</div>`);
    }
    for (let i = 0; i < open; i++) {
      cards.push(`<div class="ss-card open">your logo here<br/><a href="${esc(checkout)}" rel="nofollow">$25/mo &rarr;</a></div>`);
    }
    target.innerHTML = `
      <div class="ss-wrap">
        <div class="ss-head"><span>Sponsors</span><a href="/sponsor.html">media kit &middot; book a slot</a></div>
        <div class="ss-row">${cards.join('')}</div>
      </div>`;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
})();
