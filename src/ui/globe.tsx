import { useEffect, useRef } from "react";

import { onResize, pixelRatio } from "@/lib/resize";
import { useThemeStore } from "@/store/useThemeStore";
import { BERLIN, drawGlobe } from "@/ui/globe-draw";

/**
 * The globe on About, marking where the studio is.
 *
 * Static, and oriented so Berlin faces the viewer. It was on the shared frame
 * loop turning slowly, which cost a redraw every frame to say the same thing
 * the single frame already says — and a rotating globe pulls the eye away from
 * the team list beside it, which is the page's actual content. Drawn once, then
 * only when the box or the theme changes.
 */
export function Globe() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        /* Longitude that puts Berlin square in front of the viewer. */
        const facing = (BERLIN.lon * Math.PI) / 180;
        let size = 0;
        let ratio = 1;

        /* Read from CSS rather than hard-coded, so the globe follows the theme —
           and About reverses its ground, so this is the one place on the site
           where the ink is the opposite of the page's own. */
        const ink = () => {
            const style = getComputedStyle(canvas);
            return {
                stroke: style.color,
                land: style.color,
                accent: style.color,
                font: `${Math.round(size / ratio / 22)}px ${style.fontFamily}`
            };
        };

        const render = () => {
            const box = canvas.getBoundingClientRect();
            ratio = pixelRatio();
            const next = Math.max(1, Math.round(box.width * ratio));
            if (canvas.width !== next) {
                canvas.width = next;
                canvas.height = next;
            }
            size = next;
            drawGlobe(ctx, size, facing, ink());
        };

        render();

        const disposers = [onResize(render), useThemeStore.subscribe(render)];
        return () => disposers.forEach((fn) => fn());
    }, []);

    return (
        <div className="globe" aria-hidden="true">
            <canvas ref={canvasRef} />
        </div>
    );
}
