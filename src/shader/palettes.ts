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
 * reaches the eye is the same magenta the mark carried. Two things are done
 * about it — the chroma comes down to 0.384 of what the flare carried, and the
 * whole thing turns 18 degrees, which puts it on 308.2 in Oklch.
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
 * The turn is not the mark's, and deliberately not. The mark sits on 289.0, and
 * 37 degrees is what puts the flare there — but the two are not the same object
 * to look at. The mark is an inch of artwork in a tab; the flare is the ground
 * the whole page stands on, and at that size the same hue reads as blue rather
 * than as a cast. 18 is half of it, settled by eye off a ladder of renders, and
 * it leaves the flare some 19 degrees warmer than the icon on purpose.
 *
 * Order matters between the two, which is why `turnHue` runs last in the
 * fragment shader rather than being left to a caller. At the chroma the first
 * pass left, the bright core sits on the edge of sRGB, and turning it toward
 * violet — a hue with less room at that lightness — pushes it out: taken at 37
 * degrees before the saturation, the clamp on the way back took a third of the
 * chroma and left the turn four degrees short of where it was asked for. After
 * the saturation, at 18, the turn costs no chroma at all.
 *
 * Dark stays where it was: it is the purple over black, and nobody called it
 * pink.
 */
export const THEME_PRESETS: Record<
    Theme,
    { palette: PaletteName; invert: boolean; saturation: number; hueTurn: number }
> = {
    dark: { palette: "purple", invert: false, saturation: 2.0, hueTurn: 0 },
    light: { palette: "green", invert: true, saturation: 0.51, hueTurn: -18 }
};
