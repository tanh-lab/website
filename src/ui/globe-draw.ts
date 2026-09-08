import { COASTLINES } from "@/data/coastline";

/**
 * An orthographic globe, drawn from projection maths.
 *
 * The graticule is pure trigonometry; the coastlines are Natural Earth 110m,
 * simplified hard — 50 rings and 1264 points, 5.6KB gzipped. A graticule alone
 * was geometrically honest and told you nothing: a dot at 52.5°N is only
 * meaningful if you can see it is in Europe.
 *
 * No mapping library. The projection is six lines, and the only thing a library
 * would add here is a dependency.
 */

export interface GlobePoint {
    /** Degrees north. */
    lat: number;
    /** Degrees east. */
    lon: number;
    label: string;
}

/** Berlin, to three decimals. */
export const BERLIN: GlobePoint = { lat: 52.52, lon: 13.405, label: "Berlin" };

const RAD = Math.PI / 180;

/** Tilt, so the sphere is seen slightly from above rather than edge on. */
const TILT = 22 * RAD;

/** Meridian and parallel spacing. Coarse: this is a mark, not an atlas. */
const STEP = 20;

interface Projected {
    x: number;
    y: number;
    /** True on the hemisphere facing the viewer. */
    visible: boolean;
}

/**
 * Orthographic projection: the sphere as it appears from infinitely far away,
 * which is the one projection where the outline is a true circle.
 */
function project(latDeg: number, lonDeg: number, spin: number, r: number): Projected {
    const lat = latDeg * RAD;
    const lon = lonDeg * RAD - spin;
    const cosLat = Math.cos(lat);
    return {
        x: r * cosLat * Math.sin(lon),
        /* Negated: the canvas y axis grows downward, so without this the
           northern hemisphere is drawn below the equator and Berlin lands
           somewhere off South Africa. */
        y:
            -r *
            (Math.cos(TILT) * Math.sin(lat) - Math.sin(TILT) * cosLat * Math.cos(lon)),
        visible:
            Math.sin(TILT) * Math.sin(lat) + Math.cos(TILT) * cosLat * Math.cos(lon) > 0
    };
}

/** Stroke a lat/lon path, lifting the pen wherever it goes behind the sphere. */
function strokeArc(
    ctx: CanvasRenderingContext2D,
    points: [number, number][],
    spin: number,
    r: number
) {
    let drawing = false;
    ctx.beginPath();
    for (const [lat, lon] of points) {
        const p = project(lat, lon, spin, r);
        if (!p.visible) {
            drawing = false;
            continue;
        }
        if (drawing) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
        drawing = true;
    }
    ctx.stroke();
}

export interface GlobeStyle {
    /** Ink for the graticule and the limb. */
    stroke: string;
    /** Ink for the coastlines. */
    land: string;
    /** Ink for the marker and its label. */
    accent: string;
    font: string;
}

export function drawGlobe(
    ctx: CanvasRenderingContext2D,
    size: number,
    spin: number,
    style: GlobeStyle
) {
    const r = size / 2 - size * 0.12;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.lineWidth = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // The limb: the true circle an orthographic projection always gives.
    ctx.strokeStyle = style.stroke;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // Graticule. Parallels first, then meridians, both at a coarse spacing.
    ctx.globalAlpha = 0.16;
    for (let lat = -80; lat <= 80; lat += STEP) {
        const ring: [number, number][] = [];
        for (let lon = -180; lon <= 180; lon += 4) ring.push([lat, lon]);
        strokeArc(ctx, ring, spin, r);
    }
    for (let lon = -180; lon < 180; lon += STEP) {
        const arc: [number, number][] = [];
        for (let lat = -90; lat <= 90; lat += 4) arc.push([lat, lon]);
        strokeArc(ctx, arc, spin, r);
    }

    // Coastlines over the graticule, so land reads as the subject and the grid
    // as the armature.
    ctx.strokeStyle = style.land;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 0.9;
    for (const ring of COASTLINES) {
        const path: [number, number][] = [];
        // Flat [lon, lat, ...] — see src/data/coastline.ts for why.
        for (let i = 0; i < ring.length; i += 2) path.push([ring[i + 1]!, ring[i]!]);
        strokeArc(ctx, path, spin, r);
    }
    ctx.lineWidth = 1;

    // The marker, drawn only while it is on the near side.
    const p = project(BERLIN.lat, BERLIN.lon, spin, r);
    if (p.visible) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = style.accent;
        ctx.strokeStyle = style.accent;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.stroke();

        // A leader out to the label, so the dot is not read as a blemish.
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(p.x + 9, p.y);
        ctx.lineTo(p.x + 22, p.y);
        ctx.stroke();

        ctx.globalAlpha = 0.85;
        ctx.fillStyle = style.accent;
        ctx.font = style.font;
        ctx.textBaseline = "middle";
        ctx.fillText(BERLIN.label, p.x + 27, p.y);
    }

    ctx.restore();
}
