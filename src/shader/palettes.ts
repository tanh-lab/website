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

/** Each theme owns a palette and an invert state. */
export const THEME_PRESETS: Record<Theme, { palette: PaletteName; invert: boolean }> = {
    dark: { palette: "purple", invert: false },
    light: { palette: "green", invert: true }
};
