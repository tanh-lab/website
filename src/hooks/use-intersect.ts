import type { RefObject } from "react";
import { useEffect, useRef } from "react";

import { useScroller } from "@/ui/scroller-context";

interface Options {
    threshold?: number | number[];
    rootMargin?: string;
    /** Stop observing after the first intersection. */
    once?: boolean;
}

/**
 * Observe an element against the page scroller. Falls back to firing once,
 * immediately, where IntersectionObserver is unavailable — which is the safe
 * direction: content that cannot be observed must still be visible.
 */
export function useIntersect<T extends Element>(
    ref: RefObject<T | null>,
    onIntersect: (entry: IntersectionObserverEntry | null) => void,
    { threshold = 0, rootMargin, once = false }: Options = {}
) {
    const scroller = useScroller();
    const callback = useRef(onIntersect);
    useEffect(() => {
        callback.current = onIntersect;
    });

    const key = Array.isArray(threshold) ? threshold.join(",") : String(threshold);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        if (typeof IntersectionObserver === "undefined") {
            callback.current(null);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    callback.current(entry);
                    if (once) observer.unobserve(entry.target);
                }
            },
            { root: scroller, threshold, rootMargin }
        );

        observer.observe(el);
        return () => observer.disconnect();
        // `key` stands in for `threshold`, which is commonly an inline array.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ref, scroller, key, rootMargin, once]);
}
