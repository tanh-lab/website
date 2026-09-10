/*
 * Production build: bundle, pre-render, copy static files.
 *
 * The output is a plain static `dist/` — GitHub Pages serves it through the
 * workflow artifact, and the custom domain is bound by a CNAME the workflow
 * writes, not by anything in here.
 */
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { staticAssets } from "./plugins/static-assets";
import { absolute, organization, profilesFor, SITE_URL } from "./src/data/organization";
import { publications } from "./src/data/publications";
import type { Route } from "./src/data/routes";
import { routes } from "./src/data/routes";
import { services } from "./src/data/services";
import { SSRApp } from "./src/ssr";
import { MENU } from "./src/ui/nav";

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
for (const href of [
    ...Object.keys(ICON_LINKS),
    ...PRELOAD_FONTS,
    // Referenced from the JSON-LD below rather than from the markup, which
    // makes a rename here silent in a way a broken <img> would not be.
    organization.logo,
    organization.image
]) {
    if (!(await Bun.file(join("./public", href)).exists())) {
        console.error(`Referenced asset not found in public/: ${href}`);
        process.exit(1);
    }
}

/*
 * The theme-color tag carries its own copy of the two grounds, because the boot
 * script that reads them runs before any stylesheet exists. Nothing else would
 * catch them drifting: the page would simply be one colour and the phone's
 * status bar above it another, on one theme only, on mobile only.
 *
 * --background in tokens.css is the definition. Light is the bare :root, dark
 * the override, so the two declarations are in that order.
 */
const tokens = await readFile("./src/styles/tokens.css", "utf8");
const grounds = [...tokens.matchAll(/--background:\s*([^;]+);/g)].map((match) =>
    match[1]!.trim()
);
if (grounds.length !== 2) {
    console.error(
        `Expected two --background declarations in tokens.css, found ${grounds.length}`
    );
    process.exit(1);
}
for (const [attribute, expected] of [
    ["data-light", grounds[0]!],
    ["data-dark", grounds[1]!]
] as const) {
    const declared = html
        .match(new RegExp(`<meta[^>]*name="theme-color"[^>]*>`))?.[0]
        .match(new RegExp(`${attribute}="([^"]*)"`))?.[1];
    if (declared !== expected) {
        console.error(
            `theme-color ${attribute} is ${declared ?? "missing"}, but tokens.css says ${expected}`
        );
        process.exit(1);
    }
}

// The same accounts the JSON-LD claims, as the link relation that claims
// them. Mastodon only shows a website as verified when the site links back.
const ME_LINKS = organization.sameAs
    .map((href) => `<link rel="me" href="${href}">`)
    .join("");

html = html.replace(
    "</head>",
    `${Object.values(ICON_LINKS).join("")}${PRELOAD_FONTS.map(
        (href) =>
            `<link rel="preload" as="font" type="font/woff2" href="${href}" crossorigin>`
    ).join("")}${ME_LINKS}</head>`
);

/*
 * Structured data.
 *
 * The page says what the studio does in prose, and a crawler reads prose as
 * words rather than as facts: the name lives in an SVG, the address on
 * /legal/, the accounts in a link at the foot. This is the same information
 * stated as one entity, so the three are known to be one company — which is
 * what a knowledge panel is assembled from, and what a new domain has no
 * history to establish on its own.
 *
 * Built from the same data the page renders, so the two cannot drift.
 */
function slug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function personId(name: string): string {
    return `${SITE_URL}/#person-${slug(name)}`;
}

function structuredData(description: string): string {
    const organizationId = `${SITE_URL}/#organization`;

    const founders = organization.founders.map((name) => ({
        "@type": "Person",
        "@id": personId(name),
        name,
        sameAs: profilesFor(name)
    }));

    /*
     * An author who founded the studio is the person already in the graph, not
     * a second one who happens to share their name — which is the whole point
     * of stating any of this: it is what ties the papers to the company.
     */
    const knownPeople = new Set(organization.founders);
    const authorsOf = (authors: string) =>
        authors
            .split(", ")
            .map((name) =>
                knownPeople.has(name)
                    ? { "@id": personId(name) }
                    : { "@type": "Person", name }
            );

    const graph: Record<string, unknown>[] = [
        {
            "@type": "Organization",
            "@id": organizationId,
            name: organization.name,
            url: `${SITE_URL}/`,
            description,
            email: `mailto:${organization.email}`,
            logo: absolute(organization.logo),
            image: absolute(organization.image),
            sameAs: organization.sameAs,
            founder: founders,
            address: {
                "@type": "PostalAddress",
                streetAddress: organization.address.street,
                postalCode: organization.address.postalCode,
                addressLocality: organization.address.locality,
                addressCountry: organization.address.country
            },
            // What the studio is asked for, in its own words: the service names
            // as the Services page lists them.
            knowsAbout: services.map((service) => service.name)
        },
        {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: `${SITE_URL}/`,
            name: organization.name,
            description,
            inLanguage: "en",
            publisher: { "@id": organizationId }
        },
        ...publications.map((publication) => {
            // The venue line carries the year and nothing else does; a paper
            // whose venue is ever phrased without one simply goes undated
            // rather than dated wrongly.
            const year = publication.venue.match(/\b(?:19|20)\d{2}\b/)?.[0];

            return {
                "@type": "ScholarlyArticle",
                headline: publication.title,
                name: publication.title,
                abstract: publication.summary,
                author: authorsOf(publication.authors),
                ...(year ? { datePublished: year } : {}),
                ...(publication.links[0] ? { url: publication.links[0].href } : {}),
                ...(publication.cover ? { image: absolute(publication.cover) } : {})
            };
        })
    ];

    // `<` escaped so no string in the data can close the script element early.
    const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
    return `<script type="application/ld+json">${json.replace(/</g, "\\u003c")}</script>`;
}

// The description is read back out of the markup rather than restated here, so
// there is one copy of the sentence and the tag and the entity always agree.
const descriptionMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/);
if (!descriptionMatch?.[1]) {
    console.error('No <meta name="description"> in index.html to build JSON-LD from');
    process.exit(1);
}

html = html.replace("</head>", `${structuredData(descriptionMatch[1])}</head>`);

const markup = renderToString(createElement(SSRApp));
html = html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`);

await writeFile(join(OUT_DIR, "index.html"), html, "utf8");

// Pages serves this for any path without its own file. There are no routes to
// miss here, so it is the same document — a deep link that no longer exists
// lands on the site rather than on GitHub's default 404.
await writeFile(join(OUT_DIR, "404.html"), html, "utf8");

await cp("./public", OUT_DIR, { recursive: true });
await mkdir(OUT_DIR, { recursive: true });

/*
 * The route documents.
 *
 * Each section gets a path of its own serving this same document — the client
 * hydrates the pre-rendered markup, so it has to be this document and not a
 * slice of it — with a head that says where you are and, via `sectionForPath`,
 * a scroller that opens at the right place.
 *
 * Written after the copy from public/ so nothing there can land on top of one.
 */
function escapeHtml(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/*
 * Rewrite exactly one tag, or stop the build.
 *
 * These patterns are the only thing tying this step to the markup in
 * index.html. A tag that is renamed or duplicated there would otherwise leave
 * every route quietly wearing the homepage's title, which is the one thing the
 * routes exist not to do.
 */
function replaceOnce(doc: string, pattern: RegExp, replacement: string, what: string) {
    const all = new RegExp(pattern.source, `${pattern.flags}g`);
    const found = doc.match(all)?.length ?? 0;
    if (found !== 1) {
        console.error(`Expected exactly one ${what} in index.html, found ${found}`);
        process.exit(1);
    }
    return doc.replace(pattern, replacement);
}

function routeDocument(route: Route): string {
    // While a route is the homepage in all but its head, it says so: the
    // canonical points home rather than at itself. See `Route.ownContent`.
    const canonical = `${SITE_URL}${route.ownContent ? route.path : "/"}`;
    const title = escapeHtml(route.title);
    const description = escapeHtml(route.description);

    let doc = html;
    doc = replaceOnce(doc, /<title>[^<]*<\/title>/, `<title>${title}</title>`, "<title>");
    doc = replaceOnce(
        doc,
        /<link[^>]*rel="canonical"[^>]*>/,
        `<link rel="canonical" href="${canonical}">`,
        "canonical link"
    );
    doc = replaceOnce(
        doc,
        /<meta[^>]*name="description"[^>]*>/,
        `<meta name="description" content="${description}">`,
        "description meta"
    );
    doc = replaceOnce(
        doc,
        /<meta[^>]*property="og:title"[^>]*>/,
        `<meta property="og:title" content="${title}">`,
        "og:title meta"
    );
    doc = replaceOnce(
        doc,
        /<meta[^>]*property="og:description"[^>]*>/,
        `<meta property="og:description" content="${description}">`,
        "og:description meta"
    );
    return replaceOnce(
        doc,
        /<meta[^>]*property="og:url"[^>]*>/,
        `<meta property="og:url" content="${canonical}">`,
        "og:url meta"
    );
}

// The nav and the route table describe the same six sections. Neither is
// derived from the other — the nav carries the artwork's grouping, the table
// carries the copy — so the build is where they are held to agreeing.
const menuIds = new Set(MENU.flat().map((item) => item.id));
for (const id of menuIds) {
    if (!routes.some((route) => route.section === id)) {
        console.error(`Nav entry "${id}" has no route in src/data/routes.ts`);
        process.exit(1);
    }
}
for (const route of routes) {
    if (!menuIds.has(route.section)) {
        console.error(
            `Route ${route.path} names "${route.section}", which the nav has no entry for`
        );
        process.exit(1);
    }
}

for (const route of routes) {
    const directory = join(OUT_DIR, route.path);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "index.html"), routeDocument(route), "utf8");
}

/*
 * The sitemap, taken from what actually landed in dist rather than from a list
 * kept by hand — a document added under public/ is in it without anyone having
 * to remember, and one that is renamed cannot leave a dead entry behind.
 *
 * `noindex` is honoured: /client/ and /ci/ carry it, and listing a page that
 * asks to be dropped sends two opposite signals about the same URL.
 *
 * No <lastmod>. The only date available here is the build's own, which would
 * claim every page changed on every deploy — a signal that is worth less than
 * nothing once a crawler learns not to trust it.
 */
const documents = (await readdir(OUT_DIR, { recursive: true }))
    .filter((name) => name.endsWith(".html"))
    // Pages serves this for a path that has no file of its own. It is a
    // fallback, not a page, and it is the same document as the index anyway.
    .filter((name) => name !== "404.html");

const urls: string[] = [];
for (const name of documents) {
    const document = await readFile(join(OUT_DIR, name), "utf8");
    if (/<meta[^>]*name="robots"[^>]*noindex/i.test(document)) continue;

    const url = `${SITE_URL}/${name.replace(/(^|\/)index\.html$/, "$1")}`;
    // A document that names something else as the original of its content is
    // not a page in its own right, and listing it asks for the two signals to
    // be reconciled by a crawler rather than by us. This is what keeps the
    // route documents out while `ownContent` is false.
    const canonical = document.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/)?.[1];
    if (canonical && canonical !== url) continue;

    urls.push(url);
}
urls.sort();

await writeFile(
    join(OUT_DIR, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls.map((url) => `    <url><loc>${url}</loc></url>`).join("\n") +
        `\n</urlset>\n`,
    "utf8"
);

console.log(
    `Built ${result.outputs.length} bundle files + pre-rendered index.html to ${OUT_DIR}, ` +
        `${routes.length} route documents, sitemap with ${urls.length} URLs`
);
