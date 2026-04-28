// In-repo (cron-friendly) version of tools/build-ci-doctor-badges.mjs.
// Reads ./leaderboard.json, writes ./badge/<owner>/<repo>.svg + ./badge/index.html.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'leaderboard.json');
const OUT = path.join(ROOT, 'badge');
fs.mkdirSync(OUT, { recursive: true });

if (!fs.existsSync(SRC)) { console.log('no leaderboard.json yet'); process.exit(0); }
const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const rows = data.rows || [];

function color(r) {
  if (r.e > 0) return '#e05d44';
  if (r.w >= 5) return '#dfb317';
  if (r.w >= 1) return '#a4a61d';
  return '#4c1';
}
function label(r) {
  if (r.e > 0) return `${r.e} error${r.e > 1 ? 's' : ''}, ${r.w} warn${r.w !== 1 ? 's' : ''}`;
  if (r.w > 0) return `${r.w} warn${r.w !== 1 ? 's' : ''}`;
  if (r.i > 0) return `${r.i} info`;
  return 'clean';
}
function tw(s) { return Math.round(s.length * 6.4) + 12; }

function svg(name, value, vColor) {
  const lw = tw(name); const rw = tw(value); const total = lw + rw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${name}: ${value}">
<title>${name}: ${value}</title>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)">
<rect width="${lw}" height="20" fill="#555"/>
<rect x="${lw}" width="${rw}" height="20" fill="${vColor}"/>
<rect width="${total}" height="20" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
<text aria-hidden="true" x="${lw * 5}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(lw - 12) * 10}">${name}</text>
<text x="${lw * 5}" y="140" transform="scale(.1)" fill="#fff" textLength="${(lw - 12) * 10}">${name}</text>
<text aria-hidden="true" x="${(lw * 10 + rw * 5)}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(rw - 12) * 10}">${value}</text>
<text x="${(lw * 10 + rw * 5)}" y="140" transform="scale(.1)" fill="#fff" textLength="${(rw - 12) * 10}">${value}</text>
</g>
</svg>`;
}

let written = 0;
for (const row of rows) {
  if (!row.repo || !row.repo.includes('/')) continue;
  const [owner, name] = row.repo.split('/');
  const dir = path.join(OUT, owner);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.svg`), svg('ci-doctor', label(row), color(row)));
  written++;
}
fs.writeFileSync(path.join(OUT, '_unknown.svg'), svg('ci-doctor', 'unknown', '#9f9f9f'));

const indexHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ci-doctor badges - ${rows.length} repos</title>
<link rel="canonical" href="https://depmedicdev-byte.github.io/badge/"/>
<meta name="description" content="Embeddable shields.io-style ci-doctor score badges for ${rows.length} OSS repos. Updated daily."/>
<style>:root{color-scheme:dark;}body{background:#0b0d10;color:#e6e8eb;font:14px/1.55 ui-sans-serif,system-ui,sans-serif;max-width:920px;margin:0 auto;padding:32px 20px 80px;}a{color:#6cb6ff;text-decoration:none;}a:hover{text-decoration:underline;}h1{font-size:24px;margin:0 0 8px;}table{width:100%;border-collapse:collapse;margin-top:18px;}th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #1e242c;vertical-align:middle;}th{color:#9aa3ad;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;}img.b{height:20px;vertical-align:middle;}code{background:#11151b;border:1px solid #1e242c;padding:1px 6px;border-radius:4px;font:12px ui-monospace,monospace;color:#c9d1d9;}pre{background:#11151b;border:1px solid #1e242c;padding:12px;border-radius:6px;font:12px ui-monospace,monospace;overflow-x:auto;color:#c9d1d9;}</style>
</head><body>
<p style="color:#9aa3ad;font-size:14px;"><a href="/">depmedic</a> / <a href="/scan-badge.html">scan-badge</a> / index</p>
<h1>${rows.length} ci-doctor badges</h1>
<p style="color:#b6bec7;">Refreshes once per day from the <a href="/leaderboard.html">leaderboard</a>. Embed any badge with: <code>![ci-doctor](https://depmedicdev-byte.github.io/badge/&lt;owner&gt;/&lt;repo&gt;.svg)</code></p>
<table>
<thead><tr><th>Repo</th><th>Badge</th><th>Findings</th><th>Embed path</th></tr></thead>
<tbody>
${rows.map((r) => `<tr><td><a href="https://github.com/${r.repo}">${r.repo}</a></td><td><img class="b" src="/badge/${r.repo}.svg" alt="${r.repo}"/></td><td>${label(r)}</td><td><code>/badge/${r.repo}.svg</code></td></tr>`).join('\n')}
</tbody></table>
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), indexHtml);
console.log(`wrote ${written} badges + index.html`);
