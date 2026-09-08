import { create } from "zustand";

import type { PaletteName } from "@/shader/palettes";
import { THEME_PRESETS } from "@/shader/palettes";
import type { Theme } from "@/store/useThemeStore";

export interface FlareSettings {
    palette: PaletteName;
    invert: boolean;
    followMouse: boolean;
    intensity: number;
    streakLength: number;
    streakHeight: number;
    glowPower: number;
    flareSize: number;
    flareSpeed: number;
    colorIntensity: number;
    contrastBW: number;
    saturation: number;
    grainAmount: number;
    grainSize: number;
    pointerReach: number;
    followEase: number;
    idleDrift: number;
    idleRoughness: number;
}

/** Numeric settings only — the dev panel builds one slider per entry. */
export type FlareNumericKey = {
    [K in keyof FlareSettings]: FlareSettings[K] extends number ? K : never;
}[keyof FlareSettings];

export interface FlareRange {
    key: FlareNumericKey;
    label: string;
    min: number;
    max: number;
    step: number;
}

/** Ranges follow the reference pen's GUI, with two deliberate departures. */
export const FLARE_RANGES: readonly FlareRange[] = [
    // Floor lowered from the pen's 0.1 to 0.0, so the streak can be switched
    // off outright rather than only turned down.
    { key: "intensity", label: "Flare intensity", min: 0, max: 2, step: 0.01 },
    { key: "streakLength", label: "Streak length", min: 1, max: 50, step: 0.1 },
    { key: "streakHeight", label: "Streak height", min: 0.1, max: 2, step: 0.01 },
    { key: "glowPower", label: "Glow power", min: 0.5, max: 5, step: 0.01 },
    { key: "flareSize", label: "Flare size", min: 0.1, max: 3, step: 0.01 },
    { key: "flareSpeed", label: "Animation speed", min: 0.1, max: 5, step: 0.01 },
    { key: "colorIntensity", label: "Colour intensity", min: 0.1, max: 0.5, step: 0.005 },
    { key: "contrastBW", label: "Black & white", min: 0, max: 1, step: 0.01 },
    { key: "saturation", label: "Saturation", min: 0, max: 2, step: 0.01 },
    { key: "grainAmount", label: "Grain intensity", min: 0, max: 1, step: 0.01 },
    { key: "grainSize", label: "Grain size", min: 0.5, max: 8, step: 0.1 },
    // 0.71 reaches the corners, which is the pen's raw 1:1 mapping.
    { key: "pointerReach", label: "Pointer reach", min: 0, max: 0.71, step: 0.005 },
    { key: "followEase", label: "Follow ease", min: 0.005, max: 0.2, step: 0.005 },
    { key: "idleDrift", label: "Idle drift", min: 0, max: 0.5, step: 0.01 },
    { key: "idleRoughness", label: "Idle roughness", min: 0, max: 1, step: 0.01 }
];

export const FLARE_DEFAULTS: FlareSettings = {
    palette: "purple",
    invert: false,
    followMouse: true,
    intensity: 0.0,
    streakLength: 48,
    streakHeight: 0.23,
    glowPower: 2.75,
    flareSize: 1.52,
    flareSpeed: 1.0,
    colorIntensity: 0.5,
    contrastBW: 0.0,
    saturation: 2.0,
    grainAmount: 0.0,
    grainSize: 1.6,
    pointerReach: 0.12,
    followEase: 0.03,
    idleDrift: 0.42,
    idleRoughness: 0.6
};

interface ShaderState extends FlareSettings {
    set: <K extends keyof FlareSettings>(key: K, value: FlareSettings[K]) => void;
    /** Restore the defaults, then let the current theme's preset win over them. */
    reset: (theme: Theme) => void;
    applyThemePreset: (theme: Theme) => void;
}

/**
 * The flare's settings.
 *
 * Read per frame with `useShaderStore.getState()` rather than subscribed to:
 * the render loop wants the latest value every frame regardless, and a React
 * subscription would re-render the tree on every slider drag.
 */
export const useShaderStore = create<ShaderState>((set) => ({
    ...FLARE_DEFAULTS,
    set: (key, value) => set({ [key]: value } as Pick<FlareSettings, typeof key>),
    reset: (theme) => set({ ...FLARE_DEFAULTS, ...presetFor(theme) }),
    applyThemePreset: (theme) => set(presetFor(theme))
}));

const presetFor = (theme: Theme) => {
    const preset = THEME_PRESETS[theme];
    return { palette: preset.palette, invert: preset.invert };
};
