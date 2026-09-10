/**
 * The mark's swash, at a width other than the one it was drawn at.
 *
 * public/favicon.svg carries the swash as a closed outline — the path Figma
 * exported — and an outline has no width to turn. What it does have is two
 * sides: the curve is a brush stroke, and every point down one side has a
 * partner across from it on the other. Pair them off, and the line through the
 * midpoints is the stroke's spine with each side an offset from it. Width then
 * moves the sides toward or away from that spine, so the swash keeps its path,
 * its reach and its taper and only its body changes.
 *
 * The move is a linear one. Writing the two sides as a and b,
 *
 *   a'(s) = spine(s) + w (a(s) - spine(s))
 *         = ((1 + w) / 2) a(s) + ((1 - w) / 2) b(s)
 *
 * — the outline blended with itself turned inside out. A blend of two Béziers
 * is a Bézier of the same degree taken control point by control point, so what
 * comes back is cubics rather than a resampled polygon: the outline stays as
 * sharp at any size as the one in the file, and at w = 1 it is that outline.
 *
 * The pairing is the only thing decided here. The outline is cut at its two
 * ends — the farthest-apart pair of points on it, which for a stroke that
 * tapers at both ends is the ends — and the halves are matched by arc length
 * from the same end. That is the right pairing for this artwork rather than a
 * guess at one: its two sides were offset from a common spine and still run to
 * within half a percent of the same length.
 */

/** Samples per cubic when a length is wanted. These are smooth; it is plenty. */
const LENGTH_SAMPLES = 128;

/** Samples per cubic when looking for the ends. Only the extremes matter. */
const END_SAMPLES = 40;

/** Two breakpoints closer than this fraction of a side are the same one. */
const MERGE = 1e-3;

/**
 * The shortest segment that is geometry rather than a seam.
 *
 * Figma closes the exported outline with four line segments of about a
 * hundredth of a unit, left where it joined the curves it drew. They carry no
 * shape, but they do carry breakpoints, and a breakpoint on one side with no
 * partner on the other pairs the halves off by one. Dropping them moves the
 * outline by less than a fiftieth of a unit in an 800-unit square.
 */
const MIN_SEGMENT = 0.5;

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * The path, as cubics.
 *
 * Lines come back as cubics with their control points on their ends, so
 * everything downstream has one shape to handle. Absolute M, L, C and Z only,
 * which is what the file holds; anything else is refused rather than guessed at.
 */
function parse(d) {
    if (/[^MLCZ0-9.,\-\s]/.test(d)) {
        throw new Error("swash: the outline uses a path command this cannot read");
    }
    const cubics = [];
    let cursor = null;
    let opened = null;
    for (const [, command, body] of d.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
        const n = (body.match(/-?\d*\.?\d+/g) ?? []).map(Number);
        if (command === "M") {
            cursor = [n[0], n[1]];
            opened = cursor;
        } else if (command === "L") {
            const end = [n[0], n[1]];
            cubics.push([cursor, cursor, end, end]);
            cursor = end;
        } else if (command === "C") {
            for (let i = 0; i + 5 < n.length; i += 6) {
                const end = [n[i + 4], n[i + 5]];
                cubics.push([cursor, [n[i], n[i + 1]], [n[i + 2], n[i + 3]], end]);
                cursor = end;
            }
        } else {
            if (cursor[0] !== opened[0] || cursor[1] !== opened[1]) {
                cubics.push([cursor, cursor, opened, opened]);
            }
            cursor = opened;
        }
    }
    return cubics;
}

function pointAt(c, t) {
    const u = 1 - t;
    return [0, 1].map(
        (k) =>
            u * u * u * c[0][k] +
            3 * u * u * t * c[1][k] +
            3 * u * t * t * c[2][k] +
            t * t * t * c[3][k]
    );
}

/** de Casteljau. Both halves are the same curve as the whole, exactly. */
function splitAt(c, t) {
    const a = [lerp(c[0], c[1], t), lerp(c[1], c[2], t), lerp(c[2], c[3], t)];
    const b = [lerp(a[0], a[1], t), lerp(a[1], a[2], t)];
    const m = lerp(b[0], b[1], t);
    return [
        [c[0], a[0], b[0], m],
        [m, b[1], a[2], c[3]]
    ];
}

/** Length along one cubic, sampled, as a running total. */
function table(c) {
    const cum = [0];
    let previous = c[0];
    for (let i = 1; i <= LENGTH_SAMPLES; i++) {
        const p = pointAt(c, i / LENGTH_SAMPLES);
        cum.push(cum[i - 1] + Math.hypot(p[0] - previous[0], p[1] - previous[1]));
        previous = p;
    }
    return cum;
}

const lengthOf = (c) => table(c)[LENGTH_SAMPLES];

/** The t at which a cubic has run this far along itself. */
function atLength(c, want) {
    const cum = table(c);
    for (let i = 0; i < LENGTH_SAMPLES; i++) {
        if (cum[i + 1] >= want) {
            const span = cum[i + 1] - cum[i];
            const within = span ? (want - cum[i]) / span : 0;
            return (i + within) / LENGTH_SAMPLES;
        }
    }
    return 1;
}

function chainTable(chain) {
    const cum = [0];
    for (const c of chain) cum.push(cum[cum.length - 1] + lengthOf(c));
    return cum;
}

/** Where this chain's joins fall, as fractions of its length. */
function breaksOf(chain) {
    const cum = chainTable(chain);
    const total = cum[cum.length - 1];
    return cum.slice(1, -1).map((v) => v / total);
}

const reverseChain = (chain) => chain.map((c) => [...c].reverse()).reverse();

/** The run of cubics from one point on the closed outline forward to another. */
function chainBetween(cubics, from, to) {
    const out = [];
    let i = from[0];
    let t = from[1];
    for (;;) {
        let piece = t > 0 ? splitAt(cubics[i], t)[1] : cubics[i];
        if (i === to[0] && t <= to[1]) {
            if (to[1] < 1) piece = splitAt(piece, t < 1 ? (to[1] - t) / (1 - t) : 0)[0];
            out.push(piece);
            return out;
        }
        out.push(piece);
        i = (i + 1) % cubics.length;
        t = 0;
    }
}

/**
 * Split a chain at these fractions of its length.
 *
 * A fraction already on a join is skipped, so cutting both sides at the union
 * of their joins leaves them with the same joins and the same count — which is
 * what lets the two be blended cubic by cubic. Splitting never changes the
 * curve, so the length a later fraction is measured against does not move.
 */
function cut(chain, fractions) {
    const out = chain.slice();
    for (const f of fractions) {
        const cum = chainTable(out);
        const total = cum[cum.length - 1];
        const target = f * total;
        const i = out.findIndex(
            (c, j) => cum[j] + MERGE * total < target && target < cum[j + 1] - MERGE * total
        );
        if (i < 0) continue;
        out.splice(i, 1, ...splitAt(out[i], atLength(out[i], target - cum[i])));
    }
    return out;
}

function dedupe(fractions) {
    const out = [];
    for (const f of [...fractions].sort((a, b) => a - b)) {
        if (!out.length || f - out[out.length - 1] > MERGE) out.push(f);
    }
    return out;
}

/** The two ends: the farthest-apart pair of points on the outline. */
function ends(cubics) {
    const points = [];
    for (let i = 0; i < cubics.length; i++) {
        for (let j = 0; j < END_SAMPLES; j++) {
            const t = j / END_SAMPLES;
            points.push([i, t, pointAt(cubics[i], t)]);
        }
    }
    let best = [-1, null, null];
    for (const a of points) {
        for (const b of points) {
            const away = Math.hypot(a[2][0] - b[2][0], a[2][1] - b[2][1]);
            if (away > best[0]) best = [away, a, b];
        }
    }
    return [best[1], best[2]].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}

const round = (v) => v.toFixed(3).replace(/\.?0+$/, "");
const place = (p) => round(p[0]) + " " + round(p[1]);

/**
 * Read a brush outline, and hand back the same outline at any width.
 *
 * The reading is the expensive half and is done once. What comes back is a
 * function of one number: 1 is the outline as given, and returns it untouched
 * so a file taken at the default setting is the file on disk.
 */
export function swash(d) {
    const cubics = parse(d).filter((c) => lengthOf(c) > MIN_SEGMENT);
    if (cubics.length < 4) {
        throw new Error("swash: the outline is too short to have two sides");
    }

    const [head, tail] = ends(cubics);
    const near = chainBetween(cubics, head, tail);
    const far = reverseChain(chainBetween(cubics, tail, head));
    const shared = dedupe([...breaksOf(near), ...breaksOf(far)]);
    const a = cut(near, shared);
    const b = cut(far, shared);
    if (a.length !== b.length) {
        throw new Error("swash: the two sides of the outline did not pair up");
    }

    return function at(width) {
        if (width === 1) return d;
        const k = (1 + width) / 2;
        const one = a.map((c, i) => c.map((p, j) => lerp(b[i][j], p, k)));
        const two = a.map((c, i) => c.map((p, j) => lerp(p, b[i][j], k)));

        // Out along one side and back along the other, so the ends meet where
        // the two sides already share a point and the outline closes on itself.
        let out = "M" + place(one[0][0]);
        for (const c of one) out += "C" + c.slice(1).map(place).join(" ");
        for (let i = two.length - 1; i >= 0; i--) {
            out += "C" + [two[i][2], two[i][1], two[i][0]].map(place).join(" ");
        }
        return out + "Z";
    };
}
