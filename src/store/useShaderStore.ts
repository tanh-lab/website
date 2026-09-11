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
    /** Degrees the finished colour is turned about the neutral axis in Oklab. */
    hueTurn: number;
    grainAmount: number;
    grainSize: number;
    pointerReach: number;
    followEase: number;
    idleDrift: number;
    idleRoughness: number;
}

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
    hueTurn: 0,
    grainAmount: 0.0,
    grainSize: 1.6,
    pointerReach: 0.12,
    followEase: 0.03,
    idleDrift: 0.42,
    idleRoughness: 0.6
};

interface ShaderState extends FlareSettings {
    applyThemePreset: (theme: Theme) => void;
}

/**
 * The flare's settings.
 *
 * Read per frame with `useShaderStore.getState()` rather than subscribed to:
 * the render loop wants the latest value every frame regardless.
 */
export const useShaderStore = create<ShaderState>((set) => ({
    ...FLARE_DEFAULTS,
    applyThemePreset: (theme) => set(presetFor(theme))
}));

const presetFor = (theme: Theme) => {
    const preset = THEME_PRESETS[theme];
    return {
        palette: preset.palette,
        invert: preset.invert,
        saturation: preset.saturation,
        hueTurn: preset.hueTurn
    };
};
