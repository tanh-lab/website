/**
 * Render the brand assets in public/brand/ from the site's own artwork.
 *
 *     bun run brand
 *
 * Nothing here restates the artwork. The mark, and the ground the headers are
 * built from, are read out of public/favicon.svg; the flare is driven through
 * the real shader — the same GLSL, the same uniform upload, the same theme
 * palette the hero uses — in headless Chrome at each platform's pixel size, and
 * one still frame is screenshotted. Re-running this after a change to either
 * reprints the whole set correctly.
 *
 * The output is checked in, deliberately: these are downloads on a public page,
 * and they must not depend on a machine with Chrome being present at deploy
 * time. This runs by hand, when the artwork changes.
 *
 * The one asset not made here is the outlined wordmark. See the note at the head
 * of public/brand/wordmark.svg for why, and for how to remake it.
 */
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const OUT_DIR = "./public/brand";
const ICON = "./public/favicon.svg";

const CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
];

/**
 * The pointer position the flare is posed at, in the shader's own 0..1 space.
 *
 * The flare is a pure function of this — `iTime` only feeds the grain, which the
 * defaults leave off — so the pose is the whole difference between one render
 * and the next, and pinning it is what makes the set reproducible rather than a
 * lucky screenshot.
 *
 * Off-centre on purpose. Centred, the three glow lobes land on top of each other
 * and the streak term fades fully in, which on a 6:1 banner reads as a bright
 * blob flanked by two mirrored dots at the edges. From here the flare is one
 * soft arc entering from the low left, which survives being cropped by every
 * platform that crops.
 */
export const POSE = { mx: 0.35, my: 0.5 };

/** Which artwork the frame is built on. */
export type Background = "mark" | "flare";

export interface SceneParams {
    width: number;
    height: number;
    background: Background;
    /** Draw the lockup over the artwork. */
    lockup: boolean;
}

/** The site's own two lines, set the way the site sets them. */
const LOCKUP_TITLE = "tanh lab";
const LOCKUP_SUB = "audio software agency";

function sceneHtml(params: SceneParams): string {
    // Mirrors .hero-lockup .lockup, which is 24vw against the viewport. A header
    // is far wider than it is tall, so the mark is sized off the short side
    // instead: it then holds the same weight relative to the artwork at every
    // aspect ratio, rather than thinning to a hairline on the 6:1 banners.
    const lockupWidth = Math.round(
        Math.min(params.width * 0.42, Math.max(params.height * 1.3, 190))
    );
    // Left, where the site sets it, and where the eye starts. The pale corner of
    // the ground is here too, so the ink has something to sit on.
    const gutter = Math.round(params.width * 0.055);

    const lockup = params.lockup
        ? `<div class="stage" style="padding-left:${gutter}px">
        <div class="lockup" style="width:${lockupWidth}px">
            <svg class="line" viewBox="0 0 1200 106">
                <text x="0" y="86" font-size="100">${LOCKUP_TITLE}</text>
            </svg>
            <svg class="line" data-line="sub" viewBox="0 0 1200 116">
                <text x="0" y="86" font-size="100">${LOCKUP_SUB}</text>
            </svg>
        </div>
        </div>`
        : "";

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
@font-face {
    font-family: "Instrument Serif";
    src: url("/fonts/instrument-serif-latin-400-normal.woff2") format("woff2");
    font-weight: 400;
    font-style: normal;
}
@font-face {
    font-family: "Barlow Semi Condensed";
    src: url("/fonts/barlow-semi-condensed-latin-200-italic.woff2") format("woff2");
    font-weight: 200;
    font-style: italic;
}
/* Laid out at the exact pixel size being rendered, rather than at 100% of the
   window. Chrome will not open a window below a platform minimum — ask for
   1128x191 and the viewport is still nearly three hundred tall — so a page sized
   in percentages lays itself out against a box the screenshot then crops, and
   anything centred in it sits well below centre. Fixed pixels are immune. */
html, body { margin: 0; padding: 0; overflow: hidden; }
body { width: ${params.width}px; height: ${params.height}px; }
/* The light theme's ground, which is what the flare is composited onto on the
   site. The flare leaves its dark end transparent, so without this the frame
   would still come out white — but only by borrowing Chrome's default. */
body { background: #fff; }
#gl {
    position: absolute;
    top: 0;
    left: 0;
    width: ${params.width}px;
    height: ${params.height}px;
    display: block;
}
/* A full-frame flex box rather than a 50% offset: the lockup's height is not
   known until its two lines have been measured and refitted, and an offset
   computed against the old height leaves the mark sitting low. */
.stage {
    position: absolute;
    top: 0;
    left: 0;
    width: ${params.width}px;
    height: ${params.height}px;
    display: flex;
    align-items: center;
}
.line {
    display: block;
    width: 100%;
    height: auto;
    /* The page's default ink, which these files have to agree with: white over
       the ground rather than black. /ci/ renders every other combination. */
    fill: #e8e8e6;
    font-family: "Instrument Serif", serif;
    font-weight: 400;
}
.line[data-line="sub"] {
    font-family: "Barlow Semi Condensed", sans-serif;
    font-weight: 200;
    font-style: italic;
}
</style>
</head>
<body>
<canvas id="gl"></canvas>
${lockup}
<script type="module" src="/scene.js"></script>
</body>
</html>`;
}

/**
 * The mark's ground, lifted straight out of the committed icon.
 *
 * Read from public/favicon.svg rather than kept as a second copy, so the headers
 * cannot drift away from the avatar they will sit beside in a profile. If that
 * inlined raster is ever replaced, this follows it.
 */
async function markGround(): Promise<Blob> {
    const svg = await Bun.file(ICON).text();
    const match = svg.match(/href="data:image\/png;base64,([^"]+)"/);
    if (!match?.[1]) throw new Error(`no inlined ground found in ${ICON}`);
    return new Blob([Buffer.from(match[1], "base64")], { type: "image/png" });
}

/**
 * Bundle the browser half and serve it, the fonts, the ground and a scene page.
 *
 * A server rather than file:// URLs: a woff2 loaded from a file:// page counts
 * as cross-origin and is refused, which would cost the lockup its faces and set
 * the whole run in Times.
 */
export async function startSceneServer() {
    const built = await Bun.build({
        entrypoints: ["./tools/brand-scene.ts"],
        target: "browser",
        minify: false
    });
    if (!built.success) {
        for (const log of built.logs) console.error(log);
        throw new Error("scene bundle failed");
    }
    const sceneJs = await built.outputs[0]!.text();
    const ground = await markGround();

    const server = Bun.serve({
        port: 0,
        async fetch(request) {
            const url = new URL(request.url);

            if (url.pathname === "/scene.js") {
                return new Response(sceneJs, {
                    headers: { "content-type": "text/javascript" }
                });
            }

            if (url.pathname === "/ground.png") return new Response(ground);

            if (url.pathname.startsWith("/fonts/")) {
                const file = Bun.file(join("./public", url.pathname));
                return (await file.exists())
                    ? new Response(file)
                    : new Response("not found", { status: 404 });
            }

            if (url.pathname === "/scene") {
                const q = url.searchParams;
                return new Response(
                    sceneHtml({
                        width: Number(q.get("w")),
                        height: Number(q.get("h")),
                        background: q.get("bg") === "flare" ? "flare" : "mark",
                        lockup: q.get("lockup") === "1"
                    }),
                    { headers: { "content-type": "text/html" } }
                );
            }

            return new Response("not found", { status: 404 });
        }
    });

    return {
        url: (params: SceneParams) =>
            `${server.url.origin}/scene?w=${params.width}&h=${params.height}` +
            `&bg=${params.background}&lockup=${params.lockup ? 1 : 0}` +
            `&mx=${POSE.mx}&my=${POSE.my}`,
        stop: () => server.stop(true)
    };
}

/**
 * Wait for Chrome to finish writing a file, then stop watching.
 *
 * Stable rather than merely present: the screenshot appears at size zero and is
 * filled in, so a reader that moves the moment it exists gets a truncated PNG.
 */
async function settled(path: string, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    let last = -1;
    while (Date.now() < deadline) {
        await Bun.sleep(200);
        if (!existsSync(path)) continue;
        const size = Bun.file(path).size;
        if (size > 0 && size === last) return true;
        last = size;
    }
    return false;
}

/**
 * One screenshot, at exactly the requested pixel size.
 *
 * The screenshot is waited for on disk rather than by waiting for Chrome to
 * exit, because it does not: --headless=new writes the PNG promptly and then
 * sits there, and every shot in the set hung on its own process for as long as
 * it was given. So the file is the signal, and the browser is killed once it
 * has been written.
 *
 * Software GL: there is no GPU behind a headless Chrome here, so the flare's
 * three glow terms are rasterised on the CPU. Slow — tens of seconds for the
 * larger surfaces — but it is one frame, and for arithmetic this plain the
 * result is what a GPU would have produced.
 */
export async function shoot(
    chrome: string,
    url: string,
    width: number,
    height: number,
    out: string
): Promise<void> {
    const profile = join("./node_modules/.cache", `brand-chrome-${Bun.randomUUIDv7()}`);
    const proc = Bun.spawn(
        [
            chrome,
            "--headless=new",
            "--disable-gpu",
            "--enable-unsafe-swiftshader",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            "--force-prefers-reduced-motion",
            // Nothing here should reach the network but this run's own server,
            // and the updater it would otherwise start outlives the screenshot.
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-background-networking",
            "--disable-component-update",
            "--disable-extensions",
            `--user-data-dir=${profile}`,
            `--window-size=${width},${height}`,
            // Long enough for the bundle, the two woff2 faces, and one software
            // fragment pass over the largest surface in the set.
            "--virtual-time-budget=20000",
            `--screenshot=${out}`,
            url
        ],
        { stdout: "ignore", stderr: "pipe" }
    );

    const written = await settled(out, 180_000);
    proc.kill();
    await proc.exited;
    // A fresh profile per shot, removed after it: a reused directory still
    // holding a lock from a killed run is refused, and Chrome then writes
    // nothing at all while looking exactly like a slow render.
    await rm(profile, { recursive: true, force: true });
    if (!written) throw new Error(`chrome wrote no screenshot for ${out}`);
}

interface Header {
    /** Output basename, without the variant suffix or extension. */
    name: string;
    width: number;
    height: number;
    background: Background;
}

/**
 * Every size is the platform's own stated one, so an upload is never resampled
 * on the way in — which is where a smooth gradient picks up banding.
 *
 * All of them are built on the mark's ground, because a header is seen beside
 * the avatar and the two have to be the same artwork.
 *
 * The "flare" background renders the live hero instead, and is deliberately not
 * in this list. It was: the assumption going in was that the mark's ground had
 * come off this shader, and it had not — fitting the shader to the ground bottoms
 * out against its parameter bounds at an error of 28/255, nowhere near a match.
 * So a flare header is a second, unrelated magenta, and since the ground's chroma
 * was pulled back it is also a much louder one. The mode stays because it is the
 * site's own artwork and one line brings it back; it does not ship because the
 * kit has to hang together.
 */
const HEADERS: Header[] = [
    { name: "header-linkedin-page", width: 1128, height: 191, background: "mark" },
    { name: "header-linkedin-profile", width: 1584, height: 396, background: "mark" },
    { name: "header-mastodon", width: 1500, height: 500, background: "mark" },
    { name: "card-social", width: 1200, height: 630, background: "mark" },
    { name: "header-wide", width: 2400, height: 800, background: "mark" }
];

/** Square renders of the mark itself, for avatars and app icons. */
const MARK_SIZES = [256, 512, 1024];

if (import.meta.main) {
    const chrome = CHROME_CANDIDATES.find((path) => existsSync(path));
    if (!chrome) {
        console.error(`No Chrome found. Looked in:\n  ${CHROME_CANDIDATES.join("\n  ")}`);
        process.exit(1);
    }

    await mkdir(OUT_DIR, { recursive: true });

    // The mark is already vector, so its PNGs are a straight rasterisation of
    // the committed SVG rather than anything this has to compose.
    for (const size of MARK_SIZES) {
        const out = join(OUT_DIR, `mark-${size}.png`);
        const proc = Bun.spawn(
            ["rsvg-convert", "-w", `${size}`, "-h", `${size}`, ICON, "-o", out],
            { stdout: "ignore", stderr: "pipe" }
        );
        if ((await proc.exited) !== 0) {
            console.error(await new Response(proc.stderr).text());
            console.error("rsvg-convert failed — install it with: brew install librsvg");
            process.exit(1);
        }
        console.log(`  mark-${size}.png`);
    }

    const scene = await startSceneServer();
    try {
        for (const header of HEADERS) {
            for (const lockup of [false, true]) {
                const name = lockup ? `${header.name}-lockup` : header.name;
                const params: SceneParams = {
                    width: header.width,
                    height: header.height,
                    background: header.background,
                    lockup
                };
                const out = join(OUT_DIR, `${name}.png`);
                await shoot(chrome, scene.url(params), header.width, header.height, out);
                console.log(`  ${name}.png  ${header.width}x${header.height}`);
            }
        }
    } finally {
        scene.stop();
    }

    console.log(
        `\nRendered ${MARK_SIZES.length} marks + ${HEADERS.length * 2} headers to ${OUT_DIR}`
    );
}
