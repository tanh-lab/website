import type { ReactNode } from "react";
import { useCallback, useEffect } from "react";

import { useSectionStore } from "@/store/useSectionStore";
import { createPaging } from "@/ui/paging";
import { useScroller } from "@/ui/scroller-context";

/** How much of a page has to be on screen before it counts as the one you are on. */
const ACTIVE_THRESHOLD = 0.55;

/**
 * The scroll container: one snap page per section.
 *
 * This is `<main>` itself rather than a wrapper around it. The pages are sized
 * `height: 100%`, and that only resolves against an ancestor with a definite
 * height.
 *
 * The element is reported upwards rather than kept here, because the header, the
 * brand layer and the shader all sit outside this subtree and still have to
 * observe it.
 */
export function Scroller({
    onMount,
    children
}: {
    onMount: (element: HTMLElement | null) => void;
    children: ReactNode;
}) {
    const element = useScroller();

    // A callback ref rather than useRef: the element becomes state one level up,
    // so everything that depends on it re-runs once it actually exists.
    const ref = useCallback((node: HTMLElement | null) => onMount(node), [onMount]);

    useEffect(() => {
        if (!element) return;
        const paging = createPaging(element);
        return () => paging.dispose();
    }, [element]);

    useEffect(() => {
        if (!element || typeof IntersectionObserver === "undefined") return;

        const pages = [...element.querySelectorAll<HTMLElement>(".hero, .page")];
        const setActive = useSectionStore.getState().setActive;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    const target = entry.target as HTMLElement;
                    // The hero carries no nav entry, so reaching it clears the
                    // highlight rather than setting one.
                    const isHero = target.classList.contains("hero");
                    setActive(
                        isHero ? null : target.id,
                        target.classList.contains("is-inverted")
                    );
                }
            },
            { root: element, threshold: ACTIVE_THRESHOLD }
        );

        pages.forEach((page) => observer.observe(page));
        return () => observer.disconnect();
    }, [element]);

    return (
        <main className="scroller" id="scroller" ref={ref} tabIndex={-1}>
            {children}
        </main>
    );
}
