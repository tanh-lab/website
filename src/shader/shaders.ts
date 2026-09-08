/**
 * GLSL for the hero flare, on a single fullscreen triangle.
 *
 * The fragment shader is carried over from the reference pen essentially
 * verbatim. The only additions are the `precision` line — which GLSL ES
 * requires and Three.js would otherwise inject on your behalf — and the grain
 * block, which goes into the shape *before* the tint so it colours with the
 * flare rather than hazing the empty areas into a flat wash.
 *
 * Everything in it keys off how far `iMouse` sits from centre, so a pointer at
 * the edge would kill the effect entirely. That is corrected on the JS side by
 * soft-clamping the pointer into a disc; the shader itself is untouched.
 */

export const VERTEX_SHADER = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;
void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform float intensity;
uniform float streakLength;
uniform float streakHeight;
uniform float glowPower;
uniform float flareSize;
uniform float colorIntensity;
uniform vec3 primaryColor;
uniform float contrastBW;
uniform float saturation;
uniform bool invert;
uniform float grainAmount;
uniform float grainSize;
varying vec2 vUv;

// Value-noise fbm, so the grain has structure rather than being flat
// per-pixel dust.
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.02; a *= 0.5; }
    return v;
}

float interleavedGradientNoise(vec2 uv) {
    const vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
    return fract(magic.z * fract(dot(uv, magic.xy)));
}

float interglow(in vec2 uv, in vec2 pos, in vec3 flex, in float power) {
    vec2 uvd = uv * (length(uv)) * flex.xy;
    float edge = (1.0 / (1.0 + flex.z * pow(length(uvd - pos), power)));
    return clamp(edge, 0.0, 1.0);
}

vec3 blackAndWhite(vec3 color, float amount) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(color, vec3(luminance), amount);
}

vec3 adjustSaturation(vec3 color, float amount) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(luminance), color, amount);
}

void main() {
    vec2 uv = vUv;
    vec2 fragCoord = vUv * iResolution;
    vec2 mm = iMouse;

    float inz = interleavedGradientNoise(fragCoord);
    vec3 baseColor = vec3(1.0);
    vec3 outcol = vec3(0.0);

    // The streak.
    {
        const vec2 A = sin(vec2(0.0, 2.2));
        const mat2 Ar = mat2(A, -A.y, A.x);
        vec2 U = uv - mm.xy;
        U = (abs(U * Ar) * mat2(0.0, 0.0, streakLength, streakHeight));
        float lfStreak = 0.15 / max(U.x, U.y);
        float fadein = smoothstep(
            0.8, 1.0, 1.0 - (length(vec2(0.5) - mm) * 2.0 * flareSize));
        float xt = smoothstep(0.0, 1.1, lfStreak);
        outcol = baseColor * xt * (fadein * fadein * 2.0 * intensity);
    }

    // The glows.
    float xr1 = interglow(vec2(-0.5, -0.5) + uv, uv - mm, vec3(2.2, 1.5, 24.0 + inz), 1.25);
    float xr2 = interglow(vec2(-0.45, -0.55) + uv, uv - mm, vec3(4.2, 2.2, 28.0 + inz), 1.5);
    float xr3 = interglow(vec2(-0.53, -0.46) + uv, uv - mm, vec3(1.4, 4.6, 16.0 + inz), 1.1);

    outcol += baseColor * xr1 * xr1 * colorIntensity;
    outcol += baseColor * xr2 * colorIntensity * 0.7;
    outcol += baseColor * pow(xr3 + (inz * 0.3335), glowPower) * colorIntensity;

    // Grain goes in before the tint, scaled by luminance so it rides the
    // flare instead of fogging the empty ground.
    if (grainAmount > 0.0) {
        float gs = max(grainSize, 0.5);
        vec2 gq = floor(fragCoord / gs);
        float coarse = fbm(fragCoord * (0.010 / gs) + iTime * 0.35) - 0.5;
        float fine = hash21(gq * 1.7 + fract(iTime) * 91.3) - 0.5;
        float lum = max(max(outcol.r, outcol.g), outcol.b);
        outcol += (coarse * 0.55 + fine * 0.45) * grainAmount * lum * 2.0;
        outcol = max(outcol, vec3(0.0));
    }

    outcol *= primaryColor;
    outcol = adjustSaturation(outcol, saturation);
    outcol = blackAndWhite(outcol, contrastBW);
    outcol = clamp(outcol, 0.0, 1.0);
    if (invert) outcol = 1.0 - outcol;

    gl_FragColor = vec4(outcol, outcol.r + outcol.g + outcol.b);
}
`;
