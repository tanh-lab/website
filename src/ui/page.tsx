import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface PageProps {
    id: string;
    children: ReactNode;
    /**
     * Reverse ground and ink. The header survives this on its own — it is
     * difference-blended — but the brand is not, so the section observer tells
     * it separately.
     */
    inverted?: boolean;
}

/**
 * One section page: a full-height snap target with an inset scrim panel behind
 * its content.
 *
 * `.page` stays flush for scroll snapping; only the paint is inset, which is
 * why the veil is a pseudo-element rather than a background on the page itself.
 */
export function Page({ id, children, inverted = false }: PageProps) {
    return (
        <section className={cn("page", "module", inverted && "is-inverted")} id={id}>
            <div className="page-inner w">{children}</div>
        </section>
    );
}
