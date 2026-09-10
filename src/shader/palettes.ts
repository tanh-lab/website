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
 * Each theme owns a palette, an invert state and a saturation.
 *
 * Light is the one that reads too pink: it tints with green and inverts, so
 * what reaches the eye is magenta. Its saturation is set to hold 0.7 of the
 * chroma the flare carried, the same figure the mark's ground is baked at.
 *
 * 0.95 rather than the 1.4 that arithmetic suggests. `adjustSaturation` is
 * `mix(luminance, colour, amount)`, which is linear in the distance from grey,
 * but the green tint has already zeroed red and blue: past an amount of 1 both
 * go negative, the clamp before the invert throws that away, and the chroma
 * stops tracking the number. So it was measured rather than derived — rendered
 * at a range of amounts and read back as mean Oklab chroma, where 0.95 lands on
 * 0.703 and the 1.4 it should have been lands on 0.847.
 *
 * Dark stays where it was: it is the purple over black, and nobody called it
 * pink.
 */
export const THEME_PRESETS: Record<
    Theme,
    { palette: PaletteName; invert: boolean; saturation: number }
> = {
    dark: { palette: "purple", invert: false, saturation: 2.0 },
    light: { palette: "green", invert: true, saturation: 0.95 }
};
