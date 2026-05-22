/*
 * Custom dev server. `bun --hot ./index.html` doesn't serve files from
 * `public/`, so we register each public file as an explicit route before the
 * SPA fallback. HTML bundling + HMR is still handled by the HTMLBundle import.
 */
import { readdirSync, statSync } from "node:fs"
import { join, extname } from "node:path"
import index from "./index.html"

const PORT = Number(process.env.PORT ?? 3000)
const PUBLIC_DIR = join(import.meta.dir, "public")

const MIME: Record<string, string> = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ico": "image/x-icon",
  ".json": "application/json",
}

function collectPublicRoutes(dir: string, prefix = ""): Record<string, () => Response> {
  const out: Record<string, () => Response> = {}
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const route = `${prefix}/${name}`
    if (statSync(full).isDirectory()) {
      Object.assign(out, collectPublicRoutes(full, route))
    } else {
      const type = MIME[extname(name)] ?? "application/octet-stream"
      // Re-read file on each request so edits during dev are picked up.
      out[route] = () => new Response(Bun.file(full), { headers: { "Content-Type": type } })
    }
  }
  return out
}

const publicRoutes = collectPublicRoutes(PUBLIC_DIR)

Bun.serve({
  port: PORT,
  development: { hmr: true, console: true },
  routes: {
    ...publicRoutes,
    "/*": index,
  },
})

console.log(`Dev server: http://localhost:${PORT}/`)
console.log(`Public routes: ${Object.keys(publicRoutes).length}`)
