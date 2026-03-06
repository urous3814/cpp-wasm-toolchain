# Contributing

## Commit Convention

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Maintenance, dependency updates |
| `build` | Build scripts, packaging |
| `ci` | GitHub Actions workflows |
| `test` | Smoke tests, test harnesses |
| `refactor` | Restructuring without behavior change |
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
docs: add repository-rules.md
chore: bump TOOLCHAIN_VERSION to 0.2.0
```

---

## Branch Naming

```
feature/<description>   — new functionality
fix/<description>       — bug fixes
release/<version>       — release preparation
docs/<description>      — documentation-only changes
```

Use lowercase and hyphens. No spaces, no uppercase.

### Branch Strategy

```
main        ← production; updated only via release tags in CI
develop     ← integration branch; all feature branches merge here
feature/*   ← branch from develop, PR back to develop
fix/*       ← branch from develop, PR back to develop
release/*   ← branch from develop for version bump, merge to develop then main
```

**Always branch from `develop`.** Never commit directly to `main`.

### Typical workflow

```bash
git checkout develop && git pull origin develop
git checkout -b feature/my-feature

# work, commit incrementally

git push -u origin feature/my-feature
# open PR targeting develop
```

---

## Pull Request Requirements

Before a PR can be merged:

- [ ] CI (`ci.yml`) passes on the branch
- [ ] `pnpm typecheck` passes (no TypeScript errors)
- [ ] All smoke tests pass (`node tests/smoke/runtime-smoke.mjs`)
- [ ] Bash script syntax is valid (`bash -n toolchain/scripts/*.sh`)
- [ ] Documentation updated if a public API or build contract changed
- [ ] All commits follow the convention above

### PR title format

Same as commit format: `type(scope): description`

### PR body minimum

```markdown
## Summary

One to three sentences describing what changed and why.

## Changes

- change 1
- change 2

## Tests

- [ ] smoke tests pass
- [ ] typecheck passes
```
