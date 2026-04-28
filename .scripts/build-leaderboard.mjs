// Daily build of /leaderboard.html. Runs in GitHub Actions on a cron.
// Loads ci-doctor + gha-budget from npm (installed in same job).
// Writes leaderboard.html, leaderboard.json, and appends one line to
// .scripts/leaderboard-history.jsonl for week-over-week deltas.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, '..');

function loadModule(npmName) {
  for (const dir of [process.cwd(), SITE, path.join(SITE, '.scripts')]) {
    const p = path.join(dir, 'node_modules', npmName);
    if (fs.existsSync(p)) return require(p);
  }
  return require(npmName);
}
const ciDoctor = loadModule('ci-doctor');
const ghaBudget = loadModule('gha-budget');

const REPOS = [
  'facebook/react', 'vercel/next.js', 'vitejs/vite', 'sveltejs/svelte',
  'vuejs/core', 'microsoft/TypeScript', 'denoland/deno', 'prettier/prettier',
  'eslint/eslint', 'axios/axios', 'expressjs/express', 'jestjs/jest',
  'sindresorhus/got', 'webpack/webpack', 'rollup/rollup', 'remix-run/react-router',
  'TanStack/query', 'preactjs/preact', 'storybookjs/storybook', 'parcel-bundler/parcel',
  'pnpm/pnpm', 'nuxt/nuxt', 'gatsbyjs/gatsby', 'remix-run/remix',
  'tailwindlabs/tailwindcss', 'lodash/lodash', 'date-fns/date-fns',
  'chakra-ui/chakra-ui', 'mui/material-ui', 'ReactiveX/rxjs',
  'nestjs/nest', 'fastify/fastify', 'sequelize/sequelize', 'prisma/prisma',
  'biomejs/biome', 'swc-project/swc', 'microsoft/playwright',
  'electron/electron', 'nodejs/node', 'npm/cli',
];

const ASSUMED_MIN = 8;
const ASSUMED_RUNS_PER_DAY = 30;
const DAYS_PER_MONTH = 30;
const OUT_HTML = path.join(SITE, 'leaderboard.html');
const OUT_JSON = path.join(SITE, 'leaderboard.json');
const HISTORY = path.join(SITE, '.scripts', 'leaderboard-history.jsonl');

const TOKEN = process.env.GITHUB_API_TOKEN || process.env.GITHUB_TOKEN || '';
const HEADERS = { 'User-Agent': 'depmedic-leaderboard', Accept: 'application/vnd.github+json' };
if (TOKEN) HEADERS.Authorization = 'token ' + TOKEN;

async function ghJson(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { headers: HEADERS });
    if (r.ok) return r.json();
    if (r.status === 403 || r.status === 429) {
      const reset = parseInt(r.headers.get('x-ratelimit-reset') || '0', 10);
      const wait = Math.max(2, reset ? (reset * 1000 - Date.now()) / 1000 : 30);
      console.warn(`[rate-limit] sleeping ${Math.round(wait)}s`);
      await new Promise(res => setTimeout(res, wait * 1000));
      continue;
    }
    if (r.status === 404) return null;
    throw new Error(`GitHub ${r.status} on ${url}`);
  }
  throw new Error(`gave up after retries: ${url}`);
}

async function fetchText(url) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`fetch ${r.status} on ${url}`);
  return r.text();
}

async function scanRepo(repo) {
  const listing = await ghJson(`https://api.github.com/repos/${repo}/contents/.github/workflows`);
  if (!listing || !Array.isArray(listing)) return null;
  const ymls = listing.filter(f => f.type === 'file' && /\.ya?ml$/i.test(f.name));
  let workflows = 0, findings = 0, e = 0, w = 0, i = 0, perRun = 0;
  const ruleHits = {};
  for (const f of ymls) {
    let yaml;
    try { yaml = await fetchText(f.download_url); } catch { continue; }
    workflows++;
    const fdg = ciDoctor.auditWorkflow(yaml, f.path);
    findings += fdg.length;
    for (const fd of fdg) {
      ruleHits[fd.ruleId] = (ruleHits[fd.ruleId] || 0) + 1;
      if (fd.severity === 'error') e++;
      else if (fd.severity === 'warn' || fd.severity === 'warning') w++;
      else i++;
    }
    try {
      const r = ghaBudget.analyzeWorkflow(f.path, yaml, { minutes: ASSUMED_MIN });
      if (!r.error && r.totalCostPerRunUsd) perRun += r.totalCostPerRunUsd;
    } catch (_) {}
  }
  if (workflows === 0) return null;
  const score = +(((e * 3) + (w * 1) + (i * 0.5)) / workflows).toFixed(2);
  return {
    repo, workflows, findings, e, w, i, ruleHits,
    perRun: +perRun.toFixed(2),
    monthly: Math.round(perRun * ASSUMED_RUNS_PER_DAY * DAYS_PER_MONTH),
    score,
  };
}

function loadHistory() {
  if (!fs.existsSync(HISTORY)) return [];
  return fs.readFileSync(HISTORY, 'utf8').split(/\r?\n/).filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

function appendHistory(entry) {
  fs.mkdirSync(path.dirname(HISTORY), { recursive: true });
  fs.appendFileSync(HISTORY, JSON.stringify(entry) + '\n');
}

function rankDelta(prev) {
  if (!prev) return null;
  const prevRanks = {};
  prev.rows.forEach((r, i) => { prevRanks[r.repo] = i + 1; });
  return (repo, currentRank) => {
    const old = prevRanks[repo];
    if (old == null) return { delta: null, label: 'new' };
    const d = old - currentRank;
    return { delta: d, label: d === 0 ? 'same' : (d > 0 ? `up ${d}` : `down ${-d}`) };
  };
}

function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function renderHtml(rows, generatedAt, prevSnapshot) {
  const deltaFn = rankDelta(prevSnapshot);
  const totalWf = rows.reduce((a, r) => a + r.workflows, 0);
  const totalFd = rows.reduce((a, r) => a + r.findings, 0);
  const totalMo = rows.reduce((a, r) => a + r.monthly, 0);
  const ruleAgg = {};
  for (const r of rows) for (const [k, v] of Object.entries(r.ruleHits)) ruleAgg[k] = (ruleAgg[k] || 0) + v;
  const topRules = Object.entries(ruleAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const renderRow = (r, i) => {
    const rank = i + 1;
    const d = deltaFn ? deltaFn(r.repo, rank) : null;
    const trend = d
      ? (d.label === 'new' ? '<span class="trend new">new</span>' :
         d.label === 'same' ? '<span class="trend same">-</span>' :
         d.delta > 0 ? `<span class="trend up">&uarr;${d.delta}</span>` :
                       `<span class="trend down">&darr;${-d.delta}</span>`)
      : '';
    return `<tr>
      <td class="right">${rank}</td>
      <td>${trend}</td>
      <td><a href="https://github.com/${esc(r.repo)}" rel="noopener">${esc(r.repo)}</a>
          &middot; <a href="/scan.html#r=${encodeURIComponent(r.repo)}&m=8&d=30" title="re-scan in browser">scan</a></td>
      <td class="right"><strong>${r.score.toFixed(2)}</strong></td>
      <td class="right">${r.workflows}</td>
      <td class="right">${r.findings}</td>
      <td class="right">${r.e}/${r.w}/${r.i}</td>
      <td class="right">$${r.perRun.toFixed(2)}</td>
      <td class="right">$${r.monthly.toLocaleString()}</td>
    </tr>`;
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>OSS GitHub Actions hygiene leaderboard (live, daily) - depmedic</title>
<meta name="description" content="Live ranking of ${rows.length} popular OSS repositories by GitHub Actions hygiene. Updated daily. Powered by ci-doctor (14 rules) and gha-budget. Lower score is better." />
<link rel="canonical" href="https://depmedicdev-byte.github.io/leaderboard.html" />
<meta name="theme-color" content="#0b0d10" />
<meta property="og:title" content="OSS GitHub Actions hygiene leaderboard - live, daily" />
<meta property="og:description" content="Live ranking of ${rows.length} popular OSS repositories by CI hygiene. Updated daily. Real numbers, with day-over-day deltas." />
<meta property="og:url" content="https://depmedicdev-byte.github.io/leaderboard.html" />
<meta property="og:type" content="website" />
<meta property="og:image" content="https://depmedicdev-byte.github.io/og/benchmarks.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://depmedicdev-byte.github.io/og/benchmarks.png" />
<style>
  :root { color-scheme: dark; } * { box-sizing: border-box; } html, body { margin: 0; padding: 0; }
  body { background: #0b0d10; color: #e6e8eb; font: 16px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
  a { color: #6cb6ff; text-decoration: none; } a:hover { text-decoration: underline; }
  main { max-width: 1040px; margin: 0 auto; padding: 40px 20px 80px; }
  .nav { color: #9aa3ad; font-size: 14px; margin: 0 0 16px; } .nav a { color: #9aa3ad; }
  h1 { font-size: 28px; margin: 0 0 6px; letter-spacing: -0.01em; }
  h2 { font-size: 16px; color: #c9d1d9; margin: 28px 0 10px; letter-spacing: 0.03em; text-transform: uppercase; }
  .lead { color: #b6bec7; max-width: 64ch; margin: 0 0 18px; }
  .meta { color: #6f7882; font-size: 13px; margin: 0 0 22px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 14px 0 22px; }
  .stat { background: #11151b; border: 1px solid #1e242c; border-radius: 8px; padding: 12px 16px; }
  .stat .label { color: #9aa3ad; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
  .stat .val { font-size: 22px; font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 24px; font-size: 14px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #1e242c; }
  th { color: #9aa3ad; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
  td.right, th.right { text-align: right; }
  .trend { font-family: ui-monospace, monospace; font-size: 12.5px; padding: 1px 5px; border-radius: 4px; }
  .trend.up { color: #9ce29c; background: #1d3b22; }
  .trend.down { color: #ffb8b8; background: #4a1e1e; }
  .trend.same { color: #6f7882; }
  .trend.new { color: #a3d4ff; background: #1e3a4a; }
  td code, p code { background: #11151b; border: 1px solid #1e242c; padding: 1px 6px; border-radius: 4px; font: 12.5px ui-monospace, monospace; color: #c9d1d9; }
  .toplist { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 14px 0 22px; }
  .toplist .card { background: #11151b; border: 1px solid #1e242c; border-radius: 8px; padding: 14px 16px; }
  .toplist .card.best { border-color: #2a4732; }
  .toplist .card.worst { border-color: #4a2a2a; }
  .toplist h3 { margin: 0 0 8px; font-size: 14px; color: #c9d1d9; text-transform: uppercase; letter-spacing: 0.04em; }
  .toplist ol { margin: 0; padding-left: 22px; color: #b6bec7; font-size: 14px; }
  .toplist li { padding: 2px 0; }
  .disclaimer { background: #11151b; border-left: 3px solid #2a3744; padding: 10px 16px; color: #9aa3ad; font-size: 13px; border-radius: 4px; margin: 16px 0; }
  footer { margin-top: 32px; color: #6f7882; font-size: 13px; border-top: 1px solid #1e242c; padding-top: 16px; }
  @media (max-width: 700px) { .toplist { grid-template-columns: 1fr; } table { font-size: 13px; } }
</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "OSS GitHub Actions hygiene leaderboard",
  "description": "Daily-updated ranking of popular OSS repositories by GitHub Actions workflow hygiene, audited with ci-doctor (14 rules).",
  "url": "https://depmedicdev-byte.github.io/leaderboard.html",
  "creator": { "@type": "Organization", "name": "depmedic" },
  "license": "https://opensource.org/licenses/MIT",
  "dateModified": "${generatedAt.slice(0,10)}"
}
</script>
</head>
<body>
<main>

<p class="nav"><a href="/">depmedic</a> / leaderboard</p>

<h1>OSS GitHub Actions hygiene leaderboard</h1>
<p class="lead">
  Live ranking of <strong>${rows.length}</strong> popular OSS repositories by their
  GitHub Actions workflow hygiene. Lower score = better. Powered by
  <a href="https://www.npmjs.com/package/ci-doctor"><code>ci-doctor</code></a>
  (14 rules) and <a href="https://www.npmjs.com/package/gha-budget"><code>gha-budget</code></a>
  (per-job pricing). Workflow YAML re-fetched from each repo every day.
</p>
<p class="meta">
  Last updated <strong>${generatedAt}</strong> &middot;
  <a href="/leaderboard.json">raw data (JSON)</a> &middot;
  <a href="/scan.html">scan your own repo</a> &middot;
  <a href="/benchmarks.html">original 20-repo report</a>
</p>

<div style="background:#11151b;border:1px solid #2a3744;border-radius:8px;padding:14px 18px;margin:8px 0 18px;">
  <div style="color:#9ce29c;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">New report</div>
  <div style="margin:6px 0 4px;"><strong>State of OSS CI Hygiene 2026 (Edition 1)</strong> &middot; the data on this page, packaged as a 12-page PDF + raw JSON snapshot for $14.</div>
  <a href="https://buy.polar.sh/polar_cl_hp9SCOpmklXMRrcQKJGVhoPvIB2JitmY9OAG80Ngqv4" style="color:#6cb6ff;">Get the report &rarr;</a>
</div>

<div id="sponsor-strip"></div>
<script src="/sponsors.js" defer></script>

<div class="stats">
  <div class="stat"><div class="label">Repos ranked</div><div class="val">${rows.length}</div></div>
  <div class="stat"><div class="label">Workflows scanned</div><div class="val">${totalWf}</div></div>
  <div class="stat"><div class="label">Total findings</div><div class="val">${totalFd.toLocaleString()}</div></div>
  <div class="stat"><div class="label">Modeled $/mo combined</div><div class="val">$${totalMo.toLocaleString()}</div></div>
</div>

<div class="toplist">
  <div class="card best">
    <h3>Cleanest 5 (lowest score)</h3>
    <ol>${rows.slice().sort((a,b)=>a.score-b.score).slice(0,5).map(r => `<li>${esc(r.repo)} <code>${r.score.toFixed(2)}</code></li>`).join('')}</ol>
  </div>
  <div class="card worst">
    <h3>Most findings per workflow (highest score)</h3>
    <ol>${rows.slice().sort((a,b)=>b.score-a.score).slice(0,5).map(r => `<li>${esc(r.repo)} <code>${r.score.toFixed(2)}</code></li>`).join('')}</ol>
  </div>
</div>

<h2>Top rules across all repos</h2>
<table>
  <thead><tr><th>Rule</th><th class="right">Hits</th></tr></thead>
  <tbody>${topRules.map(([k,v]) => `<tr><td><code>${esc(k)}</code></td><td class="right">${v}</td></tr>`).join('')}</tbody>
</table>

<h2>Full ranking (sorted by hygiene score)</h2>
<table>
  <thead><tr>
    <th class="right">#</th>
    <th>Trend</th>
    <th>Repo</th>
    <th class="right" title="(errors*3 + warns*1 + info*0.5) / workflows. Lower is better.">Score</th>
    <th class="right">WFs</th>
    <th class="right">Findings</th>
    <th class="right">E/W/I</th>
    <th class="right">$/run</th>
    <th class="right">$/mo*</th>
  </tr></thead>
  <tbody>${rows.map(renderRow).join('')}</tbody>
</table>

<div class="disclaimer">
  <strong>Methodology.</strong> Each repo's <code>.github/workflows/*.yml</code>
  is fetched fresh from the GitHub public API daily. <code>ci-doctor</code>
  emits findings against 14 rules. Score = (errors&times;3 + warns&times;1 +
  info&times;0.5) / workflow_count. Cost columns assume 8 min/job, 30
  runs/day, GitHub-hosted standard <code>ubuntu-latest</code> pricing.
  Trend column compares to the previous day's snapshot. Self-hosted and
  large-runner jobs are not priced.
</div>

<div class="disclaimer">
  This is not an attack on any of these projects. They all ship excellent
  software. The point of a public, ranked, daily-updated leaderboard is
  that the <em>same patterns</em> show up everywhere, and seeing real
  numbers is more useful than abstract advice. To request removal from
  the list, open an issue on
  <a href="https://github.com/depmedicdev-byte/depmedicdev-byte.github.io/issues">depmedicdev-byte/depmedicdev-byte.github.io</a>.
</div>

<footer>
  Built with <a href="https://www.npmjs.com/package/ci-doctor">ci-doctor</a>
  + <a href="https://www.npmjs.com/package/gha-budget">gha-budget</a>.
  Both MIT. See also: <a href="/scan.html">scan a single repo</a> -
  <a href="/rules.html">all 14 rules explained</a> -
  <a href="/badge.html">add a "scanned with ci-doctor" badge to your README</a>.
</footer>

</main>
</body>
</html>
`;
}

async function main() {
  console.log(`scanning ${REPOS.length} repos...`);
  const t0 = Date.now();
  const rows = [];
  for (let i = 0; i < REPOS.length; i++) {
    const repo = REPOS[i];
    process.stdout.write(`[${i + 1}/${REPOS.length}] ${repo} ... `);
    try {
      const r = await scanRepo(repo);
      if (r) {
        rows.push(r);
        process.stdout.write(`score=${r.score.toFixed(2)} (${r.workflows} wfs, ${r.findings} fdg)\n`);
      } else {
        process.stdout.write(`SKIP (no .github/workflows)\n`);
      }
    } catch (e) {
      process.stdout.write(`ERR ${e.message}\n`);
    }
  }
  rows.sort((a, b) => a.score - b.score);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nscanned ${rows.length}/${REPOS.length} in ${elapsed}s`);

  const history = loadHistory();
  const prevSnapshot = history.length ? history[history.length - 1] : null;
  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  fs.writeFileSync(OUT_HTML, renderHtml(rows, generatedAt, prevSnapshot));
  fs.writeFileSync(OUT_JSON, JSON.stringify({ generatedAt, rows }, null, 2));
  appendHistory({
    ts: generatedAt,
    rows: rows.map(r => ({ repo: r.repo, score: r.score, e: r.e, w: r.w, i: r.i, perRun: r.perRun })),
  });

  console.log(`wrote leaderboard.html (${fs.statSync(OUT_HTML).size} bytes), leaderboard.json`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
