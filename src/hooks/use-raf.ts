import { useEffect, useRef } from "react";

import { onFrame } from "@/lib/raf";

/**
 * Subscribe a component to the shared frame loop.
 *
 * The callback is held in a ref, so a fresh closure on every render does not
 * resubscribe — and does not go stale either.
 */
export function useRaf(fn: (now: number, dt: number) => void, enabled = true) {
    const ref = useRef(fn);
    // Assigned in an effect, not during render: the subscription below reads
    // `ref.current` at call time, so it only has to be current by the time a
    // frame or event actually fires.
    useEffect(() => {
        ref.current = fn;
    });

    useEffect(() => {
        if (!enabled) return;
        return onFrame((now, dt) => ref.current(now, dt));
    }, [enabled]);
}
