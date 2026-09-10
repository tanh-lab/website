/**
 * The experimental half of /ci/.
 *
 * Everything above this section is drawn from the artwork: one SVG, rasterised
 * and relabelled. Everything here is drawn from the function instead — tanh
 * over the real line, its level curves in the complex plane, and its polar
 * form. The geometry is computed rather than exported, so the file a visitor
 * takes away is the same curve the preview drew, at whatever size it is opened.
 *
 * None of it is in use. The section exists so the alternatives can be looked at
 * beside the mark rather than described.
 */

/** The square the mark uses, so a sketch can be dropped in beside it. */
const BOX = 800;

/** The complex square the level curves are read over, as in the Wolfram plot. */
const DOMAIN = 3;

/** Samples per side for the level curves. Smooth field; the lines carry it. */
const GRID = 140;

/**
 * A ceiling on the sampled value.
 *
 * tanh has poles at ±iπ/2, both inside the square, and a sample can land close
 * enough to one to come back infinite. Interpolating against an infinity gives
 * NaN and drops the whole cell, so the field is clamped instead: a very large
 * finite number puts the crossing hard against the pole, which is where it
 * belongs.
 */
const CLAMP = 1e6;

/** The ink each ground is drawn in. Contrast is the only decision here. */
const INK = { paper: "#1c1c1a", ink: "#e8e8e6", ground: "#ffebeb" };
const PAPER = { paper: "#ffffff", ink: "#1c1c1a" };

/* ---------- the function -------------------------------------------------- */

/**
 * tanh(x + iy), from the real identity rather than from complex arithmetic.
 *
 *   tanh(x + iy) = (sinh 2x + i sin 2y) / (cosh 2x + cos 2y)
 *
 * which is finite everywhere the denominator is, and states the poles plainly:
 * cosh 2x = 1 and cos 2y = -1 together mean x = 0, y = ±π/2.
 */
function ctanh(x, y) {
    const d = Math.cosh(2 * x) + Math.cos(2 * y);
    return [Math.sinh(2 * x) / d, Math.sin(2 * y) / d];
}

const reTanh = (x, y) => ctanh(x, y)[0];
const imTanh = (x, y) => ctanh(x, y)[1];

/* ---------- level curves -------------------------------------------------- */

/**
 * Which segments a cell contributes, by which of its corners are above the
 * level. Corners run a = bottom-left, b = bottom-right, c = top-right,
 * d = top-left; edges run 0 = bottom, 1 = right, 2 = top, 3 = left.
 *
 * Every pair is oriented so the region above the level lies to the left of the
 * direction of travel. That is what lets the segments be chained afterwards
 * without any geometry: the end of one is the start of the next.
 *
 * Cases 5 and 10 are the saddles — two opposite corners above the level, which
 * can join through the middle or not — and are decided from the cell's centre
 * rather than picked, so neighbouring cells cannot disagree.
 */
const CASES = [
    [],
    [[0, 3]],
    [[1, 0]],
    [[1, 3]],
    [[2, 1]],
    null,
    [[2, 0]],
    [[2, 3]],
    [[3, 2]],
    [[0, 2]],
    null,
    [[1, 2]],
    [[3, 1]],
    [[0, 1]],
    [[3, 0]],
    []
];

const SADDLE_5 = { apart: [[0, 3], [2, 1]], joined: [[0, 1], [2, 3]] };
const SADDLE_10 = { apart: [[1, 0], [3, 2]], joined: [[3, 0], [1, 2]] };

/** The field, sampled once per function and reused at every level. */
const fields = new Map();

function fieldOf(fn) {
    const cached = fields.get(fn);
    if (cached) return cached;

    const n = GRID;
    const values = new Float64Array((n + 1) * (n + 1));
    for (let j = 0; j <= n; j++) {
        const y = -DOMAIN + (2 * DOMAIN * j) / n;
        for (let i = 0; i <= n; i++) {
            const x = -DOMAIN + (2 * DOMAIN * i) / n;
            const v = fn(x, y);
            values[j * (n + 1) + i] = Number.isFinite(v)
                ? Math.max(-CLAMP, Math.min(CLAMP, v))
                : CLAMP;
        }
    }
    fields.set(fn, values);
    return values;
}

/**
 * The levels to draw, evenly spaced and stepped off zero.
 *
 * Both parts vanish along whole lines — Re tanh on the imaginary axis, Im tanh
 * on the real one — so the zero level is not a curve but a region, and asking
 * for it gives a smear rather than a line. Half-stepping the set keeps every
 * level a real contour. The range runs past 1 on purpose: |tanh| exceeds 1 only
 * around the poles, so the outer levels are exactly the loops that sit there.
 */
function levels(count) {
    const span = 2.4;
    const out = [];
    for (let m = 0; m < count; m++) {
        out.push(-span + (2 * span * (m + 0.5)) / count);
    }
    return out;
}

/**
 * Marching squares over a sampled field, chained into polylines.
 *
 * Endpoints are identified by which edge of the grid they fall on rather than
 * by their coordinates, so two cells sharing an edge produce the same key with
 * no rounding, and a contour comes out as one path instead of a thousand
 * two-point ones.
 */
function contourLines(values, level) {
    const n = GRID;
    const stride = n + 1;
    const hCount = n * stride;

    const at = (i, j) => values[j * stride + i];
    const gx = (i) => (i / n) * BOX;
    const gy = (j) => BOX - (j / n) * BOX;

    const points = new Map();
    const point = (id, xy) => {
        if (!points.has(id)) points.set(id, xy);
        return id;
    };

    const horizontal = (i, j) => {
        const a = at(i, j);
        const t = (level - a) / (at(i + 1, j) - a);
        return point(j * n + i, [gx(i + t), gy(j)]);
    };
    const vertical = (i, j) => {
        const a = at(i, j);
        const t = (level - a) / (at(i, j + 1) - a);
        return point(hCount + j * stride + i, [gx(i), gy(j + t)]);
    };

    const segments = [];
    const from = new Map();

    for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
            const a = at(i, j);
            const b = at(i + 1, j);
            const c = at(i + 1, j + 1);
            const d = at(i, j + 1);

            const code =
                (a >= level ? 1 : 0) |
                (b >= level ? 2 : 0) |
                (c >= level ? 4 : 0) |
                (d >= level ? 8 : 0);
            if (code === 0 || code === 15) continue;

            let pairs = CASES[code];
            if (!pairs) {
                const middle = (a + b + c + d) / 4 >= level;
                const saddle = code === 5 ? SADDLE_5 : SADDLE_10;
                pairs = middle ? saddle.joined : saddle.apart;
            }

            const edge = (which) => {
                if (which === 0) return horizontal(i, j);
                if (which === 1) return vertical(i + 1, j);
                if (which === 2) return horizontal(i, j + 1);
                return vertical(i, j);
            };

            for (const [start, end] of pairs) {
                const segment = { a: edge(start), b: edge(end) };
                segments.push(segment);
                from.set(segment.a, segment);
            }
        }
    }

    const ends = new Set(segments.map((s) => s.b));
    const used = new Set();
    const lines = [];

    const walk = (first) => {
        const pts = [points.get(first.a)];
        let current = first;
        for (;;) {
            used.add(current);
            pts.push(points.get(current.b));
            const next = from.get(current.b);
            if (!next || used.has(next)) break;
            current = next;
        }
        return pts;
    };

    // Open contours first, from the one end no segment arrives at; whatever is
    // left over is a closed loop and can be started anywhere.
    for (const segment of segments) {
        if (!used.has(segment) && !ends.has(segment.a)) lines.push(walk(segment));
    }
    for (const segment of segments) {
        if (!used.has(segment)) lines.push(walk(segment));
    }
    return lines;
}

/* ---------- paths --------------------------------------------------------- */

/**
 * Drop the points that say nothing.
 *
 * Every curve here is sampled far finer than it is drawn — a contour steps
 * through the grid cell by cell, the plots at a few hundred samples — and the
 * page carries eight of them at once. A point further than the tolerance from
 * the line its neighbours already describe is kept; the rest are not missed at
 * any size these are used at.
 */
function simplify(points, tolerance) {
    if (points.length < 3) return points;
    const out = [points[0]];
    let anchor = points[0];
    for (let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        const q = points[i + 1];
        const dx = q[0] - anchor[0];
        const dy = q[1] - anchor[1];
        const length = Math.hypot(dx, dy) || 1;
        const away = Math.abs((p[0] - anchor[0]) * dy - (p[1] - anchor[1]) * dx) / length;
        if (away > tolerance) {
            out.push(p);
            anchor = p;
        }
    }
    out.push(points[points.length - 1]);
    return out;
}

const round = (v) => (Math.round(v * 10) / 10).toString();

function toPath(points, tolerance) {
    const pts = simplify(points, tolerance);
    const first = pts[0];
    const last = pts[pts.length - 1];
    const closed = Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.05;
    const body = (closed ? pts.slice(0, -1) : pts)
        .map((p) => round(p[0]) + " " + round(p[1]))
        .join("L");
    return "M" + body + (closed ? "Z" : "");
}

/* ---------- the plots ----------------------------------------------------- */

/* The real plot's frame: x wider than y, because tanh is flat almost
   everywhere and a square window on a square domain draws a rule with a kink
   in it rather than a curve. */
const XSPAN = 2.6;
const YSPAN = 1.3;
const PAD = 92;

const cx = (x) => PAD + ((x + XSPAN) / (2 * XSPAN)) * (BOX - 2 * PAD);
const cy = (y) => BOX - (PAD + ((y + YSPAN) / (2 * YSPAN)) * (BOX - 2 * PAD));

/** tanh(kx), plotted. A span past XSPAN runs off the frame, for the crops. */
function curvePath(k, span = XSPAN) {
    const steps = 400;
    const points = [];
    for (let s = 0; s <= steps; s++) {
        const x = -span + (2 * span * s) / steps;
        points.push([cx(x), cy(Math.tanh(k * x))]);
    }
    return toPath(points, 0.4);
}

/**
 * r = tanh(jφ) over φ ∈ [-2π, 2π], in the convention the polar plot uses: a
 * negative radius is drawn at the opposite angle rather than dropped. So the
 * negative half-turn traces the same ring from the other side, and the two
 * passes through φ = 0 are the two spirals into the centre.
 *
 * The whole family lands on the same unit circle — tanh saturates within a
 * fraction of a turn at every j — so the rings are set at their own radii to be
 * told apart. Only the scale is chosen; the shape of each is the plot's.
 */
function polarPath(j, radius) {
    const turns = 2 * Math.PI;
    const steps = 4000;
    const points = [];
    for (let s = 0; s <= steps; s++) {
        const phi = -turns + (2 * turns * s) / steps;
        const r = Math.tanh(j * phi) * radius;
        points.push([BOX / 2 + r * Math.cos(phi), BOX / 2 - r * Math.sin(phi)]);
    }
    return toPath(points, 0.12);
}

function contourMarkup(fn, count, width, opacity) {
    const values = fieldOf(fn);
    let out = "";
    const fade = opacity === undefined ? "" : ' stroke-opacity="' + opacity + '"';
    for (const level of levels(count)) {
        for (const line of contourLines(values, level)) {
            out += '<path stroke-width="' + width + '"' + fade +
                ' d="' + toPath(line, 0.7) + '"/>';
        }
    }
    return out;
}

/**
 * The sketches.
 *
 * One control runs through all of them: k, the index the Wolfram tables step
 * through. On the real plots it is the steepness of the curve; on the complex
 * ones it is how many levels are drawn. Same number, so the set moves together.
 */
const MARKS = [
    {
        id: "curve",
        name: "Curve",
        note: "tanh kx, plotted and nothing more. The mark's swash is this line given a body.",
        draw: (k) => '<path stroke-width="46" d="' + curvePath(k) + '"/>'
    },
    {
        id: "sheaf",
        name: "Sheaf",
        note: "tanh jx for every j up to k, over one another. The family the slider walks, drawn at once.",
        draw: (k) => {
            let out = "";
            for (let j = 1; j <= k; j++) {
                out += '<path stroke-width="15" d="' + curvePath(j) + '"/>';
            }
            return out;
        }
    },
    {
        id: "roundel",
        name: "Roundel",
        note: "The curve run past the frame and cropped to a disc. The avatar form: square crops of it survive.",
        draw: (k) =>
            '<defs><clipPath id="lab-roundel"><circle cx="400" cy="400" r="316"/>' +
            "</clipPath></defs>" +
            '<g clip-path="url(#lab-roundel)">' +
            '<path stroke-width="42" d="' + curvePath(k, 3.6) + '"/></g>' +
            '<circle cx="400" cy="400" r="316" stroke-width="22"/>'
    },
    {
        id: "mirror",
        name: "Mirror",
        note: "tanh kx against its own reflection. Two flat approaches, one crossing, and the crossing is the whole of the mark.",
        draw: (k) =>
            '<path stroke-width="34" d="' + curvePath(k) + '"/>' +
            '<g transform="translate(0 ' + BOX + ') scale(1 -1)">' +
            '<path stroke-width="34" d="' + curvePath(k) + '"/></g>'
    },
    {
        id: "real",
        name: "Real part",
        note: "Level curves of Re tanh z over the square. The two eyes are the poles at ±iπ/2, where the levels close around themselves.",
        draw: (k) => contourMarkup(reTanh, 4 * k, 3)
    },
    {
        id: "imaginary",
        name: "Imaginary part",
        note: "The same square, the other component. Same two poles, and the levels arrive at them the other way about.",
        draw: (k) => contourMarkup(imTanh, 4 * k, 3)
    },
    {
        id: "net",
        name: "Conformal net",
        note: "Both families together, the imaginary one held back. They cross at right angles everywhere the derivative is not zero.",
        draw: (k) =>
            contourMarkup(imTanh, 3 * k, 2.5, 0.34) + contourMarkup(reTanh, 3 * k, 3)
    },
    {
        id: "vortex",
        name: "Vortex",
        note: "r = tanh jφ in polar form, for every j up to k. Each ring is where the plot saturates; the spirals are its two passes through the origin.",
        draw: (k) => {
            let out = "";
            for (let j = 1; j <= k; j++) {
                const radius = 316 * (0.42 + (0.58 * j) / k);
                out += '<path stroke-width="' + (k > 3 ? 12 : 16) + '" d="' +
                    polarPath(j, radius) + '"/>';
            }
            return out;
        }
    }
];

/* ---------- the section --------------------------------------------------- */

const FIELDS = [
    { id: "paper", label: "Paper" },
    { id: "ink", label: "Ink" },
    { id: "ground", label: "Ground" }
];

/** Geometry is expensive and does not depend on the ground it is drawn over. */
const geometry = new Map();

function drawnAt(mark, k) {
    const key = mark.id + ":" + k;
    const cached = geometry.get(key);
    if (cached) return cached;
    const markup = mark.draw(k);
    geometry.set(key, markup);
    return markup;
}

export function initLab({ groundAt, save, loadImage, buildSegment, chroma }) {
    const host = document.getElementById("lab-marks");
    const optionHost = document.getElementById("lab-options");
    const state = { k: 3, field: "paper" };

    /** The ground, encoded once per repaint rather than once per sketch. */
    let groundUrl = "";

    const background = () => {
        if (state.field === "ground") {
            return '<image href="' + groundUrl + '" x="0" y="0" width="' + BOX +
                '" height="' + BOX + '" preserveAspectRatio="none"/>';
        }
        return '<rect width="' + BOX + '" height="' + BOX + '" fill="' +
            PAPER[state.field] + '"/>';
    };

    const svgFor = (mark) =>
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + BOX + " " + BOX +
        '" width="' + BOX + '" height="' + BOX + '">' +
        background() +
        '<g fill="none" stroke="' + INK[state.field] +
        '" stroke-linecap="round" stroke-linejoin="round"' +
        (state.field === "ground" ? ' stroke-opacity="0.92"' : "") +
        ">" +
        drawnAt(mark, state.k) +
        "</g></svg>";

    const fileName = (mark, extension) =>
        "tanh-lab-sketch-" + mark.id + "-k" + state.k +
        (state.field === "paper" ? "" : "-" + state.field) + "." + extension;

    async function rasterise(svg, size) {
        const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
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

    function saveSvg(mark) {
        const url = URL.createObjectURL(
            new Blob([svgFor(mark)], { type: "image/svg+xml" })
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName(mark, "svg");
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
    }

    /* One card per sketch, built once; only the artwork inside is replaced. */
    const previews = new Map();

    for (const mark of MARKS) {
        const item = document.createElement("li");
        item.className = "mark";

        const preview = document.createElement("div");
        preview.className = "preview";

        const name = document.createElement("h3");
        name.textContent = mark.name;

        const note = document.createElement("p");
        note.textContent = mark.note;

        const files = document.createElement("div");
        files.className = "files";

        const svgButton = document.createElement("button");
        svgButton.type = "button";
        svgButton.textContent = "SVG";
        svgButton.addEventListener("click", () => saveSvg(mark));

        const pngButton = document.createElement("button");
        pngButton.type = "button";
        pngButton.textContent = "PNG 1024";
        pngButton.addEventListener("click", async () => {
            save(await rasterise(svgFor(mark), 1024), fileName(mark, "png"));
        });

        files.append(svgButton, pngButton);
        item.append(preview, name, note, files);
        host.append(item);
        previews.set(mark.id, preview);
    }

    function render() {
        if (state.field === "ground") {
            groundUrl = groundAt(chroma()).toDataURL("image/png");
        }
        for (const mark of MARKS) {
            previews.get(mark.id).innerHTML = svgFor(mark);
        }
    }

    /* ---------- the two controls ---------- */

    const detail = document.createElement("label");
    detail.className = "option";

    const detailLabel = document.createElement("span");
    detailLabel.className = "math";
    detailLabel.textContent = "k";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "1";
    slider.max = "6";
    slider.step = "1";
    slider.value = String(state.k);

    const readout = document.createElement("output");
    readout.className = "readout";
    readout.textContent = String(state.k);

    slider.addEventListener("input", () => {
        state.k = Number(slider.value);
        readout.textContent = slider.value;
        render();
    });

    detail.append(detailLabel, slider, readout);

    const field = document.createElement("div");
    field.className = "option";

    const fieldLabel = document.createElement("span");
    fieldLabel.textContent = "Field";

    const segment = document.createElement("div");
    segment.className = "segment";
    buildSegment(segment, FIELDS, state.field, (id) => {
        state.field = id;
        render();
    });

    field.append(fieldLabel, segment);
    optionHost.append(detail, field);

    render();

    return {
        /** The top slider moves the ground; only the sketches over it change. */
        onChroma() {
            if (state.field === "ground") render();
        }
    };
}
