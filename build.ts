import tailwindPlugin from "bun-plugin-tailwind"
import { cp, mkdir } from "node:fs/promises"

const OUT_DIR = "./dist"

const result = await Bun.build({
  entrypoints: ["./index.html"],
  outdir: OUT_DIR,
  minify: true,
  plugins: [tailwindPlugin],
  // Absolute paths so the SPA fallback (404.html) at /open-source/anira
  // can still resolve /chunk-…js from the site root, not the current URL.
  publicPath: "/",
})

if (!result.success) {
  console.error("Build failed")
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

// Copy static assets (fonts, etc.) from public/ to dist/.
await mkdir(OUT_DIR, { recursive: true })
await cp("./public", OUT_DIR, { recursive: true })

console.log(`Built ${result.outputs.length} files to ${OUT_DIR}`)
