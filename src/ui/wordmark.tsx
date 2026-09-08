import { cn } from "@/lib/cn";
import { useWordmarkStore } from "@/store/useWordmarkStore";

/**
 * The wordmark as live text in an SVG.
 *
 * The viewBox comes from the store, which `fitWordmarks` fills in with the width
 * the text actually renders at — so the mark scales to exactly its container
 * whichever font resolved. Until then it carries a placeholder with a sane
 * aspect ratio, which is also what the pre-rendered HTML ships.
 */
export function Wordmark({ sub = false }: { sub?: boolean }) {
    const viewBox = useWordmarkStore((state) => (sub ? state.sub : state.title));

    return (
        <svg
            className={cn("wordmark-svg", sub && "is-sub")}
            viewBox={viewBox}
            aria-hidden="true"
        >
            <text x="0" y="86" fontSize="100">
                {sub ? "audio software agency" : "tanh lab"}
            </text>
        </svg>
    );
}
