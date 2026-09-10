import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface PageProps {
    id: string;
    /**
     * The section's name, as the nav says it.
     *
     * Rendered as a hidden <h2> rather than shown: the nav already carries these
     * words in their own column, so a visible title would repeat itself on
     * screen — but without one the document has no outline, and the six sections
     * are reachable only by scrolling through them.
     */
    title: string;
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
export function Page({ id, title, children, inverted = false }: PageProps) {
    return (
        <section className={cn("page", "module", inverted && "is-inverted")} id={id}>
            <div className="page-inner w">
                <h2 className="visually-hidden">{title}</h2>
                {children}
            </div>
        </section>
    );
}
