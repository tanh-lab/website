import { create } from "zustand";

/**
 * What the intro is waiting on. The page is revealed when all three are
 * satisfied — whichever lands last — so the curve sweep never restarts and
 * never cuts off mid-draw.
 *
 * `fonts` starts satisfied where the API is missing: nothing can then tell us
 * when the wordmark fitting has settled, so waiting on it would hang forever.
 */
interface Gate {
    /** The preloader's tanh sweep has finished drawing. */
    swept: boolean;
    /** window `load` has fired. */
    loaded: boolean;
    /** Webfonts are ready and the wordmarks have been refitted against them. */
    fonts: boolean;
}

interface MotionState {
    gate: Gate;
    /** The preloader is gone and the intro has started. */
    revealed: boolean;
    /** A page transition is running; the flare stands down while it does. */
    paging: boolean;
    open: (key: keyof Gate) => void;
    setPaging: (paging: boolean) => void;
}

export const useMotionStore = create<MotionState>((set) => ({
    gate: {
        swept: false,
        loaded: false,
        fonts: typeof document !== "undefined" && !document.fonts
    },
    revealed: false,
    paging: false,

    open: (key) =>
        set((state) => {
            if (state.gate[key]) return state;
            const gate = { ...state.gate, [key]: true };
            const revealed = gate.swept && gate.loaded && gate.fonts;
            return { gate, revealed };
        }),

    setPaging: (paging) => set({ paging })
}));
