# tanh-lab-web

Marketing site for [tanh lab](https://tanh-lab.com) — an audio software studio based in Berlin.

## Stack

| Layer | Choice |
|---|---|
| Toolchain | [Bun](https://bun.sh) — install, dev server, bundler, all-in-one |
| UI | React 19 + TypeScript |
| Routing | [wouter](https://github.com/molefrog/wouter) (~2 KB SPA router) |
| Styling | Tailwind CSS v4 with token-based `@theme inline` mapping |
| Fonts | Inter (body) + Instrument Serif (display), bundled locally via `@fontsource` |
| Visual | `@paper-design/shaders-react` for the gradient background |

No Next.js, no Vite, no PostCSS — the full toolchain is Bun.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.3 (`curl -fsSL https://bun.sh/install | bash`)

## Install & run

```bash
bun install
bun run dev
```

Open <http://localhost:3000>.

Hot-module reload, bundling, font and CSS processing all run from `bun --hot ./index.html`.

## Scripts

| Script | What it does |
|---|---|
| `bun run dev` | Start the dev server with HMR |
| `bun run build` | Produce a minified production bundle in `dist/` |
| `bun run start` | Serve the bundled site (production mode) |
| `bun run type-check` | Run `tsc --noEmit` to validate TypeScript |

## Project structure

```
index.html              ← entry — Bun bundles `src/main.tsx` from here
src/
  main.tsx              ← React root, font imports, globals.css
  App.tsx               ← router + page layout
  components/
    navbar.tsx          ← fixed glass-pill header
    gradient-background.tsx
    page-shell.tsx      ← centered hero for sub-pages
    section.tsx         ← content section wrapper
    glass-card.tsx      ← reusable card with glass-panel utility
    brand-icons.tsx     ← inline GitHub/LinkedIn/ORCID SVGs (lucide dropped brand marks)
  pages/
    home.tsx
    services.tsx
    research.tsx
    open-source.tsx
    project.tsx         ← dynamic `/open-source/:slug` detail page
    about.tsx
    legal.tsx
  data/
    projects.ts         ← single source for open-source projects
  lib/
    utils.ts            ← `cn()` helper (clsx + tailwind-merge)
  styles/
    tokens.css          ← primitive design tokens (CSS variables)
    globals.css         ← Tailwind base + @theme inline + .glass utilities
```

## Design tokens

Token system is intentionally minimal and lives in two files:

- **`src/styles/tokens.css`** — primitive CSS variables (colors, spacing, radii, font sizes, font families). Mirrors `cosmos/utils/theme/tokens.ts` from our product side, dark-only.
- **`src/styles/globals.css`** — `@theme inline` block maps the primitives onto Tailwind utility names (`bg-app`, `text-primary`, `p-md`, `rounded-lg`, `font-display`, …). Also defines `.glass` and `.glass-panel` utilities for the frosted surfaces.

To add a new design token:

1. Add the primitive in `tokens.css` (e.g. `--color-bg-card: #...`)
2. Map it to a utility in `globals.css` under `@theme inline` (e.g. `--color-card: var(--color-bg-card)`)
3. Use it: `<div className="bg-card">…</div>`

**Naming caveat:** Tailwind v4 falls back to `--spacing-*` for `max-w-*`/`w-*`/`h-*` utilities when no `--container-*` exists. Avoid spacing token names that collide with Tailwind's container scale (`xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, …) — our spacing scale uses `xs/sm/md/lg/xl/xxl/xxxl/jumbo/massive` for that reason.

## Adding a page

1. Create `src/pages/your-page.tsx`. Wrap content in `<PageShell title="…" eyebrow="…" lead="…">`.
2. Add a route in `src/App.tsx`:
   ```tsx
   <Route path="/your-page" component={YourPage} />
   ```
3. Add a nav link in `src/components/navbar.tsx` (`navLinks` array).

## Adding an open-source project

Edit `src/data/projects.ts` and append a `Project` entry. A new card appears on `/open-source` and a detail page at `/open-source/<slug>` is generated automatically.

## Deploying

The output of `bun run build` is a static `dist/` folder — drop it on any static host (Cloudflare Pages, Netlify, S3, GitHub Pages, …). No SSR is required; routing is client-side via wouter, so configure the host to fall back to `index.html` for unknown paths.
