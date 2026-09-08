import { useEffect, useRef } from "react";

import { createFlare } from "@/shader/flare";

/**
 * The shader backdrop: fixed behind every page, never scrolls.
 *
 * The canvas is inert to the pointer — the flare tracks the cursor from a
 * window-level listener instead — so it never intercepts a click meant for the
 * content above it.
 */
export function HeroArt() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        return createFlare(canvas);
    }, []);

    return (
        <div className="hero-art" aria-hidden="true">
            <canvas ref={canvasRef} className="hero-gl" id="hero-gl" />
        </div>
    );
}
