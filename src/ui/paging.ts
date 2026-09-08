import { onKeys } from "@/lib/keys";
import { prefersReducedMotion } from "@/lib/motion-preference";
import { onResize } from "@/lib/resize";
import { useMotionStore } from "@/store/useMotionStore";
import { scrollTick } from "@/ui/scroll-tick";

/**
 * One page per gesture, on our own clock.
 *
 * Native scroll snapping decides both when to move and how long it takes, and
 * neither is tunable. It waits for a gesture to accumulate before committing —
 * the dead spot before anything happens — and then lands in about 300ms, which
 * is a rush for a mark travelling the height of the screen. This takes both
 * over: it commits on the first event of a gesture, so the response stays
 * immediate, and eases out over PAGE_MS so the travel has room to read.
 *
 * Below 900px the stylesheet turns snapping off and lets pages grow past the
 * viewport, so this stands down there too.
 */

/** The whole move. This is the knob for "too fast". */
const PAGE_MS = 700;
/** Quiet that separates one gesture from the next. */
const GAP_MS = 150;
/** px of wheel travel that commits a gesture. */
const COMMIT = 20;
/** px per line, for `deltaMode: 1` — Firefox reports lines, not pixels. */
const LINE = 40;
/** px of touch travel that commits. */
const SWIPE = 40;

const WIDE = "(min-width: 901px)";

/**
 * Quadratic ease-out. The snappiness a gesture wants is in *committing* at
 * once, which this does on the first event — not in a velocity spike. A cubic
 * or expo out covers half the screen in the first quarter of the time and
 * reads as a lurch followed by a drift.
 */
const ease = (t: number) => 1 - Math.pow(1 - t, 2);

export interface Paging {
    /** Move to a page by index, animated. */
    goTo: (index: number) => void;
    /** Move to the page with this element, if it is one. Returns false if not. */
    goToElement: (el: Element | null) => boolean;
    dispose: () => void;
}

export function createPaging(scroller: HTMLElement): Paging {
    const pages = [...scroller.children].filter((el): el is HTMLElement =>
        el instanceof HTMLElement ? el.matches(".hero, .page") : false
    );

    const wide = window.matchMedia(WIDE);
    const disposers: Array<() => void> = [];

    let index = 0;
    let frame: number | null = null;
    let lastWheel = -Infinity;
    /** May the gesture in progress still fire? */
    let armed = true;
    /** Wheel distance accumulated within the current gesture. */
    let travel = 0;
    /** Smallest delta seen since the last commit. */
    let quietest = Infinity;
    /** Direction of the gesture in progress. */
    let heading = 0;
    /** One step held back while a move runs. */
    let queued = 0;

    const height = () => scroller.clientHeight || 1;
    const position = () => scroller.scrollTop / height();

    /**
     * Where a gesture should land, read from the scroll position rather than
     * from `index`. Anything can move the scroller behind our back — dragging
     * a text selection past the edge auto-scrolls it, so does focusing a link
     * — and a stored index then sends the next gesture to the wrong page. The
     * epsilon keeps an exactly-aligned page from rounding the wrong way.
     */
    const step = (direction: number) => {
        // Mid-move the reference is the page being animated *to*, not the
        // fractional position under way — otherwise a second scroll during the
        // move re-targets the page already being travelled to, and looks like
        // it was ignored.
        if (frame !== null) return index + (direction > 0 ? 1 : -1);
        const p = position();
        return direction > 0 ? Math.floor(p + 1e-3) + 1 : Math.ceil(p - 1e-3) - 1;
    };

    const stop = () => {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        useMotionStore.getState().setPaging(false);
    };

    const goTo = (target: number) => {
        const clamped = Math.max(0, Math.min(pages.length - 1, target));
        index = clamped;
        const to = clamped * height();
        const from = scroller.scrollTop;
        stop();
        if (Math.abs(to - from) < 1) return;

        if (prefersReducedMotion()) {
            scroller.scrollTop = to;
            scrollTick.emit();
            return;
        }

        const started = performance.now();
        useMotionStore.getState().setPaging(true);

        // Named `advance`, not `step`: a named function expression binds its
        // own name in scope, and calling it `step` shadowed the step() helper
        // above — the queue flush then called this callback instead and fed its
        // undefined return straight back into goTo().
        frame = requestAnimationFrame(function advance(now) {
            const t = Math.min((now - started) / PAGE_MS, 1);
            scroller.scrollTop = from + (to - from) * ease(t);
            scrollTick.emit(); // same frame, not the next
            if (t < 1) {
                frame = requestAnimationFrame(advance);
                return;
            }
            stop();
            if (queued) {
                const direction = queued;
                queued = 0;
                goTo(step(direction));
            }
        });
    };

    /**
     * Input during a move is queued rather than dropped or run immediately:
     * dropping it reads as unresponsive, running it lets a burst of wheel
     * events fly through several pages at once. At most one step is held, and
     * the latest direction wins — so the pace is one page per move however
     * hard the wheel is pushed.
     */
    const commit = (direction: number) => {
        if (frame !== null) {
            queued = direction > 0 ? 1 : -1;
            return;
        }
        goTo(step(direction));
    };

    /**
     * One page per gesture. A mouse wheel delivers a gesture as one large
     * event, but a trackpad delivers a stream of small ones — often starting
     * below a pixel — so the trigger has to be accumulated distance, not the
     * size of any single event. A gap in the stream is what separates one
     * gesture from the next; everything during the move and during the
     * momentum tail falls inside the same gesture and is swallowed.
     *
     * Bound to the window, not the scroller: the header and the brand layer are
     * its siblings, so a wheel with the pointer over the top strip never
     * bubbled through the scroller and did nothing at all.
     */
    const onWheel = (event: WheelEvent) => {
        if (!wide.matches) return;
        // ctrl/⌘ + wheel is how both trackpad pinch and mouse wheel reach the
        // browser's own zoom. Swallowing it disabled zoom across the whole
        // site, which is an accessibility regression, not a scroll behaviour.
        if (event.ctrlKey || event.metaKey) return;
        if (event.target instanceof Element && event.target.closest(".controls")) return;
        event.preventDefault();

        const now = performance.now();
        const unit = event.deltaMode === 1 ? LINE : event.deltaMode === 2 ? height() : 1;
        const delta = event.deltaY * unit;
        const size = Math.abs(delta);
        const direction = delta > 0 ? 1 : -1;

        // A gap in the stream is one way to know a gesture is new. The other is
        // that the input got stronger again: a momentum tail only ever decays,
        // so a delta rising back above the quietest one seen is a fresh push.
        // Without this, scrolling again during a move was swallowed — the tail
        // kept the stream unbroken, so no gap ever arrived.
        const rearm =
            now - lastWheel > GAP_MS ||
            (!armed && direction !== heading) ||
            (!armed && size > quietest * 2 + 2);
        if (rearm) {
            armed = true;
            travel = 0;
            quietest = Infinity;
        }
        lastWheel = now;
        if (!armed) {
            quietest = Math.min(quietest, size);
            return;
        }

        travel += delta;
        if (Math.abs(travel) < COMMIT) return;

        armed = false;
        heading = direction;
        quietest = size;
        commit(travel);
    };

    // Touch: above 900px includes tablets in landscape, where there is no wheel.
    let touchY: number | null = null;

    const onTouchStart = (event: TouchEvent) => {
        touchY =
            wide.matches && frame === null ? (event.touches[0]?.clientY ?? null) : null;
    };

    const onTouchMove = (event: TouchEvent) => {
        if (!wide.matches) return;
        if (event.target instanceof Element && event.target.closest(".controls")) return;
        event.preventDefault(); // we own the vertical axis
        if (touchY === null) return;
        const y = event.touches[0]?.clientY;
        if (y === undefined) return;
        const dy = touchY - y;
        if (Math.abs(dy) < SWIPE) return;
        touchY = null;
        commit(dy);
    };

    const onTouchEnd = () => {
        touchY = null;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    disposers.push(
        () => window.removeEventListener("wheel", onWheel),
        () => window.removeEventListener("touchstart", onTouchStart),
        () => window.removeEventListener("touchmove", onTouchMove),
        () => window.removeEventListener("touchend", onTouchEnd)
    );

    const KEY_STEPS: Record<string, number> = {
        ArrowDown: 1,
        PageDown: 1,
        " ": 1,
        ArrowUp: -1,
        PageUp: -1
    };

    disposers.push(
        onKeys([...Object.keys(KEY_STEPS), "Home", "End"], (event) => {
            if (!wide.matches || event.metaKey || event.ctrlKey || event.altKey) return;
            if (event.key === "Home") {
                event.preventDefault();
                goTo(0);
                return;
            }
            if (event.key === "End") {
                event.preventDefault();
                goTo(pages.length - 1);
                return;
            }
            const direction = KEY_STEPS[event.key];
            if (!direction) return;
            event.preventDefault();
            commit(direction);
        })
    );

    const goToElement = (el: Element | null) => {
        if (!el) return false;
        const i = pages.indexOf(el as HTMLElement);
        if (i < 0) return false;
        goTo(i);
        return true;
    };

    /**
     * In-page anchors, delegated. Without native smooth scrolling these would
     * otherwise jump.
     *
     * Delegated rather than bound per anchor so that links rendered later are
     * covered too, and the target is resolved with `getElementById` on the
     * fragment rather than `querySelector(href)`: a bare `href="#"` — which
     * three links on the page have — is not a valid selector, and
     * `querySelector("#")` throws a SyntaxError. That exception aborted the
     * handler before `preventDefault`, so those links jumped the scroller to
     * the top instead of doing nothing.
     */
    const onClick = (event: MouseEvent) => {
        if (!wide.matches) return;
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (!(event.target instanceof Element)) return;

        const anchor = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
        const id = anchor?.getAttribute("href")?.slice(1);
        if (!id) return;

        if (goToElement(document.getElementById(id))) event.preventDefault();
    };

    document.addEventListener("click", onClick);
    disposers.push(() => document.removeEventListener("click", onClick));

    const apply = () => {
        if (wide.matches) {
            // Both of these would fight every frame we write.
            scroller.style.scrollSnapType = "none";
            scroller.style.scrollBehavior = "auto";
            scroller.style.touchAction = "pan-x pinch-zoom";
            index = Math.round(position());
        } else {
            stop();
            scroller.style.scrollSnapType = "";
            scroller.style.scrollBehavior = "";
            scroller.style.touchAction = "";
        }
    };

    // Resize repositions by `index`, so it has to track strays too.
    const onScroll = () => {
        if (frame === null) index = Math.round(position());
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    disposers.push(() => scroller.removeEventListener("scroll", onScroll));

    apply();
    wide.addEventListener("change", apply);
    disposers.push(() => wide.removeEventListener("change", apply));

    disposers.push(
        onResize(() => {
            if (!wide.matches || frame !== null) return;
            scroller.scrollTop = index * height();
        })
    );

    return {
        goTo,
        goToElement,
        dispose: () => {
            stop();
            disposers.forEach((fn) => fn());
        }
    };
}
