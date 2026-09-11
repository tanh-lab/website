/**
 * GLSL for the hero flare, on a single fullscreen triangle.
 *
 * The fragment shader is carried over from the reference pen essentially
 * verbatim. The additions are the `precision` line — which GLSL ES requires and
 * Three.js would otherwise inject on your behalf — the grain block, which goes
 * into the shape *before* the tint so it colours with the flare rather than
 * hazing the empty areas into a flat wash, and the Oklab hue turn, which goes
 * *after* everything because it grades the finished artwork.
 *
 * Everything in it keys off how far `iMouse` sits from centre, so a pointer at
 * the edge would kill the effect entirely. That is corrected on the JS side by
 * soft-clamping the pointer into a disc; the shader itself is untouched.
 */

/**
 * Every uniform the fragment shader declares, which is what `createQuadProgram`
 * needs in order to cache their locations. It lives here rather than beside the
 * render loop because this is the file that declares them: anything that
 * compiles this shader needs the same list, and there is now more than one
 * caller — the hero flare, and the brand renderer in tools/.
 */
export const UNIFORMS = [
    "iResolution",
    "iTime",
    "iMouse",
    "intensity",
    "streakLength",
    "streakHeight",
    "glowPower",
    "flareSize",
    "colorIntensity",
    "primaryColor",
    "contrastBW",
    "saturation",
    "invert",
    "hueTurn",
    "grainAmount",
    "grainSize"
] as const;

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
uniform float hueTurn;
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

// The sRGB transfer function, both ways. Oklab is defined over linear light, so
// without these the turn below would be rotating gamma-encoded numbers and the
// hue would not land where the degrees say it does.
vec3 toLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}

vec3 toSrgb(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
               step(vec3(0.0031308), c));
}

/**
 * Turn a colour about the neutral axis in Oklab.
 *
 * The same transform /ci/ carries over the mark's ground, and the same one that
 * took the mark off magenta — restated in GLSL rather than shared, since the
 * page's is a loop over an ImageData and this is a fragment. a and b rotate; L
 * is untouched, so the flare changes what colour it is without changing how
 * light or how saturated it is.
 */
vec3 turnHue(vec3 color, float turn) {
    vec3 lin = toLinear(clamp(color, 0.0, 1.0));
    vec3 lms = vec3(
        dot(lin, vec3(0.4122214708, 0.5363325363, 0.0514459929)),
        dot(lin, vec3(0.2119034982, 0.6806995451, 0.1073969566)),
        dot(lin, vec3(0.0883024620, 0.2817188376, 0.6299787005)));
    lms = pow(max(lms, 0.0), vec3(1.0 / 3.0));
    vec3 lab = vec3(
        dot(lms, vec3(0.2104542553, 0.7936177850, -0.0040720468)),
        dot(lms, vec3(1.9779984951, -2.4285922050, 0.4505937099)),
        dot(lms, vec3(0.0259040371, 0.7827717662, -0.8086757660)));

    float c = cos(radians(turn));
    float s = sin(radians(turn));
    lab.yz = vec2(lab.y * c - lab.z * s, lab.y * s + lab.z * c);

    vec3 back = vec3(
        lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z,
        lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z,
        lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z);
    back = back * back * back;
    vec3 rgb = vec3(
        dot(back, vec3(4.0767416621, -3.3077115913, 0.2309699292)),
        dot(back, vec3(-1.2684380046, 2.6097574011, -0.3413193965)),
        dot(back, vec3(-0.0041960863, -0.7034186147, 1.7076147010)));
    return clamp(toSrgb(clamp(rgb, 0.0, 1.0)), 0.0, 1.0);
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

    // Coverage is read off the colour before the turn, not after. The flare is
    // composited onto the page, so this alpha is how much of the page it hides;
    // a hue control that also moved it would be changing the shape of the
    // artwork, not its colour. Rotating a and b leaves L alone but not the sum
    // of the three channels, so the two have to be taken in this order.
    float coverage = outcol.r + outcol.g + outcol.b;

    // Guarded because it is a full Oklab round trip per pixel and the dark
    // theme asks for none of it. hueTurn is uniform across the draw, so the
    // branch is coherent and costs nothing.
    if (hueTurn != 0.0) outcol = turnHue(outcol, hueTurn);

    gl_FragColor = vec4(outcol, coverage);
}
`;
