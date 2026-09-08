import { useEffect, useRef } from "react";

import { onKeys } from "@/lib/keys";

/**
 * Bind keyboard shortcuts through the shared keydown bus, which already
 * declines to fire while the user is typing into a field.
 */
export function useKeys(keys: string[], fn: (event: KeyboardEvent) => void) {
    const ref = useRef(fn);
    // Assigned in an effect, not during render: the subscription below reads
    // `ref.current` at call time, so it only has to be current by the time a
    // frame or event actually fires.
    useEffect(() => {
        ref.current = fn;
    });

    // Joined rather than passed as an array: a literal like ["g", "G"] is a new
    // array identity on every render and would resubscribe every time.
    const key = keys.join(" ");

    useEffect(() => onKeys(key.split(" "), (event) => ref.current(event)), [key]);
}
