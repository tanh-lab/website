/**
 * One resize listener for the whole page, coalesced to a frame.
 *
 * There were five: the header measurement, the paging reposition, the GL
 * drawing-buffer realloc, the wordmark refit and the brand remeasure. Each
 * forced layout or reallocated a buffer, and the browser fires resize on
 * every frame of a window drag — so a drag cost five forced layouts and a
 * GPU realloc per frame, in an order nobody had chosen. Subscribers now run
 * once per frame in registration order, which is also the order they depend
 * on each other: fit the wordmarks, then measure the header, then remeasure
 * the brand against both.
 *
 * Device-pixel-ratio changes come through here too. They are not resize
 * events — dragging a window from a Retina display to an external monitor
 * fires no resize at all — so the canvases kept their old backing-store
 * scale and rendered soft until the next reload.
 */
type ResizeFn = () => void;

const subscribers = new Set<ResizeFn>();
let scheduled = false;
let bound = false;
let dprQuery: MediaQueryList | null = null;

function flush() {
    scheduled = false;
    for (const fn of [...subscribers]) fn();
}

function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(flush);
}

/** Re-arm the DPR watch: the query has to be rebuilt around the new ratio. */
function watchDpr() {
    dprQuery?.removeEventListener("change", onDprChange);
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dprQuery.addEventListener("change", onDprChange);
}

function onDprChange() {
    watchDpr();
    schedule();
}

function bind() {
    if (bound) return;
    bound = true;
    window.addEventListener("resize", schedule, { passive: true });
    watchDpr();
}

/** Subscribe to coalesced resize + DPR changes. Returns an unsubscribe function. */
export function onResize(fn: ResizeFn): () => void {
    bind();
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}

/** Run every subscriber on the next frame, without waiting for a real resize. */
export { schedule as requestResize };

/** Capped so a 3x phone does not quadruple the fragment cost for no visible gain. */
export const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);
