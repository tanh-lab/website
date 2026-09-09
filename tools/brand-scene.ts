/**
 * The browser half of the brand renderer: one still frame, composed and
 * screenshotted at exactly the size asked for.
 *
 * Bundled and loaded into headless Chrome by tools/render-brand.ts. Where it
 * draws the flare it imports the shader, the GL plumbing and the defaults
 * straight out of src/ rather than restating any of them, which is the whole
 * point — a header that merely looked like the site would go stale the first
 * time the flare was touched.
 */
import { createQuadProgram } from "@/shader/gl";
import { THEME_PRESETS } from "@/shader/palettes";
import { FRAGMENT_SHADER, UNIFORMS, VERTEX_SHADER } from "@/shader/shaders";
import { applyFlareUniforms } from "@/shader/uniforms";
import { FLARE_DEFAULTS } from "@/store/useShaderStore";
import type { Theme } from "@/store/useThemeStore";

const params = new URLSearchParams(location.search);

const number = (key: string, fallback: number) => {
    const value = Number(params.get(key));
    return params.get(key) !== null && Number.isFinite(value) ? value : fallback;
};

/**
 * Draw the flare, if this scene is one that wants it.
 *
 * The other background — the mark's own ground, stretched — is a plain <img>
 * the page markup carries, so there is nothing to do here for it.
 */
function drawFlare(canvas: HTMLCanvasElement) {
    const theme: Theme = params.get("theme") === "dark" ? "dark" : "light";
    const quad = createQuadProgram(canvas, VERTEX_SHADER, FRAGMENT_SHADER, UNIFORMS);
    if (!quad) throw new Error("no webgl context");

    // Ratio 1: the window is opened at exactly the pixel size being rendered, so
    // the drawing buffer and the output PNG are the same grid. Anything else
    // would resample the flare on the way out.
    quad.resize(1);
    applyFlareUniforms(quad.gl, quad.uniforms, {
        ...FLARE_DEFAULTS,
        ...THEME_PRESETS[theme]
    });

    // iTime only feeds the grain, which the defaults leave at zero, so the frame
    // is a pure function of the pointer position — which is what makes a render
    // reproducible rather than a lucky screenshot.
    quad.gl.uniform1f(quad.uniforms.iTime!, 0);
    quad.gl.uniform2f(quad.uniforms.iMouse!, number("mx", 0.5), number("my", 0.5));
    quad.draw();
}

/**
 * Load an image and resolve once it has actually decoded.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`could not load ${src}`));
        image.src = src;
    });
}

/**
 * Draw the mark's own ground, stretched to the frame.
 *
 * The ground is carried in public/favicon.svg as a 96px raster — small on
 * purpose, because it is smooth enough that a larger one buys nothing and only
 * inflates a file that has to stay inlineable. Blowing that up by twenty-five
 * times in one step is where a browser's resampler starts showing its lattice,
 * so it goes up in doublings instead, which is the same trick a mip chain uses
 * and costs nothing at this size.
 *
 * Stretched rather than cropped: the field has no edges or figures to distort,
 * and stretching keeps the whole composition — pale top-left ramping into
 * saturated magenta bottom-right — instead of landing on one flat corner of it.
 */
async function drawGround(canvas: HTMLCanvasElement) {
    const image = await loadImage("/ground.png");
    // From the query, not from the element: the page is laid out at the exact
    // size being rendered precisely because the window cannot be trusted to be
    // it. See the note on the scene's stylesheet.
    const target = { width: number("w", 1200), height: number("h", 630) };

    const step = document.createElement("canvas");
    step.width = image.naturalWidth;
    step.height = image.naturalHeight;
    const stepContext = step.getContext("2d")!;
    stepContext.imageSmoothingQuality = "high";
    stepContext.drawImage(image, 0, 0);

    let width = step.width;
    let height = step.height;
    while (width < target.width || height < target.height) {
        const next = {
            width: Math.min(width * 2, target.width),
            height: Math.min(height * 2, target.height)
        };
        const scratch = document.createElement("canvas");
        scratch.width = next.width;
        scratch.height = next.height;
        const scratchContext = scratch.getContext("2d")!;
        scratchContext.imageSmoothingQuality = "high";
        scratchContext.drawImage(
            step,
            0,
            0,
            width,
            height,
            0,
            0,
            next.width,
            next.height
        );
        stepContext.canvas.width = next.width;
        stepContext.canvas.height = next.height;
        stepContext.imageSmoothingQuality = "high";
        stepContext.drawImage(scratch, 0, 0);
        width = next.width;
        height = next.height;
    }

    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d")!;
    context.imageSmoothingQuality = "high";
    context.drawImage(step, 0, 0, target.width, target.height);
}

/**
 * Fit each lockup line to its own rendered width, which is what sets the two
 * lines to a common measure — the short title large, the long subtitle small.
 * The same measurement the site takes in src/ui/wordmark-fit.ts, for the same
 * reason: the mark is live text, so the box it scales to has to be measured
 * rather than guessed. Restated rather than imported because that one reads the
 * hero rig's class names, which this page has no reason to reproduce.
 */
function fitLines() {
    for (const svg of document.querySelectorAll<SVGSVGElement>(".line")) {
        const text = svg.querySelector("text");
        const width = text?.getComputedTextLength() ?? 0;
        if (width <= 0) continue;
        const height = (svg.getAttribute("viewBox") ?? "").split(/\s+/)[3] ?? "106";
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    // The lockup is sized by its width, and its height falls out of the fit. On
    // the short banners — 1128x191 is six to one — that lands past the bottom
    // edge, so the box is pulled in until the mark sits inside the frame with
    // room around it.
    const lockup = document.querySelector<HTMLElement>(".lockup");
    if (!lockup) return;
    const limit = number("h", 630) * 0.62;
    const box = lockup.getBoundingClientRect();
    if (box.height > limit) {
        lockup.style.width = `${(box.width * limit) / box.height}px`;
    }
}

const canvas = document.getElementById("gl");
if (canvas instanceof HTMLCanvasElement) {
    if (params.get("bg") === "mark") await drawGround(canvas);
    else drawFlare(canvas);
}

// Chrome screenshots when it judges the page done; this is the signal the
// renderer actually waits on. It waits on the faces too, so a lockup is never
// measured — or captured — mid-swap.
await document.fonts.ready;
fitLines();
document.documentElement.dataset.ready = "1";
