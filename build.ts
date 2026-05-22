import tailwindPlugin from "bun-plugin-tailwind"
import { cp, mkdir, writeFile, readFile } from "node:fs/promises"
import { join } from "node:path"
import { renderToString } from "react-dom/server"
import { createElement } from "react"
import { SSRApp } from "./src/ssr"
import { projects } from "./src/data/projects"

const OUT_DIR = "./dist"

// 1. Build the gradient shader worker first, to a stable fixed filename. The
// React wrapper references this exact path in production. Bun's dev server
// resolves `new URL("./gradient/worker.ts", import.meta.url)` on its own, so
// this entrypoint is only needed for the production bundle.
const workerResult = await Bun.build({
  entrypoints: ["./src/components/gradient/worker.ts"],
  outdir: OUT_DIR,
  naming: "gradient-worker.js",
  minify: true,
  target: "browser",
  format: "esm",
})

if (!workerResult.success) {
  console.error("Worker build failed")
  for (const log of workerResult.logs) console.error(log)
  process.exit(1)
}

// 2. Build the main page bundle.
const result = await Bun.build({
  entrypoints: ["./index.html"],
  outdir: OUT_DIR,
  minify: true,
  plugins: [tailwindPlugin],
  publicPath: "/",
})

if (!result.success) {
  console.error("Build failed")
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

// 3. Pre-render each route. Reads the bundled index.html, injects the
// React-rendered markup into <div id="root">, writes one HTML file per route.
const ROUTES: string[] = [
  "/",
  "/services",
  "/research",
  "/open-source",
  ...projects.map((p) => `/open-source/${p.slug}`),
  "/about",
  "/legal",
]

const bundledHtml = await readFile(join(OUT_DIR, "index.html"), "utf8")

function injectMarkup(markup: string): string {
  return bundledHtml.replace(
    /<div id="root"><\/div>/,
    `<div id="root">${markup}</div>`,
  )
}

for (const path of ROUTES) {
  const markup = renderToString(createElement(SSRApp, { path }))
  const html = injectMarkup(markup)
  const outPath = path === "/" ? join(OUT_DIR, "index.html") : join(OUT_DIR, path, "index.html")
  await mkdir(join(outPath, ".."), { recursive: true })
  await writeFile(outPath, html, "utf8")
}

// 404 page: render the unmatched-route fallback in the App. GitHub Pages
// serves this for any URL without its own index.html.
const notFoundMarkup = renderToString(createElement(SSRApp, { path: "/__not_found__" }))
await writeFile(join(OUT_DIR, "404.html"), injectMarkup(notFoundMarkup), "utf8")

// 4. Copy static assets from public/.
await mkdir(OUT_DIR, { recursive: true })
await cp("./public", OUT_DIR, { recursive: true })

console.log(`Built ${result.outputs.length + workerResult.outputs.length} bundle files + ${ROUTES.length} pre-rendered routes to ${OUT_DIR}`)
