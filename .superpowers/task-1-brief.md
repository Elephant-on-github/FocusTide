# Task 1: Verify Static Build Works

## Files:
- Read: `nuxt.config.ts` (already configured for SSR + prerender)
- Run: `yarn generate`

## Interfaces:
- Consumes: existing Nuxt config
- Produces: `dist/` directory with static HTML/JS/CSS

## Steps:

- [ ] **Step 1: Install dependencies**

```bash
cd C:\Users\eleph\.ai\temp\FocusTide
yarn install
```

- [ ] **Step 2: Generate static site**

```bash
yarn generate
```

Expected: `dist/` directory created with `index.html` and assets

- [ ] **Step 3: Verify output size**

```bash
# Check total size of dist/
# PowerShell:
(Get-ChildItem -Recurse dist | Measure-Object -Property Length -Sum).Sum / 1MB
```

Expected: <5MB for the static bundle (HTML + JS + CSS + assets)

- [ ] **Step 4: Commit**

```bash
git add dist/
git commit -m "chore: verify static build output"
```

**Note:** The `dist/` directory should be added to `.gitignore` after verification. This task is about verifying the build works, not committing the output. If dist/ is already in .gitignore, just verify the build succeeds and report the size.
