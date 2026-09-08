/**
 * The WebGL plumbing, kept apart from the effect itself: compile, link, bind
 * one fullscreen triangle, and cache uniform locations. Nothing here knows
 * what a flare is.
 */

export interface QuadProgram {
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    /** Uniform locations by name. Missing (or optimised-out) names give null. */
    uniforms: Record<string, WebGLUniformLocation | null>;
    /** Resize the drawing buffer to the canvas's CSS box at `ratio`. */
    resize: (ratio: number) => void;
    draw: () => void;
    dispose: () => void;
}

function compile(
    gl: WebGLRenderingContext,
    type: number,
    source: string
): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("shader compile:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

/**
 * A single fullscreen triangle rather than a quad: it is one primitive instead
 * of two, and it has no diagonal seam where the two triangles of a quad meet.
 * The vertices sit outside clip space on purpose — the rasteriser clips it
 * back to exactly the viewport.
 */
const TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);

export function createQuadProgram(
    canvas: HTMLCanvasElement,
    vertexSource: string,
    fragmentSource: string,
    uniformNames: readonly string[]
): QuadProgram | null {
    const gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false
    });
    if (!gl) return null;

    const vs = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("shader link:", gl.getProgramInfoLog(program));
        return null;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE, gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    // This program's own record of what it last uploaded. Seeded out of range
    // so the first resize always runs, however the canvas is already sized.
    let lastWidth = -1;
    let lastHeight = -1;

    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const name of uniformNames) {
        uniforms[name] = gl.getUniformLocation(program, name);
    }

    return {
        gl,
        program,
        uniforms,
        resize(ratio) {
            const box = canvas.getBoundingClientRect();
            const width = Math.max(1, Math.round(box.width * ratio));
            const height = Math.max(1, Math.round(box.height * ratio));

            // Two separate questions, and conflating them cost the shader its
            // texture. Assigning canvas.width reallocates the drawing buffer
            // even when the value is unchanged — worth skipping, since a
            // resize-driven caller runs on every frame of a window drag.
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }

            // But uniforms are per-program, and the canvas outlives any one
            // program: guarding the upload on the *canvas* meant a program
            // created against an already-correct canvas never received
            // iResolution at all. fragCoord is `vUv * iResolution`, so it came
            // out zero everywhere and the interleaved-gradient dither collapsed
            // to a constant — the glow rendered perfectly smooth, missing the
            // fine per-pixel texture it is supposed to have. The record has to
            // belong to this program, hence a closure local seeded out of range.
            if (lastWidth !== width || lastHeight !== height) {
                lastWidth = width;
                lastHeight = height;
                gl.viewport(0, 0, width, height);
                if (uniforms.iResolution) {
                    gl.uniform2f(uniforms.iResolution, width, height);
                }
            }
        },
        draw() {
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
        dispose() {
            // Release this program's own objects, and nothing more.
            //
            // Emphatically NOT WEBGL_lose_context.loseContext(): a canvas hands
            // out one context for its lifetime, and a lost one stays lost. React
            // in development mounts an effect, tears it down and mounts it again
            // to surface exactly this kind of bug — so losing the context here
            // killed it on the first teardown, and the second mount compiled
            // against a dead context, failing with an empty info log. The result
            // was no shader at all in development, while production, where the
            // double-invoke does not happen, looked fine.
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
        }
    };
}
