# OSS GitHub Actions: cost + smells benchmark (n=20)

> Plain-markdown companion to <https://depmedicdev-byte.github.io/benchmarks.html>.
> Generated 2026-04-28. Methodology and raw data are public; reproduce with <https://github.com/depmedicdev-byte/ci-doctor> and <https://github.com/depmedicdev-byte/gha-budget>.

## TL;DR

- **229 workflows** across **20 popular OSS repos**.
- **944 ci-doctor findings** total: 39 error / 783 warn / 122 info.
- **$56.64 per-run** combined CI spend (sum of all repos).
- **~$50,976 per month** modeled at 30 runs/day, 8 min/job, GitHub-hosted standard runner pricing.

## Methodology

1. Pulled `.github/workflows/*.yml` for 20 popular npm-ecosystem OSS repos via the GitHub public API.
2. Ran every workflow through ci-doctor (14 rules) and gha-budget (per-job pricing).
3. Modeled monthly cost as: `per_run_cost * 30 * 30` (assumes 8 min/job).
4. Self-hosted and large/macOS runners may be priced low or unpriced; numbers are conservative.

## Per-repo summary (sorted by modeled monthly $)

| Repo | Workflows | Per-run $ | Modeled $/mo | Findings (err/warn/info) |
| --- | ---: | ---: | ---: | --- |
| [denoland/deno](https://github.com/denoland/deno) | 11 | $18.3 | $16,474 | 99 (0/81/18) |
| [facebook/react](https://github.com/facebook/react) | 24 | $16.19 | $14,573 | 91 (0/73/18) |
| [vercel/next.js](https://github.com/vercel/next.js) | 37 | $4.1 | $3,686 | 166 (17/137/12) |
| [axios/axios](https://github.com/axios/axios) | 8 | $2.62 | $2,362 | 40 (12/27/1) |
| [storybookjs/storybook](https://github.com/storybookjs/storybook) | 15 | $2.05 | $1,843 | 67 (0/49/18) |
| [microsoft/TypeScript](https://github.com/microsoft/TypeScript) | 18 | $1.92 | $1,728 | 79 (0/67/12) |
| [eslint/eslint](https://github.com/eslint/eslint) | 8 | $1.54 | $1,382 | 46 (0/40/6) |
| [remix-run/react-router](https://github.com/remix-run/react-router) | 19 | $1.22 | $1,094 | 52 (0/49/3) |
| [webpack/webpack](https://github.com/webpack/webpack) | 9 | $1.15 | $1,037 | 25 (0/21/4) |
| [vitejs/vite](https://github.com/vitejs/vite) | 12 | $1.09 | $979 | 26 (0/25/1) |
| [prettier/prettier](https://github.com/prettier/prettier) | 17 | $1.02 | $922 | 32 (6/23/3) |
| [jestjs/jest](https://github.com/jestjs/jest) | 9 | $0.9 | $806 | 20 (0/20/0) |
| [parcel-bundler/parcel](https://github.com/parcel-bundler/parcel) | 6 | $0.9 | $806 | 52 (0/47/5) |
| [vuejs/core](https://github.com/vuejs/core) | 9 | $0.83 | $749 | 39 (0/38/1) |
| [sveltejs/svelte](https://github.com/sveltejs/svelte) | 5 | $0.7 | $634 | 14 (0/10/4) |
| [rollup/rollup](https://github.com/rollup/rollup) | 4 | $0.64 | $576 | 25 (2/16/7) |
| [preactjs/preact](https://github.com/preactjs/preact) | 8 | $0.64 | $576 | 30 (0/25/5) |
| [tannerlinsley/react-query](https://github.com/tannerlinsley/react-query) | 5 | $0.45 | $403 | 20 (0/18/2) |
| [expressjs/express](https://github.com/expressjs/express) | 4 | $0.38 | $346 | 18 (2/14/2) |
| [sindresorhus/got](https://github.com/sindresorhus/got) | 1 | $0 | $0 | 3 (0/3/0) |

## What this is NOT

- It is **not** the actual bill these projects pay. Real spend depends on PR volume, scheduled-run frequency, runner choice, and OSS rate-limit credits from GitHub.
- It is **not** an accusation. Most of these projects have very competent CI engineers. The point of the benchmark is to show that even great teams leave 20-50% of CI spend on the table because the same 5 rules (missing concurrency, missing timeout, no cache, no permissions, unpinned actions) are easy to miss at the workflow level.

## Per-repo deep dives

- [denoland/deno](https://depmedicdev-byte.github.io/examples/denoland-deno.html) - 11 workflows, 99 findings
- [facebook/react](https://depmedicdev-byte.github.io/examples/facebook-react.html) - 24 workflows, 91 findings
- [vercel/next.js](https://depmedicdev-byte.github.io/examples/vercel-next.js.html) - 37 workflows, 166 findings
- [axios/axios](https://depmedicdev-byte.github.io/examples/axios-axios.html) - 8 workflows, 40 findings
- [storybookjs/storybook](https://depmedicdev-byte.github.io/examples/storybookjs-storybook.html) - 15 workflows, 67 findings
- [microsoft/TypeScript](https://depmedicdev-byte.github.io/examples/microsoft-typescript.html) - 18 workflows, 79 findings
- [eslint/eslint](https://depmedicdev-byte.github.io/examples/eslint-eslint.html) - 8 workflows, 46 findings
- [remix-run/react-router](https://depmedicdev-byte.github.io/examples/remix-run-react-router.html) - 19 workflows, 52 findings
- [webpack/webpack](https://depmedicdev-byte.github.io/examples/webpack-webpack.html) - 9 workflows, 25 findings
- [vitejs/vite](https://depmedicdev-byte.github.io/examples/vitejs-vite.html) - 12 workflows, 26 findings
- [prettier/prettier](https://depmedicdev-byte.github.io/examples/prettier-prettier.html) - 17 workflows, 32 findings
- [jestjs/jest](https://depmedicdev-byte.github.io/examples/jestjs-jest.html) - 9 workflows, 20 findings
- [parcel-bundler/parcel](https://depmedicdev-byte.github.io/examples/parcel-bundler-parcel.html) - 6 workflows, 52 findings
- [vuejs/core](https://depmedicdev-byte.github.io/examples/vuejs-core.html) - 9 workflows, 39 findings
- [sveltejs/svelte](https://depmedicdev-byte.github.io/examples/sveltejs-svelte.html) - 5 workflows, 14 findings
- [rollup/rollup](https://depmedicdev-byte.github.io/examples/rollup-rollup.html) - 4 workflows, 25 findings
- [preactjs/preact](https://depmedicdev-byte.github.io/examples/preactjs-preact.html) - 8 workflows, 30 findings
- [tannerlinsley/react-query](https://depmedicdev-byte.github.io/examples/tannerlinsley-react-query.html) - 5 workflows, 20 findings
- [expressjs/express](https://depmedicdev-byte.github.io/examples/expressjs-express.html) - 4 workflows, 18 findings
- [sindresorhus/got](https://depmedicdev-byte.github.io/examples/sindresorhus-got.html) - 1 workflows, 3 findings

## Reproduce locally

```bash
gh repo clone <repo>
cd <repo>
npx ci-doctor && npx gha-budget --runs-per-day 30 --minutes 8
```

## Related

- All 14 ci-doctor rules: <https://depmedicdev-byte.github.io/rules.md>
- Free in-browser scanner for any public repo: <https://depmedicdev-byte.github.io/scan.html>
- Hardened workflow templates that pass all 14 rules: <https://buy.polar.sh/polar_cl_0B3rGUBRJTdwvZRv7UYRoFcaznHfDrsywfXMH2ichbn>
