import { create } from "zustand";

interface SectionState {
    /** id of the page currently filling the screen, or null on the hero. */
    activeId: string | null;
    /**
     * The active page reverses ground and ink. The header survives that on its
     * own — it is difference-blended — but the brand is not, so it has to be
     * told.
     */
    inverted: boolean;
    setActive: (activeId: string | null, inverted: boolean) => void;
}

export const useSectionStore = create<SectionState>((set) => ({
    activeId: null,
    inverted: false,
    setActive: (activeId, inverted) => set({ activeId, inverted })
}));
