/**
 * Experimental monochrome mark generator on /ci/.
 *
 * Plots cuts of tanh — the real-line curve, Re/Im contours on C, polar petals,
 * line slices, and orthographic projections — and hands them out as SVG / PNG.
 * Independent of ci.js: the shipped mark and chroma pipeline are untouched.
 */

const INK = { dark: "#1c1c1a", light: "#e8e8e6" };
const PAPER = { light: "#ffffff", dark: "#1c1c1a" };

const PREVIEW = 400;
/** Temp flood resolution for discovering regions on click (not kept). */
const FLOOD_RES = 1024;
const GRID = 160;
const POLE_EPS = 1e-4;
const FIELD_CLIP = 2;
const CURVE_SAMPLES = 256;
const POLAR_SAMPLES = 720;
const PROJ_GRID = 36;
/** RDP simplify tolerance in flood-canvas pixels. */
const TRACE_EPSILON = 1.5;

const FAMILIES = [
    { id: "curve", label: "Curve" },
    { id: "re", label: "Re contours" },
    { id: "im", label: "Im contours" },
    { id: "polar", label: "Polar" },
    { id: "slice", label: "Slice" },
    { id: "projection", label: "Projection" }
];

const DRAW_STYLES = [
    { id: "lines", label: "Lines" },
    { id: "bands", label: "Bands" },
    { id: "sign", label: "Sign" }
];

const SLICE_MODES = [
    { id: "re", label: "Re vs t" },
    { id: "im", label: "Im vs t" },
    { id: "image", label: "w-plane" }
];

const DEFAULTS = {
    family: "curve",
    stroke: 1.5,
    pad: 0.12,
    invert: false,
    strokeInvert: false,
    curveSpan: 5,
    domain: 3,
    levels: 24,
    style: "lines",
    k: 2,
    sliceAngle: 0,
    sliceOffset: 0,
    sliceSpan: 3,
    sliceMode: "re",
    projPart: "re",
    azimuth: 35,
    elevation: 28
};

/** State keys owned by each plot family (not shared stroke / pad / ink). */
const FAMILY_KEYS = {
    curve: ["curveSpan"],
    re: ["domain", "levels", "style"],
    im: ["domain", "levels", "style"],
    polar: ["k"],
    slice: ["sliceAngle", "sliceOffset", "sliceSpan", "sliceMode"],
    projection: ["projPart", "domain", "azimuth", "elevation"]
};

const state = { ...DEFAULTS };

/** Re/Im contour bands the user has filled — regenerates vector quads each paint. */
let filledBands = new Set();

/** World-space closed rings for Curve / Polar / Slice / Projection fills. */
let fillPolygons = [];

/**
 * Last paint's view: bounds, pad, world strokes, and the canvas transform at
 * FLOOD_RES — enough to map clicks and re-flood without a persistent bitmap.
 */
let lastView = null;

/** Ignore range input while boot/reset is settling form restoration. */
let booting = true;

/** Last geometry produced by paint(), used for SVG export. */
let lastGeom = null;

const previewScale = () => Math.min(2, window.devicePixelRatio || 1);

/* ---------- complex tanh -------------------------------------------------- */

function tanhRe(x, y) {
    const d = Math.cosh(2 * x) + Math.cos(2 * y);
    if (Math.abs(d) < POLE_EPS) return NaN;
    return Math.sinh(2 * x) / d;
}

function tanhIm(x, y) {
    const d = Math.cosh(2 * x) + Math.cos(2 * y);
    if (Math.abs(d) < POLE_EPS) return NaN;
    return Math.sin(2 * y) / d;
}

function clipField(v) {
    if (!Number.isFinite(v)) return NaN;
    return Math.max(-FIELD_CLIP, Math.min(FIELD_CLIP, v));
}

/* ---------- geometry helpers ---------------------------------------------- */

/**
 * Map a world-space polyline into the padded square [0, size]².
 * Returns paths, and the transform used (for click hit-testing).
 */
function fitPaths(polylines, size, padFrac, bounds) {
    const pad = size * padFrac;
    const span = size - pad * 2;
    const { minX, maxX, minY, maxY } = bounds;
    const w = Math.max(1e-9, maxX - minX);
    const h = Math.max(1e-9, maxY - minY);
    // Uniform scale so aspect is preserved; centre the unused axis.
    const scale = Math.min(span / w, span / h);
    const ox = pad + (span - w * scale) / 2;
    const oy = pad + (span - h * scale) / 2;
    const transform = { ox, oy, scale, minX, maxY, size };

    const paths = [];
    for (const line of polylines) {
        if (line.length < 2) continue;
        const pts = [];
        for (const [x, y] of line) {
            pts.push([ox + (x - minX) * scale, oy + (maxY - y) * scale]);
        }
        paths.push(pts);
    }
    return { paths, transform };
}

function screenToWorld(px, py, transform) {
    const { ox, oy, scale, minX, maxY } = transform;
    return [minX + (px - ox) / scale, maxY - (py - oy) / scale];
}

/** Even-odd point-in-polygon test. */
function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0];
        const yi = poly[i][1];
        const xj = poly[j][0];
        const yj = poly[j][1];
        const hit =
            yi > y !== yj > y &&
            x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-15) + xi;
        if (hit) inside = !inside;
    }
    return inside;
}

function boundsOf(polylines) {
    let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
    for (const line of polylines) {
        for (const [x, y] of line) {
            if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    if (!Number.isFinite(minX)) {
        return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
    }
    // Square the view so marks stay centred and comparable across families.
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const half = Math.max(maxX - minX, maxY - minY, 1e-6) / 2;
    return { minX: cx - half, maxX: cx + half, minY: cy - half, maxY: cy + half };
}

function colors() {
    const invert = state.invert;
    const ink = invert ? INK.light : INK.dark;
    const paper = invert ? PAPER.dark : PAPER.light;
    // Stroke can flip against the fill ink — useful on filled regions.
    const stroke = state.strokeInvert
        ? invert
            ? INK.dark
            : INK.light
        : ink;
    return { ink, paper, stroke };
}

/* ---------- curve --------------------------------------------------------- */

function buildCurve() {
    const span = state.curveSpan;
    const line = [];
    for (let i = 0; i <= CURVE_SAMPLES; i++) {
        const u = i / CURVE_SAMPLES;
        const x = -span + u * 2 * span;
        line.push([x, Math.tanh(x)]);
    }
    return { strokes: [line], fills: [] };
}

/* ---------- marching squares ---------------------------------------------- */

function sampleField(part, domain, n) {
    const values = new Float64Array((n + 1) * (n + 1));
    const valid = new Uint8Array((n + 1) * (n + 1));
    const fn = part === "re" ? tanhRe : tanhIm;
    for (let j = 0; j <= n; j++) {
        const y = -domain + (j / n) * 2 * domain;
        for (let i = 0; i <= n; i++) {
            const x = -domain + (i / n) * 2 * domain;
            const v = clipField(fn(x, y));
            const idx = j * (n + 1) + i;
            values[idx] = v;
            valid[idx] = Number.isFinite(v) ? 1 : 0;
        }
    }
    return { values, valid, n, domain };
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function edgePoint(x0, y0, x1, y1, v0, v1, level) {
    const t = (level - v0) / (v1 - v0 || 1e-12);
    return [lerp(x0, x1, t), lerp(y0, y1, t)];
}

/**
 * Isolines via marching squares. Cells with any invalid corner (near a pole)
 * are skipped so contours do not jump the singularity.
 */
function contoursFromField(field, levels) {
    const { values, valid, n, domain } = field;
    const step = (2 * domain) / n;
    const lines = [];

    for (const level of levels) {
        const segs = [];
        for (let j = 0; j < n; j++) {
            const y0 = -domain + j * step;
            const y1 = y0 + step;
            for (let i = 0; i < n; i++) {
                const x0 = -domain + i * step;
                const x1 = x0 + step;
                const i00 = j * (n + 1) + i;
                const i10 = i00 + 1;
                const i01 = i00 + (n + 1);
                const i11 = i01 + 1;
                if (!valid[i00] || !valid[i10] || !valid[i01] || !valid[i11]) {
                    continue;
                }
                const v00 = values[i00];
                const v10 = values[i10];
                const v01 = values[i01];
                const v11 = values[i11];
                let code = 0;
                if (v00 >= level) code |= 1;
                if (v10 >= level) code |= 2;
                if (v11 >= level) code |= 4;
                if (v01 >= level) code |= 8;
                if (code === 0 || code === 15) continue;

                const bottom = () => edgePoint(x0, y0, x1, y0, v00, v10, level);
                const right = () => edgePoint(x1, y0, x1, y1, v10, v11, level);
                const top = () => edgePoint(x0, y1, x1, y1, v01, v11, level);
                const left = () => edgePoint(x0, y0, x0, y1, v00, v01, level);

                // Ambiguous cases 5 and 10: pick the average-based saddle split.
                const avg = (v00 + v10 + v11 + v01) / 4;
                switch (code) {
                    case 1:
                    case 14:
                        segs.push([left(), bottom()]);
                        break;
                    case 2:
                    case 13:
                        segs.push([bottom(), right()]);
                        break;
                    case 3:
                    case 12:
                        segs.push([left(), right()]);
                        break;
                    case 4:
                    case 11:
                        segs.push([right(), top()]);
                        break;
                    case 6:
                    case 9:
                        segs.push([bottom(), top()]);
                        break;
                    case 7:
                    case 8:
                        segs.push([left(), top()]);
                        break;
                    case 5:
                        if (avg >= level) {
                            segs.push([left(), top()]);
                            segs.push([bottom(), right()]);
                        } else {
                            segs.push([left(), bottom()]);
                            segs.push([right(), top()]);
                        }
                        break;
                    case 10:
                        if (avg >= level) {
                            segs.push([left(), bottom()]);
                            segs.push([right(), top()]);
                        } else {
                            segs.push([left(), top()]);
                            segs.push([bottom(), right()]);
                        }
                        break;
                }
            }
        }
        lines.push(...stitch(segs));
    }
    return lines;
}

/** Join collinear-ish segments into polylines where endpoints meet. */
function stitch(segs) {
    if (!segs.length) return [];
    const eps = 1e-6;
    const used = new Uint8Array(segs.length);
    const out = [];

    const near = (a, b) => Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;

    for (let s = 0; s < segs.length; s++) {
        if (used[s]) continue;
        used[s] = 1;
        const poly = [segs[s][0], segs[s][1]];
        let grew = true;
        while (grew) {
            grew = false;
            const head = poly[0];
            const tail = poly[poly.length - 1];
            for (let i = 0; i < segs.length; i++) {
                if (used[i]) continue;
                const [a, b] = segs[i];
                if (near(tail, a)) {
                    poly.push(b);
                    used[i] = 1;
                    grew = true;
                } else if (near(tail, b)) {
                    poly.push(a);
                    used[i] = 1;
                    grew = true;
                } else if (near(head, b)) {
                    poly.unshift(a);
                    used[i] = 1;
                    grew = true;
                } else if (near(head, a)) {
                    poly.unshift(b);
                    used[i] = 1;
                    grew = true;
                }
            }
        }
        if (poly.length >= 2) out.push(poly);
    }
    return out;
}

function levelList(count) {
    const levels = [];
    for (let i = 1; i < count; i++) {
        levels.push(-FIELD_CLIP + (i / count) * 2 * FIELD_CLIP);
    }
    return levels;
}

/** Contour levels for the current style. */
function activeLevels() {
    if (state.style === "sign") return [0];
    if (state.style === "bands") {
        return levelList(Math.max(4, Math.floor(state.levels / 2)));
    }
    return levelList(state.levels);
}

function bandAt(value, levels) {
    let band = 0;
    for (const lv of levels) {
        if (value >= lv) band++;
    }
    return band;
}

/** How many bands the current level list partitions the field into. */
function bandCount(levels) {
    return levels.length + 1;
}

/**
 * Seed filled regions from the style preset.
 * Lines starts empty (paint by clicking). Bands fills every other strip.
 * Sign fills the non-negative side. Clears freehand polygons too.
 */
function clearFills() {
    filledBands = new Set();
    fillPolygons = [];
}

function seedFilledBands() {
    clearFills();
    if (state.family !== "re" && state.family !== "im") return;
    if (state.style === "lines") return;

    const levels = activeLevels();
    const n = bandCount(levels);
    if (state.style === "bands") {
        for (let b = 1; b < n; b += 2) filledBands.add(b);
    } else if (state.style === "sign") {
        filledBands.add(1);
    }
}

function buildContours(part) {
    const field = sampleField(part, state.domain, GRID);
    const levels = activeLevels();
    // Isolines only — band fills are composed in renderMark from filledBands.
    return { strokes: contoursFromField(field, levels), fills: [] };
}

/**
 * Filled cells whose band index is in `which`.
 * Each cell is classified by the average of its corners relative to levels.
 */
function bandFills(field, levels, which) {
    const { values, valid, n, domain } = field;
    const step = (2 * domain) / n;
    const sorted = [...levels].sort((a, b) => a - b);
    const fills = [];
    if (!which || which.size === 0) return fills;

    for (let j = 0; j < n; j++) {
        const y0 = -domain + j * step;
        const y1 = y0 + step;
        for (let i = 0; i < n; i++) {
            const x0 = -domain + i * step;
            const x1 = x0 + step;
            const i00 = j * (n + 1) + i;
            const i10 = i00 + 1;
            const i01 = i00 + (n + 1);
            const i11 = i01 + 1;
            if (!valid[i00] || !valid[i10] || !valid[i01] || !valid[i11]) {
                continue;
            }
            const avg =
                (values[i00] + values[i10] + values[i11] + values[i01]) / 4;
            const band = bandAt(avg, sorted);
            if (which.has(band)) {
                fills.push([
                    [x0, y0],
                    [x1, y0],
                    [x1, y1],
                    [x0, y1]
                ]);
            }
        }
    }
    return fills;
}

/* ---------- polar --------------------------------------------------------- */

function polarPolyline(k) {
    const line = [];
    const twoPi = 2 * Math.PI;
    for (let i = 0; i <= POLAR_SAMPLES; i++) {
        const phi = -twoPi + (i / POLAR_SAMPLES) * 4 * Math.PI;
        let r = Math.tanh(k * phi);
        // Negative r: reflect through the origin (PolarPlot convention).
        let angle = phi;
        if (r < 0) {
            r = -r;
            angle += Math.PI;
        }
        line.push([r * Math.cos(angle), r * Math.sin(angle)]);
    }
    return line;
}

function buildPolar() {
    return { strokes: [polarPolyline(state.k)], fills: [] };
}

/* ---------- slice --------------------------------------------------------- */

function buildSlice() {
    const theta = (state.sliceAngle * Math.PI) / 180;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    // Offset perpendicular to the slice direction.
    const ox = -state.sliceOffset * s;
    const oy = state.sliceOffset * c;
    const span = state.sliceSpan;
    const line = [];

    for (let i = 0; i <= CURVE_SAMPLES; i++) {
        const t = -span + (i / CURVE_SAMPLES) * 2 * span;
        const x = t * c + ox;
        const y = t * s + oy;
        const re = tanhRe(x, y);
        const im = tanhIm(x, y);
        if (!Number.isFinite(re) || !Number.isFinite(im)) {
            // Break the polyline at poles.
            if (line.length >= 2) {
                // Handled by splitting below — push a sentinel.
                line.push(null);
            }
            continue;
        }
        if (state.sliceMode === "re") line.push([t, re]);
        else if (state.sliceMode === "im") line.push([t, im]);
        else line.push([re, im]);
    }

    const strokes = [];
    let current = [];
    for (const p of line) {
        if (p === null) {
            if (current.length >= 2) strokes.push(current);
            current = [];
        } else {
            current.push(p);
        }
    }
    if (current.length >= 2) strokes.push(current);
    return { strokes, fills: [] };
}

/* ---------- projection ---------------------------------------------------- */

function buildProjection() {
    const part = state.projPart;
    const domain = state.domain;
    const n = PROJ_GRID;
    const az = (state.azimuth * Math.PI) / 180;
    const el = (state.elevation * Math.PI) / 180;
    const cosA = Math.cos(az);
    const sinA = Math.sin(az);
    const cosE = Math.cos(el);
    const sinE = Math.sin(el);
    const fn = part === "re" ? tanhRe : tanhIm;

    const project = (x, y, z) => {
        // Rotate about Y (azimuth), then about X (elevation); drop depth.
        const x1 = x * cosA + z * sinA;
        const z1 = -x * sinA + z * cosA;
        const y1 = y * cosE - z1 * sinE;
        return [x1, y1];
    };

    const height = (x, y) => {
        const v = fn(x, y);
        if (!Number.isFinite(v)) return null;
        return Math.max(-FIELD_CLIP, Math.min(FIELD_CLIP, v));
    };

    const strokes = [];
    // Grid lines in x (constant y)
    for (let j = 0; j <= n; j++) {
        const y = -domain + (j / n) * 2 * domain;
        let current = [];
        for (let i = 0; i <= n; i++) {
            const x = -domain + (i / n) * 2 * domain;
            const z = height(x, y);
            if (z === null) {
                if (current.length >= 2) strokes.push(current);
                current = [];
                continue;
            }
            current.push(project(x, y, z * 0.55));
        }
        if (current.length >= 2) strokes.push(current);
    }
    // Grid lines in y (constant x)
    for (let i = 0; i <= n; i++) {
        const x = -domain + (i / n) * 2 * domain;
        let current = [];
        for (let j = 0; j <= n; j++) {
            const y = -domain + (j / n) * 2 * domain;
            const z = height(x, y);
            if (z === null) {
                if (current.length >= 2) strokes.push(current);
                current = [];
                continue;
            }
            current.push(project(x, y, z * 0.55));
        }
        if (current.length >= 2) strokes.push(current);
    }
    return { strokes, fills: [] };
}

/* ---------- compose ------------------------------------------------------- */

function buildGeometry() {
    switch (state.family) {
        case "curve":
            return buildCurve();
        case "re":
            return buildContours("re");
        case "im":
            return buildContours("im");
        case "polar":
            return buildPolar();
        case "slice":
            return buildSlice();
        case "projection":
            return buildProjection();
        default:
            return buildCurve();
    }
}

/**
 * Render geometry onto an offscreen canvas of `size` CSS-ish pixels
 * (caller multiplies by dpr for preview). Returns the canvas.
 * `overrides` merges into state for this draw only (thumbnails, etc.).
 */
function renderMark(size, overrides = null) {
    const saved = overrides ? { ...state } : null;
    if (overrides) Object.assign(state, overrides);
    try {
        const { strokes } = buildGeometry();
        const bandFillsWorld =
            !overrides &&
            (state.family === "re" || state.family === "im") &&
            filledBands.size
                ? bandFills(
                      sampleField(state.family, state.domain, GRID),
                      activeLevels(),
                      filledBands
                  )
                : [];
        const freeFills = overrides ? [] : fillPolygons;
        const fills = [...bandFillsWorld, ...freeFills];
        // Bounds from strokes only — fills must not shift the view or click
        // hit-testing drifts after the first paint.
        const bounds =
            state.family === "re" || state.family === "im"
                ? {
                      minX: -state.domain,
                      maxX: state.domain,
                      minY: -state.domain,
                      maxY: state.domain
                  }
                : boundsOf(strokes.length ? strokes : [[-1, -1], [1, 1]]);
        const fittedStrokes = fitPaths(strokes, size, state.pad, bounds);
        const fittedFills = fitPaths(fills, size, state.pad, bounds);
        const strokePaths = fittedStrokes.paths;
        const fillPaths = fittedFills.paths;
        const { ink, paper, stroke } = colors();
        const weight = state.stroke * (size / PREVIEW);

        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = paper;
        ctx.fillRect(0, 0, size, size);

        ctx.fillStyle = ink;
        for (const poly of fillPaths) {
            if (poly.length < 3) continue;
            ctx.beginPath();
            ctx.moveTo(poly[0][0], poly[0][1]);
            for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
            ctx.closePath();
            ctx.fill();
        }

        ctx.strokeStyle = stroke;
        ctx.lineWidth = weight;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const poly of strokePaths) {
            if (poly.length < 2) continue;
            ctx.beginPath();
            ctx.moveTo(poly[0][0], poly[0][1]);
            for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
            ctx.stroke();
        }

        if (!overrides) {
            const floodFit = fitPaths(strokes, FLOOD_RES, state.pad, bounds);
            lastView = {
                bounds,
                pad: state.pad,
                strokes,
                transform: floodFit.transform,
                barrierPaths: floodFit.paths,
                barrierWeight: state.stroke * (FLOOD_RES / PREVIEW),
                family: state.family
            };
            lastGeom = {
                strokePaths,
                fillPaths,
                ink,
                paper,
                stroke,
                size,
                weight
            };
        }
        return canvas;
    } finally {
        if (saved) Object.assign(state, saved);
    }
}

/* ---------- flood → vector trace (transient) ------------------------------ */

function barrierWalls(barrierPaths, barrierWeight) {
    const c = document.createElement("canvas");
    c.width = FLOOD_RES;
    c.height = FLOOD_RES;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, FLOOD_RES, FLOOD_RES);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = Math.max(2, barrierWeight * 1.35);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const strokePoly = (poly) => {
        if (poly.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(poly[0][0], poly[0][1]);
        for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
        ctx.stroke();
    };
    for (const poly of barrierPaths) strokePoly(poly);
    // Seal open strokes to the frame so a flood cannot wrap around an endpoint
    // (otherwise "above the curve" and "below" become one region).
    for (const poly of barrierPaths) {
        if (poly.length < 2) continue;
        strokePoly([poly[0], rayToBorder(poly[0], poly[0], poly[1], FLOOD_RES)]);
        const n = poly.length;
        strokePoly([
            poly[n - 1],
            rayToBorder(poly[n - 1], poly[n - 1], poly[n - 2], FLOOD_RES)
        ]);
    }
    const data = ctx.getImageData(0, 0, FLOOD_RES, FLOOD_RES).data;
    const wall = new Uint8Array(FLOOD_RES * FLOOD_RES);
    for (let i = 0; i < wall.length; i++) wall[i] = data[i * 4] < 200 ? 1 : 0;
    const n = FLOOD_RES;
    for (let i = 0; i < n; i++) {
        wall[i] = 1;
        wall[(n - 1) * n + i] = 1;
        wall[i * n] = 1;
        wall[i * n + (n - 1)] = 1;
    }
    return wall;
}

/** From `origin`, continue past `from`→`through` direction until the square border. */
function rayToBorder(origin, from, through, size) {
    let dx = from[0] - through[0];
    let dy = from[1] - through[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    // Step outward from the endpoint.
    let x = origin[0];
    let y = origin[1];
    const max = size * 2;
    for (let i = 0; i < max; i++) {
        x += dx;
        y += dy;
        if (x <= 0) return [0, y];
        if (y <= 0) return [x, 0];
        if (x >= size - 1) return [size - 1, y];
        if (y >= size - 1) return [x, size - 1];
    }
    return [origin[0], origin[1]];
}

/** Flood a temp mask from (mx, my); returns the mask or null if blocked. */
function floodRegion(mx, my, wall) {
    mx = mx | 0;
    my = my | 0;
    if (mx < 0 || my < 0 || mx >= FLOOD_RES || my >= FLOOD_RES) return null;
    const start = my * FLOOD_RES + mx;
    if (wall[start]) return null;
    const mask = new Uint8Array(FLOOD_RES * FLOOD_RES);
    const stack = [start];
    mask[start] = 1;
    let count = 0;
    while (stack.length) {
        const i = stack.pop();
        count++;
        const x = i % FLOOD_RES;
        const y = (i / FLOOD_RES) | 0;
        const tryPush = (nx, ny) => {
            if (nx < 0 || ny < 0 || nx >= FLOOD_RES || ny >= FLOOD_RES) return;
            const j = ny * FLOOD_RES + nx;
            if (wall[j] || mask[j]) return;
            mask[j] = 1;
            stack.push(j);
        };
        tryPush(x + 1, y);
        tryPush(x - 1, y);
        tryPush(x, y + 1);
        tryPush(x, y - 1);
    }
    if (count < 8) return null;
    return mask;
}

/**
 * Marching-squares boundary of a binary mask, stitched into polylines.
 * Returns the longest closed (or nearly closed) ring in canvas pixels.
 */
function traceMaskBoundary(mask) {
    const n = FLOOD_RES;
    const at = (x, y) =>
        x < 0 || y < 0 || x >= n || y >= n ? 0 : mask[y * n + x];
    const segs = [];
    for (let y = 0; y < n - 1; y++) {
        for (let x = 0; x < n - 1; x++) {
            const tl = at(x, y);
            const tr = at(x + 1, y);
            const br = at(x + 1, y + 1);
            const bl = at(x, y + 1);
            const code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
            if (code === 0 || code === 15) continue;
            const top = [x + 0.5, y];
            const right = [x + 1, y + 0.5];
            const bottom = [x + 0.5, y + 1];
            const left = [x, y + 0.5];
            switch (code) {
                case 1:
                case 14:
                    segs.push([left, bottom]);
                    break;
                case 2:
                case 13:
                    segs.push([bottom, right]);
                    break;
                case 3:
                case 12:
                    segs.push([left, right]);
                    break;
                case 4:
                case 11:
                    segs.push([right, top]);
                    break;
                case 6:
                case 9:
                    segs.push([bottom, top]);
                    break;
                case 7:
                case 8:
                    segs.push([left, top]);
                    break;
                case 5:
                    segs.push([left, top], [bottom, right]);
                    break;
                case 10:
                    segs.push([left, bottom], [right, top]);
                    break;
            }
        }
    }
    const rings = stitch(segs);
    if (!rings.length) return null;
    // Prefer the longest ring — usually the outer boundary of the fill.
    let best = rings[0];
    for (const ring of rings) {
        if (ring.length > best.length) best = ring;
    }
    return best;
}

/** Ramer–Douglas–Peucker polyline simplification. */
function simplifyRdp(points, epsilon) {
    if (points.length < 3) return points.slice();
    const sq = epsilon * epsilon;
    const dist2 = (p, a, b) => {
        let x = a[0];
        let y = a[1];
        let dx = b[0] - x;
        let dy = b[1] - y;
        if (dx !== 0 || dy !== 0) {
            const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) {
                x = b[0];
                y = b[1];
            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }
        dx = p[0] - x;
        dy = p[1] - y;
        return dx * dx + dy * dy;
    };
    const out = [];
    const rec = (start, end) => {
        let maxD = 0;
        let idx = 0;
        for (let i = start + 1; i < end; i++) {
            const d = dist2(points[i], points[start], points[end]);
            if (d > maxD) {
                maxD = d;
                idx = i;
            }
        }
        if (maxD > sq) {
            rec(start, idx);
            rec(idx, end);
        } else {
            out.push(points[start]);
        }
    };
    rec(0, points.length - 1);
    out.push(points[points.length - 1]);
    return out;
}

/**
 * Discover the paper region under a flood-canvas click and return it as a
 * world-space closed polygon, or null.
 */
function floodTraceWorld(mx, my) {
    if (!lastView) return null;
    const wall = barrierWalls(lastView.barrierPaths, lastView.barrierWeight);
    const mask = floodRegion(mx, my, wall);
    if (!mask) return null;
    const ring = traceMaskBoundary(mask);
    if (!ring || ring.length < 3) return null;
    const simplified = simplifyRdp(ring, TRACE_EPSILON);
    if (simplified.length < 3) return null;
    const world = simplified.map(([px, py]) =>
        screenToWorld(px, py, lastView.transform)
    );
    // Close the ring if needed.
    const a = world[0];
    const b = world[world.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-6) world.push([a[0], a[1]]);
    return world;
}

function toSvg() {
    // Rebuild at a nominal 512 viewBox so path coords are crisp and weight
    // matches the mid PNG.
    const size = 512;
    renderMark(size);
    const { strokePaths, fillPaths, ink, paper, stroke, weight } = lastGeom;
    const parts = [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
        `<rect width="100%" height="100%" fill="${paper}"/>`
    ];
    for (const poly of fillPaths) {
        if (poly.length < 3) continue;
        const d =
            "M" +
            poly.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L") +
            "Z";
        parts.push(`<path d="${d}" fill="${ink}"/>`);
    }
    for (const poly of strokePaths) {
        if (poly.length < 2) continue;
        const d =
            "M" +
            poly.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L");
        parts.push(
            `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${weight.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
        );
    }
    parts.push("</svg>");
    return parts.join("");
}

function fileBase() {
    const bits = ["tanh", state.family];
    if (state.family === "polar") bits.push("k" + state.k.toFixed(1).replace(".", ""));
    if (state.family === "re" || state.family === "im") bits.push(state.style);
    if (state.family === "slice") bits.push(state.sliceMode);
    if (state.family === "projection") bits.push(state.projPart);
    if (state.invert) bits.push("inv");
    if (state.strokeInvert) bits.push("stroke-inv");
    return bits.join("-");
}

function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/* ---------- UI ------------------------------------------------------------ */

const canvas = document.getElementById("logo-canvas");
const dims = document.getElementById("logo-dims");
const familyHost = document.getElementById("logo-family");
const optionsHost = document.getElementById("logo-options");
const invertHost = document.getElementById("logo-invert");
const strokeInvertHost = document.getElementById("logo-stroke-invert");
const thumbsHost = document.getElementById("logo-polar-thumbs");
const strokeInput = document.getElementById("logo-stroke");
const strokeOut = document.getElementById("logo-stroke-readout");
const padInput = document.getElementById("logo-pad");
const padOut = document.getElementById("logo-pad-readout");

function paintPreview() {
    if (!canvas) return;
    const dpr = previewScale();
    const source = renderMark(Math.round(PREVIEW * dpr));
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext("2d").drawImage(source, 0, 0);
    canvas.style.width = PREVIEW + "px";
    // Keep paper behind the bitmap in sync with invert / theme.
    canvas.style.background = colors().paper;
    canvas.classList.add("is-paintable");
    dims.textContent = describe();
    syncThumbPressed();
}

/** Update which polar thumbnail reads as selected, without redrawing them. */
function syncThumbPressed() {
    if (thumbsHost.hidden) return;
    let k = 1;
    for (const button of thumbsHost.children) {
        button.setAttribute("aria-pressed", String(k === state.k));
        k++;
    }
}

function describe() {
    switch (state.family) {
        case "curve":
            return `y = tanh(x), x ∈ [−${state.curveSpan}, ${state.curveSpan}]`;
        case "re":
            return `Re(tanh z) · ±${state.domain} · ${state.levels} levels · ${state.style}`;
        case "im":
            return `Im(tanh z) · ±${state.domain} · ${state.levels} levels · ${state.style}`;
        case "polar":
            return `r(φ) = tanh(${state.k} φ), φ ∈ [−2π, 2π]`;
        case "slice":
            return `slice @ ${state.sliceAngle}° · offset ${state.sliceOffset} · ${state.sliceMode}`;
        case "projection":
            return `${state.projPart === "re" ? "Re" : "Im"} surface · az ${state.azimuth}° · el ${state.elevation}°`;
        default:
            return "Monochrome SVG, and PNG at three sizes.";
    }
}

let queued = false;
function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        paintPreview();
    });
}

function segment(host, choices, current, onPick) {
    host.replaceChildren();
    for (const choice of choices) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = choice.label;
        button.setAttribute("aria-pressed", String(choice.id === current));
        button.addEventListener("click", () => onPick(choice.id));
        host.append(button);
    }
}

function buildFamilyPicker() {
    familyHost.replaceChildren();
    for (const fam of FAMILIES) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = fam.label;
        button.setAttribute("aria-pressed", String(fam.id === state.family));
        button.addEventListener("click", () => {
            state.family = fam.id;
            seedFilledBands();
            for (const other of familyHost.children) {
                other.setAttribute(
                    "aria-pressed",
                    String(other === button)
                );
            }
            rebuildOptions();
            thumbsHost.hidden = fam.id !== "polar";
            schedule();
        });
        familyHost.append(button);
    }
}

function rangeOption(label, key, min, max, step, format = (v) => String(v)) {
    const wrap = document.createElement("div");
    wrap.className = "option";
    const span = document.createElement("span");
    span.textContent = label;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(state[key]);
    input.autocomplete = "off";
    const out = document.createElement("output");
    out.textContent = format(state[key]);
    input.addEventListener("input", () => {
        if (booting) return;
        const v = Number(input.value);
        state[key] = v;
        out.textContent = format(v);
        // Geometry moved — painted regions no longer match the strokes.
        seedFilledBands();
        schedule();
    });
    wrap.append(span, input, out);
    return wrap;
}

function rebuildOptions() {
    optionsHost.replaceChildren();
    const f = state.family;

    if (f === "curve") {
        optionsHost.append(
            rangeOption("Span", "curveSpan", 1, 8, 0.5, (v) => v.toFixed(1))
        );
    }

    if (f === "re" || f === "im") {
        optionsHost.append(
            rangeOption("Domain", "domain", 1, 5, 0.25, (v) => "±" + v),
            rangeOption("Levels", "levels", 4, 48, 1, (v) => String(v))
        );
        const styleWrap = document.createElement("div");
        styleWrap.className = "option";
        styleWrap.innerHTML = "<span>Style</span>";
        const seg = document.createElement("div");
        seg.className = "segment";
        styleWrap.append(seg);
        segment(seg, DRAW_STYLES, state.style, (id) => {
            state.style = id;
            seedFilledBands();
            rebuildOptions();
            schedule();
        });
        optionsHost.append(styleWrap);
    }

    if (f === "polar") {
        optionsHost.append(
            rangeOption("k", "k", 1, 6, 0.1, (v) => v.toFixed(1))
        );
        thumbsHost.hidden = false;
        paintThumbs();
    } else {
        thumbsHost.hidden = true;
    }

    if (f === "slice") {
        optionsHost.append(
            rangeOption("Angle", "sliceAngle", 0, 180, 1, (v) => v + "°"),
            rangeOption("Offset", "sliceOffset", -2, 2, 0.05, (v) => v.toFixed(2)),
            rangeOption("Span", "sliceSpan", 1, 5, 0.25, (v) => "±" + v)
        );
        const modeWrap = document.createElement("div");
        modeWrap.className = "option";
        modeWrap.innerHTML = "<span>View</span>";
        const seg = document.createElement("div");
        seg.className = "segment";
        modeWrap.append(seg);
        segment(seg, SLICE_MODES, state.sliceMode, (id) => {
            state.sliceMode = id;
            seedFilledBands();
            rebuildOptions();
            schedule();
        });
        optionsHost.append(modeWrap);
    }

    if (f === "projection") {
        const partWrap = document.createElement("div");
        partWrap.className = "option";
        partWrap.innerHTML = "<span>Part</span>";
        const seg = document.createElement("div");
        seg.className = "segment";
        partWrap.append(seg);
        segment(
            seg,
            [
                { id: "re", label: "Re" },
                { id: "im", label: "Im" }
            ],
            state.projPart,
            (id) => {
                state.projPart = id;
                seedFilledBands();
                rebuildOptions();
                schedule();
            }
        );
        optionsHost.append(
            partWrap,
            rangeOption("Domain", "domain", 1, 4, 0.25, (v) => "±" + v),
            rangeOption("Azimuth", "azimuth", 0, 360, 1, (v) => v + "°"),
            rangeOption("Elevation", "elevation", 5, 85, 1, (v) => v + "°")
        );
    }
}

function paintThumbs() {
    if (thumbsHost.hidden) return;
    thumbsHost.replaceChildren();
    const dpr = previewScale();
    for (let k = 1; k <= 6; k++) {
        const thumb = renderMark(Math.round(72 * dpr), {
            family: "polar",
            k
        });
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("aria-pressed", String(k === state.k));
        const c = document.createElement("canvas");
        c.width = thumb.width;
        c.height = thumb.height;
        c.getContext("2d").drawImage(thumb, 0, 0);
        c.style.background = colors().paper;
        const label = document.createElement("span");
        label.textContent = "k=" + k;
        button.append(c, label);
        button.addEventListener("click", () => {
            state.k = k;
            const slider = optionsHost.querySelector('input[type="range"]');
            if (slider) {
                slider.value = String(k);
                const out = slider.nextElementSibling;
                if (out) out.textContent = k.toFixed(1);
            }
            seedFilledBands();
            schedule();
        });
        thumbsHost.append(button);
    }
}

function buildInvert() {
    segment(
        invertHost,
        [
            { id: "normal", label: "Dark" },
            { id: "invert", label: "Light" }
        ],
        state.invert ? "invert" : "normal",
        (id) => {
            state.invert = id === "invert";
            buildInvert();
            if (state.family === "polar") paintThumbs();
            schedule();
        }
    );
}

function buildStrokeInvert() {
    segment(
        strokeInvertHost,
        [
            { id: "same", label: "Same" },
            { id: "invert", label: "Invert" }
        ],
        state.strokeInvert ? "invert" : "same",
        (id) => {
            state.strokeInvert = id === "invert";
            buildStrokeInvert();
            if (state.family === "polar") paintThumbs();
            schedule();
        }
    );
}

function syncSharedControls() {
    strokeInput.value = String(state.stroke);
    strokeOut.textContent = Number(state.stroke).toString();
    padInput.value = String(state.pad);
    padOut.textContent = Number(state.pad).toFixed(2);
}

function wireShared() {
    strokeInput.addEventListener("input", () => {
        if (booting) return;
        state.stroke = Number(strokeInput.value);
        strokeOut.textContent = Number(strokeInput.value).toString();
        seedFilledBands();
        schedule();
    });
    padInput.addEventListener("input", () => {
        if (booting) return;
        state.pad = Number(padInput.value);
        padOut.textContent = state.pad.toFixed(2);
        seedFilledBands();
        schedule();
    });
}

function wireDownloads() {
    document.getElementById("logo-svg").addEventListener("click", () => {
        const svg = toSvg();
        downloadBlob(
            new Blob([svg], { type: "image/svg+xml" }),
            fileBase() + ".svg"
        );
    });
    for (const button of document.querySelectorAll("[data-logo-png]")) {
        button.addEventListener("click", () => {
            const size = Number(button.getAttribute("data-logo-png"));
            const mark = renderMark(size);
            mark.toBlob((blob) => {
                if (blob) downloadBlob(blob, fileBase() + "-" + size + ".png");
            }, "image/png");
        });
    }
}

/** Click a region to fill or clear it — vector bands or flood-traced polygons. */
function onCanvasClick(event) {
    if (booting) return;
    if (!lastView) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const mx = ((event.clientX - rect.left) / rect.width) * FLOOD_RES;
    const my = ((event.clientY - rect.top) / rect.height) * FLOOD_RES;
    const [wx, wy] = screenToWorld(mx, my, lastView.transform);

    // Remove a freehand polygon if the click lands inside one.
    for (let i = fillPolygons.length - 1; i >= 0; i--) {
        if (pointInPoly(wx, wy, fillPolygons[i])) {
            fillPolygons.splice(i, 1);
            schedule();
            return;
        }
    }

    if (state.family === "re" || state.family === "im") {
        const fn = state.family === "re" ? tanhRe : tanhIm;
        const value = clipField(fn(wx, wy));
        if (!Number.isFinite(value)) return;
        const band = bandAt(value, activeLevels());
        if (filledBands.has(band)) filledBands.delete(band);
        else filledBands.add(band);
        schedule();
        return;
    }

    const poly = floodTraceWorld(mx, my);
    if (poly) {
        fillPolygons.push(poly);
        schedule();
    }
}

function wireCanvasPaint() {
    canvas.addEventListener("click", onCanvasClick);
}

document.getElementById("logo-reset-type").addEventListener("click", () => {
    resetCurrentType();
});

document.getElementById("logo-reset").addEventListener("click", () => {
    resetToDefaults();
});

/* ---------- boot ---------------------------------------------------------- */

/** Restore defaults for the active family only, and clear its fills. */
function resetCurrentType() {
    const keys = FAMILY_KEYS[state.family] || [];
    for (const key of keys) state[key] = DEFAULTS[key];
    seedFilledBands();
    rebuildOptions();
    schedule();
}

function resetToDefaults() {
    Object.assign(state, DEFAULTS);
    seedFilledBands();
    buildFamilyPicker();
    buildInvert();
    buildStrokeInvert();
    rebuildOptions();
    thumbsHost.hidden = state.family !== "polar";
    syncSharedControls();
    paintPreview();
}

buildFamilyPicker();
buildInvert();
buildStrokeInvert();
rebuildOptions();
wireShared();
wireDownloads();
wireCanvasPaint();
thumbsHost.hidden = true;
syncSharedControls();
seedFilledBands();
paintPreview();

/**
 * Browsers restore prior <input type="range"> positions on reload, sometimes
 * after modules have run and even after pageshow. Snap back to defaults so a
 * reload always starts from the same mark.
 */
window.addEventListener("pageshow", resetToDefaults);
// Restoration can land after pageshow; settle once more on the next tasks.
queueMicrotask(resetToDefaults);
setTimeout(() => {
    resetToDefaults();
    booting = false;
}, 200);
