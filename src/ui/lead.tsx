import type { ReactNode } from "react";

import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/cn";

/** The short descriptive paragraph every section opens with. */
export function Lead({ children }: { children: ReactNode }) {
    const { ref, isVisible } = useReveal<HTMLParagraphElement>();

    return (
        <p ref={ref} className={cn("lead", "fade", isVisible && "is-in")}>
            {children}
        </p>
    );
}
