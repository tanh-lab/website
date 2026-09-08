/*
 * Development server.
 *
 * `bun --hot ./index.html` bundles and hot-reloads, but it does not serve
 * `public/`, so each public file is registered as an explicit route ahead of
 * the fallback. Files are re-read per request, so editing one during a session
 * is picked up without a restart — which also replaces the no-cache headers the
 * old Python server existed to add.
 */
import { readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

import index from "./index.html";

const PORT = Number(process.env.PORT ?? 4321);
const PUBLIC_DIR = join(import.meta.dir, "public");

const MIME: Record<string, string> = {
    ".css": "text/css",
    ".html": "text/html",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2"
};

function collectPublicRoutes(dir: string, prefix = ""): Record<string, () => Response> {
    const routes: Record<string, () => Response> = {};
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const route = `${prefix}/${name}`;
        if (statSync(full).isDirectory()) {
            Object.assign(routes, collectPublicRoutes(full, route));
        } else {
            const type = MIME[extname(name)] ?? "application/octet-stream";
            const serve = () =>
                new Response(Bun.file(full), {
                    headers: { "Content-Type": type, "Cache-Control": "no-store" }
                });
            routes[route] = serve;

            // Pages serves a directory as its index.html, so the client area
            // lives at /client/ in production. Without these two aliases the
            // same URL falls through to the SPA in development, and the page
            // only ever gets exercised at a path nothing links to.
            if (name === "index.html" && prefix) {
                routes[prefix] = serve;
                routes[`${prefix}/`] = serve;
            }
        }
    }
    return routes;
}

const publicRoutes = collectPublicRoutes(PUBLIC_DIR);

Bun.serve({
    port: PORT,
    development: { hmr: true, console: true },
    routes: {
        ...publicRoutes,
        "/*": index
    }
});

console.log(`tanh lab — http://localhost:${PORT}/`);
console.log(`${Object.keys(publicRoutes).length} files served from public/`);
