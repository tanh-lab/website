import tailwindPlugin from "bun-plugin-tailwind"
import { cp, mkdir } from "node:fs/promises"

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

await mkdir(OUT_DIR, { recursive: true })
await cp("./public", OUT_DIR, { recursive: true })

console.log(`Built ${result.outputs.length + workerResult.outputs.length} files to ${OUT_DIR}`)
