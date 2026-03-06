# Contributing

Practical guide for contributors. For engineering rules that govern this
repository, see [docs/repository-rules.md](repository-rules.md). For release
procedures, see [docs/release-policy.md](release-policy.md).

---

## Branch Naming

```
feature/<description>   — new functionality
fix/<description>       — bug fixes
docs/<description>      — documentation-only changes
chore/<description>     — maintenance, dependency updates, config changes
release/<version>       — release preparation (version bump only)
```

Use lowercase and hyphens. No spaces, no uppercase.

**All branches start from `develop`:**

```bash
git checkout develop && git pull origin develop
git checkout -b feature/my-feature
```

After the PR merges, delete the branch from local and remote.
Update `docs/branches.md` when creating or closing a branch.

---

## Commit Message Convention

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

### Allowed types

| Type | When to use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Maintenance, dependency updates, config changes |
| `build` | Build scripts, packaging |
| `ci` | GitHub Actions workflows |
| `test` | Smoke tests, test fixtures |
| `refactor` | Code restructuring without behavior change |
| `perf` | Performance improvement |

### Scopes

`toolchain` · `sysroot` · `compiler` · `linker` · `runtime` · `loader` ·
`worker` · `demo` · `ci` · `docs` · `package`

### Rules

- Lowercase, imperative mood: "add", "fix", "update" — not "added" or "fixes"
- No period at the end
- Description under 72 characters
- One logical change per commit
- Never skip hooks (`--no-verify`)

### Examples

```
feat(runtime): add runWasiProgram with RunResult return type
fix(sysroot): check lib/wasm32-wasi before packaging
build(compiler): pin emscripten version via versions.env
ci(release): upload tarball to GitHub Releases
test(smoke): add string_map compile fixture
docs: add release-policy.md
chore: bump TOOLCHAIN_VERSION to 0.2.0
```

---

## Before Opening a PR

Run these checks locally before pushing:

**Script syntax**
```bash
bash -n toolchain/scripts/*.sh
```

**TypeScript**
```bash
pnpm typecheck
```

**Smoke tests**
```bash
node tests/smoke/runtime-smoke.mjs
```

**Sysroot validation** (if sysroot or packaging changed)
```bash
./toolchain/scripts/validate-sysroot.sh
```

**Package verification** (if packaging changed)
```bash
./toolchain/scripts/package-toolchain.sh
```

If a script was modified, confirm that the relevant section in `docs/build.md`
or `docs/architecture.md` still accurately describes what it does.

---

## Pull Request Expectations

**Explain the change clearly.**
The PR description must state what changed and why. A one-line title is not
enough. Use the PR body to give reviewers enough context to evaluate the change
without reading every diff line.

**Keep PRs focused.**
One PR, one purpose. Do not combine a bug fix with a refactor or a docs update
with a new feature. Small, focused PRs are easier to review and safer to revert.

**Update documentation if the artifact layout or scripts changed.**
If your change adds, removes, or renames a file in the release artifact layout,
updates a script interface, or changes a build command — update the relevant
doc in `docs/` in the same PR. Do not leave documentation stale.

**Pass required checks before requesting review.**
CI must be green. Do not open a PR knowing that checks will fail and expecting
the reviewer to wait.

### PR title format

Same as commit format: `type(scope): description`

### Minimum PR body

```markdown
## Summary

One to three sentences: what changed and why.

## Changes

- change 1
- change 2

## Tests

- [ ] smoke tests pass
- [ ] typecheck passes
```

---

## Protected Branch Expectations

`main` and `develop` are protected branches. Contributors should not rely on
direct pushes to either.

**Pull requests are the expected path for all changes.**

Additional expectations for release-facing branches:

- PRs targeting `develop` from a `release/*` branch must include packaging
  verification: `validate-sysroot.sh` and `package-toolchain.sh` must both
  pass before the PR can be merged.
- Any change that modifies the release artifact layout (`manifest.json`
  structure, file paths, archive contents) requires a version bump in
  `versions.env` and an update to `docs/architecture.md`.
- Changes to CI workflows (`.github/workflows/`) require extra care: verify
  that `release.yml` still produces the expected artifact name and that
  `ci.yml` still covers the required checks.

---

## Required Checks Before Merge

- [ ] CI (`ci.yml`) passes on the branch
- [ ] `pnpm typecheck` exits 0
- [ ] All smoke tests pass (`node tests/smoke/runtime-smoke.mjs`)
- [ ] Bash script syntax is valid (`bash -n toolchain/scripts/*.sh`)
- [ ] Documentation updated if a public API, script interface, or build
  contract changed
- [ ] All commits follow the convention above
