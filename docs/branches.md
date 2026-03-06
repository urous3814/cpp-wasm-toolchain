# Branch Map

This document is the **single source of truth** for all branches in this repository.
Update this file whenever a branch is created, merged, or deleted.

---

## Permanent Branches

| Branch | Remote | Purpose | Direct commits allowed |
|---|---|---|---|
| `main` | `origin/main` | Production-ready releases only. Updated by `release.yml` CI when a `v*` tag is pushed. | No |
| `develop` | `origin/develop` | Integration branch. All feature and fix branches merge here via PR. CI runs on every push. | Hotfix only |

---

## Active Branches

_Update this table when creating or closing branches._

| Branch | Base | Purpose | Status |
|---|---|---|---|
| _(none yet)_ | — | — | — |

---

## Branch Naming

```
feature/<short-description>   ← new functionality
fix/<short-description>       ← bug fixes
release/<version>             ← release preparation (version bump)
```

- Lowercase and hyphens only. No spaces, no uppercase.
- Keep descriptions short (2–4 words).

### Examples

```
feature/build-sysroot
feature/browser-llvm-build
feature/wasi-shim-implementation
feature/loader-cache-indexeddb
fix/validate-sysroot-libc-check
fix/smoke-test-timeout
release/v0.2.0
```

---

## Workflow

### Start a new feature or fix

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<description>
git push -u origin feature/<description>
```

Then add the branch to the **Active Branches** table above.

### Finish a branch

1. Open a PR targeting `develop`
2. Ensure CI (`ci.yml`) is green and smoke tests pass
3. Merge via PR (squash or merge commit — no force push)
4. Delete the remote branch after merge
5. Remove the branch from the **Active Branches** table above

### Release flow

```bash
git checkout develop
git pull origin develop
git checkout -b release/v<X.Y.Z>
# bump TOOLCHAIN_VERSION in toolchain/config/versions.env
git commit -m "chore(release): bump version to X.Y.Z"
# open PR → develop → review → merge to develop
# then merge develop → main
git checkout main
git merge develop
git tag v<X.Y.Z>
git push origin main --tags
# release.yml CI triggers automatically
```

---

## Rules

- **Always branch from `develop`**, never from `main`
- **Never commit directly to `main`** — only CI merges via tagged release
- **Never force-push** to `main` or `develop`
- **Delete merged branches** from both local and remote
- **Keep this file updated** — stale entries cause confusion

---

## Branch Status History

| Branch | Created | Merged | Notes |
|---|---|---|---|
| `develop` | 2026-03-06 | — | Permanent integration branch |
