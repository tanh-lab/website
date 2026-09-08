import { create } from "zustand";

/**
 * The fitted viewBox of each wordmark line.
 *
 * The site sets its wordmark as live text rather than as artwork, so the box has
 * to be measured: we read the rendered advance width and use it as the viewBox
 * width, and the SVG then scales to exactly its container whichever font
 * resolved, and again once the webfont lands.
 *
 * It lives in a store — rather than being written onto the elements by the
 * measuring code — because React owns those attributes. Poking them imperatively
 * worked only until the next render: `revealed` flipping false→true re-rendered
 * the brand, React reconciled the `viewBox` back to the placeholder in the JSX,
 * and the mark silently snapped to header size at the top of the hero.
 *
 * The placeholders are what the pre-rendered HTML ships with. They only have to
 * carry a sane aspect ratio, so the mark is not mis-shaped in the moment before
 * hydration — or if the script never runs at all.
 */
interface WordmarkState {
    title: string;
    sub: string;
    setBoxes: (title: string, sub: string) => void;
}

export const PLACEHOLDER_TITLE = "0 0 1200 106";
/** Taller: the lowercase subtitle has descenders (g, y). */
export const PLACEHOLDER_SUB = "0 0 1200 116";

export const useWordmarkStore = create<WordmarkState>((set) => ({
    title: PLACEHOLDER_TITLE,
    sub: PLACEHOLDER_SUB,
    setBoxes: (title, sub) =>
        set((state) =>
            state.title === title && state.sub === sub ? state : { title, sub }
        )
}));
