# ci-doctor rules

> Plain-markdown companion to <https://depmedicdev-byte.github.io/rules.html>.
> Last updated 2026-04-28. ci-doctor is MIT-licensed: <https://github.com/depmedicdev-byte/ci-doctor>.

## What this is

ci-doctor scans `.github/workflows/*.yml` for 14 rules covering cost,
security, and reliability smells specific to GitHub Actions. Free.
Two dependencies (yaml, picocolors). Auto-fixes 4 of the rules in place.

## How to run

```bash
npx ci-doctor               # audit all workflows
npx ci-doctor --fix         # apply 4 safe auto-fixes
npx ci-doctor --sarif > sarif.json   # for GitHub Code Scanning
```

Or as a GitHub Action:

```yaml
- uses: depmedicdev-byte/ci-doctor@v1
  with:
    fail-on: error
```

## All 14 rules

| Rule ID | Severity | Auto-fix | Category |
| --- | --- | --- | --- |
| `deprecated-action` | error | no | maintenance |
| `pinned-action-sha` | warn | no | security |
| `missing-cache` | warn | no | cost |
| `missing-concurrency` | warn | yes | cost |
| `missing-timeout` | warn | yes | cost |
| `expensive-runner` | warn | no | cost |
| `missing-permissions` | warn | no | security |
| `matrix-overcommit` | warn | no | cost |
| `stale-cache-key` | warn | no | cost |
| `wide-trigger` | info | yes | cost |
| `artifact-no-retention` | info | yes | cost |
| `fetch-depth-zero` | info | no | cost |
| `fail-fast-true` | info | no | cost |
| `always-run-on-pr` | info | no | cost |

## Rule details

### `deprecated-action` (error)

Pinned to a deprecated major version. GitHub will start failing these.

### `pinned-action-sha` (warn)

Third-party actions should be pinned to a full commit SHA, not a tag or branch.

### `missing-cache` (warn)

setup-* actions without a cache option re-download dependencies on every run.

### `missing-concurrency` (warn)

Workflows triggered on push or pull_request should declare a concurrency group to cancel superseded runs.

### `missing-timeout` (warn)

Jobs without timeout-minutes default to 360 (6 hours). A runaway job burns minutes you pay for.

### `expensive-runner` (warn)

macos-* runners cost 10x and windows-* costs 2x ubuntu. Use them only when platform-specific commands are present.

### `missing-permissions` (warn)

Without a top-level permissions block the GITHUB_TOKEN gets the repository default which is usually too permissive.

### `matrix-overcommit` (warn)

A matrix that crosses many OS or version axes can multiply CI minutes silently.

### `stale-cache-key` (warn)

actions/cache step has a key that does not include a lockfile hash, so the cache never invalidates when deps change.

### `wide-trigger` (info)

on: push without branches filter runs the workflow on every branch push.

### `artifact-no-retention` (info)

upload-artifact without retention-days uses the repo default (often 90 days) and bills storage for the full window.

### `fetch-depth-zero` (info)

actions/checkout with fetch-depth: 0 pulls full history. Slow and rarely needed.

### `fail-fast-true` (info)

matrix job uses default fail-fast: true, which kills sibling jobs on first failure - wasting their already-billed minutes and hiding parallel failures.

### `always-run-on-pr` (info)

a heavy step (docker build, e2e, codeql) runs on every PR with no paths filter, no label gate, and no condition. It runs whether or not the PR touched anything that matters to it.

## Why this list

These 14 rules cover the smells that show up in 90%+ of real-world
workflows scanned across 20 popular OSS repos (944 findings, see
/benchmarks.md). Every rule has a measurable impact on either dollars,
security posture, or build reliability. No style nits. No "use this
action over that one" opinions. No noise.

## Related

- All 14 rules with bad/good YAML examples: <https://depmedicdev-byte.github.io/rules.html>
- 20 popular OSS repos scanned: <https://depmedicdev-byte.github.io/benchmarks.html>
- Per-repo deep dives: <https://depmedicdev-byte.github.io/examples/>
- ci-doctor vs other linters: <https://depmedicdev-byte.github.io/compare/>
- Get the README badge: <https://depmedicdev-byte.github.io/badge.html>
