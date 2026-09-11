import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/motion-preference";
import { useMotionStore } from "@/store/useMotionStore";

const SIZE = 44;
/** One pass, no repeat. The same figure as `--sweep` in base.css. */
const DRAW_MS = 800;
const STEEPNESS = 5.2;
const SAMPLES = 48;

/**
 * The curve, as a path.
 *
 * Sampled rather than fitted: the shape is the function the studio is named
 * after, and 48 segments across 44px is finer than the stroke can show. Built
 * at module scope so it is a constant in the markup — the pre-render carries
 * the finished path, and the browser can paint it on the first frame without
 * waiting for the bundle to arrive and hydrate.
 */
const CURVE = (() => {
    const pad = SIZE * 0.16;
    const span = SIZE - pad * 2;
    let d = "";
    for (let i = 0; i <= SAMPLES; i++) {
        const u = i / SAMPLES;
        const x = pad + u * span;
        const y = SIZE / 2 - Math.tanh((u - 0.5) * STEEPNESS) * (SIZE / 2 - pad);
        d += `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d;
})();

/**
 * The preloader: a tanh curve sweeping in left to right, once, then handing
 * over to the reveal.
 *
 * Derived from the function the studio is named after, so the mark owes nothing
 * to anyone else's. The page is uncovered when the sweep has finished *and*
 * `load` has fired *and* the fonts have settled — whichever lands last — so the
 * animation never restarts and never cuts off mid-draw.
 *
 * The sweep is a panel sliding off a finished curve, not a curve drawn frame by
 * frame. It was the latter: a canvas re-stroked from a `requestAnimationFrame`
 * loop, which is a main-thread animation competing with the one thing that
 * saturates the main thread on a cold load — the bundle parsing, React
 * hydrating, the flare compiling its program. On a desktop that contest is
 * invisible. On an iPad it is not: hydration alone is a single task long enough
 * to swallow a run of frames, and the curve stopped dead in the middle of its
 * 800ms and then jumped. Nothing was slow; the animation simply was not being
 * given any frames to draw in.
 *
 * A transform animation is handed to the compositor and keeps its own time
 * there, so it runs at full rate through a blocked main thread. That is the
 * whole reason for the shape of this file: the curve is static markup, and the
 * only thing that moves is a rectangle in the preloader's own background colour
 * sliding off it. See `.loader-wipe` in base.css.
 *
 * Two things fall out of the change. The sweep now starts on the first painted
 * frame rather than after hydration, so it overlaps the load it used to follow
 * and the intro is shorter by however long the bundle took. And the ink is
 * `currentColor` rather than a colour read back from the element on every theme
 * change, which is one fewer style recalc and one fewer subscription.
 */
export function Preloader() {
    const wipeRef = useRef<HTMLSpanElement>(null);
    const revealed = useMotionStore((state) => state.revealed);

    useEffect(() => {
        const open = () => useMotionStore.getState().open("swept");
        const wipe = wipeRef.current;

        // Reduced motion means arriving already swept. The stylesheet has
        // already put the panel aside; this is only the gate.
        if (!wipe || prefersReducedMotion()) {
            open();
            return;
        }

        // The animation is started by CSS, possibly long before this effect
        // runs, so the end of it cannot be waited for with a listener — by here
        // it may already have happened. `finished` resolves either way, which
        // is the whole reason for going through the animation object rather
        // than `animationend`.
        //
        // The timer is the floor under that: it covers a browser with no
        // `getAnimations`, and an animation cancelled out from under us. `open`
        // ignores a gate that is already open, so whichever arrives first wins
        // and the other is a no-op.
        const timer = setTimeout(open, DRAW_MS + 120);
        const running = wipe.getAnimations?.() ?? [];
        if (running.length > 0) {
            void Promise.all(running.map((animation) => animation.finished)).then(
                open,
                open
            );
        }

        return () => clearTimeout(timer);
    }, []);

    return (
        <div
            className={cn("preloader", revealed && "is-done")}
            id="preloader"
            aria-hidden="true"
        >
            <span className="loader">
                <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
                    <path
                        d={CURVE}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                <span ref={wipeRef} className="loader-wipe" />
            </span>
        </div>
    );
}
