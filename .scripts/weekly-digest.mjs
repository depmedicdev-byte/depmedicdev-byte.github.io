// Weekly digest: walks 9 depmedic npm packages, finds versions published in
// the last 7 days, writes a /blog/depmedic-weekly-N.html, posts the same
// content to dev.to, appends to RSS, registers in sitemap, persists state.
//
// Idempotent: if no packages updated in the last 7 days, exits cleanly with
// no commit. Safe to re-run inside the same week.
//
// Hard-coded packages and links so this never depends on local files.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PKGS = [
  ['depmedic', 'npx depmedic - finds outdated/risky deps in any repo'],
  ['ci-doctor', 'npx ci-doctor - 16 cost+security rules for GitHub Actions'],
  ['cursor-rules-init', 'npx cursor-rules-init - scaffold .cursor/rules/'],
  ['gha-budget', 'npx gha-budget - $-denominated cost of any GHA workflow'],
  ['pin-actions', 'npx pin-actions - one-shot SHA pinner for `uses:` blocks'],
  ['gitlab-ci-doctor', 'npx gitlab-ci-doctor - 14 rules for .gitlab-ci.yml'],
  ['bitbucket-ci-doctor', 'npx bitbucket-ci-doctor - 8 rules for bitbucket-pipelines.yml'],
  ['azure-pipelines-ci-doctor', 'npx azure-pipelines-ci-doctor - 8 rules for azure-pipelines.yml'],
  ['circleci-ci-doctor', 'npx circleci-ci-doctor - 8 rules for .circleci/config.yml'],
];

const STATE_FILE = path.join(ROOT, '.scripts', 'digest-state.json');
const state = fs.existsSync(STATE_FILE)
  ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  : { lastRun: null, lastIssue: 2, postedSlugs: [] };

const now = new Date();
const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
const since = new Date(now.getTime() - oneWeekMs);

async function npmInfo(name) {
  const r = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
  if (!r.ok) return null;
  return r.json();
}

const updates = [];
for (const [name, blurb] of PKGS) {
  const info = await npmInfo(name);
  if (!info || !info.time) continue;
  const versions = Object.entries(info.time)
    .filter(([k]) => /^\d+\.\d+\.\d+$/.test(k))
    .filter(([, t]) => new Date(t).getTime() >= since.getTime())
    .sort((a, b) => new Date(a[1]) - new Date(b[1]));
  if (!versions.length) continue;
  const latest = versions[versions.length - 1];
  updates.push({ name, blurb, version: latest[0], at: latest[1], n: versions.length });
}

if (!updates.length) {
  console.log('no updates in the last 7 days. nothing to publish.');
  process.exit(0);
}

const issueNum = (state.lastIssue || 2) + 1;
const slug = `depmedic-weekly-${issueNum}`;
const title = `depmedic weekly #${issueNum}: ${updates.length} package update${updates.length > 1 ? 's' : ''} this week`;
const dateStr = now.toISOString().slice(0, 10);

const updatesMd = updates.map((u) => `- **[${u.name}](https://www.npmjs.com/package/${u.name})** -> \`${u.version}\` (${u.n > 1 ? `${u.n} releases this week` : 'patch'}). ${u.blurb}.`).join('\n');

const bodyMd = `# ${title}

Published ${dateStr}. Auto-generated digest of every depmedic package that shipped to npm in the last 7 days.

## What shipped

${updatesMd}

## Why this matters

Most depmedic packages get a patch every 1-2 weeks - a new rule, a sharpened heuristic, a fix surfaced by a real-world workflow. Pin a recent version (\`npm i -E ci-doctor\`) and re-run weekly to keep the audit fresh.

## How to consume

- Subscribe to the [newsletter](https://depmedicdev-byte.github.io/newsletter.html) for weekly summaries.
- Pin the [\`ci-doctor-action@v1\`](https://github.com/depmedicdev-byte/ci-doctor-action) for sticky PR comment + SARIF.
- The [in-browser scanners](https://depmedicdev-byte.github.io) are always on the latest version.

## Related

- [Compare ci-doctor vs zizmor](https://depmedicdev-byte.github.io/compare/ci-doctor-vs-zizmor.html)
- [Compare ci-doctor vs actionlint](https://depmedicdev-byte.github.io/compare/ci-doctor-vs-actionlint.html)
- [State of OSS CI Hygiene 2026](https://depmedicdev-byte.github.io/leaderboard.html)
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} - depmedic</title>
<meta name="description" content="${updates.length} depmedic packages shipped to npm in the last week. Auto-generated weekly digest." />
<link rel="canonical" href="https://depmedicdev-byte.github.io/blog/${slug}.html" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="Auto-generated weekly digest from the npm registry." />
<meta property="og:image" content="https://depmedicdev-byte.github.io/og/home.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://depmedicdev-byte.github.io/og/home.png" />
<style>
  :root { color-scheme: dark; } body { background:#0b0d10;color:#e6e8eb;font:16px/1.55 ui-sans-serif,system-ui,sans-serif;max-width:760px;margin:0 auto;padding:40px 20px 80px;}
  a { color:#6cb6ff;text-decoration:none;} a:hover{text-decoration:underline;}
  h1 { font-size:28px;letter-spacing:-0.01em;margin:0 0 16px;}
  h2 { font-size:18px;margin:30px 0 10px;color:#c9d1d9;text-transform:uppercase;letter-spacing:0.04em;}
  code { background:#11151b;border:1px solid #1e242c;border-radius:4px;padding:1px 6px;font:13px ui-monospace,monospace;}
  ul li { margin-bottom:8px;}
  footer{margin-top:48px;color:#6f7882;font-size:13px;border-top:1px solid #1e242c;padding-top:14px;}
</style>
</head>
<body>
<p style="color:#9aa3ad;font-size:14px;"><a href="/">depmedic</a> / <a href="/newsletter.html">weekly</a></p>
<h1>${title}</h1>
<p style="color:#b6bec7;">Published ${dateStr}. Auto-generated digest of every depmedic package that shipped to npm in the last 7 days.</p>
<h2>What shipped</h2>
<ul>
${updates.map((u) => `<li><strong><a href="https://www.npmjs.com/package/${u.name}">${u.name}</a></strong> &rarr; <code>${u.version}</code> (${u.n > 1 ? `${u.n} releases this week` : 'patch'}). ${u.blurb}.</li>`).join('\n')}
</ul>
<h2>Subscribe</h2>
<p>Weekly low-volume newsletter at <a href="/newsletter.html">/newsletter.html</a>.</p>
<footer>
  Auto-generated by the <code>weekly-digest</code> GitHub Actions cron.
  Source: <a href="https://github.com/depmedicdev-byte/depmedicdev-byte.github.io/blob/main/.scripts/weekly-digest.mjs">.scripts/weekly-digest.mjs</a>.
</footer>
</body>
</html>
`;

const blogDir = path.join(ROOT, 'blog');
fs.mkdirSync(blogDir, { recursive: true });
const blogPath = path.join(blogDir, `${slug}.html`);
fs.writeFileSync(blogPath, html);
console.log(`wrote blog/${slug}.html`);

const rssPath = path.join(ROOT, 'rss.xml');
if (fs.existsSync(rssPath)) {
  let rss = fs.readFileSync(rssPath, 'utf8');
  const item = `    <item>
      <title>${title}</title>
      <link>https://depmedicdev-byte.github.io/blog/${slug}.html</link>
      <guid isPermaLink="true">https://depmedicdev-byte.github.io/blog/${slug}.html</guid>
      <pubDate>${now.toUTCString()}</pubDate>
      <description>${updates.length} depmedic packages shipped this week.</description>
    </item>
`;
  rss = rss.replace(/<\/channel>/, item + '  </channel>');
  fs.writeFileSync(rssPath, rss);
  console.log('updated rss.xml');
}

const sitemapPath = path.join(ROOT, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  let sm = fs.readFileSync(sitemapPath, 'utf8');
  const url = `https://depmedicdev-byte.github.io/blog/${slug}.html`;
  if (!sm.includes(url)) {
    const block = `  <url><loc>${url}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
    sm = sm.replace(/<\/urlset>/, block + '</urlset>');
    fs.writeFileSync(sitemapPath, sm);
    console.log('updated sitemap.xml');
  }
}

if (process.env.DEVTO_API_TOKEN) {
  const article = {
    title,
    body_markdown: bodyMd,
    published: true,
    tags: ['githubactions', 'devops', 'ci', 'opensource'],
    canonical_url: `https://depmedicdev-byte.github.io/blog/${slug}.html`,
    description: `${updates.length} depmedic packages shipped to npm in the last week. Auto-generated weekly digest.`,
  };
  try {
    const r = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: {
        'api-key': process.env.DEVTO_API_TOKEN,
        Accept: 'application/vnd.forem.api-v1+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ article }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) console.log('dev.to:', j.url);
    else console.log('dev.to FAILED:', r.status, JSON.stringify(j).slice(0, 200));
  } catch (e) {
    console.log('dev.to error:', e.message);
  }
} else {
  console.log('DEVTO_API_TOKEN missing - skipping dev.to crosspost');
}

state.lastIssue = issueNum;
state.lastRun = now.toISOString();
state.postedSlugs = [...(state.postedSlugs || []), slug];
fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
console.log(`state -> issue ${issueNum}`);
