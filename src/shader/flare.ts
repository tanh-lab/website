import { onKeys } from "@/lib/keys";
import { prefersReducedMotion } from "@/lib/motion-preference";
import { onFrame } from "@/lib/raf";
import { onResize, pixelRatio } from "@/lib/resize";
import { createQuadProgram } from "@/shader/gl";
import { createPointerDrift } from "@/shader/pointer-drift";
import { FRAGMENT_SHADER, UNIFORMS, VERTEX_SHADER } from "@/shader/shaders";
import { applyFlareUniforms } from "@/shader/uniforms";
import { useMotionStore } from "@/store/useMotionStore";
import { useShaderStore } from "@/store/useShaderStore";
import { useThemeStore } from "@/store/useThemeStore";

/**
 * The hero artwork: a lens flare on one fullscreen triangle, in plain WebGL.
 * One triangle does not need a scene graph, and doing without one keeps the
 * hero free of a runtime dependency.
 *
 * Framework-free on purpose — it is driven by the shared frame loop and reads
 * its settings straight out of the stores, so it can be mounted from a React
 * effect without React being involved in any of the 60 frames per second.
 */
export function createFlare(canvas: HTMLCanvasElement): () => void {
    const quad = createQuadProgram(canvas, VERTEX_SHADER, FRAGMENT_SHADER, UNIFORMS);
    if (!quad) return () => {};

    const { gl, uniforms } = quad;
    const drift = createPointerDrift();
    const disposers: Array<() => void> = [];

    /** The shader clock. Advanced by flareSpeed, so it is not wall time. */
    let clock = 0;

    const render = () => {
        applyFlareUniforms(gl, uniforms, useShaderStore.getState());
        gl.uniform1f(uniforms.iTime!, clock);
        quad.draw();
    };

    const resize = () => {
        quad.resize(pixelRatio());
        render();
    };

    // The theme owns a palette and an invert state. Subscribing replays the
    // current theme immediately, so this cannot miss a change that happened
    // before the flare mounted — which is exactly what used to go wrong.
    useShaderStore.getState().applyThemePreset(useThemeStore.getState().theme);
    disposers.push(
        useThemeStore.subscribe((state, previous) => {
            if (state.theme === previous.theme) return;
            useShaderStore.getState().applyThemePreset(state.theme);
            render();
        })
    );

    disposers.push(onResize(resize));

    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    disposers.push(() => window.removeEventListener("pointermove", onPointerMove));
    disposers.push(() => canvas.removeEventListener("pointermove", onPointerMove));

    function onPointerMove(event: PointerEvent) {
        if (!useShaderStore.getState().followMouse) return;
        const box = canvas.getBoundingClientRect();
        if (!box.width || !box.height) return;
        drift.setPointer(
            (event.clientX - box.left) / box.width,
            // GL's origin is bottom-left; the pointer's is top-left.
            1 - (event.clientY - box.top) / box.height,
            event.timeStamp
        );
    }

    // A way back from a corner, once the pointer has dragged the flare there.
    disposers.push(onKeys(["0"], () => drift.centre()));

    quad.resize(pixelRatio());
    // One frame up front, so the canvas is not blank while it fades in.
    gl.uniform2f(uniforms.iMouse!, 0.5, 0.5);
    render();

    if (prefersReducedMotion()) {
        return () => disposers.forEach((fn) => fn());
    }

    disposers.push(
        onFrame((now, dt) => {
            const motion = useMotionStore.getState();
            // Hold still while a page transition runs, and while the preloader
            // still covers everything. The flare drifts on ~43s and ~63s
            // periods, so freezing it cannot be seen, and it hands a
            // full-viewport fragment pass per frame back to whatever is
            // actually on screen — the curve sweep, then the scroll.
            if (!motion.revealed || motion.paging) return;

            const settings = useShaderStore.getState();
            clock += 0.01 * settings.flareSpeed;
            const mouse = drift.update(clock, now, dt, settings);
            gl.uniform2f(uniforms.iMouse!, mouse.x, mouse.y);
            render();
        })
    );

    return () => {
        disposers.forEach((fn) => fn());
        quad.dispose();
    };
}
