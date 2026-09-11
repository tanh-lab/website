import { useRef, useState } from "react";

import { useIntersect } from "@/hooks/use-intersect";
import { prefersReducedMotion } from "@/lib/motion-preference";

/**
 * Reveal-on-scroll, once. Fires as a page snaps in and stays revealed —
 * scrolling back past a section should not replay it.
 *
 * A low threshold with a bottom rootMargin rather than a large threshold: a
 * page taller than the scroller can never reach a high intersection ratio, so
 * something like 0.3 would leave it stuck at opacity 0 for good on a short
 * viewport.
 *
 * The margin is positive, which grows the root downward rather than pulling it
 * in: the fade starts while the content is still a tenth of a screen below the
 * fold and is done by the time it is properly on it. It used to be -12%, which
 * asked for the content to be an eighth of the way in before it began — fine
 * for a snap, where a page arrives all at once and stops, and wrong for a phone
 * scrolling freely past it, where the reader reaches the space before the fade
 * is told to start and watches it fill in.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
    const ref = useRef<T>(null);
    const [isVisible, setVisible] = useState(false);

    useIntersect(ref, () => setVisible(true), {
        threshold: 0,
        rootMargin: "0px 0px 10% 0px",
        once: true
    });

    // Reduced motion means arriving already revealed rather than animating in.
    return { ref, isVisible: isVisible || prefersReducedMotion() };
}
