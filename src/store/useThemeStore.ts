import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "tanh-theme";

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggle: () => void;
    /** Adopt the stored preference, if any. Client-only; call once on mount. */
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

/**
 * Put a theme on the document: the attribute the tokens key off, and the
 * browser's own chrome behind the page.
 *
 * The attribute is written before the store's state so that subscribers — the
 * globe and the preloader curve, both of which read their ink back out of CSS
 * with `getComputedStyle` — see the incoming theme rather than the outgoing
 * one. Handed the outgoing ink, the globe was drawn in exactly the colour the
 * new ground then became, and vanished.
 *
 * The chrome colour is read back off `--background` rather than mapped from a
 * table here, so the tokens stay the single definition of the two grounds. The
 * boot script in index.html carries its own copy only because it has to run
 * before any stylesheet exists.
 */
function paint(theme: Theme) {
    const root = document.documentElement;
    root.dataset.theme = theme;

    const meta = document.querySelector('meta[name="theme-color"]');
    const ground = getComputedStyle(root).getPropertyValue("--background").trim();
    if (meta && ground) meta.setAttribute("content", ground);
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
 * The default is light — what the bare `:root` block in tokens.css paints,
 * `html[data-theme="dark"]` being the override. Only a stored choice moves it;
 * `prefers-color-scheme` is deliberately not consulted, so a first visit looks
 * the same for everyone.
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
        paint(theme);
        set({ theme });
        persist(theme);
    },

    toggle: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),

    hydrate: () => {
        const theme = readStored() ?? "light";
        paint(theme);
        set({ theme });
    }
}));
