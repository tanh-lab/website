import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "tanh-theme";

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggle: () => void;
    /** Adopt the stored or system preference. Client-only; call once on mount. */
    hydrate: () => void;
}

const isTheme = (value: unknown): value is Theme => value === "light" || value === "dark";

function readStored(): Theme | null {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return isTheme(saved) ? saved : null;
    } catch {
        // Private browsing denies access to localStorage outright.
        return null;
    }
}

function persist(theme: Theme) {
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // Nothing to do; the choice simply will not survive a reload.
    }
}

/**
 * Light and dark.
 *
 * The default is the system preference, falling back to light — which is what
 * the bare `:root` block in tokens.css paints, `html[data-theme="dark"]` being
 * the override. The previous implementation initialised to light while its own
 * comment claimed dark, and never consulted `prefers-color-scheme` at all.
 *
 * `document.documentElement.dataset.theme` is written by the store rather than
 * by a component, so that non-React subscribers — the flare, which keeps a
 * palette per theme — see a consistent value whenever they read it. A store
 * replays its current state to every new subscriber, which is what makes the
 * old ordering bug impossible: the shader used to register its `themechange`
 * listener after the theme module had already dispatched, and papered over the
 * miss by re-reading the DOM by hand.
 */
export const useThemeStore = create<ThemeState>((set, get) => ({
    theme: "light",

    setTheme: (theme) => {
        if (get().theme === theme) return;
        set({ theme });
        document.documentElement.dataset.theme = theme;
        persist(theme);
    },

    toggle: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),

    hydrate: () => {
        const stored = readStored();
        const system = window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
        const theme = stored ?? system;
        set({ theme });
        document.documentElement.dataset.theme = theme;
    }
}));
