/*
 * Development server.
 *
 * `bun --hot ./index.html` bundles and hot-reloads, but it does not serve
 * `public/`, so public files are routed here, ahead of the SPA fallback. The
 * no-cache headers are what the old Python server existed to add.
 *
 * Each *top-level* entry in public/ gets a route — a wildcard for a directory,
 * an exact path for a file — and the file itself is resolved per request. The
 * tree used to be walked once at startup and registered file by file, which
 * meant a file added during a session had no route: it fell through to the SPA
 * and answered 200 with the app's HTML instead of 404, so a missing asset
 * looked like a broken one. Resolving per request means anything dropped into
 * an existing directory works immediately, and anything genuinely absent gets a
 * real 404. A brand-new top-level directory is still a restart.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";

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

const send = (file: string) =>
    new Response(Bun.file(file), {
        headers: {
            "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
            "Cache-Control": "no-store"
        }
    });

/**
 * Resolve a request path inside public/, or null if there is nothing there.
 *
 * A directory resolves to its index.html, because Pages serves it that way in
 * production and the client area lives at /client/. The containment check is
 * not ceremony: the path comes off the wire, and `normalize` is what turns any
 * `..` in it into something that can be compared against the root.
 */
function resolvePublic(pathname: string): string | null {
    const target = normalize(join(PUBLIC_DIR, decodeURIComponent(pathname)));
    if (target !== PUBLIC_DIR && !target.startsWith(PUBLIC_DIR + sep)) return null;
    if (!existsSync(target)) return null;
    if (statSync(target).isDirectory()) {
        const home = join(target, "index.html");
        return existsSync(home) ? home : null;
    }
    return target;
}

const serveFromPublic = (request: Request) => {
    const file = resolvePublic(new URL(request.url).pathname);
    return file ? send(file) : new Response("Not found", { status: 404 });
};

const routes: Record<string, unknown> = {};
for (const name of readdirSync(PUBLIC_DIR)) {
    if (statSync(join(PUBLIC_DIR, name)).isDirectory()) {
        routes[`/${name}`] = serveFromPublic; // /client, for the index.html
        routes[`/${name}/*`] = serveFromPublic;
    } else {
        routes[`/${name}`] = serveFromPublic;
    }
}

Bun.serve({
    port: PORT,
    development: { hmr: true, console: true },
    routes: { ...routes, "/*": index }
});

console.log(`tanh lab — http://localhost:${PORT}/`);
console.log(`${Object.keys(routes).length} routes served from public/`);
