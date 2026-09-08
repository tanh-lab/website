import { useThemeStore } from "@/store/useThemeStore";

/** A half-filled disc — the same mark in both themes, rotated 180°. */
export function ThemeToggle() {
    const theme = useThemeStore((state) => state.theme);
    const toggle = useThemeStore((state) => state.toggle);
    const dark = theme === "dark";

    return (
        <button
            className="theme-toggle"
            type="button"
            onClick={toggle}
            aria-pressed={dark}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title="Light / dark"
        >
            <svg viewBox="0 0 16 16" aria-hidden="true">
                <circle
                    cx="8"
                    cy="8"
                    r="7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                />
                <path d="M8 1 A7 7 0 0 1 8 15 Z" fill="currentColor" />
            </svg>
        </button>
    );
}
