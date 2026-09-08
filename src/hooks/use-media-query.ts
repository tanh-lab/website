import { useCallback, useSyncExternalStore } from "react";

/**
 * Matches a media query, kept in sync with changes.
 *
 * `useSyncExternalStore` rather than state-plus-effect: a media query *is* an
 * external store, and this is the primitive for one. It also takes a separate
 * server snapshot, which is what keeps the pre-rendered markup — produced with
 * no window at all — from disagreeing with the first client render.
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const mq = window.matchMedia(query);
            mq.addEventListener("change", onChange);
            return () => mq.removeEventListener("change", onChange);
        },
        [query]
    );

    const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

    // Nothing matches on the server; the real value arrives at hydration.
    const getServerSnapshot = () => false;

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
