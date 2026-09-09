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
 */

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

const state = { chroma: 1, size: 2, lockup: "none", align: "left", ink: "dark" };

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

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("could not load " + src));
        image.src = src;
    });
}

const GROUND_IN_SVG = /href="data:image\/png;base64,([^"]+)"/;

let markSvg = "";
let ground = null;

async function loadArtwork() {
    markSvg = await (await fetch("/favicon.svg")).text();
    const match = markSvg.match(GROUND_IN_SVG);
    if (!match) throw new Error("no ground inlined in favicon.svg");
    ground = await loadImage("data:image/png;base64," + match[1]);
}

/** The mark's ground at the current chroma, at its own small native size. */
function groundAt(amount) {
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

/** The mark, rasterised by the browser from the SVG with the ground swapped in. */
async function renderMark(size, amount) {
    const swapped = markSvg.replace(
        GROUND_IN_SVG,
        () => 'href="' + groundAt(amount).toDataURL("image/png") + '"'
    );
    const url = URL.createObjectURL(new Blob([swapped], { type: "image/svg+xml" }));
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

    const lines = () => {
        const set = [
            fitLine(context, "tanh lab", "400", '"Instrument Serif", serif', 106, boxWidth)
        ];
        if (options.lockup === "full") {
            set.push(
                fitLine(
                    context,
                    "audio software agency",
                    "italic 200",
                    '"Barlow Semi Condensed", sans-serif',
                    116,
                    boxWidth
                )
            );
        }
        return set;
    };

    const stack = (set) => set.reduce((sum, line) => sum + line.height, 0);

    // The lockup is sized by its width, and its height falls out of the fit. On
    // the short banners — 1128x191 is six to one — that lands past the bottom
    // edge, so the box is pulled in until the mark sits inside the frame with
    // room around it.
    let set = lines();
    const limit = height * 0.62;
    if (stack(set) > limit) {
        boxWidth = (boxWidth * limit) / stack(set);
        set = lines();
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

function save(canvas, name) {
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

const suffix = () =>
    state.chroma === 1 ? "" : "-chroma" + state.chroma.toFixed(2).replace(".", "");

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
const slider = document.getElementById("chroma");
const readout = document.getElementById("chroma-readout");

function paint(canvas, source) {
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext("2d").drawImage(source, 0, 0);
}

async function refresh() {
    const size = SIZES[state.size];
    const dpr = previewScale();

    paint(markCanvas, await renderMark(MARK_PREVIEW * dpr, state.chroma));
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
        for (const choice of group.choices) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = choice.label;
            button.setAttribute("aria-pressed", String(state[group.key] === choice.id));
            button.addEventListener("click", () => {
                state[group.key] = choice.id;
                for (const other of segment.children) {
                    other.setAttribute("aria-pressed", String(other === button));
                }
                syncLockupOptions();
                scheduleRefresh();
            });
            segment.append(button);
        }

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

function wireMarkDownloads() {
    // The static links are correct only at full strength. Once the slider has
    // moved they would hand over a file that does not match what is on screen,
    // so they are taken over and rendered here instead.
    for (const link of document.querySelectorAll("#mark-files a[href*='mark-']")) {
        const size = Number(link.textContent.trim());
        link.addEventListener("click", async (event) => {
            event.preventDefault();
            save(
                await renderMark(size, state.chroma),
                "tanh-lab-mark-" + size + suffix() + ".png"
            );
        });
    }

    const svgLink = document.querySelector("#mark-files a[href='/favicon.svg']");
    svgLink.addEventListener("click", (event) => {
        if (state.chroma === 1) return; // the file on disk is already this
        event.preventDefault();
        const swapped = markSvg.replace(
            GROUND_IN_SVG,
            () => 'href="' + groundAt(state.chroma).toDataURL("image/png") + '"'
        );
        const url = URL.createObjectURL(new Blob([swapped], { type: "image/svg+xml" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "tanh-lab-mark" + suffix() + ".svg";
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
    wireMarkDownloads();

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

    document.getElementById("header-download").addEventListener("click", () => {
        const size = SIZES[state.size];
        save(
            renderHeader(size.width, size.height, state.chroma, state),
            headerName(size)
        );
    });

    await refresh();
}

main();
