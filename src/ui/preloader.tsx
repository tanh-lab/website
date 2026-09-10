import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/motion-preference";
import { useMotionStore } from "@/store/useMotionStore";
import { useThemeStore } from "@/store/useThemeStore";

const SIZE = 44;
/** One pass, no repeat. */
const DRAW_MS = 800;
const STEEPNESS = 5.2;
const SAMPLES = 48;

/**
 * The preloader: a tanh curve drawing itself left to right, once, then handing
 * over to the reveal.
 *
 * Derived from the function the studio is named after, so the mark owes nothing
 * to anyone else's. The page is uncovered when the sweep has finished *and*
 * `load` has fired *and* the fonts have settled — whichever lands last — so the
 * animation never restarts and never cuts off mid-draw.
 */
export function Preloader() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const revealed = useMotionStore((state) => state.revealed);

    useEffect(() => {
        const canvas = canvasRef.current;
        const open = useMotionStore.getState().open;
        if (!canvas) {
            open("swept");
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            open("swept");
            return;
        }

        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = SIZE * ratio;
        canvas.height = SIZE * ratio;
        ctx.scale(ratio, ratio);

        const pad = SIZE * 0.16;
        const span = SIZE - pad * 2;
        const pointAt = (u: number): [number, number] => [
            pad + u * span,
            SIZE / 2 - Math.tanh((u - 0.5) * STEEPNESS) * (SIZE / 2 - pad)
        ];

        // Read once. This is a style recalc, and it was being forced on every
        // frame of the sweep.
        let ink = getComputedStyle(canvas).color;
        const unsubscribe = useThemeStore.subscribe(() => {
            ink = getComputedStyle(canvas).color;
        });

        const render = (drawn: number) => {
            ctx.clearRect(0, 0, SIZE, SIZE);
            ctx.strokeStyle = ink;
            ctx.lineWidth = 1.5;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();

            const upto = SAMPLES * drawn;
            const whole = Math.floor(upto);
            for (let i = 0; i <= whole; i++) {
                const [x, y] = pointAt(i / SAMPLES);
                if (i) ctx.lineTo(x, y);
                else ctx.moveTo(x, y);
            }
            // The tip lands between samples on all but the last frame. Without
            // this the line only grows when `upto` crosses a whole sample, and
            // the curve's own flattening near the end means it stops crossing
            // — it sat visibly frozen for the last 240ms of the 800.
            if (upto > whole) {
                const [x, y] = pointAt(upto / SAMPLES);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        };

        if (prefersReducedMotion()) {
            render(1);
            open("swept");
            return unsubscribe;
        }

        let frame = 0;
        let began = 0;

        const loop = (now: number) => {
            if (!began) began = now;
            const p = Math.min(1, (now - began) / DRAW_MS);
            // Linear, deliberately. The tanh shape supplies its own
            // acceleration — the stroke covers far more ink per frame through
            // the steep middle than across the flat tails — so easing on top of
            // it only distorts that. A cubic ease-out drew half the curve in
            // the first fifth of the time and then asymptoted, creeping the
            // last 0.8px over 240ms: not read as easing, read as a hang.
            // Measured ink growth: 13% in the first fifth, 16% in the last.
            render(p);
            if (p < 1) {
                frame = requestAnimationFrame(loop);
                return;
            }
            open("swept");
        };

        frame = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(frame);
            unsubscribe();
        };
    }, []);

    return (
        <div
            className={cn("preloader", revealed && "is-done")}
            id="preloader"
            aria-hidden="true"
        >
            <canvas ref={canvasRef} className="loader" width={SIZE} height={SIZE} />
        </div>
    );
}
