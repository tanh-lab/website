# tanh-lab-web

Marketing site for [tanh lab](https://tanh-lab.com) — an audio software studio in Berlin.

One scroll-snapped document: six section pages over a fixed WebGL backdrop, with
the wordmark travelling from the hero into the header as the first page turns.

## Stack

| Layer | Choice |
|---|---|
| Toolchain | [Bun](https://bun.sh) — install, dev server, bundler, all-in-one |
| UI | React 19 + TypeScript |
| State | [Zustand](https://zustand.docs.pmnd.rs), as on the product side |
| Styling | Hand-written CSS with a token layer. No Tailwind, no PostCSS |
| Fonts | Instrument Serif (display) + Barlow Semi Condensed (interface), self-hosted |
| Visual | A lens-flare shader on one fullscreen triangle, in plain WebGL |

No Next.js, no Vite. Routing would buy nothing: the six "pages" are sections of
a single document, not routes.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.3 — `curl -fsSL https://bun.sh/install | bash`

## Install and run

```bash
bun install
bun run dev
```

Open <http://localhost:4321>.

| Script | What it does |
|---|---|
| `bun run dev` | Dev server with HMR |
| `bun run build` | Minified static build into `dist/` |
| `bun run brand` | Re-render the brand assets in `public/brand/` (needs Chrome and `rsvg-convert`) |
| `bun run start` | Serve the bundled site |
| `bun run type-check` | `tsc --noEmit` on TypeScript 7 |
| `bun run type-check:ts6` | The same, on TypeScript 6 |
| `bun run format` | Prettier |

### Two TypeScripts

`type-check` runs **TypeScript 7** — the native Go compiler, about 7x faster
here. `typescript` itself stays on **6** because typescript-eslint needs the JS
compiler API, which 7.0 does not ship; 7.1 is expected to. When it lands, drop
the `typescript7` alias and move `typescript` to `^7`.

Note the `tanh-tools` edit hook type-checks with TS 6 while CI uses TS 7. They
agree today, but that is a divergence to keep an eye on.

## Structure

```
index.html            Bun entry
build.ts              bundle → pre-render → copy public/
dev-server.ts         dev server; serves public/ alongside the HMR bundle
plugins/              keeps /fonts/* out of the module graph, for both of the above
tools/                render-brand: the /ci/ downloads, drawn from favicon.svg and the real shader

src/
  main.tsx            hydrates the pre-render (or plain render in dev)
  App.tsx             composes the screen; owns the scroller element
  ssr.tsx             the tree as build.ts pre-renders it

  pages/              one file per section
  data/               publications, projects, people, services — content, not markup

  store/              zustand; usable with or without React
    useThemeStore       light/dark, persisted, mirrored onto <html data-theme>
    useMotionStore      the intro gate, and whether a page transition is running
    useSectionStore     which page is on screen
    useShaderStore      flare settings
    useWordmarkStore    the measured viewBox of each wordmark line

  hooks/              React wrappers over the singletons in lib/
  lib/                one listener each, framework-free
    raf                 ONE frame loop
    resize              ONE resize listener, frame-coalesced, DPR-aware
    keys                ONE keydown bus, with the typing guard in one place
    emitter, cn, motion-preference

  shader/             gl (plumbing) · shaders (GLSL) · flare · uniforms · palettes · pointer-drift
  ui/                 chrome components, plus the three imperative controllers:
                      paging, brand (the travel), wordmark-fit
  dev/                flare panel (C) and grid overlay (G) — dropped from production
  styles/             tokens · base · layout · rows · pages/* · responsive
```

### Why stores rather than events

The old build wired these modules together with `document` events, which made
correctness depend on the order the file happened to run in: the shader
registered its `themechange` listener after the theme module had already
dispatched, and papered over the miss by re-reading the DOM. A store replays its
current value to every new subscriber, so mounting order stops mattering.

The imperative controllers read stores directly (`useShaderStore.getState()`)
rather than subscribing, because they want the latest value every frame anyway
and a React subscription would re-render the tree on every slider drag.

### React and imperative DOM

The travel, the paging controller and the shader write to the DOM every frame.
Anything React also renders must not be poked imperatively — it survives only
until the next render, when React reconciles the attribute back. That is why the
fitted `viewBox` lives in `useWordmarkStore` and is rendered, not assigned.

## Adding things

- **A section** — add `src/pages/your-page.tsx`, a `src/styles/pages/your-page.css`
  imported from `styles/index.css`, the page in `App.tsx`, and the nav entry in
  `src/ui/nav.tsx`.
- **A publication or project** — append to `src/data/publications.ts` or
  `src/data/projects.ts`. Nothing else changes.

## Keyboard

`C` flare panel · `G` grid overlay · `0` centre the flare · arrows / space /
page keys / Home / End page through (dev overlays are development-only).

## Deploying

`bun run build` emits a static `dist/`. The GitHub Actions workflow builds on
push to `main` and publishes to GitHub Pages.

Two things about that deployment are easy to break:

- Pages is configured as `build_type: "workflow"`, so it serves the Actions
  artifact rather than a branch. Without `.github/workflows/deploy.yml` in the
  tree, the last deployment stays live and nothing you push appears.
- The custom domain is bound by the workflow's `echo "tanh-lab.com" > dist/CNAME`
  step, not by a committed CNAME. Remove it and the domain unbinds on the next
  deploy.
