/**
 * One requestAnimationFrame loop for the whole page.
 *
 * Previously the shader, the preloader sweep and the paging animation each
 * ran their own. Separate loops cannot be ordered against one another, and
 * every extra one is a separate wake-up for the compositor; worse, the
 * shader had no way to know it was drawing a frame that the paging animation
 * was about to invalidate.
 *
 * The loop only runs while something is subscribed, so an idle page costs
 * nothing.
 */
type FrameFn = (now: number, dt: number) => void;

const subscribers = new Set<FrameFn>();
let handle: number | null = null;
let previous = 0;

/** Seconds. Clamped so a backgrounded tab does not resume with a huge step. */
const MAX_DT = 0.1;
const DEFAULT_DT = 1 / 60;

function tick(now: number) {
    handle = requestAnimationFrame(tick);
    const dt = previous ? Math.min((now - previous) / 1000, MAX_DT) : DEFAULT_DT;
    previous = now;
    for (const fn of [...subscribers]) fn(now, dt);
}

/** Subscribe to the shared frame loop. Returns an unsubscribe function. */
export function onFrame(fn: FrameFn): () => void {
    subscribers.add(fn);
    if (handle === null) {
        previous = 0;
        handle = requestAnimationFrame(tick);
    }
    return () => {
        subscribers.delete(fn);
        if (subscribers.size === 0 && handle !== null) {
            cancelAnimationFrame(handle);
            handle = null;
        }
    };
}
