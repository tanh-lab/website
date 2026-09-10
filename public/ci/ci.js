/**
 * The generator behind /ci/.
 *
 * Everything on the page is drawn from one file — public/favicon.svg — rather
 * than from a folder of exports. The mark is that SVG; the headers are the
 * ground inlined in it, stretched. That is deliberate: a header is seen beside
 * the avatar, and reading both from the same source is what stops them from
 * drifting into two different magentas.
 *
 * The PNGs under /brand/ are the same renders, made ahead of time by
 * tools/render-brand.ts so the page still hands out files with no script and so
 * something stable exists to link at. That tool only emits the default
 * combination — lockup left, dark ink, subtitle on — and this has to agree with
 * it on that one; the rest of the combinations exist only here, which is why the
 * page renders its downloads rather than linking them.
 *
 * The swash is read back out of that same SVG as a brush stroke so its width
 * can be turned, which is swash.js; the ground and the wordmark are untouched
 * by it. The experimental section at the foot of the page is not drawn from the
 * artwork at all, and lives in lab.js. It is handed what it needs from here —
 * the ground, the segmented control, the save — rather than importing it, so
 * the two modules stay a one-way dependency.
 */

import { initLab } from "./lab.js";
import { swash } from "./swash.js";

/** The sizes each platform actually states. */
const SIZES = [
    { label: "LinkedIn page", width: 1128, height: 191, file: "header-linkedin-page" },
    {
        label: "LinkedIn profile",
        width: 1584,
        height: 396,
        file: "header-linkedin-profile"
    },
    { label: "Mastodon", width: 1500, height: 500, file: "header-mastodon" },
    { label: "Social card", width: 1200, height: 630, file: "card-social" },
    { label: "Wide master", width: 2400, height: 800, file: "header-wide" }
];

/**
 * What each place actually asks for as a profile picture.
 *
 * Several land on the same number, which is the point of listing them by name
 * rather than by size: nobody setting up a Mastodon account should have to know
 * that 400 is also LinkedIn's. The mark is square and carries its own ground, so
 * every one of these is the same artwork at a different rasterisation.
 */
const AVATARS = [
    { label: "GitHub", size: 500 },
    { label: "LinkedIn", size: 400 },
    { label: "Mastodon", size: 400 },
    { label: "Instagram", size: 320 },
    { label: "Touch icon", size: 180 }
];

/** GitHub's social preview, at the size GitHub states. */
const CARD = { width: 1280, height: 640 };

/**
 * The largest the second line may be, as a fraction of the first.
 *
 * Setting both lines to one measure is the site's rule, and it works because the
 * site's second line is far longer than its first — "audio software agency" set
 * to the width of "tanh lab" lands at 0.34 of its size on its own. A repo card's
 * second line is usually short, and two lines of similar length set to the same
 * measure come out the same size, which reads as two titles rather than a mark.
 * So the ratio is a ceiling rather than a target: above it the line is scaled
 * down and left where it starts, and the site's own lockup, already under it, is
 * untouched.
 */
const SUB_MAX_RATIO = 0.36;

/** Wide enough to judge, small enough to redraw while a slider is moving. */
const PREVIEW_WIDTH = 760;
/** The mark preview's laid-out size. */
const MARK_PREVIEW = 320;

/**
 * How many device pixels a preview is drawn at per laid-out pixel.
 *
 * A canvas is a bitmap, and one sized in CSS pixels gets stretched by the
 * display like any other image — so on a retina screen a 1:1 preview arrives at
 * half the resolution it is shown at, and the lockup's type is the first thing
 * to look soft. Only the preview was ever affected; the downloads are drawn at
 * their true size. Capped at 2, past which nothing is visible and everything is
 * four times the work.
 */
const previewScale = () => Math.min(2, window.devicePixelRatio || 1);

/** How the lockup is drawn over the artwork. */
const LOCKUP_OPTIONS = [
    {
        key: "lockup",
        label: "Lockup",
        choices: [
            { id: "none", label: "None" },
            { id: "wordmark", label: "Wordmark" },
            { id: "full", label: "+ subtitle" }
        ]
    },
    {
        key: "align",
        label: "Position",
        choices: [
            { id: "left", label: "Left" },
            { id: "right", label: "Right" }
        ]
    },
    {
        key: "ink",
        label: "Ink",
        choices: [
            { id: "dark", label: "Black" },
            { id: "light", label: "White" }
        ]
    }
];

/* The brand's two inks rather than #000 and #fff: these are the values the
   wordmark SVGs are drawn in, and a lockup that used pure black beside them
   would not be the same mark. */
const INK = { dark: "#1c1c1a", light: "#e8e8e6" };

const state = {
    chroma: 1,
    width: 1,
    size: 2,
    lockup: "none",
    align: "left",
    ink: "dark"
};

/** The repo card's own state: its two lines are typed rather than fixed. */
const card = { title: "tanh-lib", sub: "tanh lab", ink: "dark" };

/* ---------- colour ---------------------------------------------------------
   Chroma scaling in Oklab, which is the whole point of the control.

   The obvious way to make artwork less pink is to fade it toward white, and it
   is the wrong way: lightness is the only thing separating the curve from the
   ground it sits on, so fading takes the mark's legibility with it. Oklab
   separates the two. Scaling a and b leaves L untouched, so the curve holds
   exactly the contrast it had and only the colour gets quieter.
--------------------------------------------------------------------------- */

const LMS_FROM_LINEAR = [
    [0.4122214708, 0.5363325363, 0.0514459929],
    [0.2119034982, 0.6806995451, 0.1073969566],
    [0.088302462, 0.2817188376, 0.6299787005]
];
const LAB_FROM_LMS = [
    [0.2104542553, 0.793617785, -0.0040720468],
    [1.9779984951, -2.428592205, 0.4505937099],
    [0.0259040371, 0.7827717662, -0.808675766]
];
const LMS_FROM_LAB = [
    [1.0, 0.3963377774, 0.2158037573],
    [1.0, -0.1055613458, -0.0638541728],
    [1.0, -0.0894841775, -1.291485548]
];
const LINEAR_FROM_LMS = [
    [4.0767416621, -3.3077115913, 0.2309699292],
    [-1.2684380046, 2.6097574011, -0.3413193965],
    [-0.0041960863, -0.7034186147, 1.707614701]
];

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp255 = (c) => Math.max(0, Math.min(255, Math.round(c * 255)));

const apply = (m, x, y, z) => [
    m[0][0] * x + m[0][1] * y + m[0][2] * z,
    m[1][0] * x + m[1][1] * y + m[1][2] * z,
    m[2][0] * x + m[2][1] * y + m[2][2] * z
];

/** Scale the chroma of every pixel in an ImageData, in place. */
function scaleChroma(data, amount) {
    for (let i = 0; i < data.length; i += 4) {
        const [l, m, s] = apply(
            LMS_FROM_LINEAR,
            toLinear(data[i] / 255),
            toLinear(data[i + 1] / 255),
            toLinear(data[i + 2] / 255)
        );
        const [lightness, a, b] = apply(
            LAB_FROM_LMS,
            Math.cbrt(l),
            Math.cbrt(m),
            Math.cbrt(s)
        );
        const [l2, m2, s2] = apply(
            LMS_FROM_LAB,
            lightness,
            a * amount,
            b * amount
        );
        const [r, g, bl] = apply(
            LINEAR_FROM_LMS,
            l2 * l2 * l2,
            m2 * m2 * m2,
            s2 * s2 * s2
        );
        data[i] = clamp255(toSrgb(Math.max(0, Math.min(1, r))));
        data[i + 1] = clamp255(toSrgb(Math.max(0, Math.min(1, g))));
        data[i + 2] = clamp255(toSrgb(Math.max(0, Math.min(1, bl))));
    }
}

/* ---------- the artwork --------------------------------------------------- */

export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("could not load " + src));
        image.src = src;
    });
}

const GROUND_IN_SVG = /href="data:image\/png;base64,([^"]+)"/;

/* The only path in the file, and the whole of the drawn artwork: the swash. */
const SWASH_IN_SVG = /(<path[^>]*\bd=")([^"]+)(")/;

let markSvg = "";
let ground = null;
/** The swash outline at any width; see swash.js. Read once, on load. */
let swashAt = null;

async function loadArtwork() {
    markSvg = await (await fetch("/favicon.svg")).text();
    const match = markSvg.match(GROUND_IN_SVG);
    if (!match) throw new Error("no ground inlined in favicon.svg");
    ground = await loadImage("data:image/png;base64," + match[1]);

    const outline = markSvg.match(SWASH_IN_SVG);
    if (!outline) throw new Error("no swash outlined in favicon.svg");
    swashAt = swash(outline[2]);
}

/** The mark's ground at the current chroma, at its own small native size. */
export function groundAt(amount) {
    const canvas = document.createElement("canvas");
    canvas.width = ground.naturalWidth;
    canvas.height = ground.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(ground, 0, 0);
    if (amount !== 1) {
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        scaleChroma(pixels.data, amount);
        context.putImageData(pixels, 0, 0);
    }
    return canvas;
}

/**
 * Enlarge in doublings rather than in one jump.
 *
 * The ground is carried at 96px, which is all a field this smooth needs and
 * keeps the icon small enough to stay inlineable. Blown up twenty-five times in
 * a single drawImage, a browser's resampler starts showing its lattice; going up
 * by halves does not, and at this size costs nothing.
 */
function enlarge(source, width, height) {
    let current = source;
    let w = source.width;
    let h = source.height;
    while (w < width || h < height) {
        const next = document.createElement("canvas");
        next.width = Math.min(w * 2, width);
        next.height = Math.min(h * 2, height);
        const context = next.getContext("2d");
        context.imageSmoothingQuality = "high";
        context.drawImage(current, 0, 0, next.width, next.height);
        current = next;
        w = next.width;
        h = next.height;
    }
    return current;
}

/**
 * The mark's SVG at a chroma and a width.
 *
 * Both controls are substitutions into the file rather than a redraw of it: the
 * ground is re-encoded at the chroma asked for, the swash re-emitted at the
 * width, and everything else in the file is the file. At 1 and 1 neither
 * replacement changes a byte, so what the page shows and hands out is the
 * artwork itself and not a copy of it.
 */
function markAt(amount, width) {
    return markSvg
        .replace(SWASH_IN_SVG, (whole, head, d, tail) => head + swashAt(width) + tail)
        .replace(GROUND_IN_SVG, () => 'href="' + groundAt(amount).toDataURL("image/png") + '"');
}

/** The mark, rasterised by the browser from that SVG. */
async function renderMark(size, amount, width) {
    const url = URL.createObjectURL(new Blob([markAt(amount, width)], {
        type: "image/svg+xml"
    }));
    try {
        const image = await loadImage(url);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, size, size);
        return canvas;
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * The lockup, measured the way the site measures it.
 *
 * Both lines are set to one measure — the short title large, the long subtitle
 * small — so each line's size falls out of its own rendered width rather than
 * being chosen. Same relationship as src/ui/wordmark-fit.ts, and the same
 * reference box (100 units tall, baseline at 86) the site's wordmark SVG uses.
 */
function fitLine(context, text, style, family, boxHeight, width) {
    // Style and weight lead the shorthand and the size follows them; putting the
    // size first makes the whole declaration invalid, which a canvas reports by
    // silently keeping the font it already had.
    context.font = style + " 100px " + family;
    const measured = context.measureText(text).width;
    const scale = width / measured;
    return {
        text,
        style,
        family,
        size: 100 * scale,
        baseline: 86 * scale,
        height: boxHeight * scale
    };
}

function drawLockup(context, width, height, options) {
    if (options.lockup === "none") return;

    // Mirrors .hero-lockup .lockup at 24vw, taken off the short side so the mark
    // holds its weight at every aspect ratio instead of thinning to a hairline.
    let boxWidth = Math.round(Math.min(width * 0.42, Math.max(height * 1.3, 190)));
    const gutter = Math.round(width * 0.055);

    // The words are arguments, not constants: a repository card is this same
    // lockup with a repo name on the first line, which is what makes a card read
    // as ours without being a second piece of artwork to keep in step.
    const title = options.title ?? "tanh lab";
    const sub = options.sub ?? "audio software agency";

    const lines = () => {
        const set = [
            fitLine(context, title, "400", '"Instrument Serif", serif', 106, boxWidth)
        ];
        if (options.lockup === "full") {
            set.push(
                fitLine(
                    context,
                    sub,
                    "italic 200",
                    '"Barlow Semi Condensed", sans-serif',
                    116,
                    boxWidth
                )
            );
        }
        return set;
    };

    /** Hold the second line subordinate; see SUB_MAX_RATIO. */
    const subordinate = (set) => {
        const [first, second] = set;
        if (!second) return set;
        const ceiling = first.size * SUB_MAX_RATIO;
        if (second.size <= ceiling) return set;
        const k = ceiling / second.size;
        return [
            first,
            {
                ...second,
                size: second.size * k,
                baseline: second.baseline * k,
                height: second.height * k
            }
        ];
    };

    const stack = (set) => set.reduce((sum, line) => sum + line.height, 0);

    // The lockup is sized by its width, and its height falls out of the fit. On
    // the short banners — 1128x191 is six to one — that lands past the bottom
    // edge, so the box is pulled in until the mark sits inside the frame with
    // room around it.
    let set = subordinate(lines());
    const limit = height * 0.62;
    if (stack(set) > limit) {
        boxWidth = (boxWidth * limit) / stack(set);
        set = subordinate(lines());
    }

    // Every line is fitted to the same measure, so one left edge places them all.
    const x = options.align === "right" ? width - gutter - boxWidth : gutter;
    let y = (height - stack(set)) / 2;

    context.fillStyle = INK[options.ink];
    context.textBaseline = "alphabetic";
    for (const line of set) {
        context.font = line.style + " " + line.size + "px " + line.family;
        context.fillText(line.text, x, y + line.baseline);
        y += line.height;
    }
}

/** One header, at exactly the pixel size asked for. */
function renderHeader(width, height, amount, options) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.imageSmoothingQuality = "high";
    // Stretched, not cropped: the field has no edges or figures to distort, and
    // stretching keeps the whole composition rather than one flat corner of it.
    context.drawImage(enlarge(groundAt(amount), width, height), 0, 0, width, height);
    drawLockup(context, width, height, options);
    return canvas;
}

/* ---------- downloads ----------------------------------------------------- */

export function save(canvas, name) {
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        link.click();
        // Not revoked immediately: the click only starts the save, and pulling
        // the URL out from under it cancels the download in some browsers.
        setTimeout(() => URL.revokeObjectURL(url), 30000);
    }, "image/png");
}

const setting = (name, value) =>
    value === 1 ? "" : "-" + name + value.toFixed(2).replace(".", "");

/** For the ground artwork: the headers and the cards carry no swash. */
const suffix = () => setting("chroma", state.chroma);

/** For the mark and the avatars, which carry both. */
const markSuffix = () => suffix() + setting("width", state.width);

/**
 * What to draw over a card, from what has been typed into it.
 *
 * An empty line under drops to the wordmark alone rather than leaving a gap, and
 * an empty name leaves the artwork bare rather than drawing nothing where a name
 * should be.
 */
const cardOptions = () => ({
    lockup: !card.title.trim() ? "none" : card.sub.trim() ? "full" : "wordmark",
    align: "left",
    ink: card.ink,
    title: card.title.trim(),
    sub: card.sub.trim()
});

/** A file name from whatever was typed, rather than from the artwork. */
const cardName = () => {
    const slug = card.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return (slug || "repository") + "-card" + (card.ink === "light" ? "-light" : "") +
        suffix() + ".png";
};

/** A name that says which of the combinations this particular file is. */
function headerName(size) {
    let name = size.file;
    if (state.lockup !== "none") {
        name += state.lockup === "full" ? "-lockup" : "-wordmark";
        if (state.align === "right") name += "-right";
        if (state.ink === "light") name += "-light";
    }
    return name + suffix() + ".png";
}

/* ---------- wiring -------------------------------------------------------- */

const markCanvas = document.getElementById("mark-canvas");
const headerCanvas = document.getElementById("header-canvas");
const headerDims = document.getElementById("header-dims");
const cardCanvas = document.getElementById("card-canvas");
const cardDims = document.getElementById("card-dims");
/* Built at the end of main(); the ground it draws over follows the slider. */
let lab = null;

const slider = document.getElementById("chroma");
const readout = document.getElementById("chroma-readout");
const widthSlider = document.getElementById("swash");
const widthReadout = document.getElementById("swash-readout");

function paint(canvas, source) {
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext("2d").drawImage(source, 0, 0);
}

async function refresh() {
    const size = SIZES[state.size];
    const dpr = previewScale();

    paint(markCanvas, await renderMark(MARK_PREVIEW * dpr, state.chroma, state.width));
    markCanvas.style.width = MARK_PREVIEW + "px";

    // Laid out at most PREVIEW_WIDTH across, drawn at the display's own pixels.
    const scale = Math.min(1, PREVIEW_WIDTH / size.width);
    const laidOut = {
        width: Math.round(size.width * scale),
        height: Math.round(size.height * scale)
    };
    paint(
        headerCanvas,
        renderHeader(
            Math.round(laidOut.width * dpr),
            Math.round(laidOut.height * dpr),
            state.chroma,
            state
        )
    );
    headerCanvas.style.width = laidOut.width + "px";

    headerDims.textContent =
        size.label + " — " + size.width + " x " + size.height + " px";

    const cardWidth = Math.min(PREVIEW_WIDTH, CARD.width);
    const cardHeight = Math.round((cardWidth * CARD.height) / CARD.width);
    paint(
        cardCanvas,
        renderHeader(
            Math.round(cardWidth * dpr),
            Math.round(cardHeight * dpr),
            state.chroma,
            cardOptions()
        )
    );
    cardCanvas.style.width = cardWidth + "px";
    cardDims.textContent =
        "GitHub social preview — " + CARD.width + " x " + CARD.height + " px";

    if (lab) lab.onChroma();
}

/** Coalesced to a frame: the slider fires far faster than a redraw finishes. */
let queued = false;
function scheduleRefresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(async () => {
        queued = false;
        await refresh();
    });
}

function buildSizePicker() {
    const picker = document.getElementById("size-picker");
    SIZES.forEach((size, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = size.label;
        button.setAttribute("aria-pressed", String(index === state.size));
        button.addEventListener("click", () => {
            state.size = index;
            for (const other of picker.children) {
                other.setAttribute("aria-pressed", String(other === button));
            }
            scheduleRefresh();
        });
        picker.append(button);
    });
}

/**
 * The lockup's own controls: a labelled segment per decision.
 *
 * Built rather than written out, so the markup cannot drift from the options the
 * renderer actually understands — every button here is one of the values
 * drawLockup switches on.
 */
function buildLockupOptions() {
    const host = document.getElementById("lockup-options");

    for (const group of LOCKUP_OPTIONS) {
        const option = document.createElement("div");
        option.className = "option";
        option.dataset.key = group.key;

        const label = document.createElement("span");
        label.textContent = group.label;

        const segment = document.createElement("div");
        segment.className = "segment";
        buildSegment(segment, group.choices, state[group.key], (id) => {
            state[group.key] = id;
            syncLockupOptions();
            scheduleRefresh();
        });

        option.append(label, segment);
        host.append(option);
    }

    syncLockupOptions();
}

/** Position and ink have nothing to act on while no lockup is being drawn. */
function syncLockupOptions() {
    const off = state.lockup === "none";
    for (const option of document.querySelectorAll("#lockup-options .option")) {
        if (option.dataset.key === "lockup") continue;
        option.setAttribute("aria-disabled", String(off));
    }
}

/**
 * A segmented control, built from a list of choices.
 *
 * Shared by the lockup panel and the card's ink, so the two cannot end up
 * looking or behaving differently for the same kind of decision.
 */
export function buildSegment(host, choices, selected, onPick) {
    for (const choice of choices) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = choice.label;
        button.setAttribute("aria-pressed", String(selected === choice.id));
        button.addEventListener("click", () => {
            for (const other of host.children) {
                other.setAttribute("aria-pressed", String(other === button));
            }
            onPick(choice.id);
        });
        host.append(button);
    }
}

/** One pill per place that wants an avatar, each at that place's own size. */
function buildAvatarDownloads() {
    const host = document.getElementById("avatar-files");
    for (const avatar of AVATARS) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = avatar.label + " " + avatar.size;
        button.addEventListener("click", async () => {
            save(
                await renderMark(avatar.size, state.chroma, state.width),
                "tanh-lab-" +
                    avatar.label.toLowerCase().replace(/\s+/g, "-") +
                    "-" +
                    avatar.size +
                    markSuffix() +
                    ".png"
            );
        });
        host.append(button);
    }
}

function wireCard() {
    buildSegment(
        document.getElementById("card-ink"),
        [
            { id: "dark", label: "Black" },
            { id: "light", label: "White" }
        ],
        card.ink,
        (id) => {
            card.ink = id;
            scheduleRefresh();
        }
    );

    for (const [id, key] of [
        ["card-title", "title"],
        ["card-sub", "sub"]
    ]) {
        const input = document.getElementById(id);
        input.value = card[key];
        input.addEventListener("input", () => {
            card[key] = input.value;
            scheduleRefresh();
        });
    }

    document.getElementById("card-download").addEventListener("click", () => {
        save(
            renderHeader(CARD.width, CARD.height, state.chroma, cardOptions()),
            cardName()
        );
    });
}

function wireMarkDownloads() {
    // The static links are correct only at full strength. Once the slider has
    // moved they would hand over a file that does not match what is on screen,
    // so they are taken over and rendered here instead.
    for (const link of document.querySelectorAll("#mark-files a[href*='mark-']")) {
        const size = Number(link.textContent.trim());
        link.addEventListener("click", async (event) => {
            event.preventDefault();
            save(
                await renderMark(size, state.chroma, state.width),
                "tanh-lab-mark-" + size + markSuffix() + ".png"
            );
        });
    }

    const svgLink = document.querySelector("#mark-files a[href='/favicon.svg']");
    svgLink.addEventListener("click", (event) => {
        // The file on disk is already both defaults; let the href stand.
        if (state.chroma === 1 && state.width === 1) return;
        event.preventDefault();
        const svg = markAt(state.chroma, state.width);
        const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "tanh-lab-mark" + markSuffix() + ".svg";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
    });
}

async function main() {
    await loadArtwork();
    // Measured text is wrong until the faces are in, and the lockup is measured.
    await Promise.all([
        document.fonts.load('100px "Instrument Serif"'),
        document.fonts.load('italic 200 100px "Barlow Semi Condensed"')
    ]);

    buildSizePicker();
    buildLockupOptions();
    buildAvatarDownloads();
    wireMarkDownloads();
    wireCard();

    slider.addEventListener("input", () => {
        state.chroma = Number(slider.value);
        readout.textContent = state.chroma.toFixed(2);
        scheduleRefresh();
    });

    document.getElementById("chroma-reset").addEventListener("click", () => {
        slider.value = "1";
        state.chroma = 1;
        readout.textContent = "1.00";
        scheduleRefresh();
    });

    widthSlider.addEventListener("input", () => {
        state.width = Number(widthSlider.value);
        widthReadout.textContent = state.width.toFixed(2);
        scheduleRefresh();
    });

    document.getElementById("swash-reset").addEventListener("click", () => {
        widthSlider.value = "1";
        state.width = 1;
        widthReadout.textContent = "1.00";
        scheduleRefresh();
    });

    document.getElementById("header-download").addEventListener("click", () => {
        const size = SIZES[state.size];
        save(
            renderHeader(size.width, size.height, state.chroma, state),
            headerName(size)
        );
    });

    await refresh();

    // Last, and after the first paint: the sketches are the slowest thing on
    // the page to draw and the least urgent to see.
    lab = initLab({ groundAt, save, loadImage, buildSegment, chroma: () => state.chroma });
}

main();
