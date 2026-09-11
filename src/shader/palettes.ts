import type { Theme } from "@/store/useThemeStore";

/**
 * The flare is drawn white and tinted at the end, so a palette is a single
 * multiply colour.
 *
 * The `secondaryColor` uniform the reference pen carried is gone: it was
 * declared in the fragment shader and never read, so the compiler stripped it,
 * `getUniformLocation` returned null, and every upload was a silent no-op.
 */
export type PaletteName = keyof typeof PALETTES;

export const PALETTES = {
    original: [0.3, 0.3, 0.6],
    blue: [0.0, 0.0, 1.0],
    purple: [0.6, 0.0, 0.8],
    fire: [1.0, 0.3, 0.0],
    green: [0.0, 1.0, 0.0],
    magenta: [1.0, 0.0, 1.0]
} as const satisfies Record<string, readonly [number, number, number]>;

/**
 * Each theme owns a palette, an invert state, a saturation and a hue turn.
 *
 * Light is the one that read too pink: it tints with green and inverts, so what
 * reaches the eye is the same magenta the mark carried. It is graded the way
 * the mark is graded, in the same two passes and onto the same place — 0.384 of
 * the chroma the flare carried, at 289 degrees in Oklch.
 *
 * The saturation is measured rather than derived. `adjustSaturation` is
 * `mix(luminance, colour, amount)`, which is linear in the distance from grey,
 * but the green tint has already zeroed red and blue: past an amount of 1 both
 * go negative, the clamp before the invert throws that away, and the chroma
 * stops tracking the number. So it was rendered at a range of amounts and read
 * back as mean Oklab chroma over the frame composited on white. The first pass
 * held 0.703 of the chroma, at an amount of 0.95 rather than the 1.4 the
 * arithmetic gives; this one takes 0.55 of that, which is 0.51 and lands on
 * 0.384.
 *
 * The turn is 37 degrees, not the 39 the mark was given. A hue is somewhere
 * rather than a ratio, and the two artworks started a couple of degrees apart:
 * 37 is what puts the flare on 289.2, against the ground's own 289.0.
 *
 * Order matters between the two. At the chroma the first pass left, the bright
 * core of the flare sits on the edge of sRGB, and turning it toward violet — a
 * hue with less room at that lightness — pushes it out. The clamp on the way
 * back takes a third of the chroma with it and leaves the turn some four
 * degrees short of where it was asked for. `turnHue` runs last in the fragment
 * shader, so it sees the saturation already applied and stays in gamut.
 *
 * Dark stays where it was: it is the purple over black, and nobody called it
 * pink.
 */
export const THEME_PRESETS: Record<
    Theme,
    { palette: PaletteName; invert: boolean; saturation: number; hueTurn: number }
> = {
    dark: { palette: "purple", invert: false, saturation: 2.0, hueTurn: 0 },
    light: { palette: "green", invert: true, saturation: 0.51, hueTurn: -37 }
};
