/*
 * Production build: bundle, pre-render, copy static files.
 *
 * The output is a plain static `dist/` — GitHub Pages serves it through the
 * workflow artifact, and the custom domain is bound by a CNAME the workflow
 * writes, not by anything in here.
 */
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { staticAssets } from "./plugins/static-assets";
import { SSRApp } from "./src/ssr";

const OUT_DIR = "./dist";

// Bun writes into the output directory rather than replacing it, so without
// this a file that has been renamed or removed keeps its stale copy and goes on
// being deployed.
await rm(OUT_DIR, { recursive: true, force: true });

const result = await Bun.build({
    entrypoints: ["./index.html"],
    outdir: OUT_DIR,
    minify: true,
    publicPath: "/",
    // Keeps /fonts/* out of the module graph. The same plugin is registered in
    // bunfig.toml for the dev server, which has no `external` option of its own
    // — sharing it is what stops the two from disagreeing.
    plugins: [staticAssets],
    // Dynamic imports become their own chunks rather than being inlined into
    // the entry, which is what lets the dev tree be dropped outright.
    splitting: true,
    // Replaced as a literal so the `isDev` branch in App.tsx is provably false
    // and the whole dev bundle — the flare panel, the grid overlay and their
    // stylesheet — is dropped rather than shipped behind a flag.
    define: { "process.env.NODE_ENV": JSON.stringify("production") }
});

if (!result.success) {
    console.error("Build failed");
    for (const log of result.logs) console.error(log);
    process.exit(1);
}

// Pre-render into #root. The site is one document, so this is one route — but
// it is the difference between a crawler seeing the publications and services
// and seeing an empty div, and it puts text on screen before the bundle lands.
let html = await readFile(join(OUT_DIR, "index.html"), "utf8");

// Inline the CSS so first paint is not blocked on a second round trip. The file
// stays in dist/ as well: it is content-addressed, so a repeat visitor who
// already has it cached still gets a hit.
const linkMatch = html.match(
    /<link[^>]*rel="stylesheet"[^>]*href="(\/[^"]+\.css)"[^>]*>/
);
if (linkMatch?.[1]) {
    const css = await readFile(join(OUT_DIR, linkMatch[1]), "utf8");
    html = html.replace(linkMatch[0], `<style>${css}</style>`);
}

// The icons, and a preload for the two faces that are above the fold.
//
// Injected here rather than written into index.html because Bun treats a
// <link href> in the entry as something to resolve and bundle, and these are
// deliberately external. Without the hint the fonts are discovered inside the
// stylesheet, which puts them a full round trip behind it; the icons would be
// emitted a second time under hashed names, when the pages under public/ already
// hard-code them at stable paths. Writing them into the entry does not merely
// duplicate them either — it fails the build outright, because nothing on disk
// resolves from index.html's own directory.
const ICON_LINKS: Record<string, string> = {
    "/favicon.svg": '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    // What iOS uses when the site is added to a home screen: it ignores the SVG
    // entirely, so this is the same artwork rendered out at 180px.
    "/apple-touch-icon.png": '<link rel="apple-touch-icon" href="/apple-touch-icon.png">'
};

const PRELOAD_FONTS = [
    "/fonts/barlow-semi-condensed-latin-400-normal.woff2",
    "/fonts/instrument-serif-latin-400-normal.woff2"
];

// These are static paths, so a rename would otherwise fail silently: a preload
// would point at nothing and cost a round trip on every visit, and an icon link
// would leave the tab showing the browser's default.
for (const href of [...Object.keys(ICON_LINKS), ...PRELOAD_FONTS]) {
    if (!(await Bun.file(join("./public", href)).exists())) {
        console.error(`Referenced asset not found in public/: ${href}`);
        process.exit(1);
    }
}

html = html.replace(
    "</head>",
    `${Object.values(ICON_LINKS).join("")}${PRELOAD_FONTS.map(
        (href) =>
            `<link rel="preload" as="font" type="font/woff2" href="${href}" crossorigin>`
    ).join("")}</head>`
);

const markup = renderToString(createElement(SSRApp));
html = html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`);

await writeFile(join(OUT_DIR, "index.html"), html, "utf8");

// Pages serves this for any path without its own file. There are no routes to
// miss here, so it is the same document — a deep link that no longer exists
// lands on the site rather than on GitHub's default 404.
await writeFile(join(OUT_DIR, "404.html"), html, "utf8");

await cp("./public", OUT_DIR, { recursive: true });
await mkdir(OUT_DIR, { recursive: true });

console.log(
    `Built ${result.outputs.length} bundle files + pre-rendered index.html to ${OUT_DIR}`
);
