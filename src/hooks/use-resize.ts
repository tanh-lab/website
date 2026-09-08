import { useEffect, useRef } from "react";

import { onResize } from "@/lib/resize";

/** Subscribe a component to the shared, frame-coalesced resize bus. */
export function useResize(fn: () => void) {
    const ref = useRef(fn);
    // Assigned in an effect, not during render: the subscription below reads
    // `ref.current` at call time, so it only has to be current by the time a
    // frame or event actually fires.
    useEffect(() => {
        ref.current = fn;
    });

    useEffect(() => onResize(() => ref.current()), []);
}
